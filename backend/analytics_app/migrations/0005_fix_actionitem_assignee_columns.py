from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("analytics_app", "0004_actionitem"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'action_items'
                      AND column_name = 'assignee_name'
                ) THEN
                    ALTER TABLE action_items
                    ADD COLUMN assignee_name varchar(255) NOT NULL DEFAULT '';
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'action_items'
                      AND column_name = 'assignee_initials'
                ) THEN
                    ALTER TABLE action_items
                    ADD COLUMN assignee_initials varchar(32) NOT NULL DEFAULT '';
                END IF;
            END
            $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

