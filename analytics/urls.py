from django.urls import path
from . import views

urlpatterns = [
    path('analytics/', views.analytics_api, name='analytics_api'),
    path('income/', views.income_api, name='income_api'),
    path('import/', views.import_api, name='import_api'),
    path('import-income/', views.import_income_api, name='import_income_api'),
    path('reset/', views.reset_api, name='reset_api'),
    path('clear/', views.clear_api, name='clear_api'),
]
