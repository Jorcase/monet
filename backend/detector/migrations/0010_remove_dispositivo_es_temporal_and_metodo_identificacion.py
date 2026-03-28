from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("detector", "0009_analisisred_owner_dispositivo_owner"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="dispositivo",
            name="es_temporal",
        ),
        migrations.RemoveField(
            model_name="dispositivo",
            name="metodo_identificacion",
        ),
    ]
