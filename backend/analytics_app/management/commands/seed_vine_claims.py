"""
Seed Vine claims data from Excel file with parallel processing.
Usage: python manage.py seed_vine_claims --workers 20
"""
import os
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.core.management.base import BaseCommand
from django.conf import settings
import pandas as pd

from authentication_app.models import User
from forecast_app.models import Product, Brand
from analytics_app.models import VineClaim


class Command(BaseCommand):
    help = 'Seed Vine claims data from Excel file with parallel processing'

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
            default='excel/Vine Database.xlsx',
            help='Path to Excel file'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing vine claims data before seeding'
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
        
        # Filter out NaN rows (rows where ASIN is NaN)
        df = df.dropna(subset=['ASIN'])
        
        self.stdout.write(f"Found {len(df)} vine claim records (after filtering empty rows)")
        
        # Get or create default user
        user = self._get_or_create_user()
        self.stdout.write(f"Using user: {user.email}")
        
        if clear_existing:
            self.stdout.write("Clearing existing vine claims data...")
            VineClaim.objects.all().delete()
        
        # Split records into chunks for parallel processing
        records = list(df.iterrows())
        chunk_size = max(1, len(records) // workers)
        chunks = [records[i:i + chunk_size] for i in range(0, len(records), chunk_size)]
        
        self.stdout.write(f"Processing {len(records)} records in {len(chunks)} chunks with {workers} workers")
        
        # Track stats
        total_processed = 0
        total_created = 0
        errors = []
        
        # Process chunks in parallel
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(
                    self._process_chunk, 
                    chunk, 
                    user.id,
                    chunk_idx
                ): chunk_idx 
                for chunk_idx, chunk in enumerate(chunks)
            }
            
            for future in as_completed(futures):
                chunk_idx = futures[future]
                try:
                    processed, created, chunk_errors = future.result()
                    total_processed += processed
                    total_created += created
                    errors.extend(chunk_errors)
                    self.stdout.write(
                        f"  Chunk {chunk_idx + 1}/{len(chunks)}: "
                        f"{processed} processed, {created} created"
                    )
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  Chunk {chunk_idx + 1} failed: {str(e)}"))
                    errors.append(str(e))
        
        elapsed = time.time() - start_time
        
        self.stdout.write(self.style.SUCCESS(
            f"\nCompleted in {elapsed:.2f} seconds\n"
            f"  Records processed: {total_processed}\n"
            f"  Vine claims created: {total_created}\n"
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

    def _process_chunk(self, chunk, user_id, chunk_idx):
        """Process a chunk of vine claims - runs in thread"""
        from django.db import connection
        connection.close()  # Close inherited connection, get new one
        
        processed = 0
        created = 0
        errors = []
        
        for idx, row in chunk:
            try:
                asin = str(row.get('ASIN', '')).strip()
                if not asin or asin == 'nan':
                    continue
                
                sku = str(row.get('SKU', '')).strip() if pd.notna(row.get('SKU')) else ''
                product_name = str(row.get('Product', '')).strip() if pd.notna(row.get('Product')) else ''
                vine_status = str(row.get('Vine_Status', '')).strip() if pd.notna(row.get('Vine_Status')) else ''
                claim_date = row.get('Date')
                units_claimed = row.get('Units_Claimed')
                
                # Skip if no date
                if pd.isna(claim_date):
                    continue
                
                # Convert date
                if isinstance(claim_date, datetime):
                    claim_date = claim_date.date()
                else:
                    claim_date = pd.to_datetime(claim_date).date()
                
                # Convert units
                units = int(float(units_claimed)) if pd.notna(units_claimed) else 0
                
                # Get or create brand
                brand, _ = Brand.objects.get_or_create(
                    user_id=user_id,
                    name='TPS Nutrients',
                    defaults={'marketplace': 'Amazon', 'country': 'US'}
                )
                
                # Get or create product
                product, _ = Product.objects.get_or_create(
                    user_id=user_id,
                    asin=asin,
                    defaults={
                        'name': product_name[:500] if product_name else f'Product {asin}',
                        'sku': sku[:100] if sku else '',
                        'brand': brand,
                        'status': 'launched',
                        'is_active': True,
                    }
                )
                
                # Determine review status based on Vine_Status
                review_received = vine_status.lower() not in ['awaiting reviews', 'awaiting review', '']
                
                # Create or update vine claim
                vine_claim, vine_created = VineClaim.objects.update_or_create(
                    product=product,
                    claim_date=claim_date,
                    defaults={
                        'units_claimed': units,
                        'review_received': review_received,
                        'notes': f'Status: {vine_status}' if vine_status else '',
                    }
                )
                
                processed += 1
                if vine_created:
                    created += 1
                
            except Exception as e:
                errors.append(f"Row {idx} ({asin}): {str(e)}")
        
        return processed, created, errors
