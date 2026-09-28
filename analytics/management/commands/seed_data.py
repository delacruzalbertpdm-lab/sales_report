import json
import datetime
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from analytics.models import DailyMetric

class Command(BaseCommand):
    help = 'Seed initial multi-platform dataset into SQLite database'

    def handle(self, *args, **options):
        json_path = settings.BASE_DIR / 'shopee_analytics_data.json'
        if not json_path.exists():
            self.stdout.write(self.style.ERROR(f"File not found: {json_path}"))
            return

        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        count = 0

        # 1. Shopee
        shopee_paid = data.get('shopee_stats', {}).get('paid_order', [])
        for r in shopee_paid:
            date_str = r.get('Date')
            if date_str and '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    d_obj = datetime.date(int(parts[2]), int(parts[1]), int(parts[0]))
                    DailyMetric.objects.update_or_create(
                        platform='shopee',
                        date=d_obj,
                        defaults={
                            'sales': r.get('Sales (PHP)', 0),
                            'orders': r.get('Orders', 0),
                            'visitors': r.get('Visitors', 0),
                            'pageviews': r.get('Product Clicks', 0) * 2,
                            'cvr': r.get('Order Conversion Rate', 0),
                            'source_file': 'shopee_analytics_data.json'
                        }
                    )
                    count += 1

        # 2. Lazada
        lazada_daily = data.get('lazada_stats', {}).get('daily', [])
        for r in lazada_daily:
            date_str = r.get('date')
            if date_str and '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    d_obj = datetime.date(int(parts[2]), int(parts[1]), int(parts[0]))
                    DailyMetric.objects.update_or_create(
                        platform='lazada',
                        date=d_obj,
                        defaults={
                            'sales': r.get('sales', 0),
                            'orders': r.get('orders', 0),
                            'visitors': r.get('visitors', 0),
                            'pageviews': r.get('pageviews', 0),
                            'cvr': r.get('cvr', 0),
                            'source_file': 'shopee_analytics_data.json'
                        }
                    )
                    count += 1

        # 3. TikTok
        tiktok_daily = data.get('tiktok_stats', {}).get('daily', [])
        for r in tiktok_daily:
            date_str = r.get('date')
            if date_str and '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    d_obj = datetime.date(int(parts[2]), int(parts[1]), int(parts[0]))
                    DailyMetric.objects.update_or_create(
                        platform='tiktok',
                        date=d_obj,
                        defaults={
                            'sales': r.get('sales', 0),
                            'orders': r.get('orders', 0),
                            'visitors': r.get('visitors', 0),
                            'pageviews': r.get('pageviews', 0),
                            'cvr': r.get('cvr', 0),
                            'source_file': 'shopee_analytics_data.json'
                        }
                    )
                    count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} daily metrics into SQLite database!"))
