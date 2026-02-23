"""
Fast bulk import of TPS Nutrients product data from Excel file.
Uses bulk_create for 10-50x faster imports.

Usage: python manage.py import_excel_fast --file ../excel/1000\ Bananas\ Database.xlsx --user admin@tpsnutrients.com
"""
import pandas as pd
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from forecast_app.models import (
    Brand, Product, PackagingType, Closure, Formula, ProductExtended
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Fast bulk import products from TPS Excel database'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True, help='Path to Excel file')
        parser.add_argument('--user', type=str, required=True, help='User email to assign products to')
        parser.add_argument('--batch-size', type=int, default=100, help='Batch size for bulk operations')
        parser.add_argument('--clear', action='store_true', help='Clear existing data before import')

    def handle(self, *args, **options):
        file_path = options['file']
        user_email = options['user']
        batch_size = options['batch_size']
        clear = options['clear']

        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            self.stderr.write(f'User {user_email} not found')
            return

        self.stdout.write(f'Fast import for user: {user.email}')
        self.stdout.write(f'Reading: {file_path}')

        # Read Excel
        df = pd.read_excel(file_path, sheet_name='CatalogDataBase', header=4)
        df = df.dropna(subset=['Product Name'])
        df = df[df['Product Name'].str.strip() != '']
        
        self.stdout.write(f'Found {len(df)} products to import')

        if clear:
            self.stdout.write('Clearing existing data...')
            with transaction.atomic():
                ProductExtended.objects.filter(product__user=user).delete()
                Product.objects.filter(user=user).delete()
                Brand.objects.filter(user=user).delete()
                PackagingType.objects.filter(user=user).delete()
                Closure.objects.filter(user=user).delete()
                Formula.objects.filter(user=user).delete()
            self.stdout.write('  Cleared!')

        with transaction.atomic():
            # Step 1: Bulk create reference tables
            brands = self._bulk_create_brands(df, user, batch_size)
            packaging = self._bulk_create_packaging(df, user, batch_size)
            closures = self._bulk_create_closures(df, user, batch_size)
            formulas = self._bulk_create_formulas(file_path, user, batch_size)
            
            # Step 2: Bulk create products
            products = self._bulk_create_products(df, user, brands, batch_size)
            
            # Step 3: Bulk create extended fields
            self._bulk_create_extended(df, user, products, packaging, closures, formulas, batch_size)

        self.stdout.write(self.style.SUCCESS('Fast import complete!'))

    def _safe_str(self, val):
        """Safely convert value to string"""
        if pd.isna(val):
            return ''
        s = str(val).strip()
        return '' if s.lower() == 'nan' else s

    def _bulk_create_brands(self, df, user, batch_size):
        """Bulk create brands and return name->instance mapping"""
        brand_names = df['Brand Name'].dropna().unique()
        brand_names = [str(n).strip() for n in brand_names if str(n).strip() and str(n).lower() != 'nan']
        
        # Get existing
        existing = {b.name: b for b in Brand.objects.filter(user=user)}
        
        # Create new
        to_create = []
        for name in brand_names:
            if name not in existing:
                to_create.append(Brand(user=user, name=name, marketplace='Amazon', country='US'))
        
        if to_create:
            Brand.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
        
        # Return updated mapping
        brands = {b.name: b for b in Brand.objects.filter(user=user)}
        self.stdout.write(f'  Brands: {len(brands)}')
        return brands

    def _bulk_create_packaging(self, df, user, batch_size):
        """Bulk create packaging types"""
        names = df['Packaging Name'].dropna().unique()
        names = [str(n).strip() for n in names if str(n).strip() and str(n).lower() != 'nan']
        
        existing = {p.name: p for p in PackagingType.objects.filter(user=user)}
        
        to_create = []
        for name in names:
            if name not in existing:
                to_create.append(PackagingType(user=user, name=name))
        
        if to_create:
            PackagingType.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
        
        packaging = {p.name: p for p in PackagingType.objects.filter(user=user)}
        self.stdout.write(f'  Packaging: {len(packaging)}')
        return packaging

    def _bulk_create_closures(self, df, user, batch_size):
        """Bulk create closures"""
        names = df['Closure Name'].dropna().unique()
        names = [str(n).strip() for n in names if str(n).strip() and str(n).lower() != 'nan']
        
        existing = {c.name: c for c in Closure.objects.filter(user=user)}
        
        to_create = []
        for name in names:
            if name not in existing:
                to_create.append(Closure(user=user, name=name))
        
        if to_create:
            Closure.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
        
        closures = {c.name: c for c in Closure.objects.filter(user=user)}
        self.stdout.write(f'  Closures: {len(closures)}')
        return closures

    def _bulk_create_formulas(self, file_path, user, batch_size):
        """Bulk create formulas from FormulaDatabase sheet"""
        try:
            fdf = pd.read_excel(file_path, sheet_name='FormulaDatabase', header=1)
            formula_col = fdf.columns[1] if len(fdf.columns) > 1 else fdf.columns[0]
            names = fdf[formula_col].dropna().unique()
            names = [str(n).strip() for n in names if str(n).strip() and str(n).lower() != 'nan']
        except:
            names = []
        
        existing = {f.name: f for f in Formula.objects.filter(user=user)}
        
        to_create = []
        for name in names:
            if name not in existing:
                to_create.append(Formula(user=user, name=name))
        
        if to_create:
            Formula.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
        
        formulas = {f.name: f for f in Formula.objects.filter(user=user)}
        self.stdout.write(f'  Formulas: {len(formulas)}')
        return formulas

    def _bulk_create_products(self, df, user, brands, batch_size):
        """Bulk create products"""
        # Get existing products by name to avoid duplicates
        existing = {p.name: p for p in Product.objects.filter(user=user)}
        
        to_create = []
        to_update = []
        
        for _, row in df.iterrows():
            name = self._safe_str(row.get('Product Name'))
            if not name:
                continue
            
            brand = brands.get(self._safe_str(row.get('Brand Name')))
            
            # Parse fields
            asin = self._safe_str(row.get('Child ASIN'))
            parent_asin = self._safe_str(row.get('Parent ASIN'))
            sku = self._safe_str(row.get('CHILD SKU\nFINAL'))
            upc = self._safe_str(row.get('UPC'))
            
            status_map = {'launched': 'launched', 'pending': 'pending', 'discontinued': 'discontinued'}
            raw_status = self._safe_str(row.get('Status')).lower()
            status = status_map.get(raw_status, 'draft')
            
            size = self._safe_str(row.get('Size'))
            product_type = self._safe_str(row.get('Type'))
            
            hazmat = self._safe_str(row.get('Hazmat')).lower()
            is_hazmat = hazmat in ['yes', 'true', '1']
            
            launch_date = None
            if pd.notna(row.get('Launch Date')):
                try:
                    launch_date = pd.to_datetime(row['Launch Date']).date()
                except:
                    pass
            
            if name in existing:
                # Update existing
                p = existing[name]
                p.brand = brand
                p.asin = asin
                p.parent_asin = parent_asin
                p.sku = sku
                p.upc = upc
                p.size = size
                p.product_type = product_type
                p.status = status
                p.is_hazmat = is_hazmat
                p.launch_date = launch_date
                to_update.append(p)
            else:
                # Create new
                p = Product(
                    user=user,
                    brand=brand,
                    name=name,
                    asin=asin,
                    parent_asin=parent_asin,
                    sku=sku,
                    upc=upc,
                    size=size,
                    product_type=product_type,
                    status=status,
                    is_hazmat=is_hazmat,
                    launch_date=launch_date,
                    is_active=True,
                )
                to_create.append(p)
        
        # Bulk create
        if to_create:
            Product.objects.bulk_create(to_create, batch_size=batch_size)
        
        # Bulk update
        if to_update:
            Product.objects.bulk_update(
                to_update,
                ['brand', 'asin', 'parent_asin', 'sku', 'upc', 'size', 
                 'product_type', 'status', 'is_hazmat', 'launch_date'],
                batch_size=batch_size
            )
        
        self.stdout.write(f'  Products created: {len(to_create)}, updated: {len(to_update)}')
        
        # Return updated mapping
        return {p.name: p for p in Product.objects.filter(user=user)}

    def _bulk_create_extended(self, df, user, products, packaging, closures, formulas, batch_size):
        """Bulk create extended product fields"""
        # Get existing extended records
        existing_product_ids = set(
            ProductExtended.objects.filter(product__user=user).values_list('product_id', flat=True)
        )
        
        to_create = []
        to_update = []
        
        for _, row in df.iterrows():
            name = self._safe_str(row.get('Product Name'))
            if not name or name not in products:
                continue
            
            product = products[name]
            
            pkg = packaging.get(self._safe_str(row.get('Packaging Name')))
            closure = closures.get(self._safe_str(row.get('Closure Name')))
            formula = formulas.get(self._safe_str(row.get('Formula')))
            
            price = None
            if pd.notna(row.get('Price')):
                try:
                    price = float(row['Price'])
                except:
                    pass
            
            ext_data = {
                'packaging': pkg,
                'closure': closure,
                'formula': formula,
                'label_location': self._safe_str(row.get('Label Location')),
                'core_competitor_asins': self._safe_str(row.get('Core Competitor ASINS')),
                'other_competitor_asins': self._safe_str(row.get('Other Competitor ASINS')),
                'core_keywords': self._safe_str(row.get('Core Keywords')),
                'other_keywords': self._safe_str(row.get('Other Keywords')),
                'price': price,
                'product_title': self._safe_str(row.get('Product Title')) or self._safe_str(row.get('Title')),
                'bullets': self._safe_str(row.get('Bullets')),
                'description': self._safe_str(row.get('Description')),
                'notes': self._safe_str(row.get('Notes')),
            }
            
            if product.id in existing_product_ids:
                # Will need individual update for FK fields
                ProductExtended.objects.filter(product=product).update(**{
                    k: v for k, v in ext_data.items() if v is not None or k in ['packaging', 'closure', 'formula']
                })
            else:
                to_create.append(ProductExtended(product=product, **ext_data))
        
        if to_create:
            ProductExtended.objects.bulk_create(to_create, batch_size=batch_size, ignore_conflicts=True)
        
        self.stdout.write(f'  Extended records: {len(to_create)} created')
