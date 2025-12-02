from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Imports de tus archivos
from app.db.session import get_db
from app.core import security
from app.core.config import settings
from app.models.user import User  # Asumiendo que tu modelo User está aquí
from app.schemas.token import Token

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    Valida credenciales y devuelve un JWT.
    """
    # 1. Buscamos al usuario por EMAIL (mapeado desde form_data.username)
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # 2. Validaciones: ¿Existe el usuario? ¿Coincide la contraseña?
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
    
    # 5. Crear el token
    access_token = security.create_access_token(
        subject=user.id,  # Guardamos el ID del usuario dentro del token
        expires_delta=access_token_expires
    )
    
    # 6. Devolver respuesta
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
