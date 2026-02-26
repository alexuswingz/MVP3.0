"""
Amazon SP-API Data Synchronization Service

Orchestrates data synchronization between Amazon SP-API and local database.
Handles products, inventory, and orders synchronization.
"""

import logging
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.utils import timezone

from ..models import AmazonSellerAccount, SyncLog
from .sp_api_client import SPAPIClient, SPAPIError
from forecast_app.models import Product, Brand

logger = logging.getLogger(__name__)


def extract_size_from_name(name: str) -> str:
    """
    Extract size information from product name.
    
    Common patterns:
    - "Gallon (128 oz)" -> "Gallon"
    - "Quart (32 oz)" -> "Quart"
    - "1/2 Pint (8 oz)" -> "8oz"
    - "(8 oz)" -> "8oz"
    - "2.5 Gallon" -> "2.5 Gallon"
    """
    if not name:
        return ''
    
    name_lower = name.lower()
    
    # Check for explicit volume names first (these take priority)
    if re.search(r'2\.?5\s*gallon', name_lower):
        return '2.5 Gallon'
    if 'gallon' in name_lower:
        return 'Gallon'
    if 'quart' in name_lower:
        return 'Quart'
    if '1/2 pint' in name_lower or 'half pint' in name_lower:
        return '8oz'
    if 'pint' in name_lower:
        return 'Pint'
    
    # Fall back to oz extraction
    oz_patterns = [
        r'[\(,\s](\d+\.?\d*)\s*oz[\)]?,?',
        r'(\d+\.?\d*)oz',
        r'(\d+\.?\d*)\s*ounce',
    ]
    for pattern in oz_patterns:
        match = re.search(pattern, name_lower)
        if match:
            oz = match.group(1)
            return f'{oz}oz'
    
    # Other patterns
    patterns = [
        (r'(\d+\.?\d*)\s*lb', 'lb'),
        (r'(\d+\.?\d*)\s*pound', 'lb'),
        (r'(\d+\.?\d*)\s*liter', 'L'),
        (r'(\d+)\s*ml', 'ml'),
    ]
    for pattern, suffix in patterns:
        match = re.search(pattern, name_lower)
        if match:
            return f'{match.group(1)}{suffix}'
    
    return ''


class SyncError(Exception):
    """Custom exception for sync errors."""
    pass


class DataSyncService:
    """
    Service for synchronizing data between Amazon SP-API and local database.
    """
    
    def __init__(self, amazon_account: AmazonSellerAccount):
        """
        Initialize sync service for a specific Amazon account.
        
        Args:
            amazon_account: The AmazonSellerAccount to sync
        """
        self.account = amazon_account
        self.user = amazon_account.user
        self.sp_client = SPAPIClient(amazon_account)
    
    def _update_sync_progress(self, step: str, done_field: str = None):
        """Update sync progress for real-time frontend tracking."""
        self.account.sync_current_step = step
        fields_to_update = ['sync_current_step']
        
        if done_field:
            setattr(self.account, done_field, True)
            fields_to_update.append(done_field)
        
        self.account.save(update_fields=fields_to_update)
    
    def _reset_sync_progress(self):
        """Reset sync progress flags before starting a new sync."""
        self.account.sync_products_done = False
        self.account.sync_inventory_done = False
        self.account.sync_sales_done = False
        self.account.sync_images_done = False
        self.account.sync_current_step = 'idle'
        self.account.save(update_fields=[
            'sync_products_done', 'sync_inventory_done', 
            'sync_sales_done', 'sync_images_done', 'sync_current_step'
        ])
    
    def sync_all(self) -> SyncLog:
        """
        Perform a full sync of all data types.
        
        Returns:
            SyncLog with operation results
        """
        sync_log = SyncLog.objects.create(
            amazon_account=self.account,
            operation='full',
            status='started'
        )
        
        total_created = 0
        total_updated = 0
        total_failed = 0
        
        try:
            self.account.sync_status = 'syncing'
            self.account.save(update_fields=['sync_status'])
            
            # Reset progress flags
            self._reset_sync_progress()
            
            # Step 1: Sync products
            self._update_sync_progress('products')
            created, updated, failed = self._sync_products()
            total_created += created
            total_updated += updated
            total_failed += failed
            self._update_sync_progress('products', 'sync_products_done')
            
            # Step 2: Sync inventory
            self._update_sync_progress('inventory')
            created, updated, failed = self._sync_inventory()
            total_created += created
            total_updated += updated
            total_failed += failed
            self._update_sync_progress('inventory', 'sync_inventory_done')
            
            # Step 3: Full historical sales sync (730 days = 2 years)
            # This is required for the 18m+ algorithm to work properly
            # Uses BULK report method (~5 minutes) instead of per-ASIN API (~50 minutes)
            self._update_sync_progress('sales')
            logger.info("Syncing full historical sales data (730 days) using BULK report...")
            created, updated, failed = self._sync_sales(days_back=730, use_historical=True, use_bulk=True)
            total_created += created
            total_updated += updated
            total_failed += failed
            self._update_sync_progress('sales', 'sync_sales_done')
            
            # Step 4: Sync product images for products missing them
            self._update_sync_progress('images')
            logger.info("Syncing product images...")
            created, updated, failed = self._sync_product_images()
            total_created += created
            total_updated += updated
            total_failed += failed
            self._update_sync_progress('images', 'sync_images_done')
            
            sync_log.mark_completed(
                records_created=total_created,
                records_updated=total_updated,
                records_failed=total_failed
            )
            
            self.account.sync_status = 'completed'
            self.account.sync_current_step = 'idle'
            self.account.last_sync_at = timezone.now()
            self.account.sync_error = ''
            self.account.save(update_fields=['sync_status', 'sync_current_step', 'last_sync_at', 'sync_error'])
            
            logger.info(
                f"Full sync completed for {self.account.seller_id}: "
                f"{total_created} created, {total_updated} updated, {total_failed} failed"
            )
            
        except Exception as e:
            error_msg = str(e)
            sync_log.mark_failed(error_msg)
            
            self.account.sync_status = 'failed'
            self.account.sync_current_step = 'idle'
            self.account.sync_error = error_msg[:500]
            self.account.save(update_fields=['sync_status', 'sync_current_step', 'sync_error'])
            
            logger.error(f"Full sync failed for {self.account.seller_id}: {e}")
        
        return sync_log
    
    def sync_products(self) -> SyncLog:
        """
        Sync products from Amazon catalog.
        
        Returns:
            SyncLog with operation results
        """
        sync_log = SyncLog.objects.create(
            amazon_account=self.account,
            operation='products',
            status='started'
        )
        
        try:
            self.account.sync_status = 'syncing'
            self.account.save(update_fields=['sync_status'])
            
            created, updated, failed = self._sync_products()
            
            sync_log.mark_completed(
                records_created=created,
                records_updated=updated,
                records_failed=failed
            )
            
            self.account.sync_status = 'completed'
            self.account.last_sync_at = timezone.now()
            self.account.save(update_fields=['sync_status', 'last_sync_at'])
            
        except Exception as e:
            sync_log.mark_failed(str(e))
            self.account.sync_status = 'failed'
            self.account.sync_error = str(e)[:500]
            self.account.save(update_fields=['sync_status', 'sync_error'])
        
        return sync_log
    
    def _sync_products(self) -> Tuple[int, int, int]:
        """
        Internal method to sync products.
        
        OPTIMIZED: Uses inventory data directly instead of making
        individual catalog API calls for each ASIN (which would take 45+ minutes
        for 900 products). Catalog details can be fetched lazily later if needed.
        
        Returns:
            Tuple of (created, updated, failed) counts
        """
        created = 0
        updated = 0
        failed = 0
        
        try:
            # Get FBA inventory which includes product ASINs and names
            inventory_data = self.sp_client.get_all_fba_inventory()
            
            # Build a map of ASIN -> best product info from inventory
            # (handles duplicates by keeping the one with most data)
            asin_info_map: Dict[str, Dict] = {}
            for item in inventory_data:
                asin = item.get('asin')
                if not asin:
                    continue
                
                # Extract info from inventory item
                current_info = {
                    'name': item.get('productName', ''),
                    'sku': item.get('sellerSku', ''),
                    'fnsku': item.get('fnSku', ''),
                    'condition': item.get('condition', ''),
                }
                
                # Keep the entry with the most complete name
                if asin not in asin_info_map or len(current_info['name']) > len(asin_info_map[asin].get('name', '')):
                    asin_info_map[asin] = current_info
            
            logger.info(f"Found {len(asin_info_map)} unique ASINs from inventory")
            
            # Get or create brand for this account
            brand, _ = Brand.objects.get_or_create(
                user=self.user,
                name=self.account.account_name or f"Amazon ({self.account.seller_id})",
                defaults={
                    'seller_account': self.account.seller_id,
                    'marketplace': 'Amazon',
                    'country': self._marketplace_to_country(),
                }
            )
            
            # Get existing products for this user to determine create vs update
            existing_products = {
                p.asin: p for p in Product.objects.filter(user=self.user, asin__in=asin_info_map.keys())
            }
            
            # Prepare bulk operations
            products_to_create = []
            products_to_update = []
            
            for asin, info in asin_info_map.items():
                try:
                    product_name = info.get('name') or asin
                    sku = info.get('sku', '')
                    # Extract size from product name
                    extracted_size = extract_size_from_name(product_name)
                    
                    if asin in existing_products:
                        # Update existing product
                        product = existing_products[asin]
                        product.amazon_account = self.account
                        product.brand = brand
                        if not product.name or product.name == product.asin:
                            product.name = product_name
                        if not product.sku:
                            product.sku = sku
                        # Update size if not already set and we extracted one
                        if not product.size and extracted_size:
                            product.size = extracted_size
                        product.status = 'launched'
                        product.is_active = True
                        products_to_update.append(product)
                        updated += 1
                    else:
                        # Create new product with extracted size
                        products_to_create.append(Product(
                            user=self.user,
                            amazon_account=self.account,
                            brand=brand,
                            asin=asin,
                            name=product_name,
                            sku=sku,
                            size=extracted_size,
                            status='launched',
                            is_active=True,
                        ))
                        created += 1
                        
                except Exception as e:
                    logger.warning(f"Failed to prepare product {asin}: {e}")
                    failed += 1
            
            # Bulk create new products
            if products_to_create:
                Product.objects.bulk_create(products_to_create, ignore_conflicts=True)
                logger.info(f"Bulk created {len(products_to_create)} products")
            
            # Bulk update existing products
            if products_to_update:
                Product.objects.bulk_update(
                    products_to_update,
                    ['amazon_account', 'brand', 'name', 'sku', 'size', 'status', 'is_active'],
                    batch_size=100
                )
                logger.info(f"Bulk updated {len(products_to_update)} products")
            
        except SPAPIError as e:
            logger.error(f"SP-API error during product sync: {e}")
            raise SyncError(f"Failed to fetch products: {e}")
        
        return created, updated, failed
    
    def _parse_catalog_item(self, catalog_response: Dict) -> Dict:
        """Parse catalog API response into product data."""
        item = catalog_response.get('item', catalog_response)
        
        attributes = item.get('attributes', {})
        summaries = item.get('summaries', [{}])[0] if item.get('summaries') else {}
        images = item.get('images', [{}])[0] if item.get('images') else {}
        
        # Get title from summaries or attributes
        title = summaries.get('itemName', '')
        if not title:
            title_attrs = attributes.get('item_name', [{}])
            if title_attrs:
                title = title_attrs[0].get('value', '')
        
        # Get image URL
        image_url = ''
        image_list = images.get('images', [])
        if image_list:
            # Prefer main image
            for img in image_list:
                if img.get('variant', '') == 'MAIN':
                    image_url = img.get('link', '')
                    break
            if not image_url and image_list:
                image_url = image_list[0].get('link', '')
        
        return {
            'name': title or item.get('asin', ''),
            'sku': '',
            'image_url': image_url,
            'product_type': summaries.get('productType', ''),
            'category': summaries.get('browseClassification', {}).get('displayName', ''),
        }
    
    def _get_basic_product_info(self, asin: str, inventory_data: List[Dict]) -> Dict:
        """Get basic product info from inventory data."""
        for item in inventory_data:
            if item.get('asin') == asin:
                return {
                    'name': item.get('productName', asin),
                    'sku': item.get('sellerSku', ''),
                    'image_url': '',
                    'product_type': '',
                    'category': '',
                }
        return {'name': asin, 'sku': '', 'image_url': '', 'product_type': '', 'category': ''}
    
    def sync_inventory(self) -> SyncLog:
        """
        Sync inventory levels from FBA.
        
        Returns:
            SyncLog with operation results
        """
        sync_log = SyncLog.objects.create(
            amazon_account=self.account,
            operation='inventory',
            status='started'
        )
        
        try:
            self.account.sync_status = 'syncing'
            self.account.save(update_fields=['sync_status'])
            
            created, updated, failed = self._sync_inventory()
            
            sync_log.mark_completed(
                records_created=created,
                records_updated=updated,
                records_failed=failed
            )
            
            self.account.sync_status = 'completed'
            self.account.last_sync_at = timezone.now()
            self.account.save(update_fields=['sync_status', 'last_sync_at'])
            
        except Exception as e:
            sync_log.mark_failed(str(e))
            self.account.sync_status = 'failed'
            self.account.sync_error = str(e)[:500]
            self.account.save(update_fields=['sync_status', 'sync_error'])
        
        return sync_log
    
    def _sync_inventory(self) -> Tuple[int, int, int]:
        """
        Internal method to sync inventory (FBA + AWD).
        
        OPTIMIZED: Uses bulk operations and pre-fetches products.
        Fetches both FBA and AWD inventory for complete picture.
        
        Returns:
            Tuple of (created, updated, failed) counts
        """
        from inventory_app.models import CurrentInventory
        
        created = 0
        updated = 0
        failed = 0
        
        try:
            # Fetch FBA inventory
            inventory_data = self.sp_client.get_all_fba_inventory()
            logger.info(f"Fetched {len(inventory_data)} FBA inventory items from SP-API")
            
            # Fetch AWD inventory (may return empty if not enrolled)
            awd_inventory_data = self.sp_client.get_all_awd_inventory()
            logger.info(f"Fetched {len(awd_inventory_data)} AWD inventory items from SP-API")
            
            # Build AWD lookup by SKU (AWD uses SKU, not ASIN)
            awd_by_sku = {}
            for awd_item in awd_inventory_data:
                sku = awd_item.get('sku')
                if sku:
                    inventory_details = awd_item.get('inventoryDetails', {})
                    awd_by_sku[sku] = {
                        'available': inventory_details.get('availableDistributableQuantity', 0) or 0,
                        'reserved': inventory_details.get('reservedDistributableQuantity', 0) or 0,
                        'inbound': inventory_details.get('inboundReceivingQuantity', 0) or 0,
                        'outbound_to_fba': inventory_details.get('outboundQuantity', 0) or 0,
                    }
            
            # Get all ASINs from inventory
            asins = {item.get('asin') for item in inventory_data if item.get('asin')}
            
            # Pre-fetch all products for this user (by ASIN and SKU for AWD lookup)
            products_by_asin = {
                p.asin: p for p in Product.objects.filter(user=self.user, asin__in=asins)
            }
            products_by_sku = {
                p.sku: p for p in Product.objects.filter(user=self.user, asin__in=asins)
                if p.sku
            }
            
            # Pre-fetch existing inventory records
            existing_inventory = {
                inv.product_id: inv 
                for inv in CurrentInventory.objects.filter(product__user=self.user, product__asin__in=asins)
            }
            
            inventory_to_create = []
            inventory_to_update = []
            
            for item in inventory_data:
                try:
                    asin = item.get('asin')
                    sku = item.get('sellerSku', '')
                    if not asin or asin not in products_by_asin:
                        continue
                    
                    product = products_by_asin[asin]
                    
                    # Parse FBA inventory quantities
                    inv_details = item.get('inventoryDetails', {})
                    fulfillable = inv_details.get('fulfillableQuantity', 0) or 0
                    reserved = inv_details.get('reservedQuantity', {})
                    unfulfillable = inv_details.get('unfulfillableQuantity', {})
                    
                    # Inbound breakdown
                    inbound_working = inv_details.get('inboundWorkingQuantity', 0) or 0
                    inbound_shipped = inv_details.get('inboundShippedQuantity', 0) or 0
                    inbound_receiving = inv_details.get('inboundReceivingQuantity', 0) or 0
                    inbound_total = inbound_working + inbound_shipped + inbound_receiving
                    
                    # Reserved breakdown
                    reserved_qty = 0
                    reserved_customer = 0
                    reserved_transfer = 0
                    reserved_processing = 0
                    if isinstance(reserved, dict):
                        reserved_qty = reserved.get('totalReservedQuantity', 0) or 0
                        reserved_customer = reserved.get('customerOrders', 0) or 0
                        reserved_transfer = reserved.get('fcTransfers', 0) or 0
                        reserved_processing = reserved.get('fcProcessing', 0) or 0
                    else:
                        reserved_qty = reserved or 0
                    
                    # Unfulfillable
                    unfulfillable_qty = 0
                    if isinstance(unfulfillable, dict):
                        unfulfillable_qty = unfulfillable.get('totalUnfulfillableQuantity', 0) or 0
                    else:
                        unfulfillable_qty = unfulfillable or 0
                    
                    # Get AWD inventory for this product (using SKU)
                    awd_data = awd_by_sku.get(sku, {}) if sku else {}
                    awd_available = awd_data.get('available', 0)
                    awd_reserved = awd_data.get('reserved', 0)
                    awd_inbound = awd_data.get('inbound', 0)
                    awd_outbound = awd_data.get('outbound_to_fba', 0)
                    
                    if product.id in existing_inventory:
                        # Update existing
                        inv = existing_inventory[product.id]
                        inv.fba_available = fulfillable
                        inv.fba_reserved = reserved_qty
                        inv.fba_reserved_customer_order = reserved_customer
                        inv.fba_reserved_fc_transfer = reserved_transfer
                        inv.fba_reserved_fc_processing = reserved_processing
                        inv.fba_inbound = inbound_total
                        inv.fba_inbound_working = inbound_working
                        inv.fba_inbound_shipped = inbound_shipped
                        inv.fba_inbound_receiving = inbound_receiving
                        inv.fba_unfulfillable = unfulfillable_qty
                        # AWD fields
                        inv.awd_available = awd_available
                        inv.awd_reserved = awd_reserved
                        inv.awd_inbound = awd_inbound
                        inv.awd_outbound_to_fba = awd_outbound
                        inventory_to_update.append(inv)
                        updated += 1
                    else:
                        # Create new
                        inventory_to_create.append(CurrentInventory(
                            product=product,
                            fba_available=fulfillable,
                            fba_reserved=reserved_qty,
                            fba_reserved_customer_order=reserved_customer,
                            fba_reserved_fc_transfer=reserved_transfer,
                            fba_reserved_fc_processing=reserved_processing,
                            fba_inbound=inbound_total,
                            fba_inbound_working=inbound_working,
                            fba_inbound_shipped=inbound_shipped,
                            fba_inbound_receiving=inbound_receiving,
                            fba_unfulfillable=unfulfillable_qty,
                            # AWD fields
                            awd_available=awd_available,
                            awd_reserved=awd_reserved,
                            awd_inbound=awd_inbound,
                            awd_outbound_to_fba=awd_outbound,
                        ))
                        created += 1
                        
                except Exception as e:
                    logger.warning(f"Failed to sync inventory for item: {e}")
                    failed += 1
            
            # Bulk operations
            if inventory_to_create:
                CurrentInventory.objects.bulk_create(inventory_to_create, ignore_conflicts=True)
                logger.info(f"Bulk created {len(inventory_to_create)} inventory records")
            
            if inventory_to_update:
                CurrentInventory.objects.bulk_update(
                    inventory_to_update,
                    ['fba_available', 'fba_reserved', 'fba_reserved_customer_order', 
                     'fba_reserved_fc_transfer', 'fba_reserved_fc_processing',
                     'fba_inbound', 'fba_inbound_working', 'fba_inbound_shipped', 
                     'fba_inbound_receiving', 'fba_unfulfillable',
                     'awd_available', 'awd_reserved', 'awd_inbound', 'awd_outbound_to_fba'],
                    batch_size=100
                )
                logger.info(f"Bulk updated {len(inventory_to_update)} inventory records")
            
        except SPAPIError as e:
            logger.error(f"SP-API error during inventory sync: {e}")
            raise SyncError(f"Failed to fetch inventory: {e}")
        
        return created, updated, failed
    
    def sync_orders(self, days_back: int = 30) -> SyncLog:
        """
        Sync orders from Amazon.
        
        Args:
            days_back: Number of days of order history to fetch
            
        Returns:
            SyncLog with operation results
        """
        sync_log = SyncLog.objects.create(
            amazon_account=self.account,
            operation='orders',
            status='started'
        )
        
        try:
            self.account.sync_status = 'syncing'
            self.account.save(update_fields=['sync_status'])
            
            created, updated, failed = self._sync_orders(days_back)
            
            sync_log.mark_completed(
                records_created=created,
                records_updated=updated,
                records_failed=failed
            )
            
            self.account.sync_status = 'completed'
            self.account.last_sync_at = timezone.now()
            self.account.save(update_fields=['sync_status', 'last_sync_at'])
            
        except Exception as e:
            sync_log.mark_failed(str(e))
            self.account.sync_status = 'failed'
            self.account.sync_error = str(e)[:500]
            self.account.save(update_fields=['sync_status', 'sync_error'])
        
        return sync_log
    
    def _sync_orders(self, days_back: int = 30) -> Tuple[int, int, int]:
        """
        Internal method to sync orders.
        
        Note: This creates sales summary data, not individual order records.
        For full order sync, consider using Reports API for bulk data.
        
        Returns:
            Tuple of (created, updated, failed) counts
        """
        created = 0
        updated = 0
        failed = 0
        
        try:
            created_after = timezone.now() - timedelta(days=days_back)
            
            orders = self.sp_client.get_all_orders(
                created_after=created_after
            )
            
            logger.info(f"Fetched {len(orders)} orders from last {days_back} days")
            
            # Group orders by ASIN and week for sales aggregation
            from collections import defaultdict
            weekly_sales: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
            
            for order in orders:
                try:
                    order_id = order.get('AmazonOrderId')
                    order_status = order.get('OrderStatus')
                    
                    # Skip cancelled/pending orders
                    if order_status in ['Canceled', 'Pending']:
                        continue
                    
                    # Get order items
                    try:
                        items_response = self.sp_client.get_order_items(order_id)
                        order_items = items_response.get('payload', {}).get('OrderItems', [])
                    except SPAPIError:
                        continue
                    
                    purchase_date = order.get('PurchaseDate', '')
                    if purchase_date:
                        order_date = datetime.fromisoformat(
                            purchase_date.replace('Z', '+00:00')
                        )
                        # Get week ending (Sunday)
                        days_to_sunday = (6 - order_date.weekday()) % 7
                        week_end = (order_date + timedelta(days=days_to_sunday)).date()
                        week_key = week_end.isoformat()
                        
                        for item in order_items:
                            asin = item.get('ASIN')
                            quantity = item.get('QuantityOrdered', 0)
                            if asin and quantity:
                                weekly_sales[asin][week_key] += quantity
                    
                    updated += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to process order: {e}")
                    failed += 1
            
            # TODO: Store weekly sales data in a SalesHistory model
            # For now, just log the aggregated data
            for asin, weeks in weekly_sales.items():
                logger.debug(f"ASIN {asin}: {dict(weeks)}")
            
        except SPAPIError as e:
            logger.error(f"SP-API error during orders sync: {e}")
            raise SyncError(f"Failed to fetch orders: {e}")
        
        return created, updated, failed
    
    def sync_sales(self, days_back: int = 365, use_historical: bool = True) -> SyncLog:
        """
        Sync sales data from Amazon using Sales API.
        
        Primary method: Sales API (GET /sales/v1/orderMetrics)
        - Provides weekly aggregated sales per ASIN
        - Supports up to 730 days (2 years) of history
        - Fast and efficient
        
        Fallback: Restock Report (30-day velocity)
        
        Args:
            days_back: Number of days of sales history (default 365, max 730)
            use_historical: If True, use Sales API. If False, use Restock Report.
            
        Returns:
            SyncLog with operation results
        """
        sync_log = SyncLog.objects.create(
            amazon_account=self.account,
            operation='sales',
            status='started'
        )
        
        try:
            self.account.sync_status = 'syncing'
            self.account.save(update_fields=['sync_status'])
            
            created, updated, failed = self._sync_sales(days_back, use_historical)
            
            sync_log.mark_completed(
                records_created=created,
                records_updated=updated,
                records_failed=failed
            )
            
            self.account.sync_status = 'completed'
            self.account.last_sync_at = timezone.now()
            self.account.save(update_fields=['sync_status', 'last_sync_at'])
            
            logger.info(f"Sales sync completed: {created} created, {updated} updated")
            
        except Exception as e:
            sync_log.mark_failed(str(e))
            self.account.sync_status = 'failed'
            self.account.sync_error = str(e)[:500]
            self.account.save(update_fields=['sync_status', 'sync_error'])
            logger.error(f"Sales sync failed: {e}")
        
        return sync_log
    
    def _sync_sales(self, days_back: int = 365, use_historical: bool = True, use_bulk: bool = True) -> Tuple[int, int, int]:
        """
        Internal method to sync sales data.
        
        Methods (fastest to slowest):
        1. Bulk Report (use_bulk=True): ~5 minutes for ALL products
           - Uses GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE
           - Single API call, downloads all orders, aggregates to weekly
           - Requires Reports API permissions
        
        2. Sales API (use_bulk=False, use_historical=True): ~50 minutes for 900 products
           - Makes individual API call per ASIN
           - Rate limited to 1.5 req/sec
        
        3. Restock Report (use_historical=False): ~1 minute
           - Only 30-day velocity data
           - Not suitable for historical forecasting
        
        Returns:
            Tuple of (created, updated, failed) counts
        """
        from .sales_sync import SalesSyncService, SPAPIError
        
        try:
            sales_service = SalesSyncService(self.account)
            
            if use_bulk and use_historical:
                # FASTEST: Try bulk orders report (~5 minutes for ALL products)
                try:
                    logger.info("Trying BULK report method for historical sales (fastest)")
                    return sales_service.sync_historical_sales_bulk(days_back=min(days_back, 730))
                except SPAPIError as e:
                    if '403' in str(e) or 'forbidden' in str(e).lower():
                        # Bulk report not permitted, fall back to per-ASIN method
                        logger.warning("Bulk report access denied, falling back to per-ASIN Sales API")
                        return sales_service.sync_historical_sales(days_back=min(days_back, 730))
                    raise
            elif use_historical:
                # SLOW: Use Sales API for per-ASIN data (~50 minutes for 900 products)
                logger.info("Using per-ASIN Sales API method (slower)")
                return sales_service.sync_historical_sales(days_back=min(days_back, 730))
            else:
                # QUICK: Use Restock Report for 30-day velocity
                return sales_service.sync_sales_velocity()
                
        except Exception as e:
            logger.error(f"Sales sync failed: {e}")
            raise SyncError(f"Failed to sync sales: {e}")
    
    def _sync_product_images(self) -> Tuple[int, int, int]:
        """
        Sync product images for products missing images.
        
        Returns:
            Tuple of (created, updated, failed) counts
        """
        from .sales_sync import SalesSyncService
        
        try:
            sales_service = SalesSyncService(self.account)
            return sales_service.sync_product_images()
        except Exception as e:
            logger.error(f"Image sync failed: {e}")
            return 0, 0, 0  # Don't fail full sync for image errors
    
    def _marketplace_to_country(self) -> str:
        """Convert marketplace ID to country name."""
        marketplace_countries = {
            'ATVPDKIKX0DER': 'US',
            'A2EUQ1WTGCTBG2': 'CA',
            'A1AM78C64UM0Y8': 'MX',
            'A1F83G8C2ARO7P': 'UK',
            'A1PA6795UKMFR9': 'DE',
            'A13V1IB3VIYZZH': 'FR',
            'APJ6JRA9NG5V4': 'IT',
            'A1RKKUPIHCS9HS': 'ES',
            'A1VC38T7YXB528': 'JP',
        }
        return marketplace_countries.get(self.account.marketplace_id, 'US')


def trigger_sync_for_account(account_id: int, operation: str = 'full') -> SyncLog:
    """
    Trigger a sync operation for an Amazon account.
    
    Args:
        account_id: The ID of the AmazonSellerAccount
        operation: Type of sync ('full', 'products', 'inventory', 'orders', 'sales')
        
    Returns:
        SyncLog with operation results
    """
    try:
        account = AmazonSellerAccount.objects.get(id=account_id, is_active=True)
    except AmazonSellerAccount.DoesNotExist:
        raise SyncError(f"Amazon account {account_id} not found or inactive")
    
    sync_service = DataSyncService(account)
    
    if operation == 'full':
        return sync_service.sync_all()
    elif operation == 'products':
        return sync_service.sync_products()
    elif operation == 'inventory':
        return sync_service.sync_inventory()
    elif operation == 'orders':
        return sync_service.sync_orders()
    elif operation == 'sales':
        return sync_service.sync_sales()
    else:
        raise SyncError(f"Unknown operation: {operation}")
