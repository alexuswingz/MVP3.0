from django.db import models
from django.conf import settings


class Brand(models.Model):
    """Brand/Seller Account reference table"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='brands')
    name = models.CharField(max_length=200)
    seller_account = models.CharField(max_length=100, blank=True)
    marketplace = models.CharField(max_length=50, default='Amazon')
    country = models.CharField(max_length=50, default='US')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'brands'
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name


class Product(models.Model):
    """Core product model - standard fields from SP-API"""
    STATUS_CHOICES = [
        ('launched', 'Launched'),
        ('pending', 'Pending'),
        ('discontinued', 'Discontinued'),
        ('draft', 'Draft'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    
    # Core identifiers (from SP-API)
    asin = models.CharField(max_length=20, blank=True, db_index=True)
    parent_asin = models.CharField(max_length=20, blank=True)
    sku = models.CharField(max_length=100, blank=True, db_index=True)
    upc = models.CharField(max_length=20, blank=True)
    
    # Basic info
    name = models.CharField(max_length=500)
    size = models.CharField(max_length=100, blank=True)
    product_type = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=200, blank=True)
    
    # Status & dates
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    launch_date = models.DateField(null=True, blank=True)
    
    # Images
    image_url = models.URLField(max_length=500, blank=True)
    
    # Flags
    is_hazmat = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        indexes = [
            models.Index(fields=['user', 'asin']),
            models.Index(fields=['user', 'sku']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'is_active', 'status']),
            models.Index(fields=['user', 'brand', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['name']),  # For search
        ]
    
    def __str__(self):
        return f"{self.name} ({self.asin or self.sku})"


class CustomFieldDefinition(models.Model):
    """Dynamic field definitions per tenant - allows each seller to define their own product attributes"""
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('decimal', 'Decimal'),
        ('date', 'Date'),
        ('boolean', 'Yes/No'),
        ('select', 'Dropdown'),
        ('multiselect', 'Multi-Select'),
        ('url', 'URL'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='custom_fields')
    name = models.CharField(max_length=100)
    field_key = models.SlugField(max_length=100)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES, default='text')
    description = models.TextField(blank=True)
    
    # For select/multiselect - link to a reference table
    reference_table = models.CharField(max_length=100, blank=True)
    
    # Display settings
    is_required = models.BooleanField(default=False)
    show_in_list = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'custom_field_definitions'
        unique_together = ['user', 'field_key']
        ordering = ['display_order', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.field_type})"


class CustomFieldValue(models.Model):
    """EAV pattern - stores custom field values for products"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='custom_fields')
    field_definition = models.ForeignKey(CustomFieldDefinition, on_delete=models.CASCADE)
    
    # Store all types as text, cast on read based on field_type
    value_text = models.TextField(blank=True)
    value_number = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)
    value_boolean = models.BooleanField(null=True, blank=True)
    
    # For select fields - reference to lookup table
    value_reference_id = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'custom_field_values'
        unique_together = ['product', 'field_definition']
    
    def get_value(self):
        """Return the appropriate value based on field type"""
        field_type = self.field_definition.field_type
        if field_type in ['text', 'url', 'select', 'multiselect']:
            return self.value_text
        elif field_type == 'number':
            return int(self.value_number) if self.value_number else None
        elif field_type == 'decimal':
            return float(self.value_number) if self.value_number else None
        elif field_type == 'date':
            return self.value_date
        elif field_type == 'boolean':
            return self.value_boolean
        return self.value_text


# ============================================================================
# TPS NUTRIENTS SPECIFIC REFERENCE TABLES
# These are examples - other tenants would have their own reference tables
# ============================================================================

class PackagingType(models.Model):
    """TPS: Bottle/Bag packaging types"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='packaging_types')
    name = models.CharField(max_length=200)
    packaging_type = models.CharField(max_length=50, blank=True)  # Bottle, Bag, etc.
    size = models.CharField(max_length=50, blank=True)
    label_size = models.CharField(max_length=100, blank=True)
    case_size = models.CharField(max_length=100, blank=True)
    units_per_case = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'packaging_types'
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name


class Closure(models.Model):
    """TPS: Closure/cap types"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='closures')
    name = models.CharField(max_length=200)
    closure_type = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'closures'
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name


class Formula(models.Model):
    """TPS: Product formulas with NPK and analysis"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='formulas')
    name = models.CharField(max_length=200)
    npk = models.CharField(max_length=50, blank=True)
    guaranteed_analysis = models.TextField(blank=True)
    derived_from = models.TextField(blank=True)
    storage_warranty = models.TextField(blank=True)
    filter_type = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'formulas'
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.npk})" if self.npk else self.name


class ProductExtended(models.Model):
    """TPS-specific extended product fields - links to reference tables"""
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='extended')
    
    # Reference table links
    packaging = models.ForeignKey(PackagingType, on_delete=models.SET_NULL, null=True, blank=True)
    closure = models.ForeignKey(Closure, on_delete=models.SET_NULL, null=True, blank=True)
    formula = models.ForeignKey(Formula, on_delete=models.SET_NULL, null=True, blank=True)
    formula_2 = models.ForeignKey(Formula, on_delete=models.SET_NULL, null=True, blank=True, related_name='products_formula2')
    
    # Case dimensions for pallet calculator (in inches and lbs)
    case_length = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Case length in inches')
    case_width = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Case width in inches')
    case_height = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Case height in inches')
    case_weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Case weight in lbs')
    units_per_case = models.IntegerField(null=True, blank=True, help_text='Number of units per case')
    
    # Additional TPS fields
    label_location = models.CharField(max_length=100, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    
    # Competitor tracking
    core_competitor_asins = models.TextField(blank=True)
    other_competitor_asins = models.TextField(blank=True)
    core_keywords = models.TextField(blank=True)
    other_keywords = models.TextField(blank=True)
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Marketing/Listing
    product_title = models.CharField(max_length=500, blank=True)
    bullets = models.TextField(blank=True)
    description = models.TextField(blank=True)
    
    # Vine
    vine_launch_date = models.DateField(null=True, blank=True)
    vine_units_enrolled = models.IntegerField(null=True, blank=True)
    vine_reviews = models.IntegerField(null=True, blank=True)
    star_rating = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'products_extended'
    
    def __str__(self):
        return f"Extended: {self.product.name}"


class DOISettings(models.Model):
    """DOI calculation settings per user"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doi_settings')
    name = models.CharField(max_length=100, default='Default')
    
    amazon_doi_goal = models.IntegerField(default=93)
    inbound_lead_time = models.IntegerField(default=30)
    manufacture_lead_time = models.IntegerField(default=7)
    market_adjustment = models.FloatField(default=0.05)
    velocity_weight = models.FloatField(default=0.15)
    
    is_default = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'doi_settings'
    
    def __str__(self):
        return f"{self.user.email} - {self.name}"


class ForecastCache(models.Model):
    """Cached forecast calculations"""
    STATUS_CHOICES = [
        ('critical', 'Critical'),
        ('low', 'Low Stock'),
        ('good', 'Good'),
        ('overstock', 'Overstock'),
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='forecasts')
    algorithm_version = models.CharField(max_length=20, default='v1')
    forecast_date = models.DateField()
    
    # Forecast results
    units_to_make = models.IntegerField(default=0)
    current_doi = models.FloatField(default=0)
    runout_date = models.DateField(null=True, blank=True)
    
    # Cumulative data for charts
    cumulative_data = models.JSONField(default=dict)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='good')
    calculation_time = models.FloatField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'forecast_cache'
        unique_together = ['product', 'algorithm_version', 'forecast_date']
        indexes = [
            models.Index(fields=['product', 'forecast_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.forecast_date}"
