"""
Amazon Selling Partner API Client

Wrapper for making authenticated calls to Amazon SP-API endpoints.
Handles token refresh, rate limiting, and common API operations.
"""

import logging
import time
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Optional, Dict, List, Any
from urllib.parse import urljoin
import httpx
from django.conf import settings
from django.utils import timezone

from ..models import AmazonSellerAccount
from .encryption import token_encryption, TokenEncryptionError
from .oauth import oauth_service, AmazonOAuthError

logger = logging.getLogger(__name__)


class SPAPIError(Exception):
    """Custom exception for SP-API errors."""
    
    def __init__(self, message: str, status_code: int = None, error_code: str = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)


class SPAPIClient:
    """
    Client for interacting with Amazon Selling Partner API.
    
    Handles:
    - Token management (refresh when expired)
    - Request signing
    - Rate limiting
    - Error handling
    """
    
    MARKETPLACE_ENDPOINTS = {
        'NA': 'https://sellingpartnerapi-na.amazon.com',
        'EU': 'https://sellingpartnerapi-eu.amazon.com',
        'FE': 'https://sellingpartnerapi-fe.amazon.com',
    }
    
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
        'A1VC38T7YXB528': 'FE',  # Japan
        'AAHKV2X7AFYLW': 'FE',   # China
        'A39IBJ37TRP1C6': 'FE',  # Australia
        'A21TJRUUN4KGV': 'FE',   # India
        'A19VAU5U5O7RUS': 'FE',  # Singapore
    }
    
    def __init__(self, amazon_account: AmazonSellerAccount):
        """
        Initialize SP-API client for a specific Amazon seller account.
        
        Args:
            amazon_account: The AmazonSellerAccount instance
        """
        self.account = amazon_account
        self.marketplace_id = amazon_account.marketplace_id
        self.region = self.MARKETPLACE_REGIONS.get(self.marketplace_id, 'NA')
        self.base_url = self.MARKETPLACE_ENDPOINTS[self.region]
        self._access_token = None
    
    def _get_access_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        if self.account.needs_token_refresh:
            self._refresh_token()
        
        if self.account.access_token_encrypted:
            try:
                return token_encryption.decrypt(self.account.access_token_encrypted)
            except TokenEncryptionError as e:
                logger.error(f"Failed to decrypt access token: {e}")
                self._refresh_token()
                return token_encryption.decrypt(self.account.access_token_encrypted)
        else:
            self._refresh_token()
            return token_encryption.decrypt(self.account.access_token_encrypted)
    
    def _refresh_token(self):
        """Refresh the access token using the refresh token."""
        try:
            refresh_token = token_encryption.decrypt(
                self.account.refresh_token_encrypted
            )
            
            token_data = oauth_service.refresh_access_token_sync(refresh_token)
            
            self.account.access_token_encrypted = token_encryption.encrypt(
                token_data['access_token']
            )
            self.account.access_token_expires_at = timezone.now() + timedelta(
                seconds=token_data['expires_in']
            )
            self.account.save(update_fields=[
                'access_token_encrypted',
                'access_token_expires_at'
            ])
            
            logger.info(f"Refreshed access token for account {self.account.seller_id}")
            
        except (TokenEncryptionError, AmazonOAuthError) as e:
            logger.error(f"Failed to refresh token: {e}")
            raise SPAPIError(f"Token refresh failed: {e}")
    
    def _make_request(
        self,
        method: str,
        path: str,
        params: Dict = None,
        data: Dict = None,
        timeout: float = 30.0
    ) -> Dict:
        """
        Make an authenticated request to SP-API.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            path: API endpoint path
            params: Query parameters
            data: Request body data
            timeout: Request timeout in seconds
            
        Returns:
            Response JSON data
        """
        access_token = self._get_access_token()
        url = urljoin(self.base_url, path)
        
        headers = {
            'x-amz-access-token': access_token,
            'Content-Type': 'application/json',
        }
        
        try:
            response = httpx.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data,
                timeout=timeout
            )
            
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 1))
                logger.warning(f"Rate limited. Retry after {retry_after}s")
                time.sleep(retry_after)
                return self._make_request(method, path, params, data, timeout)
            
            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get('errors', [{}])[0].get(
                    'message',
                    response.text
                )
                raise SPAPIError(
                    error_msg,
                    status_code=response.status_code,
                    error_code=error_data.get('errors', [{}])[0].get('code')
                )
            
            return response.json() if response.content else {}
            
        except httpx.RequestError as e:
            logger.error(f"HTTP error during SP-API request: {e}")
            raise SPAPIError(f"Network error: {e}")
    
    # ==================== Catalog API ====================
    
    def get_catalog_item(self, asin: str) -> Dict:
        """
        Get catalog item details by ASIN.
        
        API: GET /catalog/2022-04-01/items/{asin}
        """
        params = {
            'marketplaceIds': self.marketplace_id,
            'includedData': 'attributes,images,productTypes,salesRanks,summaries',
        }
        return self._make_request(
            'GET',
            f'/catalog/2022-04-01/items/{asin}',
            params=params
        )
    
    def search_catalog_items(
        self,
        keywords: str = None,
        identifiers: List[str] = None,
        identifier_type: str = 'ASIN',
        page_size: int = 20
    ) -> Dict:
        """
        Search catalog items.
        
        API: GET /catalog/2022-04-01/items
        """
        params = {
            'marketplaceIds': self.marketplace_id,
            'includedData': 'attributes,images,summaries',
            'pageSize': page_size,
        }
        
        if keywords:
            params['keywords'] = keywords
        if identifiers:
            params['identifiers'] = ','.join(identifiers)
            params['identifiersType'] = identifier_type
        
        return self._make_request('GET', '/catalog/2022-04-01/items', params=params)
    
    # ==================== Inventory API ====================
    
    def get_fba_inventory_summaries(
        self,
        next_token: str = None,
        start_date: datetime = None
    ) -> Dict:
        """
        Get FBA inventory summaries.
        
        API: GET /fba/inventory/v1/summaries
        """
        params = {
            'marketplaceIds': self.marketplace_id,
            'granularityType': 'Marketplace',
            'granularityId': self.marketplace_id,
            'details': 'true',
        }
        
        if next_token:
            params['nextToken'] = next_token
        if start_date:
            params['startDateTime'] = start_date.isoformat()
        
        return self._make_request(
            'GET',
            '/fba/inventory/v1/summaries',
            params=params
        )
    
    def get_all_fba_inventory(self) -> List[Dict]:
        """
        Get all FBA inventory items with pagination.
        
        Returns:
            List of all inventory summaries
        """
        all_inventory = []
        next_token = None
        
        while True:
            response = self.get_fba_inventory_summaries(next_token=next_token)
            
            payload = response.get('payload', {})
            inventories = payload.get('inventorySummaries', [])
            all_inventory.extend(inventories)
            
            pagination = response.get('pagination', {})
            next_token = pagination.get('nextToken')
            
            if not next_token:
                break
        
        return all_inventory
    
    # ==================== AWD Inventory API ====================
    
    def get_awd_inventory(self, next_token: str = None) -> Dict:
        """
        Get AWD (Amazon Warehousing & Distribution) inventory.
        
        API: GET /awd/2024-05-09/inventory
        
        Note: Requires AWD enrollment and appropriate permissions.
        """
        params = {
            'details': 'SHOW',
        }
        
        if next_token:
            params['nextToken'] = next_token
        
        try:
            return self._make_request(
                'GET',
                '/awd/2024-05-09/inventory',
                params=params
            )
        except SPAPIError as e:
            if e.status_code == 403:
                logger.info("AWD API not available (not enrolled or no permission)")
                return {'inventory': []}
            raise
    
    def get_all_awd_inventory(self) -> List[Dict]:
        """
        Get all AWD inventory items with pagination.
        
        Returns:
            List of all AWD inventory items, or empty list if not enrolled
        """
        all_inventory = []
        next_token = None
        
        try:
            while True:
                response = self.get_awd_inventory(next_token=next_token)
                
                inventories = response.get('inventory', [])
                all_inventory.extend(inventories)
                
                next_token = response.get('nextToken')
                
                if not next_token:
                    break
        except SPAPIError as e:
            if e.status_code == 403:
                logger.info("AWD API not available - returning empty inventory")
                return []
            raise
        
        return all_inventory
    
    # ==================== Orders API ====================
    
    def get_orders(
        self,
        created_after: datetime = None,
        created_before: datetime = None,
        order_statuses: List[str] = None,
        next_token: str = None,
        max_results: int = 100
    ) -> Dict:
        """
        Get orders from the Orders API.
        
        API: GET /orders/v0/orders
        """
        params = {
            'MarketplaceIds': self.marketplace_id,
            'MaxResultsPerPage': max_results,
        }
        
        if created_after:
            # Amazon requires ISO8601 format without microseconds
            params['CreatedAfter'] = created_after.strftime('%Y-%m-%dT%H:%M:%SZ')
        if created_before:
            params['CreatedBefore'] = created_before.strftime('%Y-%m-%dT%H:%M:%SZ')
        if order_statuses:
            params['OrderStatuses'] = ','.join(order_statuses)
        if next_token:
            params['NextToken'] = next_token
        
        return self._make_request('GET', '/orders/v0/orders', params=params)
    
    def get_order(self, order_id: str) -> Dict:
        """
        Get a specific order by ID.
        
        API: GET /orders/v0/orders/{orderId}
        """
        return self._make_request('GET', f'/orders/v0/orders/{order_id}')
    
    def get_order_items(self, order_id: str, next_token: str = None) -> Dict:
        """
        Get items for a specific order.
        
        API: GET /orders/v0/orders/{orderId}/orderItems
        """
        params = {}
        if next_token:
            params['NextToken'] = next_token
        
        return self._make_request(
            'GET',
            f'/orders/v0/orders/{order_id}/orderItems',
            params=params
        )
    
    def get_all_orders(
        self,
        created_after: datetime,
        created_before: datetime = None
    ) -> List[Dict]:
        """
        Get all orders within a date range with pagination.
        
        Returns:
            List of all orders
        """
        all_orders = []
        next_token = None
        
        while True:
            response = self.get_orders(
                created_after=created_after,
                created_before=created_before,
                next_token=next_token
            )
            
            payload = response.get('payload', {})
            orders = payload.get('Orders', [])
            all_orders.extend(orders)
            
            next_token = payload.get('NextToken')
            
            if not next_token:
                break
        
        return all_orders
    
    # ==================== Reports API ====================
    
    def create_report(
        self,
        report_type: str,
        data_start_time: datetime = None,
        data_end_time: datetime = None
    ) -> str:
        """
        Create a report request.
        
        API: POST /reports/2021-06-30/reports
        
        Common report types:
        - GET_MERCHANT_LISTINGS_ALL_DATA
        - GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA
        - GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE
        
        Returns:
            Report ID
        """
        data = {
            'reportType': report_type,
            'marketplaceIds': [self.marketplace_id],
        }
        
        if data_start_time:
            data['dataStartTime'] = data_start_time.isoformat()
        if data_end_time:
            data['dataEndTime'] = data_end_time.isoformat()
        
        response = self._make_request(
            'POST',
            '/reports/2021-06-30/reports',
            data=data
        )
        
        return response.get('reportId')
    
    def get_report(self, report_id: str) -> Dict:
        """
        Get report status and document ID.
        
        API: GET /reports/2021-06-30/reports/{reportId}
        """
        return self._make_request(
            'GET',
            f'/reports/2021-06-30/reports/{report_id}'
        )
    
    def get_report_document(self, report_document_id: str) -> Dict:
        """
        Get report document download URL.
        
        API: GET /reports/2021-06-30/documents/{reportDocumentId}
        """
        return self._make_request(
            'GET',
            f'/reports/2021-06-30/documents/{report_document_id}'
        )
    
    def download_report(self, report_document_id: str) -> str:
        """
        Download report content.
        
        Returns:
            Report content as string
        """
        doc_info = self.get_report_document(report_document_id)
        download_url = doc_info.get('url')
        
        if not download_url:
            raise SPAPIError("No download URL in report document")
        
        response = httpx.get(download_url, timeout=60.0)
        
        if response.status_code != 200:
            raise SPAPIError(f"Failed to download report: {response.status_code}")
        
        compression = doc_info.get('compressionAlgorithm')
        if compression == 'GZIP':
            import gzip
            return gzip.decompress(response.content).decode('utf-8')
        
        return response.text
    
    def get_sales_report(self, days_back: int = 90) -> List[Dict]:
        """
        Get sales data via Sales and Traffic Report.
        
        Uses GET_SALES_AND_TRAFFIC_REPORT which provides daily sales by ASIN.
        
        Args:
            days_back: Number of days of sales history to fetch
            
        Returns:
            List of daily sales records
        """
        import csv
        from io import StringIO
        
        end_date = datetime.now(dt_timezone.utc)
        start_date = end_date - timedelta(days=days_back)
        
        # Request the report
        report_id = self.create_report(
            'GET_SALES_AND_TRAFFIC_REPORT',
            data_start_time=start_date,
            data_end_time=end_date
        )
        
        logger.info(f"Created sales report {report_id}, waiting for processing...")
        
        # Poll for report completion (max 5 minutes)
        max_attempts = 30
        for attempt in range(max_attempts):
            time.sleep(10)  # Wait 10 seconds between checks
            
            report_status = self.get_report(report_id)
            status = report_status.get('processingStatus')
            
            logger.info(f"Report status: {status} (attempt {attempt + 1}/{max_attempts})")
            
            if status == 'DONE':
                report_doc_id = report_status.get('reportDocumentId')
                break
            elif status in ('CANCELLED', 'FATAL'):
                raise SPAPIError(f"Report failed with status: {status}")
        else:
            raise SPAPIError("Report processing timed out")
        
        # Download and parse the report
        report_content = self.download_report(report_doc_id)
        
        # Parse JSON report (Sales and Traffic is JSON format)
        import json
        try:
            data = json.loads(report_content)
            return data.get('salesAndTrafficByAsin', {}).get('byAsin', [])
        except json.JSONDecodeError:
            # Try CSV format as fallback
            reader = csv.DictReader(StringIO(report_content), delimiter='\t')
            return list(reader)
    
    def get_flat_file_orders_report(self, days_back: int = 90) -> List[Dict]:
        """
        Get orders data via flat file orders report.
        
        Uses GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE.
        This is more reliable and provides order-level data.
        
        Args:
            days_back: Number of days of order history to fetch
            
        Returns:
            List of order records (parsed from TSV)
        """
        import csv
        from io import StringIO
        
        end_date = datetime.now(dt_timezone.utc)
        start_date = end_date - timedelta(days=days_back)
        
        # Request the report
        report_id = self.create_report(
            'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE',
            data_start_time=start_date,
            data_end_time=end_date
        )
        
        logger.info(f"Created orders report {report_id}, waiting for processing...")
        
        # Poll for report completion (max 5 minutes)
        max_attempts = 30
        for attempt in range(max_attempts):
            time.sleep(10)  # Wait 10 seconds between checks
            
            report_status = self.get_report(report_id)
            status = report_status.get('processingStatus')
            
            logger.info(f"Report status: {status} (attempt {attempt + 1}/{max_attempts})")
            
            if status == 'DONE':
                report_doc_id = report_status.get('reportDocumentId')
                break
            elif status in ('CANCELLED', 'FATAL'):
                raise SPAPIError(f"Report failed with status: {status}")
        else:
            raise SPAPIError("Report processing timed out")
        
        # Download and parse the report
        report_content = self.download_report(report_doc_id)
        
        # Parse TSV
        reader = csv.DictReader(StringIO(report_content), delimiter='\t')
        return list(reader)
    
    # ==================== Sales API ====================
    
    def get_order_metrics(
        self,
        interval_start: datetime,
        interval_end: datetime,
        granularity: str = 'Week',
        asin: str = None
    ) -> List[Dict]:
        """
        Get sales metrics from the Sales API.
        
        This provides aggregated sales data (units, orders, revenue) by time period.
        Can be filtered by ASIN for per-product data.
        
        API: GET /sales/v1/orderMetrics
        
        Args:
            interval_start: Start of date range
            interval_end: End of date range
            granularity: 'Day', 'Week', 'Month', 'Year'
            asin: Optional ASIN to filter by
            
        Returns:
            List of metrics with unitCount, orderCount, totalSales per interval
        """
        # Format interval as ISO8601 range
        start_str = interval_start.strftime('%Y-%m-%dT00:00:00Z')
        end_str = interval_end.strftime('%Y-%m-%dT00:00:00Z')
        interval = f"{start_str}--{end_str}"
        
        params = {
            'marketplaceIds': self.marketplace_id,
            'interval': interval,
            'granularity': granularity,
        }
        
        if asin:
            params['asin'] = asin
        
        response = self._make_request('GET', '/sales/v1/orderMetrics', params=params)
        return response.get('payload', [])
    
    def get_sales_by_asin(
        self,
        asin: str,
        days_back: int = 365
    ) -> List[Dict]:
        """
        Get weekly sales data for a specific ASIN.
        
        Args:
            asin: The ASIN to get sales for
            days_back: Number of days of history (default 365 = 1 year)
            
        Returns:
            List of weekly metrics
        """
        end_date = datetime.now(dt_timezone.utc)
        start_date = end_date - timedelta(days=days_back)
        
        return self.get_order_metrics(
            interval_start=start_date,
            interval_end=end_date,
            granularity='Week',
            asin=asin
        )
    
    # ==================== Seller API ====================
    
    def get_marketplace_participations(self) -> Dict:
        """
        Get seller's marketplace participations.
        
        API: GET /sellers/v1/marketplaceParticipations
        """
        return self._make_request(
            'GET',
            '/sellers/v1/marketplaceParticipations'
        )
