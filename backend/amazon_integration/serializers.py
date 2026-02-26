from rest_framework import serializers
from .models import AmazonSellerAccount, SyncLog


class AmazonSellerAccountSerializer(serializers.ModelSerializer):
    """Serializer for Amazon seller account list/detail views."""
    
    marketplace_name = serializers.CharField(read_only=True)
    needs_token_refresh = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = AmazonSellerAccount
        fields = [
            'id',
            'seller_id',
            'marketplace_id',
            'marketplace_name',
            'account_name',
            'is_active',
            'authorized_at',
            'last_sync_at',
            'sync_status',
            'sync_error',
            'sync_current_step',
            'sync_products_done',
            'sync_inventory_done',
            'sync_sales_done',
            'sync_images_done',
            'needs_token_refresh',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'seller_id', 'marketplace_id', 'authorized_at',
            'last_sync_at', 'sync_status', 'sync_error', 
            'sync_current_step', 'sync_products_done', 'sync_inventory_done',
            'sync_sales_done', 'sync_images_done',
            'created_at', 'updated_at'
        ]


class AmazonSellerAccountUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating Amazon seller account."""
    
    class Meta:
        model = AmazonSellerAccount
        fields = ['account_name', 'is_active']


class AuthorizationUrlRequestSerializer(serializers.Serializer):
    """Serializer for authorization URL request."""
    
    marketplace_id = serializers.ChoiceField(
        choices=AmazonSellerAccount.MARKETPLACE_CHOICES,
        default='ATVPDKIKX0DER'
    )
    draft_mode = serializers.BooleanField(default=False, required=False)


class AuthorizationUrlResponseSerializer(serializers.Serializer):
    """Serializer for authorization URL response."""
    
    authorization_url = serializers.URLField()
    state = serializers.CharField()
    expires_in_seconds = serializers.IntegerField()


class OAuthCallbackSerializer(serializers.Serializer):
    """Serializer for OAuth callback parameters."""
    
    state = serializers.CharField(required=True)
    selling_partner_id = serializers.CharField(required=True)
    spapi_oauth_code = serializers.CharField(required=True)


class SyncLogSerializer(serializers.ModelSerializer):
    """Serializer for sync log entries."""
    
    class Meta:
        model = SyncLog
        fields = [
            'id',
            'operation',
            'status',
            'started_at',
            'completed_at',
            'records_processed',
            'records_created',
            'records_updated',
            'records_failed',
            'error_message',
        ]
        read_only_fields = fields


class TriggerSyncSerializer(serializers.Serializer):
    """Serializer for triggering a sync operation."""
    
    operation = serializers.ChoiceField(
        choices=['products', 'inventory', 'orders', 'sales', 'sales_full', 'full'],
        default='full',
        help_text="'sales' = quick 30-day sync (~1 min), 'sales_full' = complete history (~10 min per 1000 products)"
    )
