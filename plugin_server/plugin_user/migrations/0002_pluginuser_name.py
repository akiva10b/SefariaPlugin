# Generated by Django 5.1.4 on 2024-12-12 12:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('plugin_user', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='pluginuser',
            name='name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]