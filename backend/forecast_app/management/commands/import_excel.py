"""
Import TPS Nutrients product data from Excel file.
Usage: python manage.py import_excel --file ../excel/1000\ Bananas\ Database.xlsx --user admin@tpsnutrients.com
"""
import pandas as pd
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from forecast_app.models import (
    Brand, Product, PackagingType, Closure, Formula, ProductExtended
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Import products from TPS Excel database'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True, help='Path to Excel file')
        parser.add_argument('--user', type=str, required=True, help='User email to assign products to')
        parser.add_argument('--dry-run', action='store_true', help='Preview without saving')

    def handle(self, *args, **options):
        file_path = options['file']
        user_email = options['user']
        dry_run = options['dry_run']

        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            self.stderr.write(f'User {user_email} not found')
            return

        self.stdout.write(f'Importing for user: {user.email}')
        self.stdout.write(f'Reading: {file_path}')

        # Read CatalogDataBase sheet (header is row 5, index 4)
        df = pd.read_excel(file_path, sheet_name='CatalogDataBase', header=4)
        
        # Filter out empty rows
        df = df.dropna(subset=['Product Name'])
        df = df[df['Product Name'].str.strip() != '']
        
        self.stdout.write(f'Found {len(df)} products')

        # Import reference tables first
        self._import_formulas(file_path, user, dry_run)
        self._import_packaging(df, user, dry_run)
        self._import_closures(df, user, dry_run)
        self._import_brands(df, user, dry_run)
        
        # Import products
        self._import_products(df, user, dry_run)

        self.stdout.write(self.style.SUCCESS('Import complete!'))

    def _import_formulas(self, file_path, user, dry_run):
        """Import formulas from FormulaDatabase sheet"""
        try:
            df = pd.read_excel(file_path, sheet_name='FormulaDatabase', header=1)
            
            # Find formula columns
            formula_col = None
            for col in df.columns:
                if 'formula' in str(col).lower() and 'name' in str(col).lower():
                    formula_col = col
                    break
            
            if formula_col is None:
                formula_col = df.columns[1]  # Fallback to second column
            
            formulas = df[formula_col].dropna().unique()
            
            count = 0
            for name in formulas:
                name = str(name).strip()
                if name and name.lower() != 'nan':
                    if not dry_run:
                        Formula.objects.get_or_create(
                            user=user,
                            name=name,
                            defaults={'npk': '', 'is_active': True}
                        )
                    count += 1
            
            self.stdout.write(f'  Formulas: {count}')
        except Exception as e:
            self.stderr.write(f'  Error importing formulas: {e}')

    def _import_packaging(self, df, user, dry_run):
        """Import packaging types from product data"""
        packaging_names = df['Packaging Name'].dropna().unique()
        
        count = 0
        for name in packaging_names:
            name = str(name).strip()
            if name and name.lower() != 'nan':
                if not dry_run:
                    PackagingType.objects.get_or_create(
                        user=user,
                        name=name,
                        defaults={'is_active': True}
                    )
                count += 1
        
        self.stdout.write(f'  Packaging types: {count}')

    def _import_closures(self, df, user, dry_run):
        """Import closures from product data"""
        closure_names = df['Closure Name'].dropna().unique()
        
        count = 0
        for name in closure_names:
            name = str(name).strip()
            if name and name.lower() != 'nan':
                if not dry_run:
                    Closure.objects.get_or_create(
                        user=user,
                        name=name,
                        defaults={'is_active': True}
                    )
                count += 1
        
        self.stdout.write(f'  Closures: {count}')

    def _import_brands(self, df, user, dry_run):
        """Import brands from product data"""
        brand_names = df['Brand Name'].dropna().unique()
        
        count = 0
        for name in brand_names:
            name = str(name).strip()
            if name and name.lower() != 'nan':
                if not dry_run:
                    Brand.objects.get_or_create(
                        user=user,
                        name=name,
                        defaults={'marketplace': 'Amazon', 'country': 'US', 'is_active': True}
                    )
                count += 1
        
        self.stdout.write(f'  Brands: {count}')

    def _import_products(self, df, user, dry_run):
        """Import products"""
        count = 0
        updated = 0
        
        for _, row in df.iterrows():
            name = str(row.get('Product Name', '')).strip()
            if not name or name.lower() == 'nan':
                continue
            
            # Get or create brand
            brand = None
            brand_name = str(row.get('Brand Name', '')).strip()
            if brand_name and brand_name.lower() != 'nan':
                brand, _ = Brand.objects.get_or_create(
                    user=user, name=brand_name,
                    defaults={'marketplace': 'Amazon'}
                )
            
            # Parse fields
            asin = str(row.get('Child ASIN', '')).strip()
            if asin.lower() == 'nan':
                asin = ''
            
            parent_asin = str(row.get('Parent ASIN', '')).strip()
            if parent_asin.lower() == 'nan':
                parent_asin = ''
            
            sku = str(row.get('CHILD SKU\nFINAL', '')).strip()
            if sku.lower() == 'nan':
                sku = ''
            
            upc = str(row.get('UPC', '')).strip()
            if upc.lower() == 'nan':
                upc = ''
            
            # Status mapping
            status_map = {
                'launched': 'launched',
                'pending': 'pending',
                'discontinued': 'discontinued',
            }
            raw_status = str(row.get('Status', 'draft')).strip().lower()
            status = status_map.get(raw_status, 'draft')
            
            # Size and type
            size = str(row.get('Size', '')).strip()
            if size.lower() == 'nan':
                size = ''
            
            product_type = str(row.get('Type', '')).strip()
            if product_type.lower() == 'nan':
                product_type = ''
            
            # Hazmat
            hazmat = str(row.get('Hazmat', '')).strip().lower()
            is_hazmat = hazmat in ['yes', 'true', '1']
            
            # Launch date
            launch_date = None
            if pd.notna(row.get('Launch Date')):
                try:
                    launch_date = pd.to_datetime(row['Launch Date']).date()
                except:
                    pass
            
            if not dry_run:
                # Create or update product
                product, created = Product.objects.update_or_create(
                    user=user,
                    name=name,
                    defaults={
                        'brand': brand,
                        'asin': asin,
                        'parent_asin': parent_asin,
                        'sku': sku,
                        'upc': upc,
                        'size': size,
                        'product_type': product_type,
                        'status': status,
                        'is_hazmat': is_hazmat,
                        'launch_date': launch_date,
                        'is_active': True,
                    }
                )
                
                # Create extended fields
                self._create_extended(product, row, user)
                
                if created:
                    count += 1
                else:
                    updated += 1
            else:
                count += 1
        
        self.stdout.write(f'  Products created: {count}')
        if updated:
            self.stdout.write(f'  Products updated: {updated}')

    def _create_extended(self, product, row, user):
        """Create or update extended product fields"""
        # Get packaging
        packaging = None
        pkg_name = str(row.get('Packaging Name', '')).strip()
        if pkg_name and pkg_name.lower() != 'nan':
            packaging = PackagingType.objects.filter(user=user, name=pkg_name).first()
        
        # Get closure
        closure = None
        closure_name = str(row.get('Closure Name', '')).strip()
        if closure_name and closure_name.lower() != 'nan':
            closure = Closure.objects.filter(user=user, name=closure_name).first()
        
        # Get formula
        formula = None
        formula_name = str(row.get('Formula', '')).strip()
        if formula_name and formula_name.lower() != 'nan':
            formula = Formula.objects.filter(user=user, name=formula_name).first()
        
        # Price
        price = None
        if pd.notna(row.get('Price')):
            try:
                price = float(row['Price'])
            except:
                pass
        
        # Get other fields
        def safe_str(val):
            s = str(val).strip() if pd.notna(val) else ''
            return '' if s.lower() == 'nan' else s
        
        ProductExtended.objects.update_or_create(
            product=product,
            defaults={
                'packaging': packaging,
                'closure': closure,
                'formula': formula,
                'label_location': safe_str(row.get('Label Location')),
                'core_competitor_asins': safe_str(row.get('Core Competitor ASINS')),
                'other_competitor_asins': safe_str(row.get('Other Competitor ASINS')),
                'core_keywords': safe_str(row.get('Core Keywords')),
                'other_keywords': safe_str(row.get('Other Keywords')),
                'price': price,
                'product_title': safe_str(row.get('Product Title')) or safe_str(row.get('Title')),
                'bullets': safe_str(row.get('Bullets')),
                'description': safe_str(row.get('Description')),
                'notes': safe_str(row.get('Notes')),
            }
        )
