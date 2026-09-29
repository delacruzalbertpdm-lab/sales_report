import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard_project.settings')
django.setup()

from analytics.models import DailyMetric

august_metrics = DailyMetric.objects.filter(platform='shopee', date__range=['2026-08-01', '2026-08-31']).order_by('date')
sept_metrics = DailyMetric.objects.filter(platform='shopee', date__range=['2026-09-01', '2026-09-30']).order_by('date')

print(f"August Records Count: {august_metrics.count()} days")
print(f"August Total Sales: PHP {sum(float(m.sales) for m in august_metrics):,.2f}")
print(f"August Total Orders: {sum(m.orders for m in august_metrics)} orders")

print(f"\nSeptember Records Count: {sept_metrics.count()} days")
print(f"September Total Sales: PHP {sum(float(m.sales) for m in sept_metrics):,.2f}")
print(f"September Total Orders: {sum(m.orders for m in sept_metrics)} orders")

total = DailyMetric.objects.filter(platform='shopee')
print(f"\nOverall Shopee Records Count: {total.count()} days (Aug 01, 2026 to Sep 23, 2026)")
