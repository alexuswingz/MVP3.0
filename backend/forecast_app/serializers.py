from rest_framework import serializers
from .models import (
    Brand, Product, PackagingType, Closure, Formula, 
    ProductExtended, CustomFieldDefinition, CustomFieldValue,
    DOISettings, ForecastCache
)


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'seller_account', 'marketplace', 'country', 'is_active']
        read_only_fields = ['id']


class PackagingTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagingType
        fields = ['id', 'name', 'packaging_type', 'size', 'label_size', 'case_size', 'units_per_case']


class ClosureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Closure
        fields = ['id', 'name', 'closure_type']


class FormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formula
        fields = ['id', 'name', 'npk', 'guaranteed_analysis', 'derived_from', 'filter_type']


class ProductExtendedSerializer(serializers.ModelSerializer):
    packaging_name = serializers.CharField(source='packaging.name', read_only=True, allow_null=True)
    closure_name = serializers.CharField(source='closure.name', read_only=True, allow_null=True)
    formula_name = serializers.CharField(source='formula.name', read_only=True, allow_null=True)
    formula_npk = serializers.CharField(source='formula.npk', read_only=True, allow_null=True)
    
    class Meta:
        model = ProductExtended
        fields = [
            'packaging', 'packaging_name', 'closure', 'closure_name', 
            'formula', 'formula_name', 'formula_npk',
            'label_location', 'price', 'product_title', 'bullets', 'description',
            'core_competitor_asins', 'core_keywords', 'notes',
            'vine_launch_date', 'vine_units_enrolled', 'vine_reviews', 'star_rating'
        ]


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    brand_name = serializers.CharField(source='brand.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'asin', 'parent_asin', 'sku', 'upc', 'name', 
            'size', 'product_type', 'category', 'status', 
            'launch_date', 'image_url', 'is_hazmat', 'is_active',
            'brand', 'brand_name', 'created_at', 'updated_at'
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer with extended fields"""
    brand_name = serializers.CharField(source='brand.name', read_only=True, allow_null=True)
    extended = ProductExtendedSerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'asin', 'parent_asin', 'sku', 'upc', 'name', 
            'size', 'product_type', 'category', 'status', 
            'launch_date', 'image_url', 'is_hazmat', 'is_active',
            'brand', 'brand_name', 'extended', 'created_at', 'updated_at'
        ]


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'asin', 'parent_asin', 'sku', 'upc', 'name', 
            'size', 'product_type', 'category', 'status', 
            'launch_date', 'image_url', 'is_hazmat', 'is_active', 'brand'
        ]
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class DOISettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DOISettings
        fields = [
            'id', 'name', 'amazon_doi_goal', 'inbound_lead_time', 
            'manufacture_lead_time', 'market_adjustment', 'velocity_weight',
            'is_default', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ForecastCacheSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_asin = serializers.CharField(source='product.asin', read_only=True)
    
    class Meta:
        model = ForecastCache
        fields = [
            'id', 'product', 'product_name', 'product_asin',
            'algorithm_version', 'forecast_date', 'units_to_make',
            'current_doi', 'runout_date', 'cumulative_data', 'status',
            'calculation_time', 'created_at'
        ]
