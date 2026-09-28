import os
import sys
import json
import django
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard_project.settings')
django.setup()

from analytics.models import DailyMetric
from analytics.views import parse_date_obj, clean_num, get_analytics_json

def ingest_august_file():
    filepath = 'C:/Users/USER1/Downloads/August_Sales_FP.xlsx'
    print(f"=== INGESTING PREVIOUS MONTH SALES (AUGUST 2026): {filepath} ===")

    xl = pd.ExcelFile(filepath)
    parsed_records = []

    sheet_order = []
    for s in xl.sheet_names:
        sl = s.lower()
        if 'confirmed order' in sl or 'confirmed' in sl:
            sheet_order.insert(0, s)
        elif 'paid order' in sl or 'paid' in sl:
            sheet_order.append(s)
        else:
            sheet_order.append(s)

    for sheet_name in sheet_order:
        df = xl.parse(sheet_name, header=None)
        if df.empty:
            continue

        for r_i in range(len(df)):
            row = df.iloc[r_i]
            row_strs = [str(x).strip().lower() for x in row.values if pd.notna(x)]

            if any(h in row_strs for h in ['date', 'time', 'analysis date']):
                headers = [str(x).strip() for x in row.values]
                date_c = sales_c = sales_rebate_c = orders_c = visitors_c = views_c = clicks_c = cvr_c = -1
                canc_orders_c = canc_sales_c = ref_orders_c = ref_sales_c = buyers_c = new_buyers_c = exist_buyers_c = pot_buyers_c = rpr_c = -1

                for c_i, h in enumerate(headers):
                    hl = h.lower()
                    if hl in ['date', 'time', 'analysis date'] and date_c == -1:
                        date_c = c_i
                    elif 'rebate' in hl and sales_rebate_c == -1:
                        sales_rebate_c = c_i
                    elif sales_c == -1 and any(k in hl for k in ['sales (php)', 'sales (placed orders)', 'sales(confirmed orders)', 'product card-attributed gmv', 'gross revenue', 'revenue', 'gmv', 'sales']):
                        sales_c = c_i
                    elif orders_c == -1 and any(k in hl for k in ['orders', 'orders (placed orders)', 'orders (confirmed orders)', 'attributed sku orders']):
                        orders_c = c_i
                    elif visitors_c == -1 and any(k in hl for k in ['visitors', 'viewers', 'visitors (visit)']):
                        visitors_c = c_i
                    elif views_c == -1 and any(k in hl for k in ['pageviews', 'page views', 'views', 'product page views']):
                        views_c = c_i
                    elif clicks_c == -1 and any(k in hl for k in ['product clicks', 'clicks']):
                        clicks_c = c_i
                    elif cvr_c == -1 and any(k in hl for k in ['order conversion rate', 'cvr', 'conversion rate']):
                        cvr_c = c_i
                    elif canc_orders_c == -1 and 'cancelled orders' in hl:
                        canc_orders_c = c_i
                    elif canc_sales_c == -1 and 'cancelled sales' in hl:
                        canc_sales_c = c_i
                    elif ref_orders_c == -1 and any(k in hl for k in ['returned/refunded orders', 'refunded orders']):
                        ref_orders_c = c_i
                    elif ref_sales_c == -1 and any(k in hl for k in ['returned/refunded sales', 'refunded sales']):
                        ref_sales_c = c_i
                    elif new_buyers_c == -1 and '# of new buyers' in hl:
                        new_buyers_c = c_i
                    elif exist_buyers_c == -1 and '# of existing buyers' in hl:
                        exist_buyers_c = c_i
                    elif pot_buyers_c == -1 and '# of potential buyers' in hl:
                        pot_buyers_c = c_i
                    elif buyers_c == -1 and any(k in hl for k in ['# of buyers', 'buyers']):
                        buyers_c = c_i
                    elif rpr_c == -1 and 'repeat purchase rate' in hl:
                        rpr_c = c_i

                if date_c != -1:
                    for data_r in range(r_i + 1, len(df)):
                        d_row = df.iloc[data_r]
                        d_obj = parse_date_obj(d_row[date_c])
                        if not d_obj:
                            continue

                        s_val = clean_num(d_row[sales_c]) if sales_c != -1 else 0.0
                        s_rebate_val = clean_num(d_row[sales_rebate_c]) if sales_rebate_c != -1 else s_val
                        o_val = int(clean_num(d_row[orders_c])) if orders_c != -1 else 0
                        v_val = int(clean_num(d_row[visitors_c])) if visitors_c != -1 else 0
                        vw_val = int(clean_num(d_row[views_c])) if views_c != -1 else 0
                        clicks_val = int(clean_num(d_row[clicks_c])) if clicks_c != -1 else (vw_val if vw_val > 0 else v_val * 2)
                        cvr_val = clean_num(d_row[cvr_c]) if cvr_c != -1 else (round((o_val / v_val * 100), 2) if v_val > 0 else 0.0)
                        canc_o_val = int(clean_num(d_row[canc_orders_c])) if canc_orders_c != -1 else 0
                        canc_s_val = clean_num(d_row[canc_sales_c]) if canc_sales_c != -1 else 0.0
                        ref_o_val = int(clean_num(d_row[ref_orders_c])) if ref_orders_c != -1 else 0
                        ref_s_val = clean_num(d_row[ref_sales_c]) if ref_sales_c != -1 else 0.0
                        buyers_val = int(clean_num(d_row[buyers_c])) if buyers_c != -1 else o_val
                        new_b_val = int(clean_num(d_row[new_buyers_c])) if new_buyers_c != -1 else 0
                        exist_b_val = int(clean_num(d_row[exist_buyers_c])) if exist_buyers_c != -1 else 0
                        pot_b_val = int(clean_num(d_row[pot_buyers_c])) if pot_buyers_c != -1 else 0
                        rpr_val = clean_num(d_row[rpr_c]) if rpr_c != -1 else 0.0

                        if s_val > 0 or o_val > 0 or v_val > 0 or vw_val > 0:
                            parsed_records.append({
                                'date': d_obj,
                                'sales': s_val,
                                'sales_rebate': s_rebate_val,
                                'orders': o_val,
                                'visitors': v_val,
                                'pageviews': vw_val,
                                'product_clicks': clicks_val,
                                'cvr': cvr_val,
                                'cancelled_orders': canc_o_val,
                                'cancelled_sales': canc_s_val,
                                'refunded_orders': ref_o_val,
                                'refunded_sales': ref_s_val,
                                'buyers': buyers_val,
                                'new_buyers': new_b_val,
                                'existing_buyers': exist_b_val,
                                'potential_buyers': pot_b_val,
                                'repeat_purchase_rate': rpr_val,
                            })

                    if len(parsed_records) > 0:
                        break
        if len(parsed_records) > 0:
            break

    print(f"Parsed {len(parsed_records)} daily records from {filepath}")

    inserted_count = 0
    total_sales = 0
    total_orders = 0

    for rec in parsed_records:
        obj, created = DailyMetric.objects.update_or_create(
            platform='shopee',
            date=rec['date'],
            defaults={
                'sales': rec['sales'],
                'sales_rebate': rec['sales_rebate'],
                'orders': rec['orders'],
                'visitors': rec['visitors'],
                'pageviews': rec['pageviews'],
                'product_clicks': rec['product_clicks'],
                'cvr': rec['cvr'],
                'cancelled_orders': rec['cancelled_orders'],
                'cancelled_sales': rec['cancelled_sales'],
                'refunded_orders': rec['refunded_orders'],
                'refunded_sales': rec['refunded_sales'],
                'buyers': rec['buyers'],
                'new_buyers': rec['new_buyers'],
                'existing_buyers': rec['existing_buyers'],
                'potential_buyers': rec['potential_buyers'],
                'repeat_purchase_rate': rec['repeat_purchase_rate'],
                'source_file': 'August_Sales_FP.xlsx'
            }
        )
        inserted_count += 1
        total_sales += rec['sales']
        total_orders += rec['orders']

    print(f"Successfully upserted {inserted_count} records into SQLite database!")
    print(f"Total August Confirmed Sales: PHP {total_sales:,.2f}")
    print(f"Total August Confirmed Orders: {total_orders}")

    # Total Shopee DB records now
    shopee_all = DailyMetric.objects.filter(platform='shopee').order_by('date')
    print(f"Total Shopee records now in database: {shopee_all.count()}")
    print(f"Date range in database: {shopee_all.first().date} to {shopee_all.last().date}")

    # Regenerate static shopee_analytics_data.json so static fallback is also 100% updated
    json_payload = get_analytics_json()
    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'shopee_analytics_data.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_payload, f, indent=2)
    print(f"Updated static fallback file {json_path}")

if __name__ == '__main__':
    ingest_august_file()
