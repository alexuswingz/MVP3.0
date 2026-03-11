# Allow product_asin to be NULL when action item has no linked product.
# The column may exist in the DB from a prior schema; we never define it on the model.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('analytics_app', '0006_actionitem_created_by_fields'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE action_items ALTER COLUMN product_asin DROP NOT NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
