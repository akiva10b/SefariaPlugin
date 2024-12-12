from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('plugin_user/', include('plugin_user.urls')),
]