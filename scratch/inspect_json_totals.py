import json

with open('shopee_analytics_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

paid_order = data.get('shopee_stats', {}).get('paid_order', [])

sales_php_sum = sum(r.get('Sales (PHP)', 0) for r in paid_order)
rebate_sales_sum = sum(r.get('Sales (Shopee Rebate applied)', 0) for r in paid_order)
orders_sum = sum(r.get('Orders', 0) for r in paid_order)
visitors_sum = sum(r.get('Visitors', 0) for r in paid_order)

print("=== SHOPEE ANALYTICS DATA JSON SUMMARY ===")
print("Number of daily rows:", len(paid_order))
print("Sum of 'Sales (PHP)':", sales_php_sum)
print("Sum of 'Sales (Shopee Rebate applied)':", rebate_sales_sum)
print("Sum of 'Orders':", orders_sum)
print("Sum of 'Visitors':", visitors_sum)
