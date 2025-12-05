#backend\app\services\audit.py
from sqlalchemy.ext.asyncio import AsyncSession  # <-- Cambio: AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.models.user import User, AuditLog
import uuid

async def log_activity(  # <-- Cambio: async def
    db: AsyncSession,    # <-- Cambio: AsyncSession
    user_id: uuid.UUID,
    action: str,
    source: str,
    details: str = None,
    update_last_login: bool = False
):
    """
    Registra una actividad en la bitácora (Versión Async).
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

    # 2. Actualizar last_login si se requiere
    if update_last_login:
        # Consulta async para obtener el usuario
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        
        if user:
            user.last_login = datetime.utcnow()
            db.add(user)

    # 3. Guardar cambios
    try:
        await db.commit()  # <-- Cambio: await
    except Exception as e:
        print(f"❌ Error escribiendo bitácora: {e}")
        await db.rollback() # <-- Cambio: await
