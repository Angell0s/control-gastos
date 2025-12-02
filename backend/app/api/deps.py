#backend\app\api\deps.py
from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.core.config import settings

# 1. Configuración de la ruta de Login para Swagger
# Esto le dice al botón "Authorize": "Manda el usuario y pass a esta URL"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login/access-token")

# 2. Dependencia de Base de Datos
def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

# 3. Obtener el usuario actual (Protección de Rutas)
def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Decodifica el token JWT, extrae el ID del usuario y lo busca en la BD.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decodificamos el token usando la CLAVE SECRETA del .env
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # Extraemos el ID del usuario (guardado en el campo 'sub')
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except (JWTError, ValidationError):
        raise credentials_exception
        
    # Buscamos al usuario en la base de datos
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise credentials_exception
        
    # Si todo está bien, devolvemos el objeto usuario completo
    return user
