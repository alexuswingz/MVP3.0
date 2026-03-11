# Add attachments JSONField for action item detail pane (name, url, type?, uploadedAt)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics_app', '0008_actionitem_legacy_columns_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='actionitem',
            name='attachments',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
