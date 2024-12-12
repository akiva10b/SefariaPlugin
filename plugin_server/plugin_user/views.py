import json
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from plugin_server.settings import FIELD_ENCRYPTION_KEY

from utils.encryption import decrypt_str_with_key
from .models import PluginUser


@csrf_exempt
def plugin_user(request):
    allowed_methods = ['GET', 'PUT', 'DELETE', 'POST']
    if request.method not in allowed_methods:
        return HttpResponseNotAllowed(allowed_methods)
    if request.method == 'POST':
        return create_plugin_user(request)
    else:
        return plugin_user_details(request)


def create_plugin_user(request):
    """
    POST: Create a new PluginUser. Requires JSON body: {"sefaria_id": "some_id"}.
    """
    try:
        data = json.loads(request.body.decode('utf-8'))
        sefaria_id = data.get('sefaria_id')
        if not sefaria_id:
            return JsonResponse({'error': 'sefaria_id is required'}, status=400)
        # Create the plugin user
        try:
            sefaria_id = decrypt_str_with_key(sefaria_id, FIELD_ENCRYPTION_KEY)
        except Exception as e:
            return JsonResponse({'error': 'Invalid sefaria_id'}, status=400)
        
        obj, created = PluginUser.objects.get_or_create(sefaria_id=sefaria_id)
        if not created:
            return JsonResponse({'error': 'sefaria_id already exists'}, status=400)
        return JsonResponse({'sefaria_id': obj.sefaria_id}, status=201)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


def plugin_user_details(request):
    """
    GET: Retrieve a specific PluginUser by sefaria_id.
    PUT: Update a PluginUser's sefaria_id. Requires JSON body: {"sefaria_id": "new_id"}.
    DELETE: Delete a PluginUser by sefaria_id.
    """
    plugin_user_id = request.headers.get('plugin_user_id')
    if not plugin_user_id:
        return JsonResponse({'error': 'sefaria_id header is required'}, status=400)

    sefaria_id = decrypt_str_with_key(plugin_user_id, FIELD_ENCRYPTION_KEY)
    plugin_user = get_object_or_404(PluginUser, sefaria_id=sefaria_id)

    if request.method == 'GET':
        return JsonResponse({'sefaria_id': plugin_user.sefaria_id})

    elif request.method == 'PUT':
        try:
            data = json.loads(request.body.decode('utf-8'))
            name = data.get('name')
            if not name:
                return JsonResponse({'error': 'name is required'}, status=400)

            plugin_user.name = name
            plugin_user.save()
            return JsonResponse({'sefaria_id': plugin_user.sefaria_id})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

    elif request.method == 'DELETE':
        plugin_user.delete()
        return JsonResponse({'status': 'deleted'})
