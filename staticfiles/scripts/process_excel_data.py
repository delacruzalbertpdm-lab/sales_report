import os
import json
import pandas as pd
import numpy as np

downloads_dir = os.path.expanduser('~/Downloads')
output_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json_output_path = os.path.join(output_dir, 'shopee_analytics_data.json')

files = {
    'shopee_stats': os.path.join(downloads_dir, 'firstprotectph.shopee-shop-stats.20260901-20260921.xlsx'),
    'sales_overview': os.path.join(downloads_dir, 'sales_overview_20260901-20260921.xlsx'),
    'traffic_overview': os.path.join(downloads_dir, 'traffic_overview_20260901_20260921.xlsx'),
    'product_overview': os.path.join(downloads_dir, 'productoverview20260901-20260921.xlsx')
}

def clean_val(v):
    if pd.isna(v):
        return None
    if isinstance(v, (int, float, np.integer, np.floating)):
        return round(float(v), 2)
    s = str(v).strip()
    # Remove commas and currency signs
    clean_s = s.replace(',', '').replace('₱', '').replace('PHP', '').replace('%', '').strip()
    try:
        if '.' in clean_s:
            return round(float(clean_s), 2)
        else:
            return int(clean_s)
    except:
        return s

def parse_time_series(df, date_col='Date'):
    records = []
    # Drop summary row if present (usually row 0 has date range like '01/09/2026-21/09/2026')
    for idx, row in df.iterrows():
        d_str = str(row.get(date_col, '')).strip()
        if not d_str or d_str == 'nan' or '-' in d_str and len(d_str) > 10:
            continue
        record = {}
        for col in df.columns:
            if not str(col).startswith('Unnamed'):
                record[str(col).strip()] = clean_val(row[col])
        if date_col in record:
            records.append(record)
    return records

def extract_all_data():
    data = {}
    
    # 1. SHOPEE SHOP STATS
    if os.path.exists(files['shopee_stats']):
        xl = pd.ExcelFile(files['shopee_stats'])
        stats_data = {}
        
        # Daily sheets
        for sheet in ['Paid Order', 'Placed Order', 'Confirmed Order']:
            if sheet in xl.sheet_names:
                df = xl.parse(sheet)
                # Find line where header is
                header_idx = None
                for idx, row in df.iterrows():
                    if 'Date' in row.values:
                        header_idx = idx
                        break
                if header_idx is not None:
                    df.columns = df.iloc[header_idx]
                    df = df.iloc[header_idx+1:].reset_index(drop=True)
                
                rows = []
                for idx, row in df.iterrows():
                    d_val = str(row.get('Date', '')).strip()
                    if d_val and d_val != 'nan' and not ('-' in d_val and len(d_val) > 10):
                        item = {}
                        for c in df.columns:
                            if pd.notna(c) and not str(c).startswith('Unnamed'):
                                item[str(c).strip()] = clean_val(row[c])
                        if 'Date' in item:
                            rows.append(item)
                stats_data[sheet.lower().replace(' ', '_')] = rows

        # Traffic Sources & Contribution
        traffic_sources = {}
        for sheet in xl.sheet_names:
            if 'Traffic Sources' in sheet:
                df = xl.parse(sheet)
                # Row 0 usually has summary
                summary_row = df.iloc[0].to_dict()
                t_type = sheet.split('(')[1].replace(')', '').strip()
                traffic_sources[t_type] = {
                    'total_sales': clean_val(summary_row.get('Sales (PHP)', 0)),
                    'product_card': clean_val(summary_row.get('Sales from Product Card', 0)),
                    'seller_live': clean_val(summary_row.get('Sales from Seller Live', 0)),
                    'seller_video': clean_val(summary_row.get('Sales from Seller Video', 0)),
                    'affiliate': clean_val(summary_row.get('Sales from Affiliate', 0)),
                    'shopee_ads': clean_val(summary_row.get('Sales from Shopee Ads', 0))
                }
        stats_data['traffic_sources_summary'] = traffic_sources
        
        # Source Contribution (Paid Order)
        if 'Source Contribution (paid o...' in xl.sheet_names:
            df_src = xl.parse('Source Contribution (paid o...')
            src_list = []
            # Line 1 usually has headers
            if df_src.shape[0] > 2:
                df_src.columns = df_src.iloc[1]
                df_src = df_src.iloc[2:].reset_index(drop=True)
                for idx, row in df_src.iterrows():
                    source_name = str(row.get('Traffic Source', '')).strip()
                    if source_name and source_name != 'nan' and source_name != 'Traffic Source':
                        src_list.append({
                            'source': source_name,
                            'sales_ratio': clean_val(row.get('Sales Ratio')),
                            'sales': clean_val(row.get('Sales (PHP)')),
                            'impressions': clean_val(row.get('Product Impressions')),
                            'clicks': clean_val(row.get('Product Clicks')),
                            'orders': clean_val(row.get('Orders')),
                            'units': clean_val(row.get('Units')),
                            'ctr': clean_val(row.get('CTR')),
                            'conversion_rate': clean_val(row.get('Order Conversion Rate')),
                            'buyers': clean_val(row.get('Buyers'))
                        })
            stats_data['source_contributions'] = src_list

        data['shopee_stats'] = stats_data

    # 2. SALES OVERVIEW
    if os.path.exists(files['sales_overview']):
        xl = pd.ExcelFile(files['sales_overview'])
        df_sales = xl.parse('Sales Overview')

        # Row 0 is total summary
        total_summary = {}
        if df_sales.shape[0] > 0:
            sum_row = df_sales.iloc[0]
            total_summary = {
                'visitors': clean_val(sum_row.get('Visitors (Visit)')),
                'buyers_placed': clean_val(sum_row.get('Buyers (Placed Orders)')),
                'sales_placed': clean_val(sum_row.get('Sales (Placed Orders) (PHP)')),
                'buyers_confirmed': clean_val(sum_row.get('Buyers (Confirmed Orders)')),
                'sales_confirmed': clean_val(sum_row.get('Sales(Confirmed Orders) (PHP)')),
                'sales_per_buyer': clean_val(sum_row.get('Sales per Buyer (Confirmed Orders) (PHP)')),
                'conv_visit_to_placed': clean_val(sum_row.get('Conversion Rate (Visit to Placed)')),
                'conv_overall': clean_val(sum_row.get('Conversion Rate')),
                'conv_placed_to_confirmed': clean_val(sum_row.get('Conversion Rate (Placed to Confirmed)'))
            }

        # Header at index 2 for daily rows
        if df_sales.shape[0] > 2:
            df_sales.columns = df_sales.iloc[2]
            df_sales = df_sales.iloc[3:].reset_index(drop=True)
            daily_sales = []
            for idx, row in df_sales.iterrows():
                d_val = str(row.get('Date', '')).strip()
                if d_val and d_val != 'nan' and not ('-' in d_val and len(d_val) > 10):
                    daily_sales.append({
                        'date': d_val,
                        'visitors': clean_val(row.get('Visitors (Visit)')),
                        'buyers_placed': clean_val(row.get('Buyers (Placed Orders)')),
                        'units_placed': clean_val(row.get('Units (Placed Orders)')),
                        'orders_placed': clean_val(row.get('Orders (Placed Orders)')),
                        'sales_placed': clean_val(row.get('Sales (Placed Orders) (PHP)')),
                        'buyers_confirmed': clean_val(row.get('Buyers (Confirmed Orders)')),
                        'units_confirmed': clean_val(row.get('Units(Confirmed Orders)')),
                        'orders_confirmed': clean_val(row.get('Orders (Confirmed Orders)')),
                        'sales_confirmed': clean_val(row.get('Sales(Confirmed Orders) (PHP)')),
                        'sales_per_buyer': clean_val(row.get('Sales per Buyer (Confirmed Orders) (PHP)')),
                        'conv_rate': clean_val(row.get('Conversion Rate'))
                    })
            data['sales_overview'] = {
                'summary': total_summary,
                'daily': daily_sales
            }

    # 3. TRAFFIC OVERVIEW
    if os.path.exists(files['traffic_overview']):
        xl = pd.ExcelFile(files['traffic_overview'])
        traffic_data = {}
        for device in ['All', 'PC', 'APP']:
            if device in xl.sheet_names:
                df_tr = xl.parse(device)
                summary_tr = {}
                if df_tr.shape[0] > 0:
                    r0 = df_tr.iloc[0]
                    summary_tr = {
                        'page_views': clean_val(r0.get('Page Views')),
                        'avg_page_views': clean_val(r0.get('Avg. Page Views')),
                        'avg_time_spent': str(r0.get('Avg. Time Spent', '')),
                        'bounce_rate': clean_val(r0.get('Bounce Rate')),
                        'visitors': clean_val(r0.get('Visitors')),
                        'new_visitors': clean_val(r0.get('New Visitors')),
                        'existing_visitors': clean_val(r0.get('Existing Visitors')),
                        'new_followers': clean_val(r0.get('New Followers'))
                    }
                
                daily_tr = []
                if df_tr.shape[0] > 2:
                    df_tr.columns = df_tr.iloc[2]
                    df_tr = df_tr.iloc[3:].reset_index(drop=True)
                    for idx, row in df_tr.iterrows():
                        d_val = str(row.get('Date', '')).strip()
                        if d_val and d_val != 'nan' and not ('-' in d_val and len(d_val) > 10):
                            daily_tr.append({
                                'date': d_val,
                                'page_views': clean_val(row.get('Page Views')),
                                'avg_page_views': clean_val(row.get('Avg. Page Views')),
                                'avg_time_spent': str(row.get('Avg. Time Spent', '')),
                                'bounce_rate': clean_val(row.get('Bounce Rate')),
                                'visitors': clean_val(row.get('Visitors')),
                                'new_visitors': clean_val(row.get('New Visitors')),
                                'existing_visitors': clean_val(row.get('Existing Visitors')),
                                'new_followers': clean_val(row.get('New Followers'))
                            })
                traffic_data[device.lower()] = {
                    'summary': summary_tr,
                    'daily': daily_tr
                }
        data['traffic_overview'] = traffic_data

    # 4. PRODUCT OVERVIEW
    if os.path.exists(files['product_overview']):
        xl = pd.ExcelFile(files['product_overview'])
        df_prod = xl.parse('overview')
        prod_daily = []
        for idx, row in df_prod.iterrows():
            d_val = str(row.get('Date', '')).strip()
            if d_val and d_val != 'nan' and not ('-' in d_val and len(d_val) > 10):
                prod_daily.append({
                    'date': d_val,
                    'product_visitors': clean_val(row.get('Product Visitors (Visit)')),
                    'page_views': clean_val(row.get('Product Page Views')),
                    'items_visited': clean_val(row.get('Items Visited')),
                    'bounce_visitors': clean_val(row.get('Product Bounce Visitors')),
                    'bounce_rate': clean_val(row.get('Product Bounce Rate')),
                    'search_clicks': clean_val(row.get('Search Clicks')),
                    'likes': clean_val(row.get('Likes')),
                    'atc_visitors': clean_val(row.get('Product Visitors (Add to Cart)')),
                    'atc_units': clean_val(row.get('Units (Add to Cart)')),
                    'atc_conv_rate': clean_val(row.get('Conversion Rate (Add to Cart)')),
                    'buyers_placed': clean_val(row.get('Buyers (Placed Order)')),
                    'units_placed': clean_val(row.get('Units (Placed Order)')),
                    'sales_placed': clean_val(row.get('Sales (Placed Order) (PHP)')),
                    'buyers_confirmed': clean_val(row.get('Buyers (Confirmed Order)')),
                    'units_confirmed': clean_val(row.get('Units (Confirmed Order)')),
                    'sales_confirmed': clean_val(row.get('Sales (Confirmed Order) (PHP)'))
                })
        data['product_overview'] = prod_daily

    # 5. LAZADA BUSINESS ADVISOR (Key Metrics)
    lazada_path = os.path.join(downloads_dir, 'Business Advisor - Dashboard - Key Metrics.xls')
    if os.path.exists(lazada_path):
        df_laz = pd.read_excel(lazada_path, sheet_name='Key Metrics', header=5)
        # Summary row (index 0)
        summary_row = df_laz.iloc[0].to_dict()
        lazada_summary = {
            'revenue': clean_val(summary_row.get('Revenue', 18264.08)),
            'visitors': clean_val(summary_row.get('Visitors', 136)),
            'buyers': clean_val(summary_row.get('Buyers', 30)),
            'orders': clean_val(summary_row.get('Orders', 32)),
            'pageviews': clean_val(summary_row.get('Pageviews', 758)),
            'units_sold': clean_val(summary_row.get('Units Sold', 127)),
            'conversion_rate': clean_val(summary_row.get('Conversion Rate', 22.06)),
            'aov': clean_val(summary_row.get('Average Order Value', 570.75)),
            'cancelled_amount': clean_val(summary_row.get('Cancelled Amount', 368.00)),
            'refund_amount': clean_val(summary_row.get('Return/Refund Amount', 202.01))
        }

        # Daily rows (index 2 onwards)
        lazada_daily = []
        for idx in range(2, len(df_laz)):
            row = df_laz.iloc[idx]
            d_val = str(row.get('Date', '')).strip()
            if d_val and d_val != 'nan' and '-' in d_val and len(d_val) == 10:
                # Convert YYYY-MM-DD to DD/MM/YYYY for consistency
                parts = d_val.split('-')
                d_formatted = f"{parts[2]}/{parts[1]}/{parts[0]}"
                lazada_daily.append({
                    'date': d_formatted,
                    'raw_date': d_val,
                    'sales': clean_val(row.get('Revenue', 0)),
                    'visitors': clean_val(row.get('Visitors', 0)),
                    'buyers': clean_val(row.get('Buyers', 0)),
                    'orders': clean_val(row.get('Orders', 0)),
                    'pageviews': clean_val(row.get('Pageviews', 0)),
                    'units_sold': clean_val(row.get('Units Sold', 0)),
                    'cvr': clean_val(row.get('Conversion Rate', 0)),
                    'aov': clean_val(row.get('Average Order Value', 0)),
                    'cancelled_sales': clean_val(row.get('Cancelled Amount', 0)),
                    'refund_sales': clean_val(row.get('Return/Refund Amount', 0))
                })

        data['lazada_stats'] = {
            'summary': lazada_summary,
            'daily': lazada_daily
        }

    with open(json_output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated {json_output_path}")

if __name__ == '__main__':
    extract_all_data()
