import os
import sys
import json
import datetime
import pandas as pd
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard_project.settings')
django.setup()

from analytics.models import DailyMetric
from analytics.views import parse_date_obj, clean_num

# 4 Official Excel File Paths
FILE_SHOP_STATS = 'C:/Users/USER1/Downloads/firstprotectph.shopee-shop-stats.20260901-20260923.xlsx'
FILE_SALES_OVERVIEW = 'C:/Users/USER1/Downloads/sales_overview_20260901-20260923.xlsx'
FILE_PRODUCT_OVERVIEW = 'C:/Users/USER1/Downloads/productoverview20260901-20260923.xlsx'
FILE_TRAFFIC_OVERVIEW = 'C:/Users/USER1/Downloads/traffic_overview_20260901_20260923.xlsx'

def process_all_files():
    print("=== STARTING MASTER INGESTION OF 4 SHOPEE EXCEL FILES ===")

    # 1. Read Shop Stats (Confirmed Order sheet)
    xl_stats = pd.ExcelFile(FILE_SHOP_STATS)
    df_stats = xl_stats.parse('Confirmed Order', header=None)
    row_idx = 3
    headers_stats = [str(x).strip().lower() for x in df_stats.iloc[row_idx].values]
    
    date_c = headers_stats.index('date')
    sales_c = headers_stats.index('sales (php)')
    rebate_c = headers_stats.index('sales (shopee rebate applied)')
    orders_c = headers_stats.index('orders')
    clicks_c = headers_stats.index('product clicks')
    visitors_c = headers_stats.index('visitors')
    cvr_c = headers_stats.index('order conversion rate')
    canc_o_c = headers_stats.index('cancelled orders')
    canc_s_c = headers_stats.index('cancelled sales')
    ref_o_c = headers_stats.index('returned/refunded orders')
    ref_s_c = headers_stats.index('returned/refunded sales')
    buyers_c = headers_stats.index('# of buyers')
    new_b_c = headers_stats.index('# of new buyers')
    exist_b_c = headers_stats.index('# of existing buyers')
    pot_b_c = headers_stats.index('# of potential buyers')
    rpr_c = headers_stats.index('repeat purchase rate')

    # Read Traffic Overview (All sheet)
    xl_traffic = pd.ExcelFile(FILE_TRAFFIC_OVERVIEW)
    df_traffic = xl_traffic.parse('All', header=None)
    
    t_date_c = t_pv_c = t_new_v_c = t_exist_v_c = -1
    t_header_row = 0
    for r_idx in range(len(df_traffic)):
        row_vals = [str(x).strip().lower() for x in df_traffic.iloc[r_idx].values if pd.notna(x)]
        if 'date' in row_vals:
            t_header_row = r_idx
            headers_traffic = [str(x).strip().lower() for x in df_traffic.iloc[r_idx].values]
            t_date_c = headers_traffic.index('date') if 'date' in headers_traffic else -1
            for idx, h in enumerate(headers_traffic):
                if 'page views' in h: t_pv_c = idx
                elif 'new visitors' in h: t_new_v_c = idx
                elif 'existing visitors' in h: t_exist_v_c = idx
            break

    traffic_by_date = {}
    if t_date_c != -1:
        for r in range(t_header_row + 1, len(df_traffic)):
            d_obj = parse_date_obj(df_traffic.iloc[r][t_date_c])
            if d_obj:
                traffic_by_date[d_obj] = {
                    'pageviews': int(clean_num(df_traffic.iloc[r][t_pv_c])) if t_pv_c != -1 else 0,
                    'new_visitors': int(clean_num(df_traffic.iloc[r][t_new_v_c])) if t_new_v_c != -1 else 0,
                    'existing_visitors': int(clean_num(df_traffic.iloc[r][t_exist_v_c])) if t_exist_v_c != -1 else 0
                }

    # Clear existing Shopee records from DB
    DailyMetric.objects.filter(platform='shopee').delete()

    records_count = 0
    tot_sales = 0
    tot_rebate = 0
    tot_orders = 0
    tot_visitors = 0
    tot_clicks = 0

    for r in range(4, len(df_stats)):
        d_obj = parse_date_obj(df_stats.iloc[r][date_c])
        if not d_obj:
            continue

        s_val = clean_num(df_stats.iloc[r][sales_c])
        s_rebate = clean_num(df_stats.iloc[r][rebate_c])
        o_val = int(clean_num(df_stats.iloc[r][orders_c]))
        v_val = int(clean_num(df_stats.iloc[r][visitors_c]))
        clicks_val = int(clean_num(df_stats.iloc[r][clicks_c]))
        cvr_val = clean_num(df_stats.iloc[r][cvr_c])
        canc_o = int(clean_num(df_stats.iloc[r][canc_o_c]))
        canc_s = clean_num(df_stats.iloc[r][canc_s_c])
        ref_o = int(clean_num(df_stats.iloc[r][ref_o_c]))
        ref_s = clean_num(df_stats.iloc[r][ref_s_c])
        buyers_val = int(clean_num(df_stats.iloc[r][buyers_c]))
        new_b = int(clean_num(df_stats.iloc[r][new_b_c]))
        exist_b = int(clean_num(df_stats.iloc[r][exist_b_c]))
        pot_b = int(clean_num(df_stats.iloc[r][pot_b_c]))
        rpr_val = clean_num(df_stats.iloc[r][rpr_c])

        tf_data = traffic_by_date.get(d_obj, {})
        pv_val = tf_data.get('pageviews', clicks_val)
        if 'new_visitors' in tf_data: new_b = tf_data['new_visitors']
        if 'existing_visitors' in tf_data: exist_b = tf_data['existing_visitors']

        DailyMetric.objects.create(
            platform='shopee',
            date=d_obj,
            sales=s_val,
            sales_rebate=s_rebate,
            orders=o_val,
            visitors=v_val,
            pageviews=pv_val,
            product_clicks=clicks_val,
            cvr=cvr_val,
            cancelled_orders=canc_o,
            cancelled_sales=canc_s,
            refunded_orders=ref_o,
            refunded_sales=ref_s,
            buyers=buyers_val,
            new_buyers=new_b,
            existing_buyers=exist_b,
            potential_buyers=pot_b,
            repeat_purchase_rate=rpr_val,
            source_file='shopee_4_excel_exports_20260901-20260923'
        )

        records_count += 1
        tot_sales += s_val
        tot_rebate += s_rebate
        tot_orders += o_val
        tot_visitors += v_val
        tot_clicks += clicks_val

    print(f"SUCCESS: Ingested {records_count} daily records for Shopee into SQLite!")
    print(f"Total Confirmed Sales: PHP {tot_sales:,.2f}")
    print(f"Total Rebate Applied Sales: PHP {tot_rebate:,.2f}")
    print(f"Total Confirmed Orders: {tot_orders}")
    print(f"Total Store Visitors: {tot_visitors}")
    print(f"Total Product Clicks: {tot_clicks}")

if __name__ == '__main__':
    process_all_files()
