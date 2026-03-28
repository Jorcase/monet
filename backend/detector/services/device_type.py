from detector.models import Dispositivo


def set_device_type(dispositivo: Dispositivo, tipo: str, fuente: str = "heuristica") -> None:
    
    if dispositivo is None:
        return
    tipo_actual = dispositivo.tipo_dispositivo
    fuente_actual = getattr(dispositivo, "tipo_fuente", "sin_datos")
    if fuente_actual == "manual":
        return
    if tipo_actual == "desconocido" or fuente_actual in {"sin_datos", "heuristica"}:
        dispositivo.tipo_dispositivo = tipo
        dispositivo.tipo_fuente = fuente
        dispositivo.save(update_fields=["tipo_dispositivo", "tipo_fuente"])
