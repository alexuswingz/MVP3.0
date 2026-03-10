from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("analytics_app", "0005_fix_actionitem_assignee_columns"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'action_items'
                      AND column_name = 'assignee'
                ) THEN
                    -- Copy any existing legacy assignee values into assignee_name if it's blank.
                    UPDATE action_items
                    SET assignee_name = COALESCE(assignee_name, '')
                    WHERE assignee IS NOT NULL
                      AND (assignee_name IS NULL OR assignee_name = '');

                    -- Relax NOT NULL constraint so inserts without this legacy column succeed.
                    BEGIN
                        ALTER TABLE action_items ALTER COLUMN assignee DROP NOT NULL;
                    EXCEPTION
                        WHEN others THEN
                            -- Ignore if constraint is already relaxed.
                            NULL;
                    END;
                END IF;
            END
            $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

