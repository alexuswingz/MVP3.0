from django.db import models
from django.conf import settings
from forecast_app.models import Product


class InventorySnapshot(models.Model):
    """Real-time inventory tracking - historical snapshots"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_snapshots')
    snapshot_date = models.DateTimeField()
    
    # FBA Inventory
    fba_available = models.IntegerField(default=0)
    fba_reserved = models.IntegerField(default=0)
    fba_inbound = models.IntegerField(default=0)
    fba_inbound_working = models.IntegerField(default=0)
    fba_inbound_shipped = models.IntegerField(default=0)
    fba_inbound_receiving = models.IntegerField(default=0)
    fba_unfulfillable = models.IntegerField(default=0)
    
    # FBA Reserved Breakdown
    fba_reserved_customer_order = models.IntegerField(default=0)
    fba_reserved_fc_transfer = models.IntegerField(default=0)
    fba_reserved_fc_processing = models.IntegerField(default=0)
    
    # AWD Inventory
    awd_available = models.IntegerField(default=0)
    awd_reserved = models.IntegerField(default=0)
    awd_inbound = models.IntegerField(default=0)
    awd_outbound_to_fba = models.IntegerField(default=0)
    
    # Inventory Age (FBA)
    age_0_to_90 = models.IntegerField(default=0)
    age_91_to_180 = models.IntegerField(default=0)
    age_181_to_270 = models.IntegerField(default=0)
    age_271_to_365 = models.IntegerField(default=0)
    age_365_plus = models.IntegerField(default=0)
    
    # Days of Supply from Amazon
    days_of_supply = models.FloatField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def fba_total(self):
        """Total FBA inventory including all states"""
        return (
            self.fba_available + 
            self.fba_reserved + 
            self.fba_inbound +
            self.fba_unfulfillable
        )
    
    @property
    def awd_total(self):
        """Total AWD inventory including all states"""
        return (
            self.awd_available + 
            self.awd_reserved + 
            self.awd_inbound +
            self.awd_outbound_to_fba
        )
    
    @property
    def total_inventory(self):
        """Total inventory across all channels (for forecast calculations)"""
        return self.fba_total + self.awd_total
    
    @property
    def total_available(self):
        """Total immediately available inventory"""
        return self.fba_available + self.awd_available
    
    class Meta:
        db_table = 'inventory_snapshots'
        indexes = [
            models.Index(fields=['product', 'snapshot_date']),
            models.Index(fields=['snapshot_date']),
        ]
        get_latest_by = 'snapshot_date'
    
    def __str__(self):
        return f"{self.product.name} - {self.snapshot_date}"


class CurrentInventory(models.Model):
    """Current inventory state (latest snapshot, denormalized for fast access)"""
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='current_inventory')
    
    # FBA Inventory
    fba_available = models.IntegerField(default=0)
    fba_reserved = models.IntegerField(default=0)
    fba_inbound = models.IntegerField(default=0)
    fba_inbound_working = models.IntegerField(default=0)
    fba_inbound_shipped = models.IntegerField(default=0)
    fba_inbound_receiving = models.IntegerField(default=0)
    fba_unfulfillable = models.IntegerField(default=0)
    
    # FBA Reserved Breakdown
    fba_reserved_customer_order = models.IntegerField(default=0)
    fba_reserved_fc_transfer = models.IntegerField(default=0)
    fba_reserved_fc_processing = models.IntegerField(default=0)
    
    # AWD Inventory
    awd_available = models.IntegerField(default=0)
    awd_reserved = models.IntegerField(default=0)
    awd_inbound = models.IntegerField(default=0)
    awd_outbound_to_fba = models.IntegerField(default=0)
    
    # Inventory Age (FBA)
    age_0_to_90 = models.IntegerField(default=0)
    age_91_to_180 = models.IntegerField(default=0)
    age_181_to_270 = models.IntegerField(default=0)
    age_271_to_365 = models.IntegerField(default=0)
    age_365_plus = models.IntegerField(default=0)
    
    # Days of Supply from Amazon
    days_of_supply = models.FloatField(default=0)
    
    last_synced = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'current_inventory'
    
    @property
    def fba_total(self):
        """Total FBA inventory including all states"""
        return (
            self.fba_available + 
            self.fba_reserved + 
            self.fba_inbound +
            self.fba_unfulfillable
        )
    
    @property
    def awd_total(self):
        """Total AWD inventory including all states"""
        return (
            self.awd_available + 
            self.awd_reserved + 
            self.awd_inbound +
            self.awd_outbound_to_fba
        )
    
    @property
    def total_inventory(self):
        """Total inventory across all channels (for forecast calculations)"""
        return self.fba_total + self.awd_total
    
    @property
    def total_available(self):
        """Total immediately available inventory"""
        return self.fba_available + self.awd_available
    
    def __str__(self):
        return f"{self.product.name} - FBA:{self.fba_available} AWD:{self.awd_available}"


class Shipment(models.Model):
    """Inbound shipment tracking"""
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('ready', 'Ready to Ship'),
        ('shipped', 'Shipped'),
        ('in_transit', 'In Transit'),
        ('receiving', 'Receiving'),
        ('received', 'Received'),
        ('cancelled', 'Cancelled'),
    ]
    
    TYPE_CHOICES = [
        ('fba', 'FBA'),
        ('awd', 'AWD'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shipments')
    
    # Identifiers
    shipment_id = models.CharField(max_length=100, blank=True, db_index=True)
    amazon_shipment_id = models.CharField(max_length=100, blank=True)
    amazon_reference_id = models.CharField(max_length=100, blank=True)
    
    # Details
    name = models.CharField(max_length=200)
    shipment_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='fba')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    
    # Ship from/to
    ship_from_name = models.CharField(max_length=200, blank=True)
    ship_from_address = models.TextField(blank=True)
    destination_center = models.CharField(max_length=100, blank=True)
    
    # Dates
    planned_ship_date = models.DateField(null=True, blank=True)
    actual_ship_date = models.DateField(null=True, blank=True)
    estimated_arrival = models.DateField(null=True, blank=True)
    actual_arrival = models.DateField(null=True, blank=True)
    
    # Totals
    total_units = models.IntegerField(default=0)
    received_units = models.IntegerField(default=0)
    
    # Notes
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'shipments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.status})"


class ShipmentItem(models.Model):
    """Individual items within shipments"""
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='shipment_items')
    
    quantity_planned = models.IntegerField(default=0)
    quantity_shipped = models.IntegerField(default=0)
    quantity_received = models.IntegerField(default=0)
    
    # From forecast
    recommended_quantity = models.IntegerField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'shipment_items'
        unique_together = ['shipment', 'product']
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity_planned}"


class LabelInventory(models.Model):
    """Label inventory for products - tracking available labels for packaging"""
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='label_inventory')
    
    # Current label count
    quantity = models.IntegerField(default=0)
    
    # Thresholds for alerts
    reorder_point = models.IntegerField(default=500)
    reorder_quantity = models.IntegerField(default=2000)
    
    # Notes
    notes = models.TextField(blank=True)
    
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'label_inventory'
        verbose_name_plural = 'Label Inventories'
        ordering = ['-quantity']
    
    @property
    def needs_reorder(self):
        return self.quantity <= self.reorder_point
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity:,} labels"
