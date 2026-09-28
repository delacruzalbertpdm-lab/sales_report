import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard_project.settings')
django.setup()

from analytics.models import DailyMetric

print("================ FULL DATABASE VERIFICATION ================")
for p in ['shopee', 'lazada', 'tiktok']:
    aug = DailyMetric.objects.filter(platform=p, date__month=8).order_by('date')
    sep = DailyMetric.objects.filter(platform=p, date__month=9).order_by('date')
    
    aug_s = sum(float(m.sales) for m in aug)
    sep_s = sum(float(m.sales) for m in sep)
    
    aug_o = sum(m.orders for m in aug)
    sep_o = sum(m.orders for m in sep)
    
    print(f"\nPLATFORM: {p.upper()}")
    print(f"  August 2026   : {aug.count()} days | Sales: PHP {aug_s:,.2f} | Orders: {aug_o}")
    print(f"  September 2026: {sep.count()} days | Sales: PHP {sep_s:,.2f} | Orders: {sep_o}")
    
    if aug_s > 0:
        pct = ((sep_s - aug_s) / aug_s) * 100
        diff = sep_s - aug_s
        status = "INCREASE" if diff >= 0 else "DECREASE"
        print(f"  Growth (MoM)  : {pct:+.2f}% ({status} of PHP {abs(diff):,.2f})")

all_aug = sum(float(m.sales) for m in DailyMetric.objects.filter(date__month=8))
all_sep = sum(float(m.sales) for m in DailyMetric.objects.filter(date__month=9))
tot_growth = ((all_sep - all_aug) / all_aug) * 100

print("\n================ COMBINED ALL PLATFORMS ================")
print(f"August Total Sales   : PHP {all_aug:,.2f}")
print(f"September Total Sales: PHP {all_sep:,.2f}")
print(f"Overall MoM Growth   : {tot_growth:+.2f}% (🚀 INCREASE of PHP {all_sep - all_aug:,.2f})")
