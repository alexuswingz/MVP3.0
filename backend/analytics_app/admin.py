from django.contrib import admin
from .models import DailySales, WeeklySales, Order, VineClaim, SeasonalityCurve, ProductSeasonality


@admin.register(DailySales)
class DailySalesAdmin(admin.ModelAdmin):
    list_display = ['get_product_name', 'date', 'units_sold', 'revenue', 'orders']
    list_filter = ['date']
    search_fields = ['product__name', 'product__asin']
    date_hierarchy = 'date'
    list_select_related = ['product']
    list_per_page = 50
    raw_id_fields = ['product']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')
    
    @admin.display(description='Product')
    def get_product_name(self, obj):
        return obj.product.name if obj.product else '-'


@admin.register(WeeklySales)
class WeeklySalesAdmin(admin.ModelAdmin):
    list_display = ['get_product_asin', 'get_product_name', 'week_ending', 'units_sold']
    list_filter = ['week_ending']
    search_fields = ['product__name', 'product__asin']
    date_hierarchy = 'week_ending'
    list_select_related = ['product']
    list_per_page = 100
    raw_id_fields = ['product']
    ordering = ['-week_ending', '-units_sold']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')
    
    @admin.display(description='ASIN')
    def get_product_asin(self, obj):
        return obj.product.asin if obj.product else '-'
    
    @admin.display(description='Product')
    def get_product_name(self, obj):
        return obj.product.name[:50] if obj.product else '-'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['amazon_order_id', 'get_product_name', 'units', 'revenue', 'purchase_date']
    list_filter = ['fulfillment_channel', 'purchase_date']
    search_fields = ['amazon_order_id', 'product__name']
    list_select_related = ['product', 'user']
    list_per_page = 50
    raw_id_fields = ['product', 'user']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product', 'user')
    
    @admin.display(description='Product')
    def get_product_name(self, obj):
        return obj.product.name if obj.product else '-'


@admin.register(VineClaim)
class VineClaimAdmin(admin.ModelAdmin):
    list_display = ['get_product_name', 'claim_date', 'units_claimed', 'review_received', 'review_rating']
    list_filter = ['review_received', 'claim_date']
    list_select_related = ['product']
    list_per_page = 50
    raw_id_fields = ['product']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')
    
    @admin.display(description='Product')
    def get_product_name(self, obj):
        return obj.product.name if obj.product else '-'


@admin.register(SeasonalityCurve)
class SeasonalityCurveAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'data_source', 'get_user_email', 'is_active']
    list_filter = ['is_active', 'data_source']
    list_select_related = ['user']
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'


@admin.register(ProductSeasonality)
class ProductSeasonalityAdmin(admin.ModelAdmin):
    list_display = ['get_product_asin', 'week_of_year', 'seasonality_index', 'search_volume', 'seasonality_multiplier']
    list_filter = ['week_of_year']
    search_fields = ['product__name', 'product__asin']
    list_select_related = ['product']
    list_per_page = 100
    raw_id_fields = ['product']
    ordering = ['product', 'week_of_year']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')
    
    @admin.display(description='ASIN')
    def get_product_asin(self, obj):
        return obj.product.asin if obj.product else '-'
