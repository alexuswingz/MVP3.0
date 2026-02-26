"""
Daily Sales Sync Management Command

Run this command daily via cron to keep sales data up to date.
Uses the quick Restock Report method (~30 seconds per account).

Usage:
    python manage.py sync_daily_sales              # Sync all active accounts
    python manage.py sync_daily_sales --account=1  # Sync specific account
    python manage.py sync_daily_sales --full       # Full historical sync (slow)

Cron example (run at 6 AM daily):
    0 6 * * * cd /path/to/backend && python manage.py sync_daily_sales >> /var/log/sales_sync.log 2>&1

Railway cron (in railway.json):
    "crons": [{ "schedule": "0 6 * * *", "command": "python manage.py sync_daily_sales" }]
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from amazon_integration.models import AmazonSellerAccount
from amazon_integration.services.sales_sync import (
    SalesSyncService,
    sync_quick,
    sync_full_history,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync sales data for all active Amazon accounts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--account',
            type=int,
            help='Sync only this account ID',
        )
        parser.add_argument(
            '--full',
            action='store_true',
            help='Run full historical sync (slow, ~10 min per 1000 products)',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=365,
            help='Days of history for full sync (default: 365)',
        )

    def handle(self, *args, **options):
        account_id = options.get('account')
        full_sync = options.get('full', False)
        days_back = options.get('days', 365)
        
        # Get accounts to sync
        if account_id:
            accounts = AmazonSellerAccount.objects.filter(id=account_id, is_active=True)
            if not accounts.exists():
                raise CommandError(f'Account {account_id} not found or inactive')
        else:
            accounts = AmazonSellerAccount.objects.filter(is_active=True)
        
        if not accounts.exists():
            self.stdout.write(self.style.WARNING('No active Amazon accounts found'))
            return
        
        self.stdout.write(f'Syncing sales for {accounts.count()} account(s)...')
        self.stdout.write(f'Mode: {"FULL HISTORY" if full_sync else "QUICK (30-day velocity)"}')
        self.stdout.write('-' * 50)
        
        total_created = 0
        total_updated = 0
        total_failed = 0
        success_count = 0
        error_count = 0
        
        for account in accounts:
            self.stdout.write(f'\nAccount: {account.account_name or account.seller_id}')
            
            try:
                if full_sync:
                    result = sync_full_history(account, days_back=days_back)
                else:
                    result = sync_quick(account)
                
                total_created += result['created']
                total_updated += result['updated']
                total_failed += result['failed']
                
                if result['errors']:
                    self.stdout.write(self.style.WARNING(f'  Errors: {result["errors"]}'))
                    error_count += 1
                else:
                    self.stdout.write(self.style.SUCCESS(
                        f'  Created: {result["created"]}, Updated: {result["updated"]}'
                    ))
                    success_count += 1
                
                # Update last sync time
                account.last_sync_at = timezone.now()
                account.save(update_fields=['last_sync_at'])
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Failed: {str(e)}'))
                logger.exception(f'Sales sync failed for account {account.id}')
                error_count += 1
        
        # Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'SYNC COMPLETE'))
        self.stdout.write(f'  Accounts: {success_count} success, {error_count} failed')
        self.stdout.write(f'  Records: {total_created} created, {total_updated} updated, {total_failed} failed')
