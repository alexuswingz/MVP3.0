import logging
from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView

from .models import AmazonSellerAccount, OAuthState, SyncLog
from .serializers import (
    AmazonSellerAccountSerializer,
    AmazonSellerAccountUpdateSerializer,
    AuthorizationUrlRequestSerializer,
    AuthorizationUrlResponseSerializer,
    OAuthCallbackSerializer,
    SyncLogSerializer,
    TriggerSyncSerializer,
)
from .services.oauth import oauth_service, AmazonOAuthError
from .services.encryption import token_encryption, TokenEncryptionError
from .services.sync_service import DataSyncService, SyncError

logger = logging.getLogger(__name__)


class ConnectSelfAuthorizedView(APIView):
    """
    Connect using self-authorized credentials from environment variables.
    This is for single-seller setups where you have your own refresh token.
    
    POST /api/v1/amazon/connect-self/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Get self-authorized credentials from settings
        refresh_token = settings.AMAZON_SP_API.get('REFRESH_TOKEN', '')
        
        if not refresh_token:
            return Response(
                {'error': 'No self-authorized refresh token configured. Set AMAZON_SP_API_REFRESH_TOKEN in environment.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        marketplace_id = request.data.get('marketplace_id', 'ATVPDKIKX0DER')
        account_name = request.data.get('account_name', 'My Amazon Account')
        
        try:
            # Encrypt the refresh token
            refresh_token_encrypted = token_encryption.encrypt(refresh_token)
            
            # Get an access token to verify credentials and get seller ID
            token_data = oauth_service.refresh_access_token_sync(refresh_token)
            access_token_encrypted = token_encryption.encrypt(token_data['access_token'])
            expires_at = timezone.now() + timezone.timedelta(seconds=token_data['expires_in'])
            
            # Try to get seller ID from SP-API
            from .services.sp_api_client import SPAPIClient
            
            # Create a temporary account object to use the client
            temp_account = AmazonSellerAccount(
                user=request.user,
                seller_id='TEMP',
                marketplace_id=marketplace_id,
                refresh_token_encrypted=refresh_token_encrypted,
                access_token_encrypted=access_token_encrypted,
                access_token_expires_at=expires_at,
            )
            
            client = SPAPIClient(temp_account)
            
            # Get marketplace participations to find seller ID
            try:
                participations = client.get_marketplace_participations()
                seller_id = None
                
                for participation in participations.get('payload', []):
                    marketplace = participation.get('marketplace', {})
                    if marketplace.get('id') == marketplace_id:
                        seller_id = participation.get('sellingPartner', {}).get('id')
                        break
                
                # If we didn't find an exact match, use the first one
                if not seller_id and participations.get('payload'):
                    seller_id = participations['payload'][0].get('sellingPartner', {}).get('id', 'UNKNOWN')
                    
            except Exception as e:
                logger.warning(f"Could not get seller ID from API: {e}")
                seller_id = 'SELF_AUTHORIZED'
            
            # Create or update the account
            account, created = AmazonSellerAccount.objects.update_or_create(
                user=request.user,
                seller_id=seller_id or 'SELF_AUTHORIZED',
                marketplace_id=marketplace_id,
                defaults={
                    'account_name': account_name,
                    'refresh_token_encrypted': refresh_token_encrypted,
                    'access_token_encrypted': access_token_encrypted,
                    'access_token_expires_at': expires_at,
                    'is_active': True,
                    'sync_status': 'pending',
                    'sync_error': '',
                }
            )
            
            action_text = 'created' if created else 'updated'
            logger.info(f"Self-authorized Amazon account {action_text} for user {request.user.id}")
            
            # Auto-trigger initial full sync for new accounts
            initial_sync_started = False
            if created:
                try:
                    account.sync_status = 'syncing'
                    account.save(update_fields=['sync_status'])
                    initial_sync_started = True
                    logger.info(f"Starting initial sync for account {account.id}")
                    
                    # Run sync synchronously (in production, use Celery)
                    sync_service = DataSyncService(account)
                    sync_service.sync_all()
                    
                except Exception as e:
                    logger.error(f"Initial sync failed: {e}")
                    account.sync_status = 'failed'
                    account.sync_error = str(e)[:500]
                    account.save(update_fields=['sync_status', 'sync_error'])
            
            # Refresh account data after sync
            account.refresh_from_db()
            serializer = AmazonSellerAccountSerializer(account)
            
            return Response({
                'message': f'Amazon account {action_text} successfully',
                'account': serializer.data,
                'initial_sync_started': initial_sync_started,
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except AmazonOAuthError as e:
            logger.error(f"Failed to verify credentials: {e}")
            return Response(
                {'error': f'Failed to verify Amazon credentials: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except TokenEncryptionError as e:
            logger.error(f"Token encryption failed: {e}")
            return Response(
                {'error': 'Failed to securely store credentials'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AmazonAuthUrlView(APIView):
    """
    Generate Amazon Seller Central authorization URL.
    
    POST /api/v1/amazon/auth-url/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = AuthorizationUrlRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        marketplace_id = serializer.validated_data['marketplace_id']
        draft_mode = serializer.validated_data.get('draft_mode', False)
        
        try:
            authorization_url, oauth_state = oauth_service.generate_authorization_url(
                user=request.user,
                marketplace_id=marketplace_id,
                draft_mode=draft_mode
            )
            
            response_data = {
                'authorization_url': authorization_url,
                'state': oauth_state.state,
                'expires_in_seconds': 600,
            }
            
            return Response(
                AuthorizationUrlResponseSerializer(response_data).data,
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Failed to generate authorization URL: {e}")
            return Response(
                {'error': 'Failed to generate authorization URL'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AmazonOAuthCallbackView(APIView):
    """
    Handle OAuth callback from Amazon Seller Central.
    
    GET /api/v1/amazon/callback/
    
    This endpoint receives the authorization code from Amazon and exchanges it
    for tokens. After successful authorization, redirects to frontend.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        state = request.query_params.get('state')
        selling_partner_id = request.query_params.get('selling_partner_id')
        spapi_oauth_code = request.query_params.get('spapi_oauth_code')
        
        frontend_url = settings.FRONTEND_URL
        
        if not all([state, selling_partner_id, spapi_oauth_code]):
            error = request.query_params.get('error', 'missing_parameters')
            error_description = request.query_params.get(
                'error_description',
                'Missing required OAuth parameters'
            )
            logger.error(f"OAuth callback error: {error} - {error_description}")
            return redirect(
                f"{frontend_url}/dashboard/settings?amazon_error={error}"
            )
        
        oauth_state = oauth_service.validate_oauth_state(state)
        if not oauth_state:
            logger.error(f"Invalid or expired OAuth state: {state[:8]}...")
            return redirect(
                f"{frontend_url}/dashboard/settings?amazon_error=invalid_state"
            )
        
        try:
            token_data = oauth_service.exchange_code_for_tokens_sync(spapi_oauth_code)
            
            refresh_token_encrypted = token_encryption.encrypt(token_data['refresh_token'])
            access_token_encrypted = token_encryption.encrypt(token_data['access_token'])
            expires_at = timezone.now() + timezone.timedelta(
                seconds=token_data['expires_in']
            )
            
            account, created = AmazonSellerAccount.objects.update_or_create(
                user=oauth_state.user,
                seller_id=selling_partner_id,
                marketplace_id=oauth_state.marketplace_id,
                defaults={
                    'refresh_token_encrypted': refresh_token_encrypted,
                    'access_token_encrypted': access_token_encrypted,
                    'access_token_expires_at': expires_at,
                    'is_active': True,
                    'sync_status': 'syncing',  # Start in syncing state
                    'sync_error': '',
                }
            )
            
            oauth_state.mark_used()
            
            action = 'created' if created else 'updated'
            logger.info(
                f"Amazon account {action} for user {oauth_state.user.id}: "
                f"{selling_partner_id}"
            )
            
            # Start initial full sync in background thread
            # In production, use Celery for better reliability
            import threading
            def run_initial_sync():
                try:
                    sync_service = DataSyncService(account)
                    sync_service.sync_all()
                except Exception as e:
                    logger.error(f"Initial sync failed for account {account.id}: {e}")
                    account.sync_status = 'failed'
                    account.sync_error = str(e)[:500]
                    account.save(update_fields=['sync_status', 'sync_error'])
            
            sync_thread = threading.Thread(target=run_initial_sync, daemon=True)
            sync_thread.start()
            logger.info(f"Started background sync for account {account.id}")
            
            return redirect(
                f"{frontend_url}/dashboard/settings?amazon_connected=true"
                f"&account_id={account.id}&sync_started=true"
            )
            
        except AmazonOAuthError as e:
            logger.error(f"OAuth token exchange failed: {e}")
            return redirect(
                f"{frontend_url}/dashboard/settings?amazon_error=token_exchange_failed"
            )
        except TokenEncryptionError as e:
            logger.error(f"Token encryption failed: {e}")
            return redirect(
                f"{frontend_url}/dashboard/settings?amazon_error=encryption_failed"
            )
        except Exception as e:
            logger.exception(f"Unexpected error during OAuth callback: {e}")
            return redirect(
                f"{frontend_url}/dashboard/settings?amazon_error=unknown_error"
            )


class AmazonSellerAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing connected Amazon seller accounts.
    
    GET /api/v1/amazon/accounts/ - List all connected accounts
    GET /api/v1/amazon/accounts/{id}/ - Get account details
    PATCH /api/v1/amazon/accounts/{id}/ - Update account (name, active status)
    DELETE /api/v1/amazon/accounts/{id}/ - Disconnect account
    POST /api/v1/amazon/accounts/{id}/sync/ - Trigger manual sync
    GET /api/v1/amazon/accounts/{id}/logs/ - Get sync logs
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AmazonSellerAccount.objects.filter(
            user=self.request.user
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AmazonSellerAccountUpdateSerializer
        return AmazonSellerAccountSerializer
    
    def perform_destroy(self, instance):
        """Soft delete - just mark as inactive and clear tokens."""
        instance.is_active = False
        instance.refresh_token_encrypted = b''
        instance.access_token_encrypted = None
        instance.access_token_expires_at = None
        instance.save()
        
        logger.info(
            f"Amazon account disconnected: {instance.seller_id} "
            f"for user {self.request.user.id}"
        )
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Trigger a manual sync for the account."""
        account = self.get_object()
        
        if not account.is_active:
            return Response(
                {'error': 'Account is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TriggerSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        operation = serializer.validated_data['operation']
        
        try:
            sync_service = DataSyncService(account)
            
            if operation == 'full':
                sync_log = sync_service.sync_all()
            elif operation == 'products':
                sync_log = sync_service.sync_products()
            elif operation == 'inventory':
                sync_log = sync_service.sync_inventory()
            elif operation == 'orders':
                sync_log = sync_service.sync_orders()
            elif operation == 'sales':
                # Quick sync: 30-day velocity from Restock Report (~1 min)
                sync_log = sync_service.sync_sales(use_historical=False)
            elif operation == 'sales_full':
                # Full sync: Sales API per ASIN (~10 min per 1000 products)
                sync_log = sync_service.sync_sales(days_back=365, use_historical=True)
            else:
                return Response(
                    {'error': f'Unknown operation: {operation}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                'message': f'Sync completed for {operation}',
                'sync_log_id': sync_log.id,
                'status': sync_log.status,
                'records_processed': sync_log.records_processed,
                'records_created': sync_log.records_created,
                'records_updated': sync_log.records_updated,
                'records_failed': sync_log.records_failed,
            })
            
        except SyncError as e:
            logger.error(f"Sync failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.exception(f"Unexpected error during sync: {e}")
            return Response(
                {'error': 'An unexpected error occurred during sync'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Get sync logs for the account."""
        account = self.get_object()
        logs = SyncLog.objects.filter(
            amazon_account=account
        ).order_by('-started_at')[:20]
        
        serializer = SyncLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def sync_status(self, request, pk=None):
        """
        Get real-time sync status for polling from frontend.
        
        Returns current sync step and completion status for each step.
        """
        account = self.get_object()
        
        return Response({
            'sync_status': account.sync_status,
            'sync_error': account.sync_error,
            'current_step': account.sync_current_step,
            'steps': {
                'products': account.sync_products_done,
                'inventory': account.sync_inventory_done,
                'sales': account.sync_sales_done,
                'images': account.sync_images_done,
            },
            'last_sync_at': account.last_sync_at,
        })
    
    @action(detail=False, methods=['get'])
    def marketplaces(self, request):
        """Get list of supported marketplaces."""
        marketplaces = [
            {'id': mp_id, 'name': mp_name}
            for mp_id, mp_name in AmazonSellerAccount.MARKETPLACE_CHOICES
        ]
        return Response(marketplaces)
