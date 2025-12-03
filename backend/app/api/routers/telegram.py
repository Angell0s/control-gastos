from typing import Any
from datetime import timedelta
import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session  # ✅ Usamos Session síncrona

from app.db.session import get_db
from app.models.user import User
from app.core import security
from app.core.config import settings
from app.schemas.telegram import (
    TelegramAuthStep1,
    TelegramAuthStep2,
    TelegramLoginRequest,
    TelegramAuthResponse
)

def normalize_phone(phone: str | None) -> str | None:
    """Normaliza cualquier número mexicano → formato E.164 sin '+' (ej: 528468996046)"""
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
def check_phone_exists(
    data: TelegramAuthStep1,
    db: Session = Depends(get_db)
) -> dict[str, bool]:
    raw_phone = data.phone.strip() if data.phone else ""
    # Normalizamos teléfono
    phone_normalized = normalize_phone(raw_phone)
    
    print(f"📱 Check Phone: '{raw_phone}' -> '{phone_normalized}'")
    
    if not phone_normalized:
        return {"exists": False}
    
    # Consulta Síncrona
    user = db.scalar(select(User).where(User.phone == phone_normalized))
    
    if user:
        print(f"✅ Usuario encontrado: {user.email}")
        return {"exists": True}
    
    print("❌ Teléfono no encontrado en BD")
    return {"exists": False}

@router.post("/login-secure", response_model=TelegramAuthResponse)
def login_telegram_secure(
    data: TelegramAuthStep2,
    db: Session = Depends(get_db)
) -> TelegramAuthResponse:
    # 1. Normalizar Teléfono
    phone_normalized = normalize_phone(data.phone)
    
    # 2. Normalizar Email (Minúsculas y sin espacios)
    email_normalized = data.email.lower().strip()

    if not phone_normalized:
        raise HTTPException(status_code=400, detail="Número de teléfono inválido")

    print(f"🔐 Login Seguro Intentando:")
    print(f"   📱 Phone: {phone_normalized}")
    print(f"   📧 Email: {email_normalized}")

    # 3. Buscar coincidencia exacta (Síncrono)
    user = db.scalar(select(User).where(
        (User.phone == phone_normalized) & (User.email == email_normalized)
    ))

    if not user:
        print("❌ Fallo de autenticación: Datos no coinciden")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El email no coincide con el teléfono registrado"
        )

    # 4. Vincular Telegram ID si es nuevo
    if data.telegram_chat_id and user.telegram_chat_id != data.telegram_chat_id:
        print(f"🔗 Vinculando nuevo Chat ID: {data.telegram_chat_id}")
        user.telegram_chat_id = data.telegram_chat_id
        db.add(user)
        db.commit()
        db.refresh(user)

    # 5. Generar Token
    access_token = security.create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    print(f"✅ Login Exitoso: {user.first_name}")
    return TelegramAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_name=user.first_name or "Usuario"
    )

@router.post("/login-silent", response_model=TelegramAuthResponse)
def login_by_telegram_id(
    data: TelegramLoginRequest,
    db: Session = Depends(get_db)
) -> TelegramAuthResponse:
    print(f"🤫 Login Silencioso ID: {data.telegram_chat_id}")
    
    # Consulta Síncrona
    user = db.scalar(select(User).where(User.telegram_chat_id == data.telegram_chat_id))

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

    print(f"✅ Login Silencioso Exitoso: {user.first_name}")
    return TelegramAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_name=user.first_name or "Usuario"
    )
