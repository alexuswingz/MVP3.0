import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.core.management.base import BaseCommand
from django.db import connection, transaction
import pandas as pd

from authentication_app.models import User
from forecast_app.models import Brand, Product
from inventory_app.models import LabelInventory


class Command(BaseCommand):
    help = 'Seed label inventory data from Excel file with parallel processing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='../excel/Label Database.xlsx',
            help='Path to the Excel file'
        )
        parser.add_argument(
            '--workers',
            type=int,
            default=20,
            help='Number of parallel workers (default: 20)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing label inventory data before seeding'
        )

    def handle(self, *args, **options):
        import sys
        file_path = options['file']
        workers = options['workers']
        
        if not os.path.exists(file_path):
            self.stderr.write(self.style.ERROR(f'File not found: {file_path}'))
            return
        
        print(f'Reading Excel file: {file_path}', flush=True)
        df = pd.read_excel(file_path)
        
        print(f'Found {len(df)} rows in the Excel file', flush=True)
        print(f'Columns: {list(df.columns)}', flush=True)
        
        df = df.dropna(subset=['(Child) ASIN'])
        print(f'After filtering: {len(df)} rows with valid ASIN', flush=True)
        
        if options['clear']:
            print('Clearing existing label inventory data...', flush=True)
            LabelInventory.objects.all().delete()
            print('Cleared existing data', flush=True)
        
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.first()
        if not admin_user:
            print('ERROR: No users found. Please create a user first.', flush=True)
            return
        
        print(f'Using user: {admin_user.email}', flush=True)
        
        chunk_size = max(1, len(df) // workers)
        chunks = [df.iloc[i:i + chunk_size] for i in range(0, len(df), chunk_size)]
        
        print(f'Processing {len(chunks)} chunks with {workers} workers...', flush=True)
        
        total_created = 0
        total_updated = 0
        total_errors = 0
        
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(self._process_chunk, chunk, admin_user.id, idx): idx 
                for idx, chunk in enumerate(chunks)
            }
            
            for future in as_completed(futures):
                chunk_idx = futures[future]
                try:
                    created, updated, errors = future.result()
                    total_created += created
                    total_updated += updated
                    total_errors += errors
                    print(f'Chunk {chunk_idx + 1}/{len(chunks)}: {created} created, {updated} updated, {errors} errors', flush=True)
                except Exception as e:
                    print(f'ERROR: Chunk {chunk_idx + 1} failed: {str(e)}', flush=True)
                    total_errors += 1
        
        print(f'Done! Created: {total_created}, Updated: {total_updated}, Errors: {total_errors}', flush=True)

    def _process_chunk(self, chunk, user_id, chunk_idx):
        created = 0
        updated = 0
        errors = 0
        
        connection.ensure_connection()
        
        user = User.objects.get(id=user_id)
        
        for _, row in chunk.iterrows():
            try:
                asin = str(row['(Child) ASIN']).strip()
                brand_name = str(row['Brand']).strip() if pd.notna(row['Brand']) else 'Unknown'
                product_name = str(row['Product']).strip() if pd.notna(row['Product']) else asin
                size = str(row['Size']).strip() if pd.notna(row['Size']) else ''
                label_qty = int(row['label_inventory']) if pd.notna(row['label_inventory']) else 0
                
                with transaction.atomic():
                    brand, _ = Brand.objects.get_or_create(
                        name=brand_name,
                        user=user,
                        defaults={'is_active': True}
                    )
                    
                    product, _ = Product.objects.get_or_create(
                        asin=asin,
                        user=user,
                        defaults={
                            'name': product_name,
                            'brand': brand,
                            'size': size,
                            'is_active': True
                        }
                    )
                    
                    label_inv, was_created = LabelInventory.objects.update_or_create(
                        product=product,
                        defaults={
                            'quantity': label_qty,
                        }
                    )
                    
                    if was_created:
                        created += 1
                    else:
                        updated += 1
                        
            except Exception as e:
                errors += 1
        
        return created, updated, errors
