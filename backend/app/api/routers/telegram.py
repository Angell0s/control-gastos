#backend\app\api\routers\telegram.py
from typing import Any
from datetime import timedelta
import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession 

from app.api.deps import get_db # Importa el get_db asíncrono (deps.py)
from app.models.user import User
from app.core import security
from app.core.config import settings
from app.schemas.telegram import (
    TelegramAuthStep1,
    TelegramAuthStep2,
    TelegramLoginRequest,
    TelegramAuthResponse
)
from app.services.audit import log_activity 

def normalize_phone(phone: str | None) -> str | None:
    """Normaliza cualquier número mexicano -> formato E.164 sin '+' (ej: 528468996046)"""
    if not phone: return None
    digits = re.sub(r"\D", "", phone.strip())
    if digits.startswith(("044", "045")): digits = digits[3:]
    digits = digits.lstrip("0")
    if digits.startswith("52") and len(digits) == 12: return digits
    if len(digits) == 10: return "52" + digits
    if digits.startswith("521") and len(digits) == 12: return digits
    if digits.startswith("521") and len(digits) == 13: return "52" + digits[2:]
    return digits if len(digits) >= 10 else None

router = APIRouter(tags=["telegram"])

@router.post("/check-phone")
async def check_phone_exists(
    data: TelegramAuthStep1,
    db: AsyncSession = Depends(get_db)
) -> dict[str, bool]:
    raw_phone = data.phone.strip() if data.phone else ""
    phone_normalized = normalize_phone(raw_phone)
    print(f"📱 Check Phone: '{raw_phone}' -> '{phone_normalized}'")
    
    if not phone_normalized:
        return {"exists": False}
    
    stmt = select(User).where(User.phone == phone_normalized)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if user:
        print(f"✅ Usuario encontrado: {user.email}")
        return {"exists": True}
    
    print("❌ Teléfono no encontrado en BD")
    return {"exists": False}


@router.post("/login-secure", response_model=TelegramAuthResponse)
async def login_telegram_secure(
    data: TelegramAuthStep2,
    db: AsyncSession = Depends(get_db)
) -> TelegramAuthResponse:
    phone_normalized = normalize_phone(data.phone)
    email_normalized = data.email.lower().strip()

    if not phone_normalized:
        raise HTTPException(status_code=400, detail="Número de teléfono inválido")

    print(f"🔐 Login Seguro Intentando: Phone: {phone_normalized} | Email: {email_normalized}")

    stmt = select(User).where(
        and_(User.phone == phone_normalized, User.email == email_normalized)
    )
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        print("❌ Fallo de autenticación")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El email no coincide con el teléfono registrado"
        )

    if data.telegram_chat_id and user.telegram_chat_id != data.telegram_chat_id:
        print(f"🔗 Vinculando nuevo Chat ID: {data.telegram_chat_id}")
        user.telegram_chat_id = data.telegram_chat_id
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = security.create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    print(f"✅ Login Exitoso: {user.first_name}")

    await log_activity(
        db=db,
        user_id=user.id,
        action="LOGIN",
        source="TELEGRAM",
        details=f"Login seguro via Bot (Phone: {phone_normalized})",
        update_last_login=True
    )

    return TelegramAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_name=user.first_name or "Usuario"
    )


@router.post("/login-silent", response_model=TelegramAuthResponse)
async def login_by_telegram_id(
    data: TelegramLoginRequest,
    db: AsyncSession = Depends(get_db)
) -> TelegramAuthResponse:
    print(f"🤫 Login Silencioso ID: {data.telegram_chat_id}")
    
    stmt = select(User).where(User.telegram_chat_id == data.telegram_chat_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        print("❌ ID de Telegram no reconocido")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Este Telegram no está vinculado"
        )

    access_token = security.create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    await log_activity(
        db=db,
        user_id=user.id,
        action="LOGIN_SILENT",
        source="TELEGRAM",
        details="Reconexión automática",
        update_last_login=True
    )

    print(f"✅ Login Silencioso Exitoso: {user.first_name}")
    return TelegramAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_name=user.first_name or "Usuario"
    )


# ✅ --- NUEVO: DESVINCULAR DESDE EL BOT ---
@router.post("/unlink", status_code=200)
async def unlink_telegram_bot(
    data: TelegramLoginRequest, # Reutilizamos este schema porque trae 'telegram_chat_id'
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Permite al usuario desvincularse usando un comando en el bot (ej: /logout).
    """
    print(f"✂️ Intentando desvincular Chat ID: {data.telegram_chat_id}")
    
    stmt = select(User).where(User.telegram_chat_id == data.telegram_chat_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado o ya desvinculado")
    
    # Borramos datos
    user.telegram_chat_id = None
    user.phone = None
    
    db.add(user)
    await db.commit()
    
    await log_activity(
        db=db,
        user_id=user.id,
        action="UNLINK_TELEGRAM",
        source="TELEGRAM_BOT",
        details="Desvinculación solicitada vía comando Bot"
    )
    
    return {"message": "Cuenta desvinculada correctamente. Deberás registrarte de nuevo para usar el bot."}
