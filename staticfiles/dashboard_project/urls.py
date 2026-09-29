from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.views.static import serve
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('analytics.urls')),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    re_path(r'^(?P<path>.*\.(css|js|json|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))$', serve, {'document_root': settings.BASE_DIR}),
]

