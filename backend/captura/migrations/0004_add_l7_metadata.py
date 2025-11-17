from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("captura", "0003_alter_capturasesion_modo_delete_capturaaccionactiva"),
    ]

    operations = [
        migrations.AddField(
            model_name="capturaflujo",
            name="alpn",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="capturaflujo",
            name="es_doh_dot",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="capturaflujo",
            name="ja3",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="capturaflujo",
            name="proto_aplicacion",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="capturaflujo",
            name="sni",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
