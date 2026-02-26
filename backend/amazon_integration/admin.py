from django.contrib import admin
from .models import AmazonSellerAccount, OAuthState, SyncLog


@admin.register(AmazonSellerAccount)
class AmazonSellerAccountAdmin(admin.ModelAdmin):
    list_display = [
        'account_name', 'seller_id', 'marketplace_name', 'user',
        'is_active', 'sync_status', 'last_sync_at', 'authorized_at'
    ]
    list_filter = ['is_active', 'sync_status', 'marketplace_id']
    search_fields = ['account_name', 'seller_id', 'user__email']
    readonly_fields = [
        'authorized_at', 'created_at', 'updated_at',
        'refresh_token_encrypted', 'access_token_encrypted'
    ]
    
    fieldsets = (
        ('Account Information', {
            'fields': ('user', 'seller_id', 'marketplace_id', 'account_name')
        }),
        ('Status', {
            'fields': ('is_active', 'sync_status', 'sync_error', 'last_sync_at')
        }),
        ('Timestamps', {
            'fields': ('authorized_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(OAuthState)
class OAuthStateAdmin(admin.ModelAdmin):
    list_display = ['user', 'marketplace_id', 'used', 'created_at', 'expires_at']
    list_filter = ['used', 'marketplace_id']
    search_fields = ['user__email', 'state']
    readonly_fields = ['state', 'created_at']


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = [
        'amazon_account', 'operation', 'status',
        'records_processed', 'started_at', 'completed_at'
    ]
    list_filter = ['operation', 'status', 'amazon_account']
    search_fields = ['amazon_account__seller_id', 'amazon_account__account_name']
    readonly_fields = ['started_at', 'completed_at']
    
    fieldsets = (
        ('Sync Info', {
            'fields': ('amazon_account', 'operation', 'status')
        }),
        ('Statistics', {
            'fields': (
                'records_processed', 'records_created',
                'records_updated', 'records_failed'
            )
        }),
        ('Details', {
            'fields': ('error_message', 'details'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('started_at', 'completed_at'),
        }),
    )
