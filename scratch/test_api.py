import urllib.request
import json

print("Testing Django REST API analytics endpoint...")
req = urllib.request.urlopen("http://127.0.0.1:8000/api/analytics/")
data = json.loads(req.read().decode('utf-8'))

shopee_orders = len(data.get('shopee_stats', {}).get('paid_order', []))
lazada_orders = len(data.get('lazada_stats', {}).get('daily', []))
tiktok_orders = len(data.get('tiktok_stats', {}).get('daily', []))

print(f"API returned analytics JSON successfully!")
print(f"Loaded Shopee Days: {shopee_orders}")
print(f"Loaded Lazada Days: {lazada_orders}")
print(f"Loaded TikTok Days: {tiktok_orders}")
print(f"Lazada Summary Revenue: PHP {data.get('lazada_stats', {}).get('summary', {}).get('revenue')}")
print(f"TikTok Summary Revenue: PHP {data.get('tiktok_stats', {}).get('summary', {}).get('revenue')}")
