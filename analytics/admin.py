from django.contrib import admin
from .models import DailyMetric

@admin.register(DailyMetric)
class DailyMetricAdmin(admin.ModelAdmin):
    list_display = ('platform', 'date', 'sales', 'orders', 'visitors', 'cvr', 'source_file', 'updated_at')
    list_filter = ('platform', 'date')
    search_fields = ('platform', 'source_file')
    ordering = ('-date', 'platform')
