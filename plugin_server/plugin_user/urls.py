from django.urls import path
from .views import plugin_user

urlpatterns = [
    path('', plugin_user, name='plugin_user_list_create'),
]