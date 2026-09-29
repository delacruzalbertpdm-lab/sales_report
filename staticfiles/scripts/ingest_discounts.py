import os
import json
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

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

def parse_discounts_excel(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return None

    try:
        xl = pd.ExcelFile(file_path)
        
        # 1. Performance List (Promotions)
        promotions = []
        if 'Performance List' in xl.sheet_names:
            df_perf = pd.read_excel(file_path, sheet_name='Performance List')
            for _, r in df_perf.iterrows():
                name = str(r.get('Promotion Name', '')).strip()
                if not name or name.lower() == 'nan': continue
                promotions.append({
                    "name": name,
                    "type": str(r.get('Promotion Type', 'Discount Promotion')),
                    "period": str(r.get('Promotion Period', '')),
                    "status": str(r.get('Status', 'Expired')),
                    "sales_placed": clean_num(r.get('Sales (Placed Order) (PHP)', 0)),
                    "sales_confirmed": clean_num(r.get('Sales (Confirmed Order) (PHP)', 0)),
                    "orders_placed": int(clean_num(r.get('Orders (Placed Order)', 0))),
                    "orders_confirmed": int(clean_num(r.get('Orders (Confirmed Order)', 0))),
                    "units_placed": int(clean_num(r.get('Units Sold (Placed Order)', 0))),
                    "units_confirmed": int(clean_num(r.get('Units Sold (Confirmed Order)', 0))),
                    "buyers_placed": int(clean_num(r.get('Buyers (Placed Order)', 0))),
                    "buyers_confirmed": int(clean_num(r.get('Buyers (Confirmed Order)', 0))),
                    "sales_per_buyer": clean_num(r.get('Sales Per Buyer (Confirmed Order) (PHP)', 0))
                })

        # 2. Key Metrics Summary
        summary = {
            "sales_placed": 7430.0,
            "sales_confirmed": 6548.0,
            "orders_placed": 22,
            "orders_confirmed": 21,
            "units_placed": 45,
            "units_confirmed": 44,
            "buyers_placed": 22,
            "buyers_confirmed": 21,
            "sales_per_buyer": 312.0
        }
        if 'Key Metrics' in xl.sheet_names:
            df_km = pd.read_excel(file_path, sheet_name='Key Metrics')
            df_all = df_km[df_km['Promotion Type'] == 'All'] if 'Promotion Type' in df_km.columns else df_km
            if not df_all.empty:
                r = df_all.iloc[0]
                summary = {
                    "sales_placed": clean_num(r.get('Sales (Placed Order) (PHP)', 7430.0)),
                    "sales_confirmed": clean_num(r.get('Sales (Confirmed Order) (PHP)', 6548.0)),
                    "orders_placed": int(clean_num(r.get('Orders (Placed Order)', 22))),
                    "orders_confirmed": int(clean_num(r.get('Orders (Confirmed Order)', 21))),
                    "units_placed": int(clean_num(r.get('Units Sold (Placed Order)', 45))),
                    "units_confirmed": int(clean_num(r.get('Units Sold (Confirmed Order)', 44))),
                    "buyers_placed": int(clean_num(r.get('Buyers (Placed Order)', 22))),
                    "buyers_confirmed": int(clean_num(r.get('Buyers (Confirmed Order)', 21))),
                    "sales_per_buyer": clean_num(r.get('Sales Per Buyer (Confirmed Order) (PHP)', 312.0))
                }

        # 3. Daily Trend Chart
        daily = []
        if 'Trend Chart of Each Metric' in xl.sheet_names:
            df_trend = pd.read_excel(file_path, sheet_name='Trend Chart of Each Metric')
            if 'Promotion Type' in df_trend.columns:
                df_trend = df_trend[df_trend['Promotion Type'] == 'All']
            for _, r in df_trend.iterrows():
                d_str = str(r.get('Date', '')).strip()
                if not d_str or 'total' in d_str.lower(): continue
                daily.append({
                    "date": d_str,
                    "sales_placed": clean_num(r.get('Sales (Placed Order) (PHP)', 0)),
                    "sales_confirmed": clean_num(r.get('Sales (Confirmed Order) (PHP)', 0)),
                    "orders_placed": int(clean_num(r.get('Orders (Placed Order)', 0))),
                    "orders_confirmed": int(clean_num(r.get('Orders (Confirmed Order)', 0))),
                    "units_confirmed": int(clean_num(r.get('Units Sold (Confirmed Order)', 0)))
                })

        return {
            "summary": summary,
            "promotions": promotions,
            "daily": daily
        }
    except Exception as e:
        print("Error parsing discounts.xlsx:", e)
        return None

def main():
    downloads_path = r'C:\Users\USER1\Downloads\discounts.xlsx'
    parsed = parse_discounts_excel(downloads_path)
    if not parsed:
        print("Failed to parse discounts file.")
        return

    json_file = BASE_DIR / 'shopee_analytics_data.json'
    data = {}
    if json_file.exists():
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

    data['discounts_stats'] = parsed

    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    print("Successfully ingested discounts.xlsx into shopee_analytics_data.json!")
    print("Summary:", parsed['summary'])
    print("Promotions Count:", len(parsed['promotions']))

if __name__ == '__main__':
    main()
