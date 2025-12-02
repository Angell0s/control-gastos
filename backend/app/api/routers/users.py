#backend\app\api\routers\users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from typing import Annotated
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    # AGREGAMOS ESTO: Seguridad para que solo usuarios logueados puedan ver la lista
    current_user: User = Depends(get_current_user) 
):
    """
    Obtener lista de usuarios registrados.
    Requiere token de autenticación.
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Obtiene el usuario actual basado en el token JWT enviado en el header.
    """
    return current_user