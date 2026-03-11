# Make legacy/denormalized columns nullable so action items without a product
# (or without legacy data) can be created. These columns exist in some DBs but
# are not on the Django ActionItem model.

from django.db import migrations, connection


def make_legacy_columns_nullable(apps, schema_editor):
    # Columns that may exist and be NOT NULL; we never set them from the model.
    columns = [
        'product_name',
        'product_brand',
        'product_size',
        'assignee',
        'attachments',
        'created_by',
    ]
    with connection.cursor() as cursor:
        for col in columns:
            try:
                cursor.execute(
                    f'ALTER TABLE action_items ALTER COLUMN {col} DROP NOT NULL;'
                )
            except Exception as e:
                # Column may not exist in this DB (e.g. created only from our migrations)
                if 'does not exist' not in str(e).lower():
                    raise


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('analytics_app', '0007_actionitem_product_asin_nullable'),
    ]

    operations = [
        migrations.RunPython(make_legacy_columns_nullable, noop_reverse),
    ]
