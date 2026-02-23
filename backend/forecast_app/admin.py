from django.contrib import admin
from .models import (
    Brand, Product, CustomFieldDefinition, CustomFieldValue,
    PackagingType, Closure, Formula, ProductExtended,
    DOISettings, ForecastCache
)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'seller_account', 'marketplace', 'user', 'is_active']
    list_filter = ['marketplace', 'is_active']
    search_fields = ['name', 'seller_account']
    list_select_related = ['user']
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


class ProductExtendedInline(admin.StackedInline):
    model = ProductExtended
    can_delete = False
    verbose_name_plural = 'Extended Fields (TPS)'
    autocomplete_fields = ['packaging', 'closure', 'formula', 'formula_2']
    fieldsets = (
        ('Packaging / Formula', {
            'fields': ('packaging', 'closure', 'formula', 'formula_2', 'label_location')
        }),
        ('Case Dimensions (for Pallet Calculator)', {
            'fields': ('case_length', 'case_width', 'case_height', 'case_weight', 'units_per_case'),
            'description': 'Dimensions in inches, weight in lbs. Used for calculating pallet counts.'
        }),
        ('Pricing & Listing', {
            'fields': ('price', 'product_title', 'bullets', 'description')
        }),
        ('Vine', {
            'fields': ('vine_launch_date', 'vine_units_enrolled', 'vine_reviews', 'star_rating')
        }),
        ('Other', {
            'fields': ('expiration_date', 'core_competitor_asins', 'core_keywords', 'notes')
        }),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'asin', 'sku', 'get_brand_name', 'status', 'get_user_email']
    list_filter = ['status', 'is_active', 'is_hazmat']
    search_fields = ['name', 'asin', 'sku', 'upc']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [ProductExtendedInline]
    list_select_related = ['user', 'brand']
    list_per_page = 50
    autocomplete_fields = ['user', 'brand']
    raw_id_fields = ['user', 'brand']
    
    fieldsets = (
        ('Core', {'fields': ('user', 'brand', 'name', 'status')}),
        ('Identifiers', {'fields': ('asin', 'parent_asin', 'sku', 'upc')}),
        ('Details', {'fields': ('size', 'product_type', 'category', 'is_hazmat')}),
        ('Dates', {'fields': ('launch_date', 'created_at', 'updated_at')}),
        ('Media', {'fields': ('image_url',)}),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'brand')
    
    @admin.display(description='Brand')
    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else '-'
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'


@admin.register(CustomFieldDefinition)
class CustomFieldDefinitionAdmin(admin.ModelAdmin):
    list_display = ['name', 'field_key', 'field_type', 'get_user_email', 'is_required', 'is_active']
    list_filter = ['field_type', 'is_active']
    search_fields = ['name', 'field_key']
    list_select_related = ['user']
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'


@admin.register(PackagingType)
class PackagingTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'packaging_type', 'size', 'units_per_case', 'get_user_email']
    list_filter = ['packaging_type', 'is_active']
    search_fields = ['name']
    list_select_related = ['user']
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'


@admin.register(Closure)
class ClosureAdmin(admin.ModelAdmin):
    list_display = ['name', 'closure_type', 'get_user_email']
    search_fields = ['name']
    list_select_related = ['user']
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'


@admin.register(Formula)
class FormulaAdmin(admin.ModelAdmin):
    list_display = ['name', 'npk', 'filter_type', 'get_user_email']
    search_fields = ['name', 'npk']
    list_select_related = ['user']
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'


@admin.register(DOISettings)
class DOISettingsAdmin(admin.ModelAdmin):
    list_display = ['get_user_email', 'name', 'amazon_doi_goal', 'inbound_lead_time', 'is_default']
    list_filter = ['is_default']
    list_select_related = ['user']
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'


@admin.register(ForecastCache)
class ForecastCacheAdmin(admin.ModelAdmin):
    list_display = ['get_product_name', 'forecast_date', 'units_to_make', 'current_doi', 'status']
    list_filter = ['status', 'forecast_date']
    search_fields = ['product__name', 'product__asin']
    list_select_related = ['product', 'product__user']
    list_per_page = 50
    raw_id_fields = ['product']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product', 'product__user')
    
    @admin.display(description='Product')
    def get_product_name(self, obj):
        return obj.product.name if obj.product else '-'
