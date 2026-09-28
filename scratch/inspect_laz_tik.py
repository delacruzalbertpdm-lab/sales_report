import pandas as pd

print("=== LAZADA AUGUST ===")
xl_laz_aug = pd.ExcelFile('C:/Users/USER1/Downloads/August_Sales_FP_Lazada.xls')
df_laz_aug = xl_laz_aug.parse('Key Metrics')
print(df_laz_aug.iloc[5:15])

print("\n=== LAZADA SEPTEMBER ===")
xl_laz_sep = pd.ExcelFile('C:/Users/USER1/Downloads/September_Sales_FP_Lazada.xls')
df_laz_sep = xl_laz_sep.parse('Key Metrics')
print(df_laz_sep.iloc[5:15])

print("\n=== TIKTOK AUGUST ===")
xl_tik_aug = pd.ExcelFile('C:/Users/USER1/Downloads/August_Sales_FP_Tiktok.xlsx')
df_tik_aug = xl_tik_aug.parse('Sheet1')
print("TikTok Aug rows:")
for i in range(len(df_tik_aug)):
    vals = [str(x) for x in df_tik_aug.iloc[i].values if pd.notna(x)]
    if any('date' in x.lower() or '2026' in x for x in vals):
        print(f"Row {i}: {df_tik_aug.iloc[i].values[:10]}")

print("\n=== TIKTOK SEPTEMBER ===")
xl_tik_sep = pd.ExcelFile('C:/Users/USER1/Downloads/September_Sales_FP_Tiktok.xlsx')
df_tik_sep = xl_tik_sep.parse('Sheet1')
print("TikTok Sep rows:")
for i in range(len(df_tik_sep)):
    vals = [str(x) for x in df_tik_sep.iloc[i].values if pd.notna(x)]
    if any('date' in x.lower() or '2026' in x for x in vals):
        print(f"Row {i}: {df_tik_sep.iloc[i].values[:10]}")
