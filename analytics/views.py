import json
import datetime
import pandas as pd
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import DailyMetric, IncomeTransaction

def clean_num(val):
    if pd.isna(val) or val is None or val == '':
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace('₱', '').replace('PHP', '').replace(',', '').replace('%', '').strip()
    if s == '-' or not s:
        return 0.0
    try:
        return float(s)
    except:
        return 0.0

def parse_date_obj(val):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() == 'nan' or 'total' in s.lower():
        return None
    if '-' in s and len(s) > 10 and ('/' in s or '~' in s or s.count('-') > 2):
        return None
    
    # YYYY-MM-DD
    if s.count('-') == 2 and len(s) == 10 and s[:4].isdigit():
        p = s.split('-')
        try:
            return datetime.date(int(p[0]), int(p[1]), int(p[2]))
        except:
            return None
            
    # DD/MM/YYYY
    if '/' in s:
        p = s.split('/')
        if len(p) == 3:
            try:
                return datetime.date(int(p[2]), int(p[1]), int(p[0]))
            except:
                return None

    # Excel Timestamp number
    if isinstance(val, (int, float)):
        try:
            dt = datetime.datetime.fromordinal(datetime.datetime(1900, 1, 1).toordinal() + int(val) - 2)
            return dt.date()
        except:
            return None

    return None

def get_analytics_json():
    # Load base JSON structure for static nested components (product_overview, traffic_sources_summary, etc.)
    base_json_path = settings.BASE_DIR / 'shopee_analytics_data.json'
    base_data = {}
    if base_json_path.exists():
        try:
            with open(base_json_path, 'r', encoding='utf-8') as f:
                base_data = json.load(f)
        except Exception as e:
            print("Error loading base JSON:", e)

    # Shopee Metrics from DB
    shopee_metrics = DailyMetric.objects.filter(platform='shopee').order_by('date')
    shopee_rows = []
    sales_overview_daily = []
    traffic_overview_daily = []
    product_overview_daily = []

    tot_sh_sales = 0.0
    tot_sh_orders = 0
    tot_sh_visitors = 0
    tot_sh_views = 0

    for m in shopee_metrics:
        d_str = m.date.strftime('%d/%m/%Y')
        sales_f = float(m.sales)
        sales_rebate_f = float(m.sales_rebate) if m.sales_rebate > 0 else sales_f
        clicks_val = m.product_clicks if m.product_clicks > 0 else m.visitors * 2
        canc_orders_val = m.cancelled_orders
        canc_sales_val = float(m.cancelled_sales)
        ref_orders_val = m.refunded_orders
        ref_sales_val = float(m.refunded_sales)
        buyers_val = m.buyers if m.buyers > 0 else m.orders
        new_buyers_val = m.new_buyers
        exist_buyers_val = m.existing_buyers
        pot_buyers_val = m.potential_buyers
        rpr_val = float(m.repeat_purchase_rate)

        tot_sh_sales += sales_f
        tot_sh_orders += m.orders
        tot_sh_visitors += m.visitors
        tot_sh_views += (m.pageviews if m.pageviews > 0 else clicks_val)

        shopee_rows.append({
            "Date": d_str,
            "Sales (PHP)": sales_f,
            "Sales (Shopee Rebate applied)": sales_rebate_f,
            "Orders": m.orders,
            "Sales per Order": float(sales_f / m.orders) if m.orders > 0 else 0.0,
            "Product Clicks": clicks_val,
            "Visitors": m.visitors,
            "Order Conversion Rate": float(m.cvr),
            "Cancelled Orders": canc_orders_val,
            "Cancelled Sales": canc_sales_val,
            "Returned/Refunded Orders": ref_orders_val,
            "Returned/Refunded Sales": ref_sales_val,
            "# of buyers": buyers_val,
            "# of new buyers": new_buyers_val,
            "# of existing buyers": exist_buyers_val,
            "# of potential buyers": pot_buyers_val,
            "Repeat Purchase Rate": rpr_val
        })

        sales_overview_daily.append({
            "date": d_str,
            "visitors": m.visitors,
            "buyers_placed": m.orders,
            "units_placed": m.orders,
            "orders_placed": m.orders,
            "sales_placed": sales_f,
            "buyers_confirmed": m.orders,
            "units_confirmed": m.orders,
            "orders_confirmed": m.orders,
            "sales_confirmed": sales_f,
            "sales_per_buyer": float(sales_f / m.orders) if m.orders > 0 else 0.0,
            "conv_rate": float(m.cvr)
        })

        traffic_overview_daily.append({
            "date": d_str,
            "page_views": m.pageviews if m.pageviews > 0 else clicks_val,
            "avg_page_views": float(clicks_val / m.visitors) if m.visitors > 0 else 1.0,
            "avg_time_spent": "00:01:00",
            "bounce_rate": 25.0,
            "visitors": m.visitors,
            "new_visitors": new_buyers_val if new_buyers_val > 0 else int(m.visitors * 0.8),
            "existing_visitors": exist_buyers_val if exist_buyers_val > 0 else int(m.visitors * 0.2),
            "new_followers": int(m.orders * 0.2)
        })

        product_overview_daily.append({
            "date": d_str,
            "product_visitors": m.visitors,
            "page_views": m.pageviews if m.pageviews > 0 else clicks_val,
            "items_visited": clicks_val,
            "bounce_visitors": int(m.visitors * 0.25),
            "bounce_rate": 25.0,
            "search_clicks": clicks_val,
            "likes": int(m.orders * 1.5),
            "atc_visitors": m.visitors,
            "atc_units": m.orders,
            "atc_conv_rate": float(m.cvr),
            "buyers_placed": m.orders,
            "units_placed": m.orders,
            "sales_placed": sales_f,
            "buyers_confirmed": m.orders,
            "units_confirmed": m.orders,
            "sales_confirmed": sales_f
        })

    # Lazada Metrics from DB
    lazada_metrics = DailyMetric.objects.filter(platform='lazada').order_by('date')
    lazada_daily = []
    tot_laz_sales = 0.0
    tot_laz_orders = 0
    tot_laz_visitors = 0
    tot_laz_views = 0

    for m in lazada_metrics:
        d_str = m.date.strftime('%d/%m/%Y')
        tot_laz_sales += float(m.sales)
        tot_laz_orders += m.orders
        tot_laz_visitors += m.visitors
        tot_laz_views += m.pageviews

        lazada_daily.append({
            "date": d_str,
            "raw_date": m.date.strftime('%Y-%m-%d'),
            "sales": float(m.sales),
            "orders": m.orders,
            "visitors": m.visitors,
            "pageviews": m.pageviews,
            "units_sold": m.orders * 2,
            "cvr": float(m.cvr),
            "cancelled_sales": 0.0,
            "refund_sales": 0.0
        })

    lazada_cvr = round((tot_laz_orders / tot_laz_visitors * 100), 2) if tot_laz_visitors > 0 else 0.0

    # TikTok Metrics from DB
    tiktok_metrics = DailyMetric.objects.filter(platform='tiktok').order_by('date')
    tiktok_daily = []
    tot_tik_sales = 0.0
    tot_tik_orders = 0
    tot_tik_visitors = 0
    tot_tik_views = 0

    for m in tiktok_metrics:
        d_str = m.date.strftime('%d/%m/%Y')
        tot_tik_sales += float(m.sales)
        tot_tik_orders += m.orders
        tot_tik_visitors += m.visitors
        tot_tik_views += m.pageviews

        tiktok_daily.append({
            "date": d_str,
            "gmv": float(m.sales),
            "sales": float(m.sales),
            "gross_sales": float(m.sales),
            "orders": m.orders,
            "buyers": m.orders,
            "units_sold": m.orders * 3,
            "pageviews": m.pageviews,
            "visitors": m.visitors,
            "cvr": float(m.cvr)
        })

    tiktok_cvr = round((tot_tik_orders / tot_tik_visitors * 100), 2) if tot_tik_visitors > 0 else 0.0

    shopee_cvr = round((tot_sh_orders / tot_sh_visitors * 100), 2) if tot_sh_visitors > 0 else 0.0

    total_records = shopee_metrics.count() + lazada_metrics.count() + tiktok_metrics.count()
    if total_records == 0:
        return {
            "shopee_stats": { "paid_order": [], "placed_order": [], "confirmed_order": [], "traffic_sources_summary": {}, "source_contributions": [] },
            "sales_overview": {
                "summary": { "visitors": 0, "buyers_placed": 0, "sales_placed": 0.0, "buyers_confirmed": 0, "sales_confirmed": 0.0, "sales_per_buyer": 0.0, "conv_rate": 0.0 },
                "daily": []
            },
            "traffic_overview": {
                "all": {
                    "summary": { "page_views": 0, "avg_page_views": 0.0, "avg_time_spent": "00:00:00", "bounce_rate": 0.0, "visitors": 0, "new_visitors": 0, "existing_visitors": 0, "new_followers": 0 },
                    "daily": []
                }
            },
            "product_overview": [],
            "lazada_stats": {
                "summary": { "revenue": 0.0, "orders": 0, "visitors": 0, "pageviews": 0, "conversion_rate": 0.0, "units_sold": 0 },
                "daily": []
            },
            "tiktok_stats": {
                "summary": { "revenue": 0.0, "gross_revenue": 0.0, "orders": 0, "buyers": 0, "units_sold": 0, "pageviews": 0, "visitors": 0, "conversion_rate": 0.0, "aov": 0.0 },
                "daily": []
            }
        }

    # Assemble response payload
    response_payload = {
        "shopee_stats": {
            "paid_order": shopee_rows,
            "placed_order": shopee_rows,
            "confirmed_order": shopee_rows,
            "traffic_sources_summary": base_data.get('shopee_stats', {}).get('traffic_sources_summary', {}),
            "source_contributions": base_data.get('shopee_stats', {}).get('source_contributions', [])
        },
        "sales_overview": {
            "summary": {
                "visitors": tot_sh_visitors,
                "buyers_placed": tot_sh_orders,
                "sales_placed": round(tot_sh_sales, 2),
                "buyers_confirmed": tot_sh_orders,
                "sales_confirmed": round(tot_sh_sales, 2),
                "sales_per_buyer": round(tot_sh_sales / tot_sh_orders, 2) if tot_sh_orders > 0 else 0.0,
                "conv_rate": shopee_cvr
            },
            "daily": sales_overview_daily
        },
        "traffic_overview": {
            "all": {
                "summary": {
                    "page_views": tot_sh_views,
                    "avg_page_views": round(tot_sh_views / tot_sh_visitors, 2) if tot_sh_visitors > 0 else 0.0,
                    "avg_time_spent": "00:01:00",
                    "bounce_rate": 27.81,
                    "visitors": tot_sh_visitors,
                    "new_visitors": int(tot_sh_visitors * 0.8),
                    "existing_visitors": int(tot_sh_visitors * 0.2),
                    "new_followers": int(tot_sh_orders * 0.2)
                },
                "daily": traffic_overview_daily
            }
        },
        "product_overview": product_overview_daily,
        "lazada_stats": {
            "summary": {
                "revenue": round(tot_laz_sales, 2),
                "orders": tot_laz_orders,
                "visitors": tot_laz_visitors,
                "pageviews": tot_laz_views,
                "conversion_rate": lazada_cvr,
                "units_sold": tot_laz_orders * 2
            },
            "daily": lazada_daily
        },
        "tiktok_stats": {
            "summary": {
                "revenue": round(tot_tik_sales, 2),
                "gross_revenue": round(tot_tik_sales, 2),
                "orders": tot_tik_orders,
                "buyers": tot_tik_orders,
                "units_sold": tot_tik_orders * 3,
                "pageviews": tot_tik_views,
                "visitors": tot_tik_visitors,
                "conversion_rate": tiktok_cvr,
                "aov": round(tot_tik_sales / tot_tik_orders, 2) if tot_tik_orders > 0 else 0.0
            },
            "daily": tiktok_daily
        }
    }

    return response_payload

def analytics_api(request):
    data = get_analytics_json()
    return JsonResponse(data, safe=False)

@csrf_exempt
def import_api(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)

    uploaded_file = request.FILES.get('file')
    platform = request.POST.get('platform', 'shopee').lower()

    if not uploaded_file:
        return JsonResponse({'error': 'No file uploaded'}, status=400)

    try:
        xl = pd.ExcelFile(uploaded_file)
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

        if not parsed_records:
            return JsonResponse({'error': f'No valid daily records parsed from {uploaded_file.name}.'}, status=400)

        # Save/Update into Django SQLite DB
        inserted_count = 0
        for rec in parsed_records:
            DailyMetric.objects.update_or_create(
                platform=platform,
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
                    'source_file': uploaded_file.name
                }
            )
            inserted_count += 1

        total_sales = sum(r['sales'] for r in parsed_records)
        total_orders = sum(r['orders'] for r in parsed_records)

        return JsonResponse({
            'success': True,
            'message': f'Successfully imported {uploaded_file.name} into Django Database!',
            'platform': platform,
            'filename': uploaded_file.name,
            'rows_loaded': inserted_count,
            'total_sales': round(total_sales, 2),
            'total_orders': total_orders
        })

    except Exception as e:
        print("Import API error:", e)
        return JsonResponse({'error': f'Failed to process file: {str(e)}'}, status=500)

@csrf_exempt
def clear_api(request):
    try:
        DailyMetric.objects.all().delete()
        return JsonResponse({'success': True, 'message': 'All database data cleared to ZERO! System is ready for fresh Excel uploads.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def reset_api(request):
    try:
        DailyMetric.objects.all().delete()
        if request.GET.get('mode') == 'clear' or request.POST.get('mode') == 'clear':
            return JsonResponse({'success': True, 'message': 'Database cleared to ZERO! Ready for fresh Excel uploads.'})

        # Seed initial dataset if not mode=clear
        from django.core.management import call_command
        call_command('seed_data')
        return JsonResponse({'success': True, 'message': 'Database reset complete! Reloaded initial dataset into SQLite.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def clean_order_no(val):
    if pd.isna(val) or val is None:
        return ''
    s = str(val).strip()
    if s in ['0', '0.0', '-1', '', 'nan', 'None']:
        return ''
    if s.endswith('.0'):
        s = s[:-2]
    return s

def parse_and_save_income_excel(file_source, filename, platform='lazada'):
    xl = pd.ExcelFile(file_source)

    if platform == 'tiktok' or 'Order details' in xl.sheet_names:
        sheet_to_read = 'Order details' if 'Order details' in xl.sheet_names else xl.sheet_names[0]
        df = xl.parse(sheet_to_read)
        if df.empty:
            return 0, 0.0, 0.0

        fee_cols = [
            ('TikTok Shop commission fee', 'TikTok Shop Commission Fee', 'Platform Fee'),
            ('Transaction fee', 'Transaction Fee', 'Platform Fee'),
            ('Shipping service fee', 'Shipping Service Fee', 'Platform Fee'),
            ('Seller growth fee', 'Seller Growth Fee', 'Platform Fee'),
            ('Affiliate Commission', 'Affiliate Commission', 'Affiliate Fee'),
            ('Affiliate partner commission', 'Affiliate Partner Commission', 'Affiliate Fee'),
            ('Adjustment amount', 'Adjustment Amount', 'Adjustment')
        ]

        records_to_create = []
        tot_gross = 0.0
        tot_net = 0.0
        stmt_name = f"TikTok Settlement ({filename})"

        for idx, row in df.iterrows():
            tx_type = str(row.get('Transaction type', '')).strip() if pd.notna(row.get('Transaction type')) else 'General'
            ord_id = clean_order_no(row.get('Order/Adjustment ID'))
            settled_time = row.get('Order settled time')
            if pd.isna(settled_time) or not settled_time:
                settled_time = row.get('Order created time')

            if pd.isna(settled_time) or not settled_time:
                continue

            try:
                d_obj = pd.to_datetime(str(settled_time).strip()).date()
            except:
                continue

            rev = float(row.get('Total Revenue', 0)) if pd.notna(row.get('Total Revenue')) else 0.0
            if rev > 0:
                tot_gross += rev
                tot_net += rev
                records_to_create.append(IncomeTransaction(
                    platform='tiktok',
                    transaction_date=d_obj,
                    transaction_type='Order Sales',
                    fee_name='Order Gross Sales',
                    transaction_number=ord_id,
                    details=f"Order Sales Revenue for Order {ord_id}",
                    amount=rev,
                    statement=stmt_name,
                    paid_status='paid',
                    order_no=ord_id,
                    source_file=filename
                ))

            for fcol, fname, fcat in fee_cols:
                if fcol in row:
                    fval = float(row.get(fcol, 0)) if pd.notna(row.get(fcol)) else 0.0
                    if fval != 0:
                        tot_net += fval
                        actual_fname = fname
                        actual_fcat = fcat
                        if fcol == 'Adjustment amount' and tx_type.lower() == 'withholding tax':
                            actual_fname = 'Withholding Tax'
                            actual_fcat = 'Tax'
                        records_to_create.append(IncomeTransaction(
                            platform='tiktok',
                            transaction_date=d_obj,
                            transaction_type=actual_fcat,
                            fee_name=actual_fname,
                            transaction_number=ord_id,
                            details=f"{actual_fname} for {ord_id}",
                            amount=fval,
                            statement=stmt_name,
                            paid_status='paid',
                            order_no=ord_id,
                            source_file=filename
                        ))

        if records_to_create:
            IncomeTransaction.objects.filter(platform='tiktok', source_file=filename).delete()
            IncomeTransaction.objects.bulk_create(records_to_create)

        return len(records_to_create), tot_gross, tot_net

    if platform == 'shopee' or 'Paid Order' in xl.sheet_names:
        sheet_to_read = 'Paid Order' if 'Paid Order' in xl.sheet_names else xl.sheet_names[0]
        df = xl.parse(sheet_to_read)
        if df.empty or len(df) < 4:
            return 0, 0.0, 0.0

        df_data = df.iloc[3:].copy()
        df_data.columns = [str(c).strip() for c in df.iloc[2].values]

        records_to_create = []
        tot_gross = 0.0
        tot_net = 0.0
        stmt_name = f"Shopee Estimated Settlement ({filename})"

        for idx, row in df_data.iterrows():
            d_str = str(row.get('Date', '')).strip()
            if not d_str or d_str == 'nan':
                continue
            try:
                d_obj = pd.to_datetime(d_str, format='%d/%m/%Y').date()
            except:
                try:
                    d_obj = pd.to_datetime(d_str).date()
                except:
                    continue

            sales_val = clean_num(row.get('Sales (PHP)')) if 'Sales (PHP)' in row else 0.0
            orders_val = int(clean_num(row.get('Orders'))) if 'Orders' in row else 0

            if sales_val > 0:
                tot_gross += sales_val
                tot_net += sales_val
                date_tag = d_obj.strftime('%Y%m%d')

                # Paid Sales Revenue
                records_to_create.append(IncomeTransaction(
                    platform='shopee',
                    transaction_date=d_obj,
                    transaction_type='Order Sales',
                    fee_name='Order Gross Sales',
                    transaction_number=f"SHOPEE-{date_tag}",
                    details=f"Shopee Paid Sales for {d_obj} ({orders_val} orders)",
                    amount=sales_val,
                    statement=stmt_name,
                    paid_status='paid',
                    order_no=f"SHOPEE-{date_tag}",
                    source_file=filename
                ))

                # Standard Shopee Fee deduction breakdown:
                # Commission Fee (5.60%), Transaction Fee (2.24%), Service Fee (4.16%)
                f_comm = round(sales_val * 0.0560, 2)
                f_tx = round(sales_val * 0.0224, 2)
                f_serv = round(sales_val * 0.0416, 2)

                fees_list = [
                    ('Shopee Commission Fee (5.6%)', -f_comm, 'Platform Fee'),
                    ('Shopee Transaction Fee (2.24%)', -f_tx, 'Platform Fee'),
                    ('Shopee Service Fee / FSM (4.16%)', -f_serv, 'Service Fee')
                ]

                for fname, fval, fcat in fees_list:
                    tot_net += fval
                    records_to_create.append(IncomeTransaction(
                        platform='shopee',
                        transaction_date=d_obj,
                        transaction_type=fcat,
                        fee_name=fname,
                        transaction_number=f"SHOPEE-{date_tag}",
                        details=f"{fname} for {d_obj}",
                        amount=fval,
                        statement=stmt_name,
                        paid_status='paid',
                        order_no=f"SHOPEE-{date_tag}",
                        source_file=filename
                    ))

        if records_to_create:
            IncomeTransaction.objects.filter(platform='shopee', source_file=filename).delete()
            IncomeTransaction.objects.bulk_create(records_to_create)

        return len(records_to_create), tot_gross, tot_net

    # Default Lazada statement parser
    sheet_to_read = xl.sheet_names[0]
    for s in xl.sheet_names:
        if 'transaction' in s.lower() or 'overview' in s.lower():
            sheet_to_read = s
            break

    df = xl.parse(sheet_to_read)
    if df.empty:
        return 0, 0.0, 0.0

    col_map = {}
    for c in df.columns:
        cl = str(c).strip().lower()
        if 'transaction date' in cl or 'date' in cl:
            col_map['date'] = c
        elif 'transaction type' in cl or 'type' in cl:
            col_map['type'] = c
        elif 'fee name' in cl or 'fee' in cl:
            col_map['fee'] = c
        elif 'transaction number' in cl or 'transaction no' in cl:
            col_map['tx_num'] = c
        elif 'details' in cl:
            col_map['details'] = c
        elif 'seller sku' in cl:
            col_map['seller_sku'] = c
        elif 'lazada sku' in cl or ('sku' in cl and 'seller' not in cl):
            col_map['lazada_sku'] = c
        elif cl == 'amount' or ('amount' in cl and 'vat' not in cl and 'wht' not in cl):
            col_map['amount'] = c
        elif 'vat in amount' in cl or 'vat' in cl:
            col_map['vat'] = c
        elif 'wht amount' in cl or 'wht' in cl:
            col_map['wht'] = c
        elif 'statement' in cl:
            col_map['statement'] = c
        elif 'paid status' in cl or 'status' in cl:
            col_map['paid_status'] = c
        elif 'order no' in cl or 'order id' in cl or cl == 'order no.':
            col_map['order_no'] = c
        elif 'order item no' in cl:
            col_map['item_no'] = c
        elif 'order item status' in cl:
            col_map['item_status'] = c
        elif 'shipping provider' in cl:
            col_map['shipping_provider'] = c
        elif 'reference' in cl:
            col_map['reference'] = c

    records_to_create = []
    tot_gross = 0.0
    tot_net = 0.0

    for idx, row in df.iterrows():
        raw_d = row.get(col_map.get('date'))
        if pd.isna(raw_d) or not raw_d:
            continue
        try:
            d_obj = pd.to_datetime(str(raw_d).strip()).date()
        except:
            continue

        amt = clean_num(row.get(col_map.get('amount'))) if col_map.get('amount') in row else 0.0
        vat_amt = clean_num(row.get(col_map.get('vat'))) if col_map.get('vat') in row else 0.0
        wht_amt = clean_num(row.get(col_map.get('wht'))) if col_map.get('wht') in row else 0.0

        tx_type = str(row.get(col_map.get('type'), '')).strip() if col_map.get('type') in row and pd.notna(row.get(col_map.get('type'))) else 'General'
        fee_name = str(row.get(col_map.get('fee'), '')).strip() if col_map.get('fee') in row and pd.notna(row.get(col_map.get('fee'))) else ''
        tx_num = str(row.get(col_map.get('tx_num'), '')).strip() if col_map.get('tx_num') in row and pd.notna(row.get(col_map.get('tx_num'))) else ''
        details = str(row.get(col_map.get('details'), '')).strip() if col_map.get('details') in row and pd.notna(row.get(col_map.get('details'))) else ''
        s_sku = str(row.get(col_map.get('seller_sku'), '')).strip() if col_map.get('seller_sku') in row and pd.notna(row.get(col_map.get('seller_sku'))) else ''
        l_sku = str(row.get(col_map.get('lazada_sku'), '')).strip() if col_map.get('lazada_sku') in row and pd.notna(row.get(col_map.get('lazada_sku'))) else ''
        stmt = str(row.get(col_map.get('statement'), '')).strip() if col_map.get('statement') in row and pd.notna(row.get(col_map.get('statement'))) else ''
        p_status = str(row.get(col_map.get('paid_status'), '')).strip() if col_map.get('paid_status') in row and pd.notna(row.get(col_map.get('paid_status'))) else 'paid'
        ord_no = clean_order_no(row.get(col_map.get('order_no'))) if col_map.get('order_no') in row else ''
        itm_no = clean_order_no(row.get(col_map.get('item_no'))) if col_map.get('item_no') in row else ''
        itm_stat = str(row.get(col_map.get('item_status'), '')).strip() if col_map.get('item_status') in row and pd.notna(row.get(col_map.get('item_status'))) else ''
        ship_prov = str(row.get(col_map.get('shipping_provider'), '')).strip() if col_map.get('shipping_provider') in row and pd.notna(row.get(col_map.get('shipping_provider'))) else ''
        ref = str(row.get(col_map.get('reference'), '')).strip() if col_map.get('reference') in row and pd.notna(row.get(col_map.get('reference'))) else ''

        if amt > 0 and ('sales' in tx_type.lower() or 'credit' in fee_name.lower()):
            tot_gross += amt
        tot_net += amt

        records_to_create.append(IncomeTransaction(
            platform=platform,
            transaction_date=d_obj,
            transaction_type=tx_type,
            fee_name=fee_name,
            transaction_number=tx_num,
            details=details,
            seller_sku=s_sku,
            lazada_sku=l_sku,
            amount=amt,
            vat_in_amount=vat_amt,
            wht_amount=wht_amt,
            statement=stmt,
            paid_status=p_status,
            order_no=ord_no,
            order_item_no=itm_no,
            order_item_status=itm_stat,
            shipping_provider=ship_prov,
            reference=ref,
            source_file=filename
        ))

    if records_to_create:
        IncomeTransaction.objects.filter(platform=platform, source_file=filename).delete()
        IncomeTransaction.objects.bulk_create(records_to_create)

    return len(records_to_create), tot_gross, tot_net

def auto_seed_income_if_empty():
    from pathlib import Path

    # 1. Lazada Income Auto-seed
    if not IncomeTransaction.objects.filter(platform='lazada').exists():
        possible_lazada = [
            settings.BASE_DIR / 'income_lazada_sept.xlsx',
            Path.home() / 'Downloads' / 'income_lazada_sept.xlsx'
        ]
        for p in possible_lazada:
            if p.exists():
                try:
                    parse_and_save_income_excel(p, 'income_lazada_sept.xlsx', platform='lazada')
                    print("Auto-seeded Lazada income from:", p)
                    break
                except Exception as e:
                    print("Auto seed Lazada income error:", e)

    # 2. TikTok Income Auto-seed
    if not IncomeTransaction.objects.filter(platform='tiktok').exists():
        possible_tiktok = [
            settings.BASE_DIR / 'income_tiktok_sept.xlsx',
            Path.home() / 'Downloads' / 'income_tiktok_sept.xlsx'
        ]
        for p in possible_tiktok:
            if p.exists():
                try:
                    parse_and_save_income_excel(p, 'income_tiktok_sept.xlsx', platform='tiktok')
                    print("Auto-seeded TikTok income from:", p)
                    break
                except Exception as e:
                    print("Auto seed TikTok income error:", e)

    # 3. Shopee Income Auto-seed
    if not IncomeTransaction.objects.filter(platform='shopee').exists():
        possible_shopee = [
            settings.BASE_DIR / 'shopee_shop_stats_sept.xlsx',
            Path.home() / 'Downloads' / 'firstprotectph.shopee-shop-stats.20260901-20260928.xlsx'
        ]
        for p in possible_shopee:
            if p.exists():
                try:
                    parse_and_save_income_excel(p, 'shopee_shop_stats_sept.xlsx', platform='shopee')
                    print("Auto-seeded Shopee income from:", p)
                    break
                except Exception as e:
                    print("Auto seed Shopee income error:", e)

def get_income_json(platform='lazada', month_filter=None):
    auto_seed_income_if_empty()
    qs = IncomeTransaction.objects.all()
    if platform and platform != 'all':
        qs = qs.filter(platform=platform)

    if month_filter and month_filter != 'all':
        try:
            parts = month_filter.split('-')
            yr, mn = int(parts[0]), int(parts[1])
            qs = qs.filter(transaction_date__year=yr, transaction_date__month=mn)
        except:
            pass

    tx_list = list(qs)
    if not tx_list:
        return {
            "summary": {
                "gross_sales": 0.0,
                "platform_fees": 0.0,
                "refunds_deductions": 0.0,
                "net_income": 0.0,
                "paid_amount": 0.0,
                "unpaid_amount": 0.0,
                "total_orders": 0,
                "total_transactions": 0
            },
            "fee_breakdown": [],
            "transaction_type_breakdown": [],
            "daily_trends": [],
            "statements": [],
            "transactions": []
        }

    tot_gross = 0.0
    tot_fees = 0.0
    tot_refunds = 0.0
    tot_net = 0.0
    tot_paid = 0.0
    tot_unpaid = 0.0

    order_numbers = set()
    fee_map = {}
    type_map = {}
    daily_map = {}
    stmt_map = {}

    for t in tx_list:
        amt = float(t.amount)
        tot_net += amt

        if t.order_no:
            order_numbers.add(t.order_no)

        p_stat = (t.paid_status or 'paid').lower()
        if p_stat == 'paid':
            tot_paid += amt
        else:
            tot_unpaid += amt

        tx_type = t.transaction_type or 'Other'
        fee_name = t.fee_name or tx_type

        if 'refund' in tx_type.lower() or 'reversal' in fee_name.lower():
            tot_refunds += amt
        elif amt < 0 or 'fee' in tx_type.lower() or 'tax' in fee_name.lower():
            tot_fees += amt
        else:
            tot_gross += amt

        if fee_name not in fee_map:
            fee_map[fee_name] = {'count': 0, 'amount': 0.0, 'type': tx_type}
        fee_map[fee_name]['count'] += 1
        fee_map[fee_name]['amount'] += amt

        if tx_type not in type_map:
            type_map[tx_type] = {'count': 0, 'amount': 0.0}
        type_map[tx_type]['count'] += 1
        type_map[tx_type]['amount'] += amt

        d_str = t.transaction_date.strftime('%d/%m/%Y')
        raw_d = t.transaction_date.strftime('%Y-%m-%d')
        if raw_d not in daily_map:
            daily_map[raw_d] = {
                'date': d_str,
                'raw_date': raw_d,
                'gross_sales': 0.0,
                'fees': 0.0,
                'refunds': 0.0,
                'net_income': 0.0,
                'orders': set()
            }
        daily_map[raw_d]['net_income'] += amt
        if amt < 0:
            daily_map[raw_d]['fees'] += amt
        else:
            daily_map[raw_d]['gross_sales'] += amt
        if t.order_no:
            daily_map[raw_d]['orders'].add(t.order_no)

        stmt_key = t.statement or 'Unassigned Statement'
        if stmt_key not in stmt_map:
            stmt_map[stmt_key] = {
                'statement': stmt_key,
                'paid_status': t.paid_status or 'paid',
                'count': 0,
                'gross_sales': 0.0,
                'fees': 0.0,
                'net_payout': 0.0,
                'orders': set()
            }
        stmt_map[stmt_key]['count'] += 1
        stmt_map[stmt_key]['net_payout'] += amt
        if amt < 0:
            stmt_map[stmt_key]['fees'] += amt
        else:
            stmt_map[stmt_key]['gross_sales'] += amt
        if t.order_no:
            stmt_map[stmt_key]['orders'].add(t.order_no)

    fee_breakdown = []
    base_calc_gross = tot_gross if tot_gross > 0 else 1.0
    for fn, fval in fee_map.items():
        fee_breakdown.append({
            'fee_name': fn,
            'count': fval['count'],
            'amount': round(fval['amount'], 2),
            'pct_of_gross': round((abs(fval['amount']) / base_calc_gross) * 100, 2)
        })
    fee_breakdown.sort(key=lambda x: abs(x['amount']), reverse=True)

    type_breakdown = []
    for tn, tval in type_map.items():
        type_breakdown.append({
            'transaction_type': tn,
            'count': tval['count'],
            'amount': round(tval['amount'], 2)
        })
    type_breakdown.sort(key=lambda x: abs(x['amount']), reverse=True)

    daily_trends = []
    for rk in sorted(daily_map.keys()):
        item = daily_map[rk]
        daily_trends.append({
            'date': item['date'],
            'raw_date': item['raw_date'],
            'gross_sales': round(item['gross_sales'], 2),
            'fees': round(item['fees'], 2),
            'refunds': round(item['refunds'], 2),
            'net_income': round(item['net_income'], 2),
            'orders': len(item['orders'])
        })

    statements_list = []
    for sk, sval in stmt_map.items():
        statements_list.append({
            'statement': sk,
            'paid_status': sval['paid_status'],
            'transaction_count': sval['count'],
            'order_count': len(sval['orders']),
            'gross_sales': round(sval['gross_sales'], 2),
            'fees': round(sval['fees'], 2),
            'net_payout': round(sval['net_payout'], 2)
        })

    tx_rows = []
    for t in tx_list[:500]:
        tx_rows.append({
            'date': t.transaction_date.strftime('%d/%m/%Y'),
            'order_no': t.order_no or '-',
            'seller_sku': t.seller_sku or '-',
            'transaction_type': t.transaction_type,
            'fee_name': t.fee_name or t.transaction_type,
            'amount': float(t.amount),
            'paid_status': t.paid_status or 'paid',
            'statement': t.statement or '-'
        })

    return {
        "summary": {
            "gross_sales": round(tot_gross, 2),
            "platform_fees": round(tot_fees, 2),
            "refunds_deductions": round(tot_refunds, 2),
            "net_income": round(tot_net, 2),
            "paid_amount": round(tot_paid, 2),
            "unpaid_amount": round(tot_unpaid, 2),
            "total_orders": len(order_numbers),
            "total_transactions": len(tx_list)
        },
        "fee_breakdown": fee_breakdown,
        "transaction_type_breakdown": type_breakdown,
        "daily_trends": daily_trends,
        "statements": statements_list,
        "transactions": tx_rows
    }

def income_api(request):
    platform = request.GET.get('platform', 'lazada').lower()
    month = request.GET.get('month', 'all')
    data = get_income_json(platform=platform, month_filter=month)
    return JsonResponse(data, safe=False)

@csrf_exempt
def import_income_api(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)

    uploaded_file = request.FILES.get('file')
    platform = request.POST.get('platform', 'lazada').lower()

    if not uploaded_file:
        return JsonResponse({'error': 'No file uploaded'}, status=400)

    try:
        count, gross, net = parse_and_save_income_excel(uploaded_file, uploaded_file.name, platform=platform)
        return JsonResponse({
            'success': True,
            'message': f'Successfully imported {count} income transactions from {uploaded_file.name}!',
            'platform': platform,
            'filename': uploaded_file.name,
            'rows_loaded': count,
            'total_gross': round(gross, 2),
            'net_income': round(net, 2)
        })
    except Exception as e:
        print("Import Income Error:", e)
        return JsonResponse({'error': f'Failed to process income file: {str(e)}'}, status=500)

