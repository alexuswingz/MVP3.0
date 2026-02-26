"""
Amazon Login with Amazon (LWA) OAuth Service

Handles the OAuth 2.0 flow for Amazon SP-API authorization:
1. Generate authorization URL for seller consent
2. Exchange authorization code for tokens
3. Refresh access tokens
"""

import logging
import httpx
from typing import Optional, Tuple
from urllib.parse import urlencode
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from ..models import OAuthState, AmazonSellerAccount

logger = logging.getLogger(__name__)


class AmazonOAuthError(Exception):
    """Custom exception for Amazon OAuth errors."""
    pass


class AmazonOAuthService:
    """Service for handling Amazon LWA OAuth operations."""
    
    MARKETPLACE_REGIONS = {
        'ATVPDKIKX0DER': 'NA',  # US
        'A2EUQ1WTGCTBG2': 'NA',  # Canada
        'A1AM78C64UM0Y8': 'NA',  # Mexico
        'A2Q3Y263D00KWC': 'NA',  # Brazil
        'A1RKKUPIHCS9HS': 'EU',  # Spain
        'A1F83G8C2ARO7P': 'EU',  # UK
        'A13V1IB3VIYZZH': 'EU',  # France
        'A1805IZSGTT6HS': 'EU',  # Netherlands
        'A1PA6795UKMFR9': 'EU',  # Germany
        'APJ6JRA9NG5V4': 'EU',   # Italy
        'A1C3SOZRARQ6R3': 'EU',  # Poland
        'A2NODRKZP88ZB9': 'EU',  # Sweden
        'AJO27BESJ8LKQ': 'EU',   # Belgium
        'ARBP9OOSHTCHU': 'EU',   # Egypt
        'A33AVAJ2PDY3EV': 'EU',  # Turkey
        'A17E79C6D8DWNP': 'EU',  # Saudi Arabia
        'A2VIGQ35RCS4UG': 'EU',  # UAE
        'A1VC38T7YXB528': 'FE',  # Japan
        'AAHKV2X7AFYLW': 'FE',   # China
        'A39IBJ37TRP1C6': 'FE',  # Australia
        'A21TJRUUN4KGV': 'FE',   # India
        'A19VAU5U5O7RUS': 'FE',  # Singapore
    }
    
    def __init__(self):
        self.client_id = settings.AMAZON_SP_API['CLIENT_ID']
        self.client_secret = settings.AMAZON_SP_API['CLIENT_SECRET']
        self.app_id = settings.AMAZON_SP_API['APP_ID']
        self.redirect_uri = settings.AMAZON_SP_API['REDIRECT_URI']
        self.lwa_token_url = settings.AMAZON_SP_API['LWA_TOKEN_URL']
        self.seller_central_urls = settings.AMAZON_SP_API['SELLER_CENTRAL_URLS']
    
    def get_region_for_marketplace(self, marketplace_id: str) -> str:
        """Get the region code for a marketplace ID."""
        return self.MARKETPLACE_REGIONS.get(marketplace_id, 'NA')
    
    def get_seller_central_url(self, marketplace_id: str) -> str:
        """Get the Seller Central URL for a marketplace."""
        region = self.get_region_for_marketplace(marketplace_id)
        return self.seller_central_urls.get(region, self.seller_central_urls['NA'])
    
    def generate_authorization_url(
        self,
        user,
        marketplace_id: str = 'ATVPDKIKX0DER',
        draft_mode: bool = False
    ) -> Tuple[str, OAuthState]:
        """
        Generate the Amazon Seller Central authorization URL.
        
        Args:
            user: The user initiating the authorization
            marketplace_id: The target marketplace ID
            draft_mode: Whether to use beta/draft mode for testing
            
        Returns:
            Tuple of (authorization_url, oauth_state)
        """
        oauth_state = OAuthState.create_for_user(user, marketplace_id)
        
        seller_central_url = self.get_seller_central_url(marketplace_id)
        
        params = {
            'application_id': self.app_id,
            'state': oauth_state.state,
        }
        
        if draft_mode:
            params['version'] = 'beta'
        
        authorization_url = (
            f"{seller_central_url}/apps/authorize/consent?"
            f"{urlencode(params)}"
        )
        
        logger.info(
            f"Generated authorization URL for user {user.id}, "
            f"marketplace {marketplace_id}"
        )
        
        return authorization_url, oauth_state
    
    async def exchange_code_for_tokens(
        self,
        authorization_code: str
    ) -> dict:
        """
        Exchange an authorization code for access and refresh tokens.
        
        Args:
            authorization_code: The spapi_oauth_code from Amazon callback
            
        Returns:
            Dict with access_token, refresh_token, expires_in
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.lwa_token_url,
                    data={
                        'grant_type': 'authorization_code',
                        'code': authorization_code,
                        'redirect_uri': self.redirect_uri,
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                    },
                    headers={
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get('error_description', response.text)
                    logger.error(f"Token exchange failed: {error_msg}")
                    raise AmazonOAuthError(f"Token exchange failed: {error_msg}")
                
                token_data = response.json()
                
                logger.info("Successfully exchanged authorization code for tokens")
                
                return {
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data['refresh_token'],
                    'expires_in': token_data.get('expires_in', 3600),
                    'token_type': token_data.get('token_type', 'bearer'),
                }
                
            except httpx.RequestError as e:
                logger.error(f"HTTP error during token exchange: {e}")
                raise AmazonOAuthError(f"Network error during token exchange: {e}")
    
    def exchange_code_for_tokens_sync(
        self,
        authorization_code: str
    ) -> dict:
        """
        Synchronous version of token exchange.
        
        Args:
            authorization_code: The spapi_oauth_code from Amazon callback
            
        Returns:
            Dict with access_token, refresh_token, expires_in
        """
        try:
            response = httpx.post(
                self.lwa_token_url,
                data={
                    'grant_type': 'authorization_code',
                    'code': authorization_code,
                    'redirect_uri': self.redirect_uri,
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                },
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                error_data = response.json()
                error_msg = error_data.get('error_description', response.text)
                logger.error(f"Token exchange failed: {error_msg}")
                raise AmazonOAuthError(f"Token exchange failed: {error_msg}")
            
            token_data = response.json()
            
            logger.info("Successfully exchanged authorization code for tokens")
            
            return {
                'access_token': token_data['access_token'],
                'refresh_token': token_data['refresh_token'],
                'expires_in': token_data.get('expires_in', 3600),
                'token_type': token_data.get('token_type', 'bearer'),
            }
            
        except httpx.RequestError as e:
            logger.error(f"HTTP error during token exchange: {e}")
            raise AmazonOAuthError(f"Network error during token exchange: {e}")
    
    async def refresh_access_token(
        self,
        refresh_token: str
    ) -> dict:
        """
        Refresh an access token using a refresh token.
        
        Args:
            refresh_token: The stored refresh token
            
        Returns:
            Dict with new access_token and expires_in
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.lwa_token_url,
                    data={
                        'grant_type': 'refresh_token',
                        'refresh_token': refresh_token,
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                    },
                    headers={
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get('error_description', response.text)
                    logger.error(f"Token refresh failed: {error_msg}")
                    raise AmazonOAuthError(f"Token refresh failed: {error_msg}")
                
                token_data = response.json()
                
                return {
                    'access_token': token_data['access_token'],
                    'expires_in': token_data.get('expires_in', 3600),
                    'token_type': token_data.get('token_type', 'bearer'),
                }
                
            except httpx.RequestError as e:
                logger.error(f"HTTP error during token refresh: {e}")
                raise AmazonOAuthError(f"Network error during token refresh: {e}")
    
    def refresh_access_token_sync(
        self,
        refresh_token: str
    ) -> dict:
        """
        Synchronous version of token refresh.
        
        Args:
            refresh_token: The stored refresh token
            
        Returns:
            Dict with new access_token and expires_in
        """
        try:
            response = httpx.post(
                self.lwa_token_url,
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                },
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                error_data = response.json()
                error_msg = error_data.get('error_description', response.text)
                logger.error(f"Token refresh failed: {error_msg}")
                raise AmazonOAuthError(f"Token refresh failed: {error_msg}")
            
            token_data = response.json()
            
            return {
                'access_token': token_data['access_token'],
                'expires_in': token_data.get('expires_in', 3600),
                'token_type': token_data.get('token_type', 'bearer'),
            }
            
        except httpx.RequestError as e:
            logger.error(f"HTTP error during token refresh: {e}")
            raise AmazonOAuthError(f"Network error during token refresh: {e}")
    
    def validate_oauth_state(
        self,
        state: str,
        user=None
    ) -> Optional[OAuthState]:
        """
        Validate an OAuth state token.
        
        Args:
            state: The state token from callback
            user: Optional user to verify ownership
            
        Returns:
            OAuthState if valid, None otherwise
        """
        try:
            oauth_state = OAuthState.objects.get(state=state)
            
            if not oauth_state.is_valid:
                logger.warning(f"OAuth state {state[:8]}... is invalid or expired")
                return None
            
            if user and oauth_state.user_id != user.id:
                logger.warning(f"OAuth state user mismatch")
                return None
            
            return oauth_state
            
        except OAuthState.DoesNotExist:
            logger.warning(f"OAuth state {state[:8]}... not found")
            return None


oauth_service = AmazonOAuthService()
