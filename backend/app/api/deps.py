#backend\app\api\deps.py
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy import select  # <--- NECESARIO PARA CONSULTAS ASYNC
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.config import settings

# 1. Configuración de OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login/access-token")

# 2. Dependencia de Base de Datos (ASÍNCRONA)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            # En async, el commit se suele hacer explícito en los endpoints si modificas datos
        finally:
            # session.close() es automático al salir del contexto 'async with'
            pass

# 3. Obtener usuario actual (ASÍNCRONO)
async def get_current_user(
    db: AsyncSession = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Decodifica el token JWT y busca al usuario de forma asíncrona.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except (JWTError, ValidationError):
        raise credentials_exception
        
    # --- CAMBIO CLAVE: CONSULTA ASÍNCRONA ---
    # En async no existe db.query(User).filter(...)
    # Se usa la sintaxis moderna de SQLAlchemy 2.0:
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first() # scalars() obtiene los objetos puros
    
    if user is None:
        raise credentials_exception
        
    return user

# 4. Superusuario (ASÍNCRONO)
async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="El usuario está inactivo")
    
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes privilegios suficientes"
        )
    
    return current_user
