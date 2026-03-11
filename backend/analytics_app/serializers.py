from django.db.models import Sum
from rest_framework import serializers
from .models import VineClaim, ActionItem
from forecast_app.models import Product


class VineClaimSerializer(serializers.ModelSerializer):
    """Serializer for VineClaim CRUD. Includes product details for list/detail."""
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.none(), write_only=True, required=True
    )
    product_asin = serializers.CharField(source='product.asin', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_size = serializers.CharField(source='product.size', read_only=True, allow_blank=True)
    brand_name = serializers.CharField(source='product.brand.name', read_only=True, allow_null=True)
    product_launch_date = serializers.DateField(source='product.launch_date', read_only=True, format='%Y-%m-%d')
    product_vine_units_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = VineClaim
        fields = [
            'id',
            'product',
            'product_id',
            'product_asin',
            'product_name',
            'product_sku',
            'product_size',
            'brand_name',
            'product_launch_date',
            'product_vine_units_enrolled',
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

    def get_product_vine_units_enrolled(self, obj):
        try:
            return obj.product.extended.vine_units_enrolled
        except Exception:
            return None

    def validate(self, attrs):
        """
        Enforce: total claimed units must not exceed units enrolled (ProductExtended.vine_units_enrolled).
        - If enrolled is null/0, disallow any units_claimed > 0.
        """
        instance = getattr(self, 'instance', None)

        # Resolve product for create/update
        if instance is not None:
            product = instance.product
        else:
            product = attrs.get('product_id')

        if product is None:
            return attrs

        # Enrolled units
        try:
            enrolled = product.extended.vine_units_enrolled
        except Exception:
            enrolled = None
        enrolled_val = int(enrolled or 0)

        # Units for this claim
        units = attrs.get('units_claimed')
        if units is None and instance is not None:
            units = instance.units_claimed
        units_val = int(units or 0)

        # Sum other claims
        qs = VineClaim.objects.filter(product=product)
        if instance is not None and instance.pk:
            qs = qs.exclude(pk=instance.pk)
        other_total = int(qs.aggregate(total=Sum('units_claimed'))['total'] or 0)
        attempted_total = other_total + units_val

        if enrolled_val <= 0 and units_val > 0:
            raise serializers.ValidationError(
                {'units_claimed': 'Set enrolled units first (cannot claim units when enrolled is 0).'}
            )

        if enrolled_val > 0 and attempted_total > enrolled_val:
            raise serializers.ValidationError(
                {'units_claimed': f'Claimed units cannot exceed enrolled units ({attempted_total} > {enrolled_val}).'}
            )

        return attrs


class ActionItemSerializer(serializers.ModelSerializer):
    """Serializer for ActionItem CRUD, aligned with the Action Items UI."""

    product_id = serializers.PrimaryKeyRelatedField(
        source='product',
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    product_asin = serializers.CharField(source='product.asin', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_brand = serializers.CharField(
        source='product.brand.name', read_only=True, allow_null=True
    )
    product_size = serializers.CharField(
        source='product.size', read_only=True, allow_blank=True
    )

    class Meta:
        model = ActionItem
        fields = [
            'id',
            'user',
            'product',
            'product_id',
            'product_asin',
            'product_name',
            'product_brand',
            'product_size',
            'status',
            'category',
            'category_sub_info',
            'subject',
            'description_html',
            'description',
            'instructions',
            'bullets',
            'assignee_name',
            'assignee_initials',
            'created_by_name',
            'created_by_initials',
            'due_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'product', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and not validated_data.get('user'):
            validated_data['user'] = request.user
        return super().create(validated_data)
