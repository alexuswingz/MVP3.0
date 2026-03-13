"""
Seed Bottles and Closures from the Excel database.
Usage: python manage.py seed_bottles_closures --file "../excel/1000 Bananas Database.xlsx" --user admin@tpsnutrients.com
"""
import pandas as pd
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from forecast_app.models import Bottle, Closure

User = get_user_model()


def safe_decimal(value, default=None):
    """Convert value to Decimal safely"""
    if pd.isna(value) or value == '' or value is None:
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return default


def safe_int(value, default=None):
    """Convert value to int safely"""
    if pd.isna(value) or value == '' or value is None:
        return default
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


def safe_str(value, default=''):
    """Convert value to string safely"""
    if pd.isna(value) or value is None:
        return default
    return str(value).strip()


class Command(BaseCommand):
    help = 'Seed bottles and closures from TPS Excel database'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True, help='Path to Excel file')
        parser.add_argument('--user', type=str, required=True, help='User email to assign data to')
        parser.add_argument('--dry-run', action='store_true', help='Preview without saving')
        parser.add_argument('--clear', action='store_true', help='Clear existing data before import')

    def handle(self, *args, **options):
        file_path = options['file']
        user_email = options['user']
        dry_run = options['dry_run']
        clear = options['clear']

        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f'User {user_email} not found'))
            return

        self.stdout.write(f'Seeding for user: {user.email}')
        self.stdout.write(f'Reading: {file_path}')

        if clear and not dry_run:
            self.stdout.write('Clearing existing bottles and closures...')
            Bottle.objects.filter(user=user).delete()
            Closure.objects.filter(user=user).delete()

        # Import bottles
        bottles_created = self._import_bottles(file_path, user, dry_run)
        
        # Import closures
        closures_created = self._import_closures(file_path, user, dry_run)

        self.stdout.write(self.style.SUCCESS(
            f'Done! Created {bottles_created} bottles and {closures_created} closures'
        ))

    def _import_bottles(self, file_path, user, dry_run):
        """Import bottles from BottleDatabase sheet"""
        self.stdout.write('Importing bottles from BottleDatabase sheet...')
        
        try:
            # Read BottleDatabase sheet (header is row 2, index 1)
            df = pd.read_excel(file_path, sheet_name='BottleDatabase', header=1)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error reading BottleDatabase: {e}'))
            return 0

        # Get column names for mapping
        columns = df.columns.tolist()
        self.stdout.write(f'Columns found: {columns[:10]}...')
        
        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for idx, row in df.iterrows():
                name = safe_str(row.get('Bottle Name', ''))
                if not name:
                    continue

                bottle_data = {
                    'name': name,
                    'size_oz': safe_decimal(row.get('Size (oz)')),
                    'shape': safe_str(row.get('Shape', '')),
                    'color': safe_str(row.get('Color', '')),
                    'thread_type': safe_str(row.get('Thread Type', '')),
                    'cap_size': safe_str(row.get('Cap Size', '')),
                    'material': safe_str(row.get('Material', '')),
                    'supplier': safe_str(row.get('Supplier', '')),
                    'packaging_part_number': safe_str(row.get('Packaging Part #', '')),
                    'description': safe_str(row.get('Description', '')),
                    'brand': safe_str(row.get('Brand', '')),
                    'lead_time_weeks': safe_int(row.get('Lead Time (Weeks)')),
                    'moq': safe_int(row.get('MOQ')),
                    'units_per_pallet': safe_int(row.get('Units per Pallet')),
                    'units_per_case': safe_int(row.get('Units per Case')),
                    'cases_per_pallet': safe_int(row.get('Cases per Pallet')),
                    'box_size': safe_str(row.get('Box Size', '')),
                    'box_length_in': safe_decimal(row.get('Box length (in)')),
                    'box_width_in': safe_decimal(row.get('Box width (in)')),
                    'box_height_in': safe_decimal(row.get('Box height (in)')),
                    'units_per_gallon': safe_decimal(row.get('Units per Gallon')),
                    'box_weight_lbs': safe_decimal(row.get('Box Weight (lbs)\n')),
                    'max_boxes_per_pallet': safe_int(row.get('Max Boxes per Pallet \n')),
                    'single_box_pallet_share': safe_decimal(row.get('Single Box Pallet Share')),
                    'replenishment_strategy': safe_str(row.get('Replenishment Strategy', '')).lower() or 'manual',
                    'packaging_bpm': safe_int(row.get('Packaging Bottles per Minute (BPM)')),
                    'length_in': safe_decimal(row.get('\nLength (in)')),
                    'width_in': safe_decimal(row.get('\nWidth (in)')),
                    'height_in': safe_decimal(row.get('\nHeight (in)')),
                    'weight_lbs': safe_decimal(row.get('\nWeight (lbs) - Finished Goods')),
                    'label_size': safe_str(row.get('Label Size', '')),
                    'supplier_order_strategy': safe_str(row.get('Supplier Order Strategy', '')).lower() or 'manual',
                    'supplier_inventory': safe_int(row.get('Supplier Inventory')),
                    'warehouse_inventory': safe_int(row.get('Warehouse Inventory')),
                    'max_warehouse_inventory': safe_int(row.get('Max Warehouse Inventory')),
                    'is_active': True,
                }

                if dry_run:
                    self.stdout.write(f'  [DRY-RUN] Would create/update bottle: {name}')
                else:
                    bottle, created = Bottle.objects.update_or_create(
                        user=user,
                        name=name,
                        defaults=bottle_data
                    )
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

        self.stdout.write(f'  Bottles: {created_count} created, {updated_count} updated')
        return created_count

    def _import_closures(self, file_path, user, dry_run):
        """Import closures from ClosureDatabase sheet"""
        self.stdout.write('Importing closures from ClosureDatabase sheet...')
        
        try:
            # Read ClosureDatabase sheet (header is row 2, index 1)
            df = pd.read_excel(file_path, sheet_name='ClosureDatabase', header=1)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error reading ClosureDatabase: {e}'))
            return 0

        columns = df.columns.tolist()
        self.stdout.write(f'Columns found: {columns[:10]}...')
        
        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for idx, row in df.iterrows():
                name = safe_str(row.get('Closure Name', ''))
                if not name:
                    continue

                # Map category
                category_raw = safe_str(row.get('Category', 'closure')).lower()
                if 'spray' in category_raw or 'spray' in name.lower():
                    category = 'sprayer'
                elif 'pump' in category_raw or 'pump' in name.lower():
                    category = 'pump'
                elif 'cap' in category_raw or 'cap' in name.lower():
                    category = 'cap'
                else:
                    category = 'closure'

                closure_data = {
                    'name': name,
                    'category': category,
                    'shape': safe_str(row.get('Shape', '')),
                    'color': safe_str(row.get('Color', '')),
                    'thread_type': safe_str(row.get('Thread Type', '')),
                    'cap_size': safe_str(row.get('Cap Size', '')),
                    'material': safe_str(row.get('Material', '')),
                    'supplier': safe_str(row.get('Supplier', '')),
                    'packaging_part_number': safe_str(row.get('Packaging Part #', '')),
                    'description': safe_str(row.get('Description', '')),
                    'brand': safe_str(row.get('Brand', '')),
                    'lead_time_weeks': safe_int(row.get('Lead Time (Weeks)')),
                    'moq': safe_int(row.get('MOQ')),
                    'units_per_pallet': safe_int(row.get('Units per Pallet')),
                    'units_per_case': safe_int(row.get('Units per Case')),
                    'cases_per_pallet': safe_int(row.get('Cases per Pallet')),
                    'supplier_order_strategy': safe_str(row.get('Supplier Order Strategy', '')).lower() or 'manual',
                    'supplier_inventory': safe_int(row.get('Supplier Inventory')),
                    'warehouse_inventory': safe_int(row.get('Warehouse Inventory')),
                    'max_warehouse_inventory': safe_int(row.get('Max Warehouse Inventory')),
                    'is_active': True,
                }

                if dry_run:
                    self.stdout.write(f'  [DRY-RUN] Would create/update closure: {name}')
                else:
                    closure, created = Closure.objects.update_or_create(
                        user=user,
                        name=name,
                        defaults=closure_data
                    )
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

        self.stdout.write(f'  Closures: {created_count} created, {updated_count} updated')
        return created_count
