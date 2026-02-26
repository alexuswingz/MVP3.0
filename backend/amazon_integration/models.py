from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import secrets


class AmazonSellerAccount(models.Model):
    """
    Stores connected Amazon seller accounts for multi-tenant SP-API integration.
    Each user can connect multiple Amazon seller accounts.
    """
    MARKETPLACE_CHOICES = [
        ('ATVPDKIKX0DER', 'United States'),
        ('A2EUQ1WTGCTBG2', 'Canada'),
        ('A1AM78C64UM0Y8', 'Mexico'),
        ('A1RKKUPIHCS9HS', 'Spain'),
        ('A1F83G8C2ARO7P', 'United Kingdom'),
        ('A13V1IB3VIYZZH', 'France'),
        ('A1805IZSGTT6HS', 'Netherlands'),
        ('A1PA6795UKMFR9', 'Germany'),
        ('APJ6JRA9NG5V4', 'Italy'),
        ('A2Q3Y263D00KWC', 'Brazil'),
        ('A1VC38T7YXB528', 'Japan'),
        ('AAHKV2X7AFYLW', 'China'),
        ('A39IBJ37TRP1C6', 'Australia'),
        ('A21TJRUUN4KGV', 'India'),
        ('A19VAU5U5O7RUS', 'Singapore'),
        ('A2VIGQ35RCS4UG', 'United Arab Emirates'),
        ('A1C3SOZRARQ6R3', 'Poland'),
        ('ARBP9OOSHTCHU', 'Egypt'),
        ('A33AVAJ2PDY3EV', 'Turkey'),
        ('A17E79C6D8DWNP', 'Saudi Arabia'),
        ('A2NODRKZP88ZB9', 'Sweden'),
        ('AJO27BESJ8LKQ', 'Belgium'),
    ]
    
    SYNC_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('syncing', 'Syncing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='amazon_accounts'
    )
    
    seller_id = models.CharField(max_length=100, db_index=True)
    marketplace_id = models.CharField(max_length=50, choices=MARKETPLACE_CHOICES)
    account_name = models.CharField(max_length=200, blank=True)
    
    refresh_token_encrypted = models.BinaryField()
    access_token_encrypted = models.BinaryField(null=True, blank=True)
    access_token_expires_at = models.DateTimeField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    authorized_at = models.DateTimeField(auto_now_add=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    sync_status = models.CharField(
        max_length=20,
        choices=SYNC_STATUS_CHOICES,
        default='pending'
    )
    sync_error = models.TextField(blank=True)
    
    # Sync progress tracking
    SYNC_STEP_CHOICES = [
        ('idle', 'Idle'),
        ('products', 'Syncing Products'),
        ('inventory', 'Syncing Inventory'),
        ('sales', 'Syncing Sales'),
        ('images', 'Loading Images'),
    ]
    sync_current_step = models.CharField(
        max_length=20,
        choices=SYNC_STEP_CHOICES,
        default='idle'
    )
    sync_products_done = models.BooleanField(default=False)
    sync_inventory_done = models.BooleanField(default=False)
    sync_sales_done = models.BooleanField(default=False)
    sync_images_done = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'amazon_seller_accounts'
        unique_together = ['user', 'seller_id', 'marketplace_id']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['seller_id', 'marketplace_id']),
        ]
    
    def __str__(self):
        name = self.account_name or self.seller_id
        return f"{name} ({self.get_marketplace_id_display()})"
    
    @property
    def marketplace_name(self):
        return dict(self.MARKETPLACE_CHOICES).get(self.marketplace_id, self.marketplace_id)
    
    @property
    def needs_token_refresh(self):
        """Check if access token needs to be refreshed."""
        if not self.access_token_expires_at:
            return True
        return timezone.now() >= self.access_token_expires_at - timedelta(minutes=5)


class OAuthState(models.Model):
    """
    Temporary storage for OAuth state tokens to prevent CSRF attacks.
    States are single-use and expire after 10 minutes.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='oauth_states'
    )
    state = models.CharField(max_length=64, unique=True, db_index=True)
    marketplace_id = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'amazon_oauth_states'
        indexes = [
            models.Index(fields=['state', 'used']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"OAuth State for {self.user.email}"
    
    @classmethod
    def create_for_user(cls, user, marketplace_id):
        """Create a new OAuth state for user authorization."""
        state = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=10)
        return cls.objects.create(
            user=user,
            state=state,
            marketplace_id=marketplace_id,
            expires_at=expires_at
        )
    
    @property
    def is_valid(self):
        """Check if state is still valid (not used and not expired)."""
        return not self.used and timezone.now() < self.expires_at
    
    def mark_used(self):
        """Mark the state as used."""
        self.used = True
        self.save(update_fields=['used'])
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired OAuth states."""
        cls.objects.filter(expires_at__lt=timezone.now()).delete()


class SyncLog(models.Model):
    """
    Log of sync operations for auditing and debugging.
    """
    OPERATION_CHOICES = [
        ('products', 'Product Sync'),
        ('inventory', 'Inventory Sync'),
        ('orders', 'Orders Sync'),
        ('full', 'Full Sync'),
    ]
    
    STATUS_CHOICES = [
        ('started', 'Started'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    amazon_account = models.ForeignKey(
        AmazonSellerAccount,
        on_delete=models.CASCADE,
        related_name='sync_logs'
    )
    operation = models.CharField(max_length=20, choices=OPERATION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='started')
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    records_processed = models.IntegerField(default=0)
    records_created = models.IntegerField(default=0)
    records_updated = models.IntegerField(default=0)
    records_failed = models.IntegerField(default=0)
    
    error_message = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'amazon_sync_logs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['amazon_account', 'operation', 'status']),
            models.Index(fields=['started_at']),
        ]
    
    def __str__(self):
        return f"{self.get_operation_display()} - {self.amazon_account} - {self.status}"
    
    def mark_completed(self, records_created=0, records_updated=0, records_failed=0):
        """Mark sync as completed with stats."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.records_processed = records_created + records_updated + records_failed
        self.records_created = records_created
        self.records_updated = records_updated
        self.records_failed = records_failed
        self.save()
    
    def mark_failed(self, error_message):
        """Mark sync as failed with error."""
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.error_message = error_message
        self.save()
