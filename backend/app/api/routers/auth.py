#backend\app\api\routers\auth.py
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession  # <-- CAMBIO: Usar AsyncSession
from sqlalchemy import select                  # <-- CAMBIO: Importar select para consultas

# Imports de tus archivos
from app.api.deps import get_db                # <-- CAMBIO: Importar desde deps, no session
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
async def login_access_token(                  # <-- CAMBIO: async def
    db: AsyncSession = Depends(get_db),        # <-- CAMBIO: Tipo AsyncSession
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    Valida credenciales y devuelve un JWT (Versión Async).
    """
    # 1. Buscamos al usuario por EMAIL de forma asíncrona
    # db.query() NO EXISTE en modo async. Usamos: await db.execute(select(...))
    
    query = select(User).where(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalars().first()
    
    # 2. Validaciones: ¿Existe el usuario? ¿Coincide la contraseña?
    # (security.verify_password no necesita await porque es CPU-bound, no I/O bound)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    
    # 3. (Opcional) Validar si el usuario está activo
    if not user.is_active:
         raise HTTPException(status_code=400, detail="Usuario inactivo")

    # 4. Definir expiración del token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 5. Crear el token (Esto es pura lógica de Python, no requiere await)
    access_token = security.create_access_token(
        subject=str(user.id),  # Aseguramos que sea string por si es UUID
        expires_delta=access_token_expires
    )
    
    # 6. Devolver respuesta
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
