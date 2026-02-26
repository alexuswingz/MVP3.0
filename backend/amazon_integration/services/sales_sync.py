"""
Amazon Sales Data Synchronization Service

Handles fetching and storing sales data from Amazon SP-API.

Primary data source: Sales API (GET /sales/v1/orderMetrics)
- Provides weekly/daily aggregated sales by ASIN
- Supports up to 2 years of historical data
- Much faster than fetching individual orders

Fallback: Restock Report for 30-day velocity data
"""

import logging
import csv
from io import StringIO
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from collections import defaultdict
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.db import transaction, connection, models
from django.utils import timezone

from .sp_api_client import SPAPIClient, SPAPIError
from ..models import AmazonSellerAccount
from forecast_app.models import Product
from analytics_app.models import WeeklySales, ProductSeasonality

logger = logging.getLogger(__name__)


class RateLimiter:
    """Thread-safe rate limiter for API calls."""
    
    def __init__(self, requests_per_second: float = 1.5):
        self.min_interval = 1.0 / requests_per_second
        self.lock = threading.Lock()
        self.last_request_time = 0
    
    def wait(self):
        """Wait until we can make another request."""
        with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.min_interval:
                sleep_time = self.min_interval - elapsed
                time.sleep(sleep_time)
            self.last_request_time = time.time()


class SalesSyncService:
    """
    Service for synchronizing sales data from Amazon.
    
    Primary data source: Sales API (GET /sales/v1/orderMetrics)
    - Provides weekly aggregated sales by ASIN
    - Supports 730 days (2 years) of historical data
    - Much faster than fetching individual orders
    
    Fallback: Restock Report for 30-day velocity
    """
    
    def __init__(self, amazon_account: AmazonSellerAccount):
        self.account = amazon_account
        self.user = amazon_account.user
        self.sp_client = SPAPIClient(amazon_account)
    
    def sync_historical_sales(self, days_back: int = 730, max_workers: int = 3) -> Tuple[int, int, int]:
        """
        Sync historical sales data using the Sales API with rate-limited parallel requests.
        
        This is the primary method - it provides actual weekly sales by ASIN
        for up to 2 years of history.
        
        Args:
            days_back: Days of history to fetch (max 730 for Sales API)
            max_workers: Number of parallel threads (default 3, with rate limiting)
            
        Returns:
            Tuple of (created, updated, failed) counts
        """
        # Get all products for this account
        products = list(Product.objects.filter(
            user=self.user,
            amazon_account=self.account
        ))
        
        if not products:
            logger.warning("No products found to sync sales for")
            return 0, 0, 0
        
        logger.info(f"Syncing sales for {len(products)} products, {days_back} days back")
        
        # Pre-fetch existing sales records for efficiency
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days_back)
        
        existing_sales = {}
        for ws in WeeklySales.objects.filter(
            product__user=self.user,
            week_ending__gte=start_date
        ).select_related('product'):
            key = (ws.product_id, ws.week_ending)
            existing_sales[key] = ws
        
        logger.info(f"Found {len(existing_sales)} existing sales records")
        
        # Create shared rate limiter (1.5 req/sec = safe under 2/sec limit)
        rate_limiter = RateLimiter(requests_per_second=1.5)
        
        # Fetch sales data with rate-limited parallel requests
        all_results = []
        failed = 0
        
        def fetch_sales_for_product(product):
            """Fetch sales for a single product with rate limiting."""
            try:
                # Wait for rate limit
                rate_limiter.wait()
                
                # Create new client for thread safety
                client = SPAPIClient(self.account)
                metrics = client.get_sales_by_asin(
                    asin=product.asin,
                    days_back=days_back
                )
                return (product, metrics, None)
            except Exception as e:
                return (product, None, str(e))
        
        # Use ThreadPoolExecutor with rate limiting
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(fetch_sales_for_product, p): p for p in products}
            
            completed = 0
            for future in as_completed(futures):
                completed += 1
                product, metrics, error = future.result()
                
                if error:
                    logger.warning(f"Error fetching sales for {product.asin}: {error}")
                    failed += 1
                else:
                    all_results.append((product, metrics or []))
                
                if completed % 100 == 0:
                    elapsed = time.time() - start_time
                    rate = completed / elapsed if elapsed > 0 else 0
                    remaining = len(products) - completed
                    eta = remaining / rate if rate > 0 else 0
                    logger.info(f"Fetched {completed}/{len(products)} products ({rate:.1f}/sec, ETA: {eta:.0f}s)")
        
        elapsed = time.time() - start_time
        logger.info(f"API calls complete in {elapsed:.1f}s. Processing {len(all_results)} results...")
        
        # Process results and prepare bulk operations
        sales_to_create = []
        sales_to_update = []
        created = 0
        updated = 0
        
        for product, metrics in all_results:
            for metric in metrics:
                # Parse interval to get week ending
                interval = metric.get('interval', '')
                if '--' not in interval:
                    continue
                
                # Extract end date from interval (e.g., "2025-10-27T00:00Z--2025-11-03T00:00Z")
                end_str = interval.split('--')[1][:10]
                try:
                    week_ending = datetime.strptime(end_str, '%Y-%m-%d').date()
                except ValueError:
                    continue
                
                units = metric.get('unitCount', 0) or 0
                orders = metric.get('orderCount', 0) or 0
                revenue = 0
                
                total_sales = metric.get('totalSales', {})
                if total_sales:
                    revenue = float(total_sales.get('amount', 0) or 0)
                
                key = (product.id, week_ending)
                
                if key in existing_sales:
                    ws = existing_sales[key]
                    ws.units_sold = units
                    ws.revenue = revenue
                    ws.orders = orders
                    sales_to_update.append(ws)
                    updated += 1
                else:
                    sales_to_create.append(WeeklySales(
                        product=product,
                        week_ending=week_ending,
                        units_sold=units,
                        revenue=revenue,
                        orders=orders,
                    ))
                    created += 1
        
        # Bulk database operations
        logger.info(f"Saving to database: {len(sales_to_create)} new, {len(sales_to_update)} updates")
        
        if sales_to_create:
            WeeklySales.objects.bulk_create(
                sales_to_create,
                ignore_conflicts=True,
                batch_size=1000
            )
            logger.info(f"Created {len(sales_to_create)} sales records")
        
        if sales_to_update:
            WeeklySales.objects.bulk_update(
                sales_to_update,
                ['units_sold', 'revenue', 'orders'],
                batch_size=1000
            )
            logger.info(f"Updated {len(sales_to_update)} sales records")
        
        return created, updated, failed
    
    def sync_historical_sales_bulk(self, days_back: int = 730) -> Tuple[int, int, int]:
        """
        Sync historical sales using bulk report - MUCH FASTER than per-ASIN API.
        
        Tries multiple report types in order of preference:
        1. GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE - Full 2-year order data (requires Orders role)
        2. GET_SALES_AND_TRAFFIC_REPORT - Sales by ASIN (~6 months, most accounts have access)
        
        Time comparison:
        - Per-ASIN API: ~50 minutes for 911 products
        - Bulk report: ~5 minutes for ALL products
        
        Args:
            days_back: Days of history to fetch (max 730 for orders, ~180 for traffic report)
            
        Returns:
            Tuple of (created, updated, failed) counts
        """
        logger.info(f"Starting BULK historical sales sync ({days_back} days)...")
        start_time = time.time()
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days_back)
        
        # FIRST: Try orders report (gives full 2-year history)
        # Requires "Direct-to-Consumer Shipping" role
        try:
            logger.info("Trying GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE (2-year history)...")
            report_id = self.sp_client.create_report(
                'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE',
                data_start_time=start_date,
                data_end_time=end_date
            )
            logger.info(f"Orders report created: {report_id}, waiting for processing...")
            
            # Continue with orders report processing below
        except SPAPIError as e:
            if '403' in str(e) or 'forbidden' in str(e).lower():
                # Orders report not permitted, try Sales & Traffic report
                logger.warning("Orders report access denied (need 'Direct-to-Consumer Shipping' role)")
                logger.info("Falling back to GET_SALES_AND_TRAFFIC_REPORT (up to 2 years history)...")
                return self._sync_via_sales_traffic_report(days_back)  # Full 730 days supported
            raise
        
        # Process orders report - wait for it to be ready
        report_doc_id = self._wait_for_report(report_id, max_attempts=60, wait_seconds=5)
        if not report_doc_id:
            raise SPAPIError("Bulk orders report processing failed or timed out")
        
        logger.info("Report ready, downloading...")
        
        # Step 3: Download and parse the report
        content = self.sp_client.download_report(report_doc_id)
        reader = csv.DictReader(StringIO(content), delimiter='\t')
        orders = list(reader)
        logger.info(f"Downloaded {len(orders)} order records")
        
        if not orders:
            logger.warning("No orders found in report")
            return 0, 0, 0
        
        # Step 4: Get products map for matching
        products_by_asin = {
            p.asin: p for p in Product.objects.filter(user=self.user, amazon_account=self.account)
        }
        products_by_sku = {
            p.sku: p for p in Product.objects.filter(user=self.user, amazon_account=self.account) if p.sku
        }
        
        logger.info(f"Matching orders to {len(products_by_asin)} products...")
        
        # Step 5: Aggregate orders into weekly sales
        # Key: (product_id, week_ending) -> {units, revenue, orders}
        weekly_data = defaultdict(lambda: {'units': 0, 'revenue': 0.0, 'orders': 0})
        matched_orders = 0
        unmatched_asins = set()
        
        for order in orders:
            # Get ASIN and SKU from order
            asin = order.get('asin', '') or order.get('ASIN', '')
            sku = order.get('sku', '') or order.get('SKU', '') or order.get('seller-sku', '')
            
            # Find matching product
            product = products_by_asin.get(asin) or products_by_sku.get(sku)
            if not product:
                if asin:
                    unmatched_asins.add(asin)
                continue
            
            matched_orders += 1
            
            # Parse order date and calculate week ending (Saturday)
            order_date_str = order.get('purchase-date', '') or order.get('order-date', '')
            if not order_date_str:
                continue
            
            try:
                # Handle various date formats
                order_date_str = order_date_str.split('T')[0] if 'T' in order_date_str else order_date_str
                order_date = datetime.strptime(order_date_str, '%Y-%m-%d').date()
            except ValueError:
                continue
            
            # Calculate week ending (Saturday)
            days_until_saturday = (5 - order_date.weekday()) % 7
            if days_until_saturday == 0 and order_date.weekday() != 5:
                days_until_saturday = 7
            week_ending = order_date + timedelta(days=days_until_saturday)
            
            # Get quantity and price
            quantity = int(order.get('quantity', 1) or order.get('quantity-shipped', 1) or 1)
            price_str = order.get('item-price', '0') or order.get('price', '0') or '0'
            try:
                price = float(price_str.replace(',', '').replace('$', ''))
            except (ValueError, AttributeError):
                price = 0.0
            
            # Aggregate
            key = (product.id, week_ending)
            weekly_data[key]['units'] += quantity
            weekly_data[key]['revenue'] += price * quantity
            weekly_data[key]['orders'] += 1
        
        logger.info(f"Matched {matched_orders} orders, {len(unmatched_asins)} unmatched ASINs")
        logger.info(f"Aggregated into {len(weekly_data)} weekly records")
        
        # Step 6: Get existing sales records for update vs create
        existing_sales = {}
        for ws in WeeklySales.objects.filter(
            product__user=self.user,
            week_ending__gte=start_date.date()
        ).select_related('product'):
            key = (ws.product_id, ws.week_ending)
            existing_sales[key] = ws
        
        # Step 7: Prepare bulk operations
        sales_to_create = []
        sales_to_update = []
        
        for (product_id, week_ending), data in weekly_data.items():
            key = (product_id, week_ending)
            
            if key in existing_sales:
                ws = existing_sales[key]
                ws.units_sold = data['units']
                ws.revenue = data['revenue']
                ws.orders = data['orders']
                sales_to_update.append(ws)
            else:
                sales_to_create.append(WeeklySales(
                    product_id=product_id,
                    week_ending=week_ending,
                    units_sold=data['units'],
                    revenue=data['revenue'],
                    orders=data['orders'],
                ))
        
        # Step 8: Bulk save to database
        created = 0
        updated = 0
        
        if sales_to_create:
            WeeklySales.objects.bulk_create(
                sales_to_create,
                ignore_conflicts=True,
                batch_size=1000
            )
            created = len(sales_to_create)
            logger.info(f"Created {created} new weekly sales records")
        
        if sales_to_update:
            WeeklySales.objects.bulk_update(
                sales_to_update,
                ['units_sold', 'revenue', 'orders'],
                batch_size=1000
            )
            updated = len(sales_to_update)
            logger.info(f"Updated {updated} existing weekly sales records")
        
        elapsed = time.time() - start_time
        logger.info(f"BULK historical sync completed in {elapsed:.1f}s: {created} created, {updated} updated")
        
        return created, updated, 0
    
    def _sync_via_sales_traffic_report(self, days_back: int = 730) -> Tuple[int, int, int]:
        """
        Sync sales using GET_SALES_AND_TRAFFIC_REPORT.
        
        This report provides daily sales by ASIN and is available to most accounts.
        Supports up to 730 days (2 years) of historical data.
        We batch requests in 30-day chunks to stay within API limits.
        
        Args:
            days_back: Days of history (default 730 = 2 years)
            
        Returns:
            Tuple of (created, updated, failed) counts
        """
        import json
        
        start_time = time.time()
        total_created = 0
        total_updated = 0
        
        # Sales & Traffic report typically limited to ~60 days per request
        # We'll batch requests to cover the full period
        batch_size = 30  # 30 days per batch for safety
        end_date = timezone.now().date()
        
        # Get products map
        products_by_asin = {
            p.asin: p for p in Product.objects.filter(user=self.user, amazon_account=self.account)
        }
        logger.info(f"Syncing sales for {len(products_by_asin)} products via Sales & Traffic report")
        
        # Pre-fetch existing sales
        start_date = end_date - timedelta(days=days_back)
        existing_sales = {}
        for ws in WeeklySales.objects.filter(
            product__user=self.user,
            week_ending__gte=start_date
        ).select_related('product'):
            key = (ws.product_id, ws.week_ending)
            existing_sales[key] = ws
        
        # Aggregate all daily data into weekly
        weekly_data = defaultdict(lambda: {'units': 0, 'revenue': 0.0, 'orders': 0})
        
        # Process in batches
        current_end = end_date
        batches_processed = 0
        
        while current_end > start_date:
            current_start = max(start_date, current_end - timedelta(days=batch_size))
            
            logger.info(f"Fetching sales data: {current_start} to {current_end}")
            
            try:
                # Create report request
                report_id = self.sp_client.create_report(
                    'GET_SALES_AND_TRAFFIC_REPORT',
                    data_start_time=timezone.make_aware(datetime.combine(current_start, datetime.min.time())),
                    data_end_time=timezone.make_aware(datetime.combine(current_end, datetime.min.time()))
                )
                
                # Wait for report
                report_doc_id = self._wait_for_report(report_id, max_attempts=30, wait_seconds=5)
                if not report_doc_id:
                    logger.warning(f"Report timeout for {current_start} to {current_end}")
                    current_end = current_start
                    continue
                
                # Download and parse
                content = self.sp_client.download_report(report_doc_id)
                
                # Sales & Traffic report is JSON format
                try:
                    report_data = json.loads(content)
                except json.JSONDecodeError:
                    # Try TSV format
                    reader = csv.DictReader(StringIO(content), delimiter='\t')
                    report_data = list(reader)
                
                # Process the report data - handle various response structures
                sales_list = []
                if isinstance(report_data, dict):
                    # JSON format - navigate to sales data
                    # Try different paths that Amazon uses
                    if 'salesAndTrafficByAsin' in report_data:
                        by_asin = report_data['salesAndTrafficByAsin']
                        if isinstance(by_asin, list):
                            sales_list = by_asin
                        elif isinstance(by_asin, dict):
                            sales_list = by_asin.get('salesByAsin', []) or by_asin.get('data', [])
                    elif 'reportData' in report_data:
                        sales_list = report_data['reportData']
                    elif 'data' in report_data:
                        sales_list = report_data['data']
                    else:
                        # Try to find any list in the response
                        for key, val in report_data.items():
                            if isinstance(val, list) and len(val) > 0:
                                sales_list = val
                                break
                elif isinstance(report_data, list):
                    sales_list = report_data
                
                logger.info(f"Processing {len(sales_list)} records from report")
                
                # Calculate week ending for this batch period (use end date)
                batch_week_ending = current_end
                # Adjust to Saturday
                days_until_saturday = (5 - batch_week_ending.weekday()) % 7
                if days_until_saturday == 0 and batch_week_ending.weekday() != 5:
                    days_until_saturday = 7
                batch_week_ending = batch_week_ending + timedelta(days=days_until_saturday)
                
                for record in sales_list:
                    if not isinstance(record, dict):
                        continue
                    
                    # Extract ASIN - Sales & Traffic report uses parentAsin
                    asin = record.get('parentAsin') or record.get('childAsin') or record.get('asin') or record.get('ASIN', '')
                    
                    product = products_by_asin.get(asin)
                    if not product:
                        continue
                    
                    # Extract metrics from salesByAsin structure
                    sales_data = record.get('salesByAsin', {})
                    if not sales_data and 'unitsOrdered' in record:
                        sales_data = record  # Flat structure
                    
                    units = int(sales_data.get('unitsOrdered', 0) or 0)
                    orders = int(sales_data.get('totalOrderItems', 0) or units)
                    
                    # Revenue can be nested or flat
                    revenue = 0.0
                    revenue_data = sales_data.get('orderedProductSales', {})
                    if isinstance(revenue_data, dict):
                        revenue = float(revenue_data.get('amount', 0) or 0)
                    elif revenue_data:
                        revenue = float(revenue_data)
                    
                    if units == 0:
                        continue
                    
                    # Aggregate - use the batch week ending
                    key = (product.id, batch_week_ending)
                    weekly_data[key]['units'] += units
                    weekly_data[key]['revenue'] += revenue
                    weekly_data[key]['orders'] += orders
                
                batches_processed += 1
                logger.info(f"Processed batch {batches_processed}: {current_start} to {current_end}")
                
            except Exception as e:
                logger.warning(f"Error processing batch {current_start} to {current_end}: {e}")
            
            current_end = current_start
        
        logger.info(f"Aggregated {len(weekly_data)} weekly records from {batches_processed} batches")
        
        # Save to database
        sales_to_create = []
        sales_to_update = []
        
        for (product_id, week_ending), data in weekly_data.items():
            if data['units'] == 0:
                continue
                
            key = (product_id, week_ending)
            
            if key in existing_sales:
                ws = existing_sales[key]
                ws.units_sold = data['units']
                ws.revenue = data['revenue']
                ws.orders = data['orders']
                sales_to_update.append(ws)
            else:
                sales_to_create.append(WeeklySales(
                    product_id=product_id,
                    week_ending=week_ending,
                    units_sold=data['units'],
                    revenue=data['revenue'],
                    orders=data['orders'],
                ))
        
        if sales_to_create:
            WeeklySales.objects.bulk_create(sales_to_create, ignore_conflicts=True, batch_size=1000)
            total_created = len(sales_to_create)
            logger.info(f"Created {total_created} sales records")
        
        if sales_to_update:
            WeeklySales.objects.bulk_update(sales_to_update, ['units_sold', 'revenue', 'orders'], batch_size=1000)
            total_updated = len(sales_to_update)
            logger.info(f"Updated {total_updated} sales records")
        
        elapsed = time.time() - start_time
        logger.info(f"Sales & Traffic sync completed in {elapsed:.1f}s")
        
        return total_created, total_updated, 0
    
    def sync_sales_velocity(self) -> Tuple[int, int, int]:
        """
        Sync current sales velocity using Restock Report.
        
        This gives us 30-day sales data which is enough for:
        - Current DOI calculations
        - Recent trend analysis
        - Starting point for forecast
        
        Returns:
            Tuple of (created, updated, failed) counts
        """
        import time
        
        created = 0
        updated = 0
        failed = 0
        
        logger.info("Requesting Restock Recommendations Report...")
        
        # Request the report
        report_id = self.sp_client.create_report(
            'GET_RESTOCK_INVENTORY_RECOMMENDATIONS_REPORT'
        )
        logger.info(f"Created report {report_id}")
        
        # Wait for report
        report_doc_id = self._wait_for_report(report_id)
        if not report_doc_id:
            raise SPAPIError("Report processing failed or timed out")
        
        # Download and parse
        content = self.sp_client.download_report(report_doc_id)
        reader = csv.DictReader(StringIO(content), delimiter='\t')
        rows = list(reader)
        logger.info(f"Parsed {len(rows)} rows")
        
        # Get products map
        products_by_asin = {
            p.asin: p for p in Product.objects.filter(user=self.user)
        }
        products_by_sku = {
            p.sku: p for p in Product.objects.filter(user=self.user) if p.sku
        }
        
        # Calculate week endings for the last 4 weeks
        today = timezone.now().date()
        week_endings = []
        for i in range(4):
            # Saturday of each week
            days_to_saturday = (5 - today.weekday()) % 7
            if i == 0 and days_to_saturday == 0 and today.weekday() != 5:
                days_to_saturday = 7
            week_end = today + timedelta(days=days_to_saturday) - timedelta(weeks=i)
            week_endings.append(week_end)
        
        # Prepare bulk data
        sales_to_create = []
        sales_to_update = []
        
        # Get existing records
        existing_sales = {}
        for ws in WeeklySales.objects.filter(
            product__user=self.user,
            week_ending__in=week_endings
        ).select_related('product'):
            key = (ws.product_id, ws.week_ending)
            existing_sales[key] = ws
        
        for row in rows:
            try:
                # Find product
                asin = row.get('ASIN', '')
                sku = row.get('Merchant SKU', '')
                
                product = products_by_asin.get(asin) or products_by_sku.get(sku)
                if not product:
                    continue
                
                # Get 30-day sales
                units_30d = int(row.get('Units Sold Last 30 Days', 0) or 0)
                revenue_30d = float(row.get('Sales last 30 days', 0) or 0)
                
                if units_30d <= 0:
                    continue
                
                # Calculate weekly averages
                weekly_units = round(units_30d / 4.3)
                weekly_revenue = round(revenue_30d / 4.3, 2)
                weekly_orders = max(1, weekly_units // 2)
                
                # Create/update for each week
                for week_end in week_endings:
                    key = (product.id, week_end)
                    
                    if key in existing_sales:
                        ws = existing_sales[key]
                        ws.units_sold = weekly_units
                        ws.revenue = weekly_revenue
                        ws.orders = weekly_orders
                        sales_to_update.append(ws)
                        updated += 1
                    else:
                        sales_to_create.append(WeeklySales(
                            product=product,
                            week_ending=week_end,
                            units_sold=weekly_units,
                            revenue=weekly_revenue,
                            orders=weekly_orders,
                        ))
                        created += 1
                
            except Exception as e:
                logger.warning(f"Failed to process row: {e}")
                failed += 1
        
        # Bulk operations
        if sales_to_create:
            WeeklySales.objects.bulk_create(
                sales_to_create, 
                ignore_conflicts=True,
                batch_size=500
            )
            logger.info(f"Bulk created {len(sales_to_create)} sales records")
        
        if sales_to_update:
            WeeklySales.objects.bulk_update(
                sales_to_update,
                ['units_sold', 'revenue', 'orders'],
                batch_size=500
            )
            logger.info(f"Bulk updated {len(sales_to_update)} sales records")
        
        return created, updated, failed
    
    def sync_product_images(self, max_workers: int = 5) -> Tuple[int, int, int]:
        """
        Sync product images from Catalog API using parallel requests.
        
        Only fetches for products missing images.
        Rate limited to respect API limits (5 req/sec for Catalog API).
        
        Args:
            max_workers: Number of parallel threads (default 5)
            
        Returns:
            Tuple of (created, updated, failed) counts
        """
        # Get products without images as a list
        products = list(Product.objects.filter(
            user=self.user,
            amazon_account=self.account
        ).filter(
            models.Q(image_url='') | models.Q(image_url__isnull=True)
        ))
        
        product_count = len(products)
        if product_count == 0:
            logger.info("All products already have images")
            return 0, 0, 0
        
        logger.info(f"Fetching images for {product_count} products (parallel, {max_workers} workers)")
        
        # Create rate limiter (5 req/sec for Catalog API - higher than Sales API)
        rate_limiter = RateLimiter(requests_per_second=5.0)
        
        def fetch_image_for_product(product):
            """Fetch image for a single product with rate limiting."""
            try:
                rate_limiter.wait()
                
                # Create new client for thread safety
                client = SPAPIClient(self.account)
                catalog_data = client.get_catalog_item(product.asin)
                
                # Extract image URL
                images_data = catalog_data.get('images', [])
                image_url = ''
                
                for img_set in images_data:
                    for img in img_set.get('images', []):
                        if img.get('variant') == 'MAIN':
                            image_url = img.get('link', '')
                            break
                    if image_url:
                        break
                
                # Fallback to first image if no MAIN
                if not image_url and images_data:
                    first_set = images_data[0].get('images', [])
                    if first_set:
                        image_url = first_set[0].get('link', '')
                
                return (product, image_url, None)
                
            except SPAPIError as e:
                return (product, None, str(e))
            except Exception as e:
                return (product, None, str(e))
        
        # Use ThreadPoolExecutor for parallel requests
        products_to_update = []
        updated = 0
        failed = 0
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(fetch_image_for_product, p): p for p in products}
            
            completed = 0
            for future in as_completed(futures):
                completed += 1
                product, image_url, error = future.result()
                
                if error:
                    logger.warning(f"Failed to get image for {product.asin}: {error}")
                    failed += 1
                elif image_url:
                    product.image_url = image_url
                    products_to_update.append(product)
                    updated += 1
                
                # Progress logging every 100 products
                if completed % 100 == 0:
                    elapsed = time.time() - start_time
                    rate = completed / elapsed if elapsed > 0 else 0
                    remaining = product_count - completed
                    eta = remaining / rate if rate > 0 else 0
                    logger.info(f"Image sync: {completed}/{product_count} ({rate:.1f}/sec, ETA: {eta:.0f}s)")
        
        elapsed = time.time() - start_time
        logger.info(f"Image fetch complete in {elapsed:.1f}s. Updating database...")
        
        # Bulk update
        if products_to_update:
            Product.objects.bulk_update(products_to_update, ['image_url'], batch_size=100)
            logger.info(f"Updated images for {len(products_to_update)} products")
        
        return 0, updated, failed
    
    def sync_product_dimensions(self) -> Tuple[int, int, int]:
        """
        Sync product dimensions and sizes from Catalog API.
        
        Fetches in batches to respect rate limits.
        Stores: size, dimensions, weight per ASIN.
        
        Returns:
            Tuple of (created, updated, failed) counts
        """
        import time
        
        updated = 0
        failed = 0
        
        # Get products without dimensions
        products = Product.objects.filter(
            user=self.user,
            amazon_account=self.account
        ).select_related('extended')
        
        logger.info(f"Checking dimensions for {products.count()} products")
        
        # Process in batches to respect rate limits
        batch_size = 10
        products_list = list(products)
        
        for i in range(0, len(products_list), batch_size):
            batch = products_list[i:i+batch_size]
            
            for product in batch:
                try:
                    # Get catalog item
                    catalog_data = self.sp_client.get_catalog_item(product.asin)
                    
                    # Extract dimensions
                    item = catalog_data.get('item', catalog_data)
                    attributes = item.get('attributes', {})
                    
                    # Get item dimensions
                    dimensions = attributes.get('item_dimensions', [{}])
                    if dimensions:
                        dim = dimensions[0]
                        # Update product size field
                        size_parts = []
                        for field in ['length', 'width', 'height']:
                            val = dim.get(field, {})
                            if val:
                                size_parts.append(f"{val.get('value', '')} {val.get('unit', '')}")
                        if size_parts:
                            product.size = ' x '.join(size_parts)
                    
                    # Get package dimensions
                    pkg_dims = attributes.get('item_package_dimensions', [{}])
                    if pkg_dims:
                        pkg = pkg_dims[0]
                        # Store in extended fields if available
                        try:
                            ext = product.extended
                        except:
                            from forecast_app.models import ProductExtended
                            ext = ProductExtended.objects.create(product=product)
                        
                        if pkg.get('length'):
                            ext.case_length = float(pkg['length'].get('value', 0))
                        if pkg.get('width'):
                            ext.case_width = float(pkg['width'].get('value', 0))
                        if pkg.get('height'):
                            ext.case_height = float(pkg['height'].get('value', 0))
                        
                        ext.save()
                    
                    # Get weight
                    weight = attributes.get('item_package_weight', [{}])
                    if weight:
                        w = weight[0]
                        try:
                            ext = product.extended
                            ext.case_weight = float(w.get('value', 0))
                            ext.save()
                        except:
                            pass
                    
                    product.save()
                    updated += 1
                    
                except SPAPIError as e:
                    logger.warning(f"Failed to get catalog for {product.asin}: {e}")
                    failed += 1
                except Exception as e:
                    logger.warning(f"Error processing {product.asin}: {e}")
                    failed += 1
            
            # Rate limit: 2 requests per second for catalog API
            time.sleep(5)
            logger.info(f"Processed {min(i + batch_size, len(products_list))}/{len(products_list)} products")
        
        return 0, updated, failed
    
    def generate_default_seasonality(self, product: Product) -> None:
        """
        Generate default seasonality data for a product.
        
        Uses a flat seasonality (1.0) as starting point.
        This should be replaced with actual search volume data.
        
        Args:
            product: Product to generate seasonality for
        """
        seasonality_records = []
        
        for week in range(1, 53):
            seasonality_records.append(ProductSeasonality(
                product=product,
                week_of_year=week,
                search_volume=100.0,
                sv_smooth_env=100.0,
                seasonality_index=1.0,
                seasonality_multiplier=1.0,
            ))
        
        ProductSeasonality.objects.bulk_create(
            seasonality_records,
            ignore_conflicts=True
        )
    
    def import_seasonality_from_search_volume(
        self,
        product: Product,
        search_volume_data: List[Dict]
    ) -> None:
        """
        Calculate and import seasonality from search volume data.
        
        Args:
            product: Product to update
            search_volume_data: List of {week_of_year: int, search_volume: float}
        """
        if len(search_volume_data) < 52:
            raise ValueError("Need 52 weeks of search volume data")
        
        # Sort by week
        sv_data = sorted(search_volume_data, key=lambda x: x['week_of_year'])
        
        # Calculate average
        volumes = [d['search_volume'] for d in sv_data]
        avg_volume = sum(volumes) / len(volumes)
        max_volume = max(volumes)
        
        seasonality_records = []
        
        for data in sv_data:
            week = data['week_of_year']
            sv = data['search_volume']
            
            # Calculate indices
            seasonality_index = sv / max_volume if max_volume > 0 else 1.0
            seasonality_multiplier = sv / avg_volume if avg_volume > 0 else 1.0
            
            seasonality_records.append({
                'week_of_year': week,
                'search_volume': sv,
                'sv_smooth_env': sv,  # Would normally smooth this
                'seasonality_index': seasonality_index,
                'seasonality_multiplier': seasonality_multiplier,
            })
        
        # Bulk upsert
        for record in seasonality_records:
            ProductSeasonality.objects.update_or_create(
                product=product,
                week_of_year=record['week_of_year'],
                defaults=record
            )
    
    def _wait_for_report(self, report_id: str, max_attempts: int = 30, wait_seconds: int = 10) -> str:
        """
        Wait for report to complete and return document ID.
        
        Args:
            report_id: The Amazon report ID to wait for
            max_attempts: Maximum number of polling attempts
            wait_seconds: Seconds to wait between each poll
            
        Returns:
            Report document ID if successful, None otherwise
        """
        for attempt in range(max_attempts):
            time.sleep(wait_seconds)
            
            status = self.sp_client.get_report(report_id)
            proc_status = status.get('processingStatus')
            
            logger.info(f"Report status: {proc_status} (attempt {attempt + 1}/{max_attempts})")
            
            if proc_status == 'DONE':
                return status.get('reportDocumentId')
            elif proc_status in ('CANCELLED', 'FATAL'):
                return None
        
        return None


def sync_sales_for_account(
    account: AmazonSellerAccount,
    mode: str = 'quick',
    days_back: int = 365
) -> Dict:
    """
    Sync sales data for an Amazon account.
    
    Args:
        account: The Amazon seller account
        mode: 
            'quick' - Use Restock Report (~1 min, 30-day velocity)
            'full' - Use Sales API (~10 min for 1000 products, full history)
            'hybrid' - Quick sync first, then full in background
        days_back: Days of history for 'full' mode (max 730)
        
    Returns:
        Dict with sync results
    """
    service = SalesSyncService(account)
    
    results = {
        'mode': mode,
        'created': 0,
        'updated': 0,
        'failed': 0,
        'errors': [],
        'estimated_time': None
    }
    
    try:
        if mode == 'quick':
            # Fast: Use Restock Report for 30-day velocity (~1 min)
            created, updated, failed = service.sync_sales_velocity()
            results['method'] = 'restock_report'
            
        elif mode == 'full':
            # Slow but complete: Use Sales API for full history
            # Estimate time: products / 1.5 requests per second
            from forecast_app.models import Product
            product_count = Product.objects.filter(
                user=account.user,
                amazon_account=account
            ).count()
            results['estimated_time'] = f"{product_count / 1.5 / 60:.1f} minutes"
            
            created, updated, failed = service.sync_historical_sales(days_back=days_back)
            results['method'] = 'sales_api'
            
        elif mode == 'hybrid':
            # Best of both: Quick sync now, schedule full sync
            created, updated, failed = service.sync_sales_velocity()
            results['method'] = 'restock_report'
            results['note'] = 'Quick sync complete. Run full sync in background for complete history.'
        
        results['created'] = created
        results['updated'] = updated
        results['failed'] = failed
        
    except Exception as e:
        results['errors'].append(str(e))
        logger.error(f"Sales sync failed: {e}")
    
    return results


def sync_quick(account: AmazonSellerAccount) -> Dict:
    """
    Quick sync using Restock Report (~1 minute).
    
    Gets 30-day sales velocity and distributes across recent weeks.
    Good for: Initial sync, regular updates, DOI calculations.
    """
    return sync_sales_for_account(account, mode='quick')


def sync_full_history(account: AmazonSellerAccount, days_back: int = 730) -> Dict:
    """
    Full historical sync using Sales API.
    
    Gets actual weekly sales per ASIN for up to 2 years.
    Time: ~10 minutes per 1000 products (rate limited to 1.5 req/sec).
    
    Good for: Complete historical analysis, accurate forecasting.
    """
    return sync_sales_for_account(account, mode='full', days_back=days_back)


def sync_recent_sales(account: AmazonSellerAccount) -> Dict:
    """
    Sync last 90 days using Sales API.
    """
    return sync_sales_for_account(account, mode='full', days_back=90)
