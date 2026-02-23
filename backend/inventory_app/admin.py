from django.contrib import admin
from .models import InventorySnapshot, CurrentInventory, Shipment, ShipmentItem, LabelInventory


@admin.register(CurrentInventory)
class CurrentInventoryAdmin(admin.ModelAdmin):
    list_display = [
        'get_product_asin', 'get_total_inventory', 
        'get_fba_total', 'fba_available', 
        'get_awd_total', 'awd_available', 'awd_outbound_to_fba',
        'days_of_supply', 'last_synced'
    ]
    search_fields = ['product__name', 'product__asin', 'product__sku']
    list_filter = ['last_synced']
    readonly_fields = ['last_synced']
    list_select_related = ['product']
    list_per_page = 50
    raw_id_fields = ['product']
    ordering = ['-fba_available']
    
    fieldsets = (
        ('Product', {
            'fields': ('product',)
        }),
        ('FBA Inventory', {
            'fields': (
                ('fba_available', 'fba_reserved', 'fba_inbound'),
                ('fba_inbound_working', 'fba_inbound_shipped', 'fba_inbound_receiving'),
                'fba_unfulfillable',
            )
        }),
        ('FBA Reserved Breakdown', {
            'fields': (
                ('fba_reserved_customer_order', 'fba_reserved_fc_transfer', 'fba_reserved_fc_processing'),
            ),
            'classes': ('collapse',)
        }),
        ('AWD Inventory', {
            'fields': (
                ('awd_available', 'awd_reserved', 'awd_inbound'),
                'awd_outbound_to_fba',
            )
        }),
        ('Inventory Age', {
            'fields': (
                ('age_0_to_90', 'age_91_to_180', 'age_181_to_270'),
                ('age_271_to_365', 'age_365_plus'),
            ),
            'classes': ('collapse',)
        }),
        ('Metrics', {
            'fields': ('days_of_supply', 'last_synced')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')
    
    @admin.display(description='ASIN')
    def get_product_asin(self, obj):
        return obj.product.asin if obj.product else '-'
    
    @admin.display(description='Total')
    def get_total_inventory(self, obj):
        return obj.total_inventory
    
    @admin.display(description='FBA Total')
    def get_fba_total(self, obj):
        return obj.fba_total
    
    @admin.display(description='AWD Total')
    def get_awd_total(self, obj):
        return obj.awd_total


@admin.register(InventorySnapshot)
class InventorySnapshotAdmin(admin.ModelAdmin):
    list_display = ['get_product_name', 'snapshot_date', 'fba_available', 'awd_available']
    list_filter = ['snapshot_date']
    search_fields = ['product__name']
    list_select_related = ['product']
    list_per_page = 50
    raw_id_fields = ['product']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')
    
    @admin.display(description='Product')
    def get_product_name(self, obj):
        return obj.product.name if obj.product else '-'


class ShipmentItemInline(admin.TabularInline):
    model = ShipmentItem
    extra = 1
    raw_id_fields = ['product']
    autocomplete_fields = ['product']


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'shipment_type', 'status', 'total_units', 'planned_ship_date', 'get_user_email']
    list_filter = ['status', 'shipment_type']
    search_fields = ['name', 'shipment_id', 'amazon_shipment_id']
    inlines = [ShipmentItemInline]
    list_select_related = ['user']
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'


@admin.register(LabelInventory)
class LabelInventoryAdmin(admin.ModelAdmin):
    list_display = ['get_product_name', 'get_product_asin', 'quantity', 'needs_reorder', 'reorder_point', 'last_updated']
    search_fields = ['product__name', 'product__asin']
    list_filter = ['last_updated']
    list_select_related = ['product']
    list_per_page = 50
    raw_id_fields = ['product']
    ordering = ['-quantity']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')
    
    @admin.display(description='Product')
    def get_product_name(self, obj):
        return obj.product.name if obj.product else '-'
    
    @admin.display(description='ASIN')
    def get_product_asin(self, obj):
        return obj.product.asin if obj.product else '-'
    
    @admin.display(description='Needs Reorder', boolean=True)
    def needs_reorder(self, obj):
        return obj.needs_reorder
