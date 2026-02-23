"""
Parallel seeding command using 20 workers for maximum speed.
Uses multiprocessing and bulk operations for fast data import.

Usage: python manage.py seed_parallel --file ../excel/1000 Bananas Database.xlsx --user admin@tpsnutrients.com
"""
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial

import pandas as pd
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction, connection

User = get_user_model()

DEFAULT_WORKERS = 20
DEFAULT_BATCH_SIZE = 50


class Command(BaseCommand):
    help = 'Parallel seed database from Excel file using multiple workers'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True, help='Path to Excel file')
        parser.add_argument('--user', type=str, required=True, help='User email to assign products to')
        parser.add_argument('--workers', type=int, default=DEFAULT_WORKERS, help='Number of parallel workers (default: 20)')
        parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE, help='Batch size per worker')
        parser.add_argument('--clear', action='store_true', help='Clear existing data before import')

    def handle(self, *args, **options):
        file_path = options['file']
        user_email = options['user']
        workers = options['workers']
        batch_size = options['batch_size']
        clear = options['clear']

        start_time = time.time()

        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f'User {user_email} not found'))
            return

        self.stdout.write(f'Parallel seeding with {workers} workers')
        self.stdout.write(f'User: {user.email}')
        self.stdout.write(f'File: {file_path}')

        # Read and normalize data
        self.stdout.write('Reading Excel file...')
        data = self._read_and_normalize_excel(file_path)
        
        if not data:
            self.stderr.write(self.style.ERROR('No valid data found'))
            return

        self.stdout.write(f'Found {len(data["products"])} products to import')

        if clear:
            self._clear_data(user)

        # Phase 1: Create reference tables (sequential - small data)
        self.stdout.write('\n[Phase 1] Creating reference tables...')
        refs = self._create_reference_tables(user, data)
        
        # Phase 2: Create products in parallel
        self.stdout.write(f'\n[Phase 2] Creating products with {workers} workers...')
        product_map = self._parallel_create_products(user, data['products'], refs, workers, batch_size)
        
        # Phase 3: Create extended records in parallel
        self.stdout.write(f'\n[Phase 3] Creating extended records with {workers} workers...')
        self._parallel_create_extended(user, data['products'], product_map, refs, workers, batch_size)

        elapsed = time.time() - start_time
        self.stdout.write(self.style.SUCCESS(f'\nSeeding complete in {elapsed:.2f}s'))
        self._print_stats(user)

    def _safe_str(self, val):
        """Safely convert value to string"""
        if pd.isna(val):
            return ''
        s = str(val).strip()
        return '' if s.lower() == 'nan' else s

    def _read_and_normalize_excel(self, file_path):
        """Read Excel and normalize data into clean dictionaries"""
        try:
            # Read main catalog
            df = pd.read_excel(file_path, sheet_name='CatalogDataBase', header=4)
            df = df.dropna(subset=['Product Name'])
            df = df[df['Product Name'].str.strip() != '']
        except Exception as e:
            self.stderr.write(f'Error reading CatalogDataBase: {e}')
            return None

        # Read formulas
        formulas = []
        try:
            fdf = pd.read_excel(file_path, sheet_name='FormulaDatabase', header=1)
            formula_col = fdf.columns[1] if len(fdf.columns) > 1 else fdf.columns[0]
            formulas = [self._safe_str(n) for n in fdf[formula_col].dropna().unique() 
                       if self._safe_str(n)]
        except:
            pass

        # Extract unique values for reference tables
        brands = list(set(self._safe_str(n) for n in df['Brand Name'].dropna().unique() if self._safe_str(n)))
        packaging = list(set(self._safe_str(n) for n in df['Packaging Name'].dropna().unique() if self._safe_str(n)))
        closures = list(set(self._safe_str(n) for n in df['Closure Name'].dropna().unique() if self._safe_str(n)))

        # Normalize products
        products = []
        for _, row in df.iterrows():
            name = self._safe_str(row.get('Product Name'))
            if not name:
                continue

            # Parse status
            status_map = {'launched': 'launched', 'pending': 'pending', 'discontinued': 'discontinued'}
            raw_status = self._safe_str(row.get('Status')).lower()
            status = status_map.get(raw_status, 'draft')

            # Parse hazmat
            hazmat = self._safe_str(row.get('Hazmat')).lower()
            is_hazmat = hazmat in ['yes', 'true', '1']

            # Parse launch date
            launch_date = None
            if pd.notna(row.get('Launch Date')):
                try:
                    launch_date = pd.to_datetime(row['Launch Date']).date().isoformat()
                except:
                    pass

            # Parse price
            price = None
            if pd.notna(row.get('Price')):
                try:
                    price = float(row['Price'])
                except:
                    pass

            products.append({
                'name': name,
                'brand': self._safe_str(row.get('Brand Name')),
                'asin': self._safe_str(row.get('Child ASIN')),
                'parent_asin': self._safe_str(row.get('Parent ASIN')),
                'sku': self._safe_str(row.get('CHILD SKU\nFINAL')),
                'upc': self._safe_str(row.get('UPC')),
                'size': self._safe_str(row.get('Size')),
                'product_type': self._safe_str(row.get('Type')),
                'status': status,
                'is_hazmat': is_hazmat,
                'launch_date': launch_date,
                # Extended fields
                'packaging': self._safe_str(row.get('Packaging Name')),
                'closure': self._safe_str(row.get('Closure Name')),
                'formula': self._safe_str(row.get('Formula')),
                'label_location': self._safe_str(row.get('Label Location')),
                'price': price,
                'product_title': self._safe_str(row.get('Product Title')) or self._safe_str(row.get('Title')),
                'bullets': self._safe_str(row.get('Bullets')),
                'description': self._safe_str(row.get('Description')),
                'notes': self._safe_str(row.get('Notes')),
                'core_competitor_asins': self._safe_str(row.get('Core Competitor ASINS')),
                'other_competitor_asins': self._safe_str(row.get('Other Competitor ASINS')),
                'core_keywords': self._safe_str(row.get('Core Keywords')),
                'other_keywords': self._safe_str(row.get('Other Keywords')),
            })

        return {
            'brands': brands,
            'packaging': packaging,
            'closures': closures,
            'formulas': formulas,
            'products': products,
        }

    def _clear_data(self, user):
        """Clear existing data for user"""
        from forecast_app.models import Product, Brand, PackagingType, Closure, Formula, ProductExtended
        
        self.stdout.write('Clearing existing data...')
        with transaction.atomic():
            ProductExtended.objects.filter(product__user=user).delete()
            Product.objects.filter(user=user).delete()
            Brand.objects.filter(user=user).delete()
            PackagingType.objects.filter(user=user).delete()
            Closure.objects.filter(user=user).delete()
            Formula.objects.filter(user=user).delete()
        self.stdout.write('  Cleared!')

    def _create_reference_tables(self, user, data):
        """Create reference tables (brands, packaging, closures, formulas)"""
        from forecast_app.models import Brand, PackagingType, Closure, Formula

        refs = {}

        # Brands
        existing_brands = {b.name: b for b in Brand.objects.filter(user=user)}
        to_create = [Brand(user=user, name=n, marketplace='Amazon', country='US') 
                    for n in data['brands'] if n not in existing_brands]
        if to_create:
            Brand.objects.bulk_create(to_create, ignore_conflicts=True)
        refs['brands'] = {b.name: b.id for b in Brand.objects.filter(user=user)}
        self.stdout.write(f'  Brands: {len(refs["brands"])}')

        # Packaging
        existing_pkg = {p.name: p for p in PackagingType.objects.filter(user=user)}
        to_create = [PackagingType(user=user, name=n) for n in data['packaging'] if n not in existing_pkg]
        if to_create:
            PackagingType.objects.bulk_create(to_create, ignore_conflicts=True)
        refs['packaging'] = {p.name: p.id for p in PackagingType.objects.filter(user=user)}
        self.stdout.write(f'  Packaging: {len(refs["packaging"])}')

        # Closures
        existing_cls = {c.name: c for c in Closure.objects.filter(user=user)}
        to_create = [Closure(user=user, name=n) for n in data['closures'] if n not in existing_cls]
        if to_create:
            Closure.objects.bulk_create(to_create, ignore_conflicts=True)
        refs['closures'] = {c.name: c.id for c in Closure.objects.filter(user=user)}
        self.stdout.write(f'  Closures: {len(refs["closures"])}')

        # Formulas
        existing_form = {f.name: f for f in Formula.objects.filter(user=user)}
        to_create = [Formula(user=user, name=n) for n in data['formulas'] if n not in existing_form]
        if to_create:
            Formula.objects.bulk_create(to_create, ignore_conflicts=True)
        refs['formulas'] = {f.name: f.id for f in Formula.objects.filter(user=user)}
        self.stdout.write(f'  Formulas: {len(refs["formulas"])}')

        return refs

    def _parallel_create_products(self, user, products, refs, workers, batch_size):
        """Create products using parallel workers"""
        from forecast_app.models import Product
        from datetime import date

        # Get existing products by SKU (unique identifier)
        existing = {p.sku: p.id for p in Product.objects.filter(user=user) if p.sku}

        # Split products into batches - use SKU as unique key
        new_products = [p for p in products if p['sku'] and p['sku'] not in existing]
        batches = [new_products[i:i + batch_size] for i in range(0, len(new_products), batch_size)]

        if not batches:
            self.stdout.write('  No new products to create')
            return {p.name: p.id for p in Product.objects.filter(user=user)}

        created_count = 0
        total_batches = len(batches)

        def create_batch(batch_data, user_id, brand_refs, max_retries=3):
            """Worker function to create a batch of products with retry on deadlock"""
            from forecast_app.models import Product
            from django.contrib.auth import get_user_model
            from datetime import date
            import time
            import random
            
            User = get_user_model()
            user = User.objects.get(id=user_id)
            
            objs = []
            for p in batch_data:
                launch = None
                if p['launch_date']:
                    try:
                        launch = date.fromisoformat(p['launch_date'])
                    except:
                        pass
                
                objs.append(Product(
                    user=user,
                    brand_id=brand_refs.get(p['brand']),
                    name=p['name'],
                    asin=p['asin'],
                    parent_asin=p['parent_asin'],
                    sku=p['sku'],
                    upc=p['upc'],
                    size=p['size'],
                    product_type=p['product_type'],
                    status=p['status'],
                    is_hazmat=p['is_hazmat'],
                    launch_date=launch,
                    is_active=True,
                ))
            
            for attempt in range(max_retries):
                try:
                    with transaction.atomic():
                        Product.objects.bulk_create(objs, ignore_conflicts=True)
                    return len(objs)
                except Exception as e:
                    if 'deadlock' in str(e).lower() and attempt < max_retries - 1:
                        time.sleep(random.uniform(0.1, 0.5))
                        continue
                    raise
            
            return len(objs)

        # Execute batches in parallel
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = []
            for batch in batches:
                future = executor.submit(create_batch, batch, user.id, refs['brands'])
                futures.append(future)

            for i, future in enumerate(as_completed(futures)):
                try:
                    count = future.result()
                    created_count += count
                    self.stdout.write(f'  Batch {i+1}/{total_batches} complete ({count} products)')
                except Exception as e:
                    self.stderr.write(f'  Batch failed: {e}')

        self.stdout.write(f'  Total products created: {created_count}')
        
        # Return updated mapping by SKU (unique key)
        return {p.sku: p.id for p in Product.objects.filter(user=user) if p.sku}

    def _parallel_create_extended(self, user, products, product_map, refs, workers, batch_size):
        """Create extended records using parallel workers"""
        from forecast_app.models import ProductExtended

        # Delete all existing extended records for this user (fresh start after products created)
        deleted_count = ProductExtended.objects.filter(product__user=user).delete()[0]
        if deleted_count:
            self.stdout.write(f'  Cleared {deleted_count} existing extended records')

        # Create extended records for all products (use SKU as key)
        to_create = []
        for p in products:
            product_id = product_map.get(p['sku'])
            if product_id:
                to_create.append({
                    'product_id': product_id,
                    **p
                })

        if not to_create:
            self.stdout.write('  No new extended records to create')
            return

        # Split into batches
        batches = [to_create[i:i + batch_size] for i in range(0, len(to_create), batch_size)]
        created_count = 0
        total_batches = len(batches)

        def create_extended_batch(batch_data, pkg_refs, cls_refs, form_refs, max_retries=3):
            """Worker function to create extended records with retry on deadlock"""
            from forecast_app.models import ProductExtended
            import time
            import random

            objs = []
            for p in batch_data:
                objs.append(ProductExtended(
                    product_id=p['product_id'],
                    packaging_id=pkg_refs.get(p['packaging']),
                    closure_id=cls_refs.get(p['closure']),
                    formula_id=form_refs.get(p['formula']),
                    label_location=p['label_location'],
                    price=p['price'],
                    product_title=p['product_title'],
                    bullets=p['bullets'],
                    description=p['description'],
                    notes=p['notes'],
                    core_competitor_asins=p['core_competitor_asins'],
                    other_competitor_asins=p.get('other_competitor_asins', ''),
                    core_keywords=p['core_keywords'],
                    other_keywords=p.get('other_keywords', ''),
                ))

            for attempt in range(max_retries):
                try:
                    with transaction.atomic():
                        created = ProductExtended.objects.bulk_create(objs, ignore_conflicts=True)
                    return len(created)
                except Exception as e:
                    if 'deadlock' in str(e).lower() and attempt < max_retries - 1:
                        time.sleep(random.uniform(0.1, 0.5))
                        continue
                    raise

            return 0

        # Execute batches in parallel
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = []
            for batch in batches:
                future = executor.submit(
                    create_extended_batch, 
                    batch, 
                    refs['packaging'], 
                    refs['closures'], 
                    refs['formulas']
                )
                futures.append(future)

            for i, future in enumerate(as_completed(futures)):
                try:
                    count = future.result()
                    created_count += count
                    self.stdout.write(f'  Batch {i+1}/{total_batches} complete ({count} records)')
                except Exception as e:
                    self.stderr.write(f'  Batch failed: {e}')

        self.stdout.write(f'  Total extended records created: {created_count}')

    def _print_stats(self, user):
        """Print final database stats"""
        from forecast_app.models import Product, Brand, PackagingType, Closure, Formula, ProductExtended

        self.stdout.write('\n--- Final Stats ---')
        self.stdout.write(f'Products: {Product.objects.filter(user=user).count()}')
        self.stdout.write(f'Brands: {Brand.objects.filter(user=user).count()}')
        self.stdout.write(f'Packaging Types: {PackagingType.objects.filter(user=user).count()}')
        self.stdout.write(f'Closures: {Closure.objects.filter(user=user).count()}')
        self.stdout.write(f'Formulas: {Formula.objects.filter(user=user).count()}')
        self.stdout.write(f'Extended Records: {ProductExtended.objects.filter(product__user=user).count()}')
