#backend\app\api\routers\auth.py
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Form # <-- Importamos Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Imports de tus archivos
from app.api.deps import get_db
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: bool = Form(False)  # <-- Nuevo parámetro opcional (default False)
) -> Any:
    """
    Valida credenciales y devuelve un JWT.
    Si 'remember_me' es True, el token dura mucho más tiempo (configurado en settings).
    """
    
    # 1. Buscamos al usuario por EMAIL
    query = select(User).where(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalars().first()
    
    # 2. Validaciones
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    
    if not user.is_active:
         raise HTTPException(status_code=400, detail="Usuario inactivo")

    # 3. Definir expiración según "remember_me"
    if remember_me:
        # Sesión extendida (ej. 7 días)
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES_LONG)
    else:
        # Sesión estándar (ej. 30 min)
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 4. Crear el token
    access_token = security.create_access_token(
        subject=str(user.id),
        expires_delta=access_token_expires
    )
    
    # 5. Devolver respuesta
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
