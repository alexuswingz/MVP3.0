from rest_framework import serializers
from .models import Shipment, ShipmentItem, CurrentInventory, InventorySnapshot
from forecast_app.models import Product


class ShipmentItemSerializer(serializers.ModelSerializer):
    """Serializer for shipment items. product_id is read from product.id when outputting (GET); for create/update the parent uses raw dicts."""
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_asin = serializers.CharField(source='product.asin', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_size = serializers.CharField(source='product.size', read_only=True)
    product_image_url = serializers.CharField(source='product.image_url', read_only=True)
    brand_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ShipmentItem
        fields = [
            'id',
            'product_id',
            'product_asin',
            'product_sku',
            'product_name',
            'product_size',
            'product_image_url',
            'brand_name',
            'quantity_planned',
            'quantity_shipped',
            'quantity_received',
            'recommended_quantity',
            'notes',
        ]
        read_only_fields = ['id']
    
    def get_brand_name(self, obj):
        if obj.product and obj.product.brand:
            return obj.product.brand.name
        return None


class ShipmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing shipments"""
    item_count = serializers.SerializerMethodField()
    shipment_type_display = serializers.CharField(source='get_shipment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Shipment
        fields = [
            'id',
            'shipment_id',
            'amazon_shipment_id',
            'amazon_reference_id',
            'name',
            'shipment_type',
            'shipment_type_display',
            'status',
            'status_display',
            'ship_from_name',
            'destination_center',
            'planned_ship_date',
            'actual_ship_date',
            'estimated_arrival',
            'actual_arrival',
            'total_units',
            'received_units',
            'item_count',
            'created_at',
            'updated_at',
        ]
    
    def get_item_count(self, obj):
        return obj.items.count()


class ShipmentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for shipment detail view"""
    items = ShipmentItemSerializer(many=True, read_only=True)
    shipment_type_display = serializers.CharField(source='get_shipment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Shipment
        fields = [
            'id',
            'shipment_id',
            'amazon_shipment_id',
            'amazon_reference_id',
            'name',
            'shipment_type',
            'shipment_type_display',
            'status',
            'status_display',
            'ship_from_name',
            'ship_from_address',
            'destination_center',
            'planned_ship_date',
            'actual_ship_date',
            'estimated_arrival',
            'actual_arrival',
            'total_units',
            'received_units',
            'notes',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_units', 'received_units']


class ShipmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating shipments"""
    items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        default=list
    )
    
    class Meta:
        model = Shipment
        fields = [
            'id',
            'shipment_id',
            'amazon_shipment_id',
            'amazon_reference_id',
            'name',
            'shipment_type',
            'status',
            'ship_from_name',
            'ship_from_address',
            'destination_center',
            'planned_ship_date',
            'actual_ship_date',
            'estimated_arrival',
            'actual_arrival',
            'notes',
            'items',
        ]
        read_only_fields = ['id']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        user = self.context['request'].user
        
        # Create the shipment
        shipment = Shipment.objects.create(user=user, **validated_data)
        
        # Create shipment items
        total_units = 0
        for item_data in items_data:
            product_id = item_data.get('product_id')
            quantity_planned = item_data.get('quantity_planned', 0)
            recommended_quantity = item_data.get('recommended_quantity')
            notes = item_data.get('notes', '')
            
            if product_id:
                try:
                    product = Product.objects.get(id=product_id, user=user)
                    ShipmentItem.objects.create(
                        shipment=shipment,
                        product=product,
                        quantity_planned=quantity_planned,
                        recommended_quantity=recommended_quantity,
                        notes=notes,
                    )
                    total_units += quantity_planned
                except Product.DoesNotExist:
                    pass
        
        # Update total units
        shipment.total_units = total_units
        shipment.save(update_fields=['total_units'])
        
        return shipment
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update shipment fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            user = self.context['request'].user
            
            # Clear existing items and recreate
            instance.items.all().delete()
            
            total_units = 0
            for item_data in items_data:
                product_id = item_data.get('product_id')
                quantity_planned = item_data.get('quantity_planned', 0)
                quantity_shipped = item_data.get('quantity_shipped', 0)
                quantity_received = item_data.get('quantity_received', 0)
                recommended_quantity = item_data.get('recommended_quantity')
                notes = item_data.get('notes', '')
                
                if product_id:
                    try:
                        product = Product.objects.get(id=product_id, user=user)
                        ShipmentItem.objects.create(
                            shipment=instance,
                            product=product,
                            quantity_planned=quantity_planned,
                            quantity_shipped=quantity_shipped,
                            quantity_received=quantity_received,
                            recommended_quantity=recommended_quantity,
                            notes=notes,
                        )
                        total_units += quantity_planned
                    except Product.DoesNotExist:
                        pass
            
            # Update total units
            instance.total_units = total_units
            instance.received_units = sum(
                item.quantity_received for item in instance.items.all()
            )
            instance.save(update_fields=['total_units', 'received_units'])
        
        return instance


class CurrentInventorySerializer(serializers.ModelSerializer):
    """Serializer for current inventory"""
    product_asin = serializers.CharField(source='product.asin', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    fba_total = serializers.IntegerField(read_only=True)
    awd_total = serializers.IntegerField(read_only=True)
    total_inventory = serializers.IntegerField(read_only=True)
    total_available = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = CurrentInventory
        fields = [
            'id',
            'product_asin',
            'product_name',
            'fba_available',
            'fba_reserved',
            'fba_inbound',
            'fba_unfulfillable',
            'fba_total',
            'fba_reserved_customer_order',
            'fba_reserved_fc_transfer',
            'fba_reserved_fc_processing',
            'awd_available',
            'awd_reserved',
            'awd_inbound',
            'awd_outbound_to_fba',
            'awd_total',
            'age_0_to_90',
            'age_91_to_180',
            'age_181_to_270',
            'age_271_to_365',
            'age_365_plus',
            'days_of_supply',
            'total_inventory',
            'total_available',
            'last_synced',
        ]
