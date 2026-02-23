"""
Seed weekly sales data from Excel file with parallel processing.
Usage: python manage.py seed_weekly_sales --workers 20
"""
import os
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.conf import settings
import pandas as pd

from authentication_app.models import User
from forecast_app.models import Product, Brand
from analytics_app.models import WeeklySales


class Command(BaseCommand):
    help = 'Seed weekly sales data from Excel file with parallel processing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--workers',
            type=int,
            default=20,
            help='Number of parallel workers (default: 20)'
        )
        parser.add_argument(
            '--file',
            type=str,
            default='excel/Units Sold Database.xlsx',
            help='Path to Excel file'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing weekly sales data before seeding'
        )

    def handle(self, *args, **options):
        start_time = time.time()
        workers = options['workers']
        file_path = options['file']
        clear_existing = options['clear']
        
        # Resolve file path
        if not os.path.isabs(file_path):
            file_path = os.path.join(settings.BASE_DIR.parent, file_path)
        
        self.stdout.write(f"Reading Excel file: {file_path}")
        
        # Read Excel file
        df = pd.read_excel(file_path)
        self.stdout.write(f"Found {len(df)} products with {len(df.columns) - 4} weeks of data")
        
        # Get or create default user
        user = self._get_or_create_user()
        self.stdout.write(f"Using user: {user.email}")
        
        if clear_existing:
            self.stdout.write("Clearing existing weekly sales data...")
            WeeklySales.objects.all().delete()
        
        # Prepare data - identify date columns
        date_columns = [col for col in df.columns if isinstance(col, datetime)]
        self.stdout.write(f"Found {len(date_columns)} date columns")
        
        # Split products into chunks for parallel processing
        product_rows = list(df.iterrows())
        chunk_size = max(1, len(product_rows) // workers)
        chunks = [product_rows[i:i + chunk_size] for i in range(0, len(product_rows), chunk_size)]
        
        self.stdout.write(f"Processing {len(product_rows)} products in {len(chunks)} chunks with {workers} workers")
        
        # Track stats
        total_products = 0
        total_sales_records = 0
        errors = []
        
        # Process chunks in parallel
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(
                    self._process_chunk, 
                    chunk, 
                    date_columns, 
                    user.id,
                    chunk_idx
                ): chunk_idx 
                for chunk_idx, chunk in enumerate(chunks)
            }
            
            for future in as_completed(futures):
                chunk_idx = futures[future]
                try:
                    products_processed, sales_created, chunk_errors = future.result()
                    total_products += products_processed
                    total_sales_records += sales_created
                    errors.extend(chunk_errors)
                    self.stdout.write(
                        f"  Chunk {chunk_idx + 1}/{len(chunks)}: "
                        f"{products_processed} products, {sales_created} sales records"
                    )
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  Chunk {chunk_idx + 1} failed: {str(e)}"))
                    errors.append(str(e))
        
        elapsed = time.time() - start_time
        
        self.stdout.write(self.style.SUCCESS(
            f"\nCompleted in {elapsed:.2f} seconds\n"
            f"  Products processed: {total_products}\n"
            f"  Weekly sales records created: {total_sales_records}\n"
            f"  Errors: {len(errors)}"
        ))
        
        if errors[:5]:
            self.stdout.write(self.style.WARNING(f"First 5 errors: {errors[:5]}"))

    def _get_or_create_user(self):
        """Get or create a default user for seeding"""
        user = User.objects.filter(is_superuser=True).first()
        if not user:
            user = User.objects.first()
        if not user:
            user = User.objects.create_user(
                email='admin@tpsnutrients.com',
                password='admin123',
                is_staff=True,
                is_superuser=True
            )
        return user

    def _process_chunk(self, chunk, date_columns, user_id, chunk_idx):
        """Process a chunk of products - runs in thread"""
        from django.db import connection
        connection.close()  # Close inherited connection, get new one
        
        products_processed = 0
        sales_created = 0
        errors = []
        
        for idx, row in chunk:
            try:
                asin = str(row.get('(Child) ASIN', '')).strip()
                if not asin or asin == 'nan':
                    continue
                
                product_name = str(row.get('Product', '')).strip()
                brand_name = str(row.get('Brand', '')).strip() if pd.notna(row.get('Brand')) else 'TPS Nutrients'
                size = str(row.get('Size', '')).strip() if pd.notna(row.get('Size')) else ''
                
                # Get or create brand
                brand, _ = Brand.objects.get_or_create(
                    user_id=user_id,
                    name=brand_name if brand_name and brand_name != 'nan' else 'TPS Nutrients',
                    defaults={'marketplace': 'Amazon', 'country': 'US'}
                )
                
                # Get or create product
                product, created = Product.objects.get_or_create(
                    user_id=user_id,
                    asin=asin,
                    defaults={
                        'name': product_name[:500] if product_name else f'Product {asin}',
                        'size': size[:100] if size else '',
                        'brand': brand,
                        'status': 'launched',
                        'is_active': True,
                    }
                )
                
                # Prepare weekly sales records
                sales_records = []
                for date_col in date_columns:
                    units = row.get(date_col)
                    if pd.notna(units) and units != '' and units != 0:
                        try:
                            units_int = int(float(units))
                            if units_int >= 0:
                                sales_records.append(WeeklySales(
                                    product=product,
                                    week_ending=date_col.date(),
                                    units_sold=units_int,
                                    revenue=0,  # Not in Excel
                                    orders=0,   # Not in Excel
                                ))
                        except (ValueError, TypeError):
                            pass
                
                # Bulk create weekly sales (delete existing first to avoid conflicts)
                if sales_records:
                    WeeklySales.objects.filter(
                        product=product,
                        week_ending__in=[s.week_ending for s in sales_records]
                    ).delete()
                    WeeklySales.objects.bulk_create(sales_records, ignore_conflicts=True)
                    sales_created += len(sales_records)
                
                products_processed += 1
                
            except Exception as e:
                errors.append(f"Row {idx} ({asin}): {str(e)}")
        
        return products_processed, sales_created, errors
