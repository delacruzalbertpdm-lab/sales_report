import pandas as pd
import os

files = [
    ('shopee', 'august', 'C:/Users/USER1/Downloads/August_Sales_FP_Shopee.xlsx'),
    ('shopee', 'september', 'C:/Users/USER1/Downloads/September_Sales_FP_Shopee.xlsx'),
    ('lazada', 'august', 'C:/Users/USER1/Downloads/August_Sales_FP_Lazada.xls'),
    ('lazada', 'september', 'C:/Users/USER1/Downloads/September_Sales_FP_Lazada.xls'),
    ('tiktok', 'august', 'C:/Users/USER1/Downloads/August_Sales_FP_Tiktok.xlsx'),
    ('tiktok', 'september', 'C:/Users/USER1/Downloads/September_Sales_FP_Tiktok.xlsx'),
]

for platform, month, filepath in files:
    print(f"\n==================== {platform.upper()} - {month.upper()} ({os.path.basename(filepath)}) ====================")
    try:
        xl = pd.ExcelFile(filepath)
        print("Sheets:", xl.sheet_names)
        for s in xl.sheet_names[:3]:
            df = xl.parse(s, header=None)
            print(f"Sheet '{s}' shape: {df.shape}")
            for r_i in range(min(6, len(df))):
                print(f"  Row {r_i}: {df.iloc[r_i].values[:8]}")
    except Exception as e:
        print("Error reading:", e)
