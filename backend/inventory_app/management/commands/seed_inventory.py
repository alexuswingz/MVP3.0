"""
Seed inventory data from Inventory Database.xlsx
Uses parallel processing for faster import (20 workers by default)
"""
import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

from authentication_app.models import User
from forecast_app.models import Brand, Product
from inventory_app.models import CurrentInventory, InventorySnapshot


class Command(BaseCommand):
    help = 'Seed inventory data from Excel file (FBA + AWD)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='../excel/Inventory Database.xlsx',
            help='Path to the Inventory Database Excel file'
        )
        parser.add_argument(
            '--workers',
            type=int,
            default=20,
            help='Number of parallel workers for processing'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing inventory data before import'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        workers = options['workers']
        clear = options['clear']

        if not os.path.exists(file_path):
            self.stderr.write(f"File not found: {file_path}")
            return

        self.stdout.write(f"Loading inventory data from: {file_path}", ending='\n')
        self.stdout.flush()

        # Get or create default user
        user, _ = User.objects.get_or_create(
            email='admin@tpsnutrients.com',
            defaults={'is_staff': True, 'is_superuser': True}
        )

        # Get or create default brand
        brand, _ = Brand.objects.get_or_create(
            user=user,
            name='TPS Nutrients',
            defaults={'description': 'Default brand for TPS Nutrients products'}
        )

        if clear:
            self.stdout.write("Clearing existing inventory data...", ending='\n')
            self.stdout.flush()
            CurrentInventory.objects.all().delete()
            InventorySnapshot.objects.all().delete()

        try:
            # Read FBA Inventory sheet
            self.stdout.write("Reading FBA Inventory sheet...", ending='\n')
            self.stdout.flush()
            df_fba = pd.read_excel(file_path, sheet_name='FBAInventory')
            self.stdout.write(f"FBA sheet: {len(df_fba)} rows", ending='\n')
            self.stdout.flush()

            # Read AWD Inventory sheet (header on row 3, 0-indexed)
            self.stdout.write("Reading AWD Inventory sheet...", ending='\n')
            self.stdout.flush()
            df_awd = pd.read_excel(file_path, sheet_name='AWDInventory', header=3)
            self.stdout.write(f"AWD sheet: {len(df_awd)} rows", ending='\n')
            self.stdout.flush()

            # Clean AWD column names (remove newlines, extra spaces)
            df_awd.columns = [str(c).strip().replace('\n', ' ') if c else f'col_{i}' 
                            for i, c in enumerate(df_awd.columns)]

            # Build a dictionary of ASIN -> FBA data
            fba_data = {}
            for _, row in df_fba.iterrows():
                asin = str(row.get('asin', '')).strip()
                if asin and asin != 'nan':
                    fba_data[asin] = {
                        'sku': str(row.get('sku', '')),
                        'product_name': str(row.get('product-name', '')),
                        'fba_available': self._safe_int(row.get('available', 0)),
                        'fba_reserved': self._safe_int(row.get('Total Reserved Quantity', 0)),
                        'fba_inbound': self._safe_int(row.get('inbound-quantity', 0)),
                        'fba_inbound_working': self._safe_int(row.get('inbound-working', 0)),
                        'fba_inbound_shipped': self._safe_int(row.get('inbound-shipped', 0)),
                        'fba_inbound_receiving': self._safe_int(row.get('inbound-received', 0)),
                        'fba_unfulfillable': self._safe_int(row.get('unfulfillable-quantity', 0)),
                        'fba_reserved_customer_order': self._safe_int(row.get('Reserved Customer Order', 0)),
                        'fba_reserved_fc_transfer': self._safe_int(row.get('Reserved FC Transfer', 0)),
                        'fba_reserved_fc_processing': self._safe_int(row.get('Reserved FC Processing', 0)),
                        'age_0_to_90': self._safe_int(row.get('inv-age-0-to-90-days', 0)),
                        'age_91_to_180': self._safe_int(row.get('inv-age-91-to-180-days', 0)),
                        'age_181_to_270': self._safe_int(row.get('inv-age-181-to-270-days', 0)),
                        'age_271_to_365': self._safe_int(row.get('inv-age-271-to-365-days', 0)),
                        'age_365_plus': self._safe_int(row.get('inv-age-456-plus-days', 0)),
                        'days_of_supply': self._safe_float(row.get('days-of-supply', 0)),
                    }

            # Build a dictionary of ASIN -> AWD data
            awd_data = {}
            for _, row in df_awd.iterrows():
                asin = str(row.get('ASIN', '')).strip()
                if asin and asin != 'nan' and asin != 'None':
                    awd_data[asin] = {
                        'product_name': str(row.get('Product Name', '')),
                        'awd_available': self._safe_int(row.get('Available in AWD (units)', 0)),
                        'awd_reserved': self._safe_int(row.get('Reserved in AWD (units)', 0)),
                        'awd_inbound': self._safe_int(row.get('Inbound to AWD (units)', 0)),
                        'awd_outbound_to_fba': self._safe_int(row.get('Outbound to FBA (units)', 0)),
                    }

            # Merge FBA and AWD data by ASIN
            all_asins = set(fba_data.keys()) | set(awd_data.keys())
            self.stdout.write(f"Total unique ASINs: {len(all_asins)}", ending='\n')
            self.stdout.flush()

            merged_data = []
            for asin in all_asins:
                fba = fba_data.get(asin, {})
                awd = awd_data.get(asin, {})
                merged = {
                    'asin': asin,
                    'product_name': fba.get('product_name') or awd.get('product_name', ''),
                    'fba_available': fba.get('fba_available', 0),
                    'fba_reserved': fba.get('fba_reserved', 0),
                    'fba_inbound': fba.get('fba_inbound', 0),
                    'fba_inbound_working': fba.get('fba_inbound_working', 0),
                    'fba_inbound_shipped': fba.get('fba_inbound_shipped', 0),
                    'fba_inbound_receiving': fba.get('fba_inbound_receiving', 0),
                    'fba_unfulfillable': fba.get('fba_unfulfillable', 0),
                    'fba_reserved_customer_order': fba.get('fba_reserved_customer_order', 0),
                    'fba_reserved_fc_transfer': fba.get('fba_reserved_fc_transfer', 0),
                    'fba_reserved_fc_processing': fba.get('fba_reserved_fc_processing', 0),
                    'age_0_to_90': fba.get('age_0_to_90', 0),
                    'age_91_to_180': fba.get('age_91_to_180', 0),
                    'age_181_to_270': fba.get('age_181_to_270', 0),
                    'age_271_to_365': fba.get('age_271_to_365', 0),
                    'age_365_plus': fba.get('age_365_plus', 0),
                    'days_of_supply': fba.get('days_of_supply', 0),
                    'awd_available': awd.get('awd_available', 0),
                    'awd_reserved': awd.get('awd_reserved', 0),
                    'awd_inbound': awd.get('awd_inbound', 0),
                    'awd_outbound_to_fba': awd.get('awd_outbound_to_fba', 0),
                }
                merged_data.append(merged)

            # Process in parallel
            chunk_size = max(1, len(merged_data) // workers)
            chunks = [merged_data[i:i + chunk_size] for i in range(0, len(merged_data), chunk_size)]

            success_count = 0
            error_count = 0

            self.stdout.write(f"Processing {len(merged_data)} inventory records with {workers} workers...", ending='\n')
            self.stdout.flush()

            with ThreadPoolExecutor(max_workers=workers) as executor:
                futures = {
                    executor.submit(self._process_chunk, chunk, user, brand): i
                    for i, chunk in enumerate(chunks)
                }

                for future in as_completed(futures):
                    chunk_idx = futures[future]
                    try:
                        result = future.result()
                        success_count += result['success']
                        error_count += result['errors']
                        self.stdout.write(
                            f"Chunk {chunk_idx + 1}/{len(chunks)} complete: "
                            f"{result['success']} success, {result['errors']} errors",
                            ending='\n'
                        )
                        self.stdout.flush()
                    except Exception as e:
                        self.stderr.write(f"Chunk {chunk_idx + 1} failed: {str(e)}")

            self.stdout.write(
                f"\nImport complete: {success_count} records imported, {error_count} errors",
                ending='\n'
            )
            self.stdout.flush()

        except Exception as e:
            self.stderr.write(f"Error during import: {str(e)}")
            import traceback
            traceback.print_exc()

    def _safe_int(self, value):
        """Convert value to int safely"""
        if pd.isna(value):
            return 0
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    def _safe_float(self, value):
        """Convert value to float safely"""
        if pd.isna(value):
            return 0.0
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def _process_chunk(self, chunk, user, brand):
        """Process a chunk of inventory records"""
        success = 0
        errors = 0

        for record in chunk:
            try:
                with transaction.atomic():
                    # Get or create product
                    product, _ = Product.objects.get_or_create(
                        asin=record['asin'],
                        user=user,
                        defaults={
                            'name': record['product_name'][:200] if record['product_name'] else record['asin'],
                            'brand': brand,
                            'sku': record['asin'],
                        }
                    )

                    # Update or create CurrentInventory
                    inventory, created = CurrentInventory.objects.update_or_create(
                        product=product,
                        defaults={
                            'fba_available': record['fba_available'],
                            'fba_reserved': record['fba_reserved'],
                            'fba_inbound': record['fba_inbound'],
                            'fba_inbound_working': record['fba_inbound_working'],
                            'fba_inbound_shipped': record['fba_inbound_shipped'],
                            'fba_inbound_receiving': record['fba_inbound_receiving'],
                            'fba_unfulfillable': record['fba_unfulfillable'],
                            'fba_reserved_customer_order': record['fba_reserved_customer_order'],
                            'fba_reserved_fc_transfer': record['fba_reserved_fc_transfer'],
                            'fba_reserved_fc_processing': record['fba_reserved_fc_processing'],
                            'awd_available': record['awd_available'],
                            'awd_reserved': record['awd_reserved'],
                            'awd_inbound': record['awd_inbound'],
                            'awd_outbound_to_fba': record['awd_outbound_to_fba'],
                            'age_0_to_90': record['age_0_to_90'],
                            'age_91_to_180': record['age_91_to_180'],
                            'age_181_to_270': record['age_181_to_270'],
                            'age_271_to_365': record['age_271_to_365'],
                            'age_365_plus': record['age_365_plus'],
                            'days_of_supply': record['days_of_supply'],
                        }
                    )

                    # Create a snapshot record for historical tracking
                    InventorySnapshot.objects.create(
                        product=product,
                        snapshot_date=datetime.now(),
                        fba_available=record['fba_available'],
                        fba_reserved=record['fba_reserved'],
                        fba_inbound=record['fba_inbound'],
                        fba_inbound_working=record['fba_inbound_working'],
                        fba_inbound_shipped=record['fba_inbound_shipped'],
                        fba_inbound_receiving=record['fba_inbound_receiving'],
                        fba_unfulfillable=record['fba_unfulfillable'],
                        fba_reserved_customer_order=record['fba_reserved_customer_order'],
                        fba_reserved_fc_transfer=record['fba_reserved_fc_transfer'],
                        fba_reserved_fc_processing=record['fba_reserved_fc_processing'],
                        awd_available=record['awd_available'],
                        awd_reserved=record['awd_reserved'],
                        awd_inbound=record['awd_inbound'],
                        awd_outbound_to_fba=record['awd_outbound_to_fba'],
                        age_0_to_90=record['age_0_to_90'],
                        age_91_to_180=record['age_91_to_180'],
                        age_181_to_270=record['age_181_to_270'],
                        age_271_to_365=record['age_271_to_365'],
                        age_365_plus=record['age_365_plus'],
                        days_of_supply=record['days_of_supply'],
                    )

                    success += 1

            except Exception as e:
                errors += 1

        return {'success': success, 'errors': errors}
