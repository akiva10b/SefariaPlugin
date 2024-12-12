from django.db import models

class PluginUser(models.Model):
    sefaria_id = models.CharField(max_length=255)
    name = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.sefaria_id
