import pandas as pd
import glob
import os

files = glob.glob("**/firstprotectph.shopee-shop-stats*.xlsx", recursive=True)
if not files:
    print("Searching user downloads or local folder...")
    files = glob.glob("C:/Users/USER1/Downloads/firstprotectph.shopee-shop-stats*.xlsx")

print("Found files:", files)

for fpath in files:
    xl = pd.ExcelFile(fpath)
    print(f"\nFile: {os.path.basename(fpath)}")
    print("Sheets:", xl.sheet_names)
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        print(f"  --- Sheet: '{sheet}' --- (shape: {df.shape})")
        print("  Columns snippet:", list(df.columns)[:8])
