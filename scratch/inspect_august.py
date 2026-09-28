import pandas as pd
import json

filepath = 'C:/Users/USER1/Downloads/August_Sales_FP.xlsx'
xl = pd.ExcelFile(filepath)
print("Sheet names:", xl.sheet_names)

for sheet in xl.sheet_names:
    print(f"\n--- SHEET: {sheet} ---")
    df = xl.parse(sheet, header=None)
    print("Shape:", df.shape)
    for i in range(min(10, len(df))):
        print(f"Row {i}: {df.iloc[i].values[:10]}")
