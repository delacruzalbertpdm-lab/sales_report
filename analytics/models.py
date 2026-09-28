from django.db import models

class DailyMetric(models.Model):
    PLATFORM_CHOICES = [
        ('shopee', 'Shopee'),
        ('lazada', 'Lazada'),
        ('tiktok', 'TikTok Shop'),
    ]

    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, db_index=True)
    date = models.DateField(db_index=True)
    sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    sales_rebate = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    orders = models.IntegerField(default=0)
    visitors = models.IntegerField(default=0)
    pageviews = models.IntegerField(default=0)
    product_clicks = models.IntegerField(default=0)
    cvr = models.FloatField(default=0.0)
    cancelled_orders = models.IntegerField(default=0)
    cancelled_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    refunded_orders = models.IntegerField(default=0)
    refunded_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    buyers = models.IntegerField(default=0)
    new_buyers = models.IntegerField(default=0)
    existing_buyers = models.IntegerField(default=0)
    potential_buyers = models.IntegerField(default=0)
    repeat_purchase_rate = models.FloatField(default=0.0)
    source_file = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date']
        unique_together = ('platform', 'date')

    def __str__(self):
        return f"[{self.platform.upper()}] {self.date}: ₱{self.sales} ({self.orders} orders)"
