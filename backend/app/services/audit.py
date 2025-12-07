#backend\app\services\audit.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.models.user import User, AuditLog
import uuid
from typing import Union  # <-- Necesario para el tipado

async def log_activity(
    db: AsyncSession,
    user_id: Union[uuid.UUID, str],  # <-- Cambio: Acepta UUID o string "system"
    action: str,
    source: str,
    details: str = None,
    update_last_login: bool = False
):
    """
    Registra una actividad en la bitácora (Versión Async).
    Soporta user_id="system" buscando al usuario 'Sistema System'.
    """
    
    final_user_id = user_id

    # 1. Lógica especial para "system"
    if user_id == "system":
        # Buscamos al usuario sistema por nombre y apellido
        query = select(User).where(
            User.first_name == "Sistema",
            User.last_name == "System"
        )
        result = await db.execute(query)
        system_user = result.scalars().first()

        if system_user:
            final_user_id = system_user.id
        else:
            # Si no existe el usuario sistema, logueamos el error y salimos
            # para evitar romper la BD intentando insertar el string "system"
            print(f"❌ Error AuditLog: No se encontró el usuario 'Sistema System' en la BD.")
            return

    # 2. Crear registro de log con el ID resuelto
    new_log = AuditLog(
        user_id=final_user_id,
        action=action,
        source=source,
        details=details,
        timestamp=datetime.utcnow()
    )
    db.add(new_log)

    # 3. Actualizar last_login si se requiere
    if update_last_login and final_user_id:
        # Reutilizamos final_user_id por si vino de "system"
        result = await db.execute(select(User).where(User.id == final_user_id))
        user = result.scalars().first()
        
        if user:
            user.last_login = datetime.utcnow()
            db.add(user)

    # 4. Guardar cambios
    try:
        await db.commit()
    except Exception as e:
        print(f"❌ Error escribiendo bitácora: {e}")
        await db.rollback()
