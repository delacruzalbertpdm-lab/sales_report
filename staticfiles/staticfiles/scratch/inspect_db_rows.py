import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard_project.settings')
django.setup()

from analytics.models import DailyMetric

metrics = DailyMetric.objects.filter(platform='shopee').order_by('date')

print("=== CURRENT SHOPEE METRICS IN SQLITE DB ===")
print("Total rows:", metrics.count())
tot_sales = sum(float(m.sales) for m in metrics)
tot_orders = sum(m.orders for m in metrics)
tot_visitors = sum(m.visitors for m in metrics)

print(f"Total Sales in DB: PHP {tot_sales:,.2f}")
print(f"Total Orders in DB: {tot_orders}")
print(f"Total Visitors in DB: {tot_visitors}")

print("\nDetail of each date in DB:")
for m in metrics:
    print(f"  {m.date} | Sales: PHP {float(m.sales):,.2f} | Orders: {m.orders} | File: {m.source_file}")
