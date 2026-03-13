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
    amazon_account = models.ForeignKey(
        'amazon_integration.AmazonSellerAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        help_text='The Amazon seller account this product belongs to'
    )
    
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
    """TPS: Bottle/Bag packaging types (legacy - use Bottle model instead)"""
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


class Bottle(models.Model):
    """
    Comprehensive bottle packaging database.
    Maps to BottleDatabase sheet in Excel.
    Referenced by products via Packaging Name.
    """
    REPLENISHMENT_CHOICES = [
        ('corral', 'Corral'),
        ('manual', 'Manual'),
        ('auto', 'Auto'),
    ]
    
    SUPPLIER_ORDER_CHOICES = [
        ('manual', 'Manual'),
        ('auto', 'Auto'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bottles')
    
    # Core Data (Primary identifier)
    name = models.CharField(max_length=200, help_text='Bottle Name - primary identifier')
    image = models.URLField(max_length=500, blank=True, help_text='Bottle Image URL')
    size_oz = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Size in oz')
    shape = models.CharField(max_length=100, blank=True, help_text='e.g., Tall Cylinder, Standard Handle, Rounded')
    color = models.CharField(max_length=50, blank=True, help_text='e.g., White, Clear')
    thread_type = models.CharField(max_length=50, blank=True, help_text='e.g., Non-Ratchet, Ratchet')
    cap_size = models.CharField(max_length=50, blank=True, help_text='e.g., 38-400, 24-410, 28-410')
    material = models.CharField(max_length=50, blank=True, help_text='e.g., HDPE, PET, PETE')
    supplier = models.CharField(max_length=200, blank=True, help_text='Supplier name')
    packaging_part_number = models.CharField(max_length=100, blank=True, help_text='Supplier part number')
    description = models.TextField(blank=True, help_text='Full supplier description')
    brand = models.CharField(max_length=200, blank=True, help_text='Brand/manufacturer')
    
    # Supplier Info
    lead_time_weeks = models.IntegerField(null=True, blank=True, help_text='Lead time in weeks')
    moq = models.IntegerField(null=True, blank=True, help_text='Minimum Order Quantity')
    units_per_pallet = models.IntegerField(null=True, blank=True)
    units_per_case = models.IntegerField(null=True, blank=True)
    cases_per_pallet = models.IntegerField(null=True, blank=True)
    
    # Finished Goods / Box Info
    box_size = models.CharField(max_length=50, blank=True, help_text='e.g., 12x10x12')
    box_length_in = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    box_width_in = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    box_height_in = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    units_per_case_finished = models.IntegerField(null=True, blank=True, help_text='Units per case (finished goods)')
    units_per_gallon = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    box_weight_lbs = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    max_boxes_per_pallet = models.IntegerField(null=True, blank=True)
    single_box_pallet_share = models.DecimalField(max_digits=8, decimal_places=6, null=True, blank=True)
    replenishment_strategy = models.CharField(max_length=20, choices=REPLENISHMENT_CHOICES, blank=True)
    packaging_bpm = models.IntegerField(null=True, blank=True, help_text='Bottles per minute')
    
    # Product Dimensions (Finished Goods)
    length_in = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Product length in inches')
    width_in = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Product width in inches')
    height_in = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Product height in inches')
    weight_lbs = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Product weight in lbs')
    label_size = models.CharField(max_length=50, blank=True, help_text='e.g., 5" x 8"')
    
    # Inventory
    supplier_order_strategy = models.CharField(max_length=20, choices=SUPPLIER_ORDER_CHOICES, blank=True)
    supplier_inventory = models.IntegerField(null=True, blank=True, help_text='Inbound inventory (ordered but not arrived)')
    warehouse_inventory = models.IntegerField(null=True, blank=True, help_text='Available inventory in warehouse')
    allocated_inventory = models.IntegerField(null=True, blank=True, default=0, help_text='Inventory allocated to shipments')
    max_warehouse_inventory = models.IntegerField(null=True, blank=True, help_text='Maximum storage capacity')
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bottles'
        unique_together = ['user', 'name']
        ordering = ['name']
        indexes = [
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'is_active', 'name']),
            models.Index(fields=['size_oz']),
            models.Index(fields=['supplier']),
            models.Index(fields=['shape']),
            models.Index(fields=['warehouse_inventory']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def case_size(self):
        """Alias for box_size for compatibility"""
        return self.box_size


class Closure(models.Model):
    """
    Comprehensive closure/cap database.
    Maps to ClosureDatabase sheet in Excel.
    Referenced by products via Closure Name.
    """
    CATEGORY_CHOICES = [
        ('closure', 'Closure'),
        ('cap', 'Cap'),
        ('sprayer', 'Sprayer'),
        ('pump', 'Pump'),
    ]
    
    SUPPLIER_ORDER_CHOICES = [
        ('manual', 'Manual'),
        ('auto', 'Auto'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='closures')
    
    # Core Info
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='closure')
    name = models.CharField(max_length=200, help_text='Closure Name - primary identifier')
    image = models.URLField(max_length=500, blank=True, help_text='Closure Image URL')
    shape = models.CharField(max_length=100, blank=True, help_text='e.g., Standard, Pour Top, Top Down, Trigger')
    color = models.CharField(max_length=50, blank=True, help_text='e.g., White, Clear')
    thread_type = models.CharField(max_length=50, blank=True, help_text='e.g., Non-Ratchet, Ratchet')
    cap_size = models.CharField(max_length=50, blank=True, help_text='e.g., 38-400, 24-410, 28-410')
    material = models.CharField(max_length=50, blank=True, help_text='e.g., P/P')
    supplier = models.CharField(max_length=200, blank=True)
    packaging_part_number = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    brand = models.CharField(max_length=200, blank=True, help_text='e.g., Berry, Aptar')
    
    # Supplier Info
    lead_time_weeks = models.IntegerField(null=True, blank=True)
    moq = models.IntegerField(null=True, blank=True, help_text='Minimum Order Quantity')
    units_per_pallet = models.IntegerField(null=True, blank=True)
    units_per_case = models.IntegerField(null=True, blank=True)
    cases_per_pallet = models.IntegerField(null=True, blank=True)
    
    # Inventory
    supplier_order_strategy = models.CharField(max_length=20, choices=SUPPLIER_ORDER_CHOICES, blank=True)
<<<<<<< Updated upstream
    supplier_inventory = models.IntegerField(null=True, blank=True, help_text='Inbound inventory (ordered but not arrived)')
    warehouse_inventory = models.IntegerField(null=True, blank=True, help_text='Available inventory in warehouse')
    allocated_inventory = models.IntegerField(null=True, blank=True, default=0, help_text='Inventory allocated to shipments')
    max_warehouse_inventory = models.IntegerField(null=True, blank=True, help_text='Maximum storage capacity')
=======
    supplier_inventory = models.IntegerField(null=True, blank=True)
    warehouse_inventory = models.IntegerField(null=True, blank=True)
    max_warehouse_inventory = models.IntegerField(null=True, blank=True)
>>>>>>> Stashed changes
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    
    class Meta:
        db_table = 'closures'
        unique_together = ['user', 'name']
        ordering = ['name']
        indexes = [
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'is_active', 'name']),
            models.Index(fields=['cap_size']),
            models.Index(fields=['category']),
            models.Index(fields=['supplier']),
            models.Index(fields=['warehouse_inventory']),
        ]
    
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
    
    # Reference table links (legacy - kept for backward compatibility)
    packaging = models.ForeignKey(PackagingType, on_delete=models.SET_NULL, null=True, blank=True)
    
    # New comprehensive reference links
    bottle = models.ForeignKey(Bottle, on_delete=models.SET_NULL, null=True, blank=True, 
                               related_name='products', help_text='Links to BottleDatabase')
    closure = models.ForeignKey(Closure, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='products', help_text='Links to ClosureDatabase')
    formula = models.ForeignKey(Formula, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='products')
    formula_2 = models.ForeignKey(Formula, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='products_formula2')
    
    # Case dimensions for pallet calculator (in inches and lbs)
    # These can be auto-populated from Bottle if linked
    case_length = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Case length in inches')
    case_width = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Case width in inches')
    case_height = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Case height in inches')
    case_weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Case weight in lbs')
    units_per_case = models.IntegerField(null=True, blank=True, help_text='Number of units per case')
    
    # Additional TPS fields
    label_location = models.CharField(max_length=100, blank=True)
    label_size = models.CharField(max_length=50, blank=True, help_text='Can be derived from Bottle')
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
        indexes = [
            models.Index(fields=['bottle']),
            models.Index(fields=['closure']),
            models.Index(fields=['formula']),
        ]
    
    def __str__(self):
        return f"Extended: {self.product.name}"
    
    def populate_from_bottle(self):
        """Populate case dimensions and label size from linked Bottle"""
        if self.bottle:
            if not self.case_length and self.bottle.box_length_in:
                self.case_length = self.bottle.box_length_in
            if not self.case_width and self.bottle.box_width_in:
                self.case_width = self.bottle.box_width_in
            if not self.case_height and self.bottle.box_height_in:
                self.case_height = self.bottle.box_height_in
            if not self.case_weight and self.bottle.box_weight_lbs:
                self.case_weight = self.bottle.box_weight_lbs
            if not self.units_per_case and self.bottle.units_per_case_finished:
                self.units_per_case = self.bottle.units_per_case_finished
            if not self.label_size and self.bottle.label_size:
                self.label_size = self.bottle.label_size
    
    def save(self, *args, **kwargs):
        # Auto-populate from bottle if available and fields are empty
        self.populate_from_bottle()
        super().save(*args, **kwargs)


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
