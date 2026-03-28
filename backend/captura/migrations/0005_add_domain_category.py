from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("captura", "0004_add_l7_metadata"),
    ]

    operations = [
        migrations.AddField(
            model_name="capturaflujo",
            name="categoria_dominio",
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
