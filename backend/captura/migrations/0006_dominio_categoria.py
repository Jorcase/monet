from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("captura", "0005_add_domain_category"),
    ]

    operations = [
        migrations.CreateModel(
            name="DominioCategoria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sufijo", models.CharField(max_length=255, unique=True)),
                ("categoria", models.CharField(max_length=64)),
                ("activo", models.BooleanField(default=True)),
                ("creado", models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                "verbose_name": "Dominio categorizado",
                "verbose_name_plural": "Dominios categorizados",
                "db_table": "captura_dominio_categoria",
                "ordering": ("sufijo",),
            },
        ),
    ]
