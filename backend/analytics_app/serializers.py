from rest_framework import serializers
from .models import VineClaim
from forecast_app.models import Product


class VineClaimSerializer(serializers.ModelSerializer):
    """Serializer for VineClaim CRUD. Includes product details for list/detail."""
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.none(), write_only=True, required=True
    )
    product_asin = serializers.CharField(source='product.asin', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    brand_name = serializers.CharField(source='product.brand.name', read_only=True, allow_null=True)

    class Meta:
        model = VineClaim
        fields = [
            'id',
            'product',
            'product_id',
            'product_asin',
            'product_name',
            'product_sku',
            'brand_name',
            'claim_date',
            'units_claimed',
            'review_received',
            'review_date',
            'review_rating',
            'notes',
        ]
        read_only_fields = ['id', 'product']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'request' in self.context:
            user = self.context['request'].user
            self.fields['product_id'].queryset = Product.objects.filter(user=user)

    def create(self, validated_data):
        product = validated_data.pop('product_id')
        validated_data['product'] = product
        return super().create(validated_data)
