from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission

TARGET_APPS = ["agente", "detector", "escaner", "captura", "analitica"]


class Command(BaseCommand):
    help = "Crea los grupos base (Administrador, Operador, Observador) y asigna permisos sugeridos."

    def handle(self, *args, **options):
        permisos = Permission.objects.filter(content_type__app_label__in=TARGET_APPS)
        view_perms = permisos.filter(codename__startswith="view_")
        change_perms = permisos.filter(codename__startswith="change_")
        add_perms = permisos.filter(codename__startswith="add_")

        admin_group, _ = Group.objects.get_or_create(name="Administrador")
        admin_group.permissions.set(permisos)
        self.stdout.write(self.style.SUCCESS("Grupo Administrador actualizado."))

        operador_group, _ = Group.objects.get_or_create(name="Operador")
        operador_group.permissions.set(list(view_perms) + list(change_perms) + list(add_perms))
        self.stdout.write(self.style.SUCCESS("Grupo Operador actualizado."))

        observador_group, _ = Group.objects.get_or_create(name="Observador")
        observador_group.permissions.set(view_perms)
        self.stdout.write(self.style.SUCCESS("Grupo Observador actualizado."))

        self.stdout.write(self.style.NOTICE("Asigná usuarios a los grupos según corresponda desde el admin."))
