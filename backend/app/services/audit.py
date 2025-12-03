#backend\app\services\audit.py
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.user import User, AuditLog
import uuid

def log_activity(
    db: Session,
    user_id: uuid.UUID,
    action: str,
    source: str,
    details: str = None,
    update_last_login: bool = False
):
    """
    Registra una actividad en la bitácora y opcionalmente actualiza el last_login del usuario.
    
    :param db: Sesión de base de datos
    :param user_id: ID del usuario
    :param action: Acción realizada (LOGIN, LOGOUT, CREATE, etc.)
    :param source: Fuente (WEB, TELEGRAM)
    :param details: Detalles adicionales opcionales
    :param update_last_login: Si es True, actualiza el campo last_login del usuario
    """
    # 1. Crear registro de log
    new_log = AuditLog(
        user_id=user_id,
        action=action,
        source=source,
        details=details,
        timestamp=datetime.utcnow()
    )
    db.add(new_log)

    # 2. Actualizar last_login si se requiere (Solo en logins)
    if update_last_login:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.last_login = datetime.utcnow()
            db.add(user)

    # 3. Guardar cambios
    try:
        db.commit()
        # No hacemos refresh del log porque raramente necesitamos devolverlo inmediato
    except Exception as e:
        print(f"❌ Error escribiendo bitácora: {e}")
        db.rollback()
