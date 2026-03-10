from django.db import models
from django.conf import settings
from forecast_app.models import Product


class DailySales(models.Model):
    """Daily sales data per product"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='daily_sales')
    date = models.DateField()
    
    # Sales metrics
    units_sold = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    orders = models.IntegerField(default=0)
    
    # Traffic (if available from SP-API)
    sessions = models.IntegerField(default=0)
    page_views = models.IntegerField(default=0)
    
    # Calculated
    @property
    def conversion_rate(self):
        if self.sessions > 0:
            return (self.orders / self.sessions) * 100
        return 0
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'daily_sales'
        unique_together = ['product', 'date']
        indexes = [
            models.Index(fields=['product', 'date']),
            models.Index(fields=['date']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.product.name} - {self.date}: {self.units_sold} units"


class WeeklySales(models.Model):
    """Weekly sales data per product - aggregated from Excel imports"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='weekly_sales')
    week_ending = models.DateField()  # The Saturday/end date of the week
    
    # Sales metrics
    units_sold = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    orders = models.IntegerField(default=0)
    
    # Calculated daily average
    @property
    def daily_average(self):
        return self.units_sold / 7 if self.units_sold else 0
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'weekly_sales'
        unique_together = ['product', 'week_ending']
        indexes = [
            models.Index(fields=['product', 'week_ending']),
            models.Index(fields=['week_ending']),
            models.Index(fields=['product', '-week_ending']),
        ]
        ordering = ['-week_ending']
    
    def __str__(self):
        return f"{self.product.name} - Week ending {self.week_ending}: {self.units_sold} units"


class Order(models.Model):
    """Individual order tracking"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders')
    
    amazon_order_id = models.CharField(max_length=50, db_index=True)
    purchase_date = models.DateTimeField()
    
    units = models.IntegerField(default=1)
    revenue = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Fulfillment
    fulfillment_channel = models.CharField(max_length=20, blank=True)  # FBA, FBM
    order_status = models.CharField(max_length=50, blank=True)
    
    # Customer location (aggregated, no PII)
    customer_state = models.CharField(max_length=50, blank=True)
    customer_country = models.CharField(max_length=50, default='US')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'orders'
        indexes = [
            models.Index(fields=['user', 'purchase_date']),
            models.Index(fields=['product', 'purchase_date']),
        ]
    
    def __str__(self):
        return f"{self.amazon_order_id} - {self.units} units"


class VineClaim(models.Model):
    """Amazon Vine program tracking"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='vine_claims')
    claim_date = models.DateField()
    
    units_claimed = models.IntegerField(default=1)
    review_received = models.BooleanField(default=False)
    review_date = models.DateField(null=True, blank=True)
    review_rating = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'vine_claims'
        ordering = ['-claim_date']
    
    def __str__(self):
        return f"{self.product.name} - {self.claim_date}"


class SeasonalityCurve(models.Model):
    """Seasonality data for forecasting"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='seasonality_curves')
    
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100, blank=True)
    
    # 52 weeks of seasonality indexes (1.0 = normal)
    weekly_indexes = models.JSONField(default=list)
    
    # Monthly indexes alternative
    monthly_indexes = models.JSONField(default=list)
    
    data_source = models.CharField(max_length=100, blank=True)  # search_volume, historical_sales
    year = models.IntegerField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'seasonality_curves'
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class ProductSeasonality(models.Model):
    """
    Per-product weekly seasonality data for 0-6m and 6-18m forecast algorithms.
    Each product can have 52 rows (one per week of year) with seasonality metrics.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='seasonality')
    week_of_year = models.IntegerField()  # 1-52
    
    # Search volume data (for 6-18m algorithm)
    search_volume = models.FloatField(default=100)
    sv_smooth_env = models.FloatField(default=100)  # Smoothed search volume envelope
    
    # Seasonality index (normalized 0-1, for 0-6m algorithm)
    seasonality_index = models.FloatField(default=1.0)
    
    # Seasonality multiplier (relative to average, e.g., 1.2 = 20% above average)
    seasonality_multiplier = models.FloatField(default=1.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_seasonality'
        unique_together = ['product', 'week_of_year']
        indexes = [
            models.Index(fields=['product', 'week_of_year']),
        ]
        ordering = ['week_of_year']
    
    def __str__(self):
        return f"{self.product.asin} - Week {self.week_of_year}: {self.seasonality_index:.2f}"


class ActionItem(models.Model):
    """
    Persisted action items for the Action Items dashboard.

    These are scoped per user, optionally linked to a Product, and denormalise
    key product fields for quick display and CSV export.
    """

    STATUS_CHOICES = [
        ('To Do', 'To Do'),
        ('In progress', 'In progress'),
        ('In review', 'In review'),
        ('Completed', 'Completed'),
    ]

    CATEGORY_CHOICES = [
        ('Ads', 'Ads'),
        ('Inventory', 'Inventory'),
        ('PDP', 'PDP'),
        ('Price', 'Price'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='action_items',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='action_items',
    )

    # Denormalised product info (kept in sync on create/update only)
    product_name = models.CharField(max_length=255, blank=True)
    product_asin = models.CharField(max_length=50, blank=True)
    product_brand = models.CharField(max_length=255, blank=True)
    product_size = models.CharField(max_length=100, blank=True)

    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default='To Do',
    )
    category = models.CharField(
        max_length=32,
        choices=CATEGORY_CHOICES,
        blank=True,
    )
    subject = models.CharField(max_length=255)
    description_html = models.TextField(blank=True)

    assignee_name = models.CharField(max_length=255, blank=True)
    assignee_initials = models.CharField(max_length=32, blank=True)

    due_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'action_items'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['user', 'assignee_name']),
            models.Index(fields=['user', 'due_date']),
        ]

    def __str__(self):
        return f"{self.subject} ({self.status})"
