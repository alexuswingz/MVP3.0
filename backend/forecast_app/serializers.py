from rest_framework import serializers
from .models import (
    Brand, Product, PackagingType, Bottle, Closure, Formula, 
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


class BottleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for bottle list views"""
    class Meta:
        model = Bottle
        fields = [
            'id', 'name', 'size_oz', 'shape', 'color', 'material',
            'supplier', 'label_size', 'box_size', 'units_per_case',
            'warehouse_inventory', 'supplier_inventory', 'allocated_inventory',
            'max_warehouse_inventory', 'cases_per_pallet', 'is_active'
        ]


class BottleDetailSerializer(serializers.ModelSerializer):
    """Full serializer for bottle detail views"""
    class Meta:
        model = Bottle
        fields = [
            'id', 'name', 'image', 'size_oz', 'shape', 'color',
            'thread_type', 'cap_size', 'material', 'supplier',
            'packaging_part_number', 'description', 'brand',
            # Supplier info
            'lead_time_weeks', 'moq', 'units_per_pallet', 
            'units_per_case', 'cases_per_pallet',
            # Finished goods / Box info
            'box_size', 'box_length_in', 'box_width_in', 'box_height_in',
            'units_per_case_finished', 'units_per_gallon', 'box_weight_lbs',
            'max_boxes_per_pallet', 'single_box_pallet_share',
            'replenishment_strategy', 'packaging_bpm',
            # Product dimensions
            'length_in', 'width_in', 'height_in', 'weight_lbs', 'label_size',
            # Inventory
            'supplier_order_strategy', 'supplier_inventory',
            'warehouse_inventory', 'max_warehouse_inventory',
            # Metadata
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ClosureListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for closure list views"""
    class Meta:
        model = Closure
        fields = [
            'id', 'name', 'category', 'shape', 'color', 'cap_size',
            'material', 'supplier', 'units_per_case', 'cases_per_pallet',
            'warehouse_inventory', 'supplier_inventory', 'allocated_inventory',
            'max_warehouse_inventory', 'is_active'
        ]


class ClosureDetailSerializer(serializers.ModelSerializer):
    """Full serializer for closure detail views"""
    class Meta:
        model = Closure
        fields = [
            'id', 'category', 'name', 'image', 'shape', 'color',
            'thread_type', 'cap_size', 'material', 'supplier',
            'packaging_part_number', 'description', 'brand',
            # Supplier info
            'lead_time_weeks', 'moq', 'units_per_pallet',
            'units_per_case', 'cases_per_pallet',
            # Inventory
            'supplier_order_strategy', 'supplier_inventory',
            'warehouse_inventory', 'allocated_inventory', 'max_warehouse_inventory',
            # Metadata
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ClosureSerializer(serializers.ModelSerializer):
    """Legacy serializer - use ClosureDetailSerializer for new code"""
    class Meta:
        model = Closure
        fields = ['id', 'name', 'category', 'shape', 'cap_size']


class FormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formula
        fields = ['id', 'name', 'npk', 'guaranteed_analysis', 'derived_from', 'filter_type']


class ProductExtendedSerializer(serializers.ModelSerializer):
    packaging_name = serializers.CharField(source='packaging.name', read_only=True, allow_null=True)
    bottle_name = serializers.CharField(source='bottle.name', read_only=True, allow_null=True)
    bottle_label_size = serializers.CharField(source='bottle.label_size', read_only=True, allow_null=True)
    bottle_box_size = serializers.CharField(source='bottle.box_size', read_only=True, allow_null=True)
    closure_name = serializers.CharField(source='closure.name', read_only=True, allow_null=True)
    formula_name = serializers.CharField(source='formula.name', read_only=True, allow_null=True)
    formula_npk = serializers.CharField(source='formula.npk', read_only=True, allow_null=True)
    
    class Meta:
        model = ProductExtended
        fields = [
            'packaging', 'packaging_name', 
            'bottle', 'bottle_name', 'bottle_label_size', 'bottle_box_size',
            'closure', 'closure_name', 
            'formula', 'formula_name', 'formula_npk',
            'label_location', 'label_size', 'price', 
            'case_length', 'case_width', 'case_height', 'case_weight', 'units_per_case',
            'product_title', 'bullets', 'description',
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
    vine_units_enrolled = serializers.IntegerField(
        source='extended.vine_units_enrolled',
        required=False,
        allow_null=True
    )

    class Meta:
        model = Product
        fields = [
            'asin', 'parent_asin', 'sku', 'upc', 'name', 
            'size', 'product_type', 'category', 'status', 
            'launch_date', 'image_url', 'is_hazmat', 'is_active', 'brand',
            'vine_units_enrolled'
        ]
    
    def create(self, validated_data):
        extended_data = validated_data.pop('extended', None)
        validated_data['user'] = self.context['request'].user
        product = super().create(validated_data)
        if extended_data:
            ProductExtended.objects.update_or_create(product=product, defaults=extended_data)
        return product

    def update(self, instance, validated_data):
        extended_data = validated_data.pop('extended', None)
        product = super().update(instance, validated_data)
        if extended_data is not None:
            ext, _ = ProductExtended.objects.get_or_create(product=product)
            for key, value in extended_data.items():
                setattr(ext, key, value)
            ext.save()
        return product


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
