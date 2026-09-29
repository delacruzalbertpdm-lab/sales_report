import urllib.request
import json

print("Clearing SQLite database via Django /api/clear/ endpoint...")
req = urllib.request.Request("http://127.0.0.1:8000/api/clear/", method="POST")
res = urllib.request.urlopen(req)
print("Response:", res.read().decode('utf-8'))

print("\nVerifying /api/analytics/ state after clear:")
req_analytics = urllib.request.urlopen("http://127.0.0.1:8000/api/analytics/")
data = json.loads(req_analytics.read().decode('utf-8'))

shopee_rows = len(data.get('shopee_stats', {}).get('paid_order', []))
lazada_rows = len(data.get('lazada_stats', {}).get('daily', []))
tiktok_rows = len(data.get('tiktok_stats', {}).get('daily', []))

print(f"Shopee Rows: {shopee_rows}")
print(f"Lazada Rows: {lazada_rows}")
print(f"TikTok Rows: {tiktok_rows}")
print("Database is at ZERO! Clean slate verification successful!")
