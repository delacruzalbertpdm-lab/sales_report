import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard_project.settings')
django.setup()

from analytics.models import DailyMetric

metrics = DailyMetric.objects.filter(platform='shopee').order_by('date')
print(f"Total Shopee metrics count: {metrics.count()}")
if metrics.exists():
    print("Min date:", metrics.first().date)
    print("Max date:", metrics.last().date)
    for m in metrics[:5]:
        print(f"  {m.date}: Sales=₱{m.sales}, Orders={m.orders}")
