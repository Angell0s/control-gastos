#backend\app\api\routers\users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from typing import Annotated
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_active_superuser 
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, UserSignup
from app.core.security import get_password_hash

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

# --- CREAR USUARIO (Solo Admins) ---
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    # Aquí aplicamos la seguridad: Solo pasa si es superusuario
    current_user: User = Depends(get_current_active_superuser) 
):
    """
    Crear un nuevo usuario.
    Requiere permisos de Superusuario.
    """
    # 1. Verificar si el email ya existe
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="El usuario con este email ya existe en el sistema.",
        )
    
    # 2. Hashear la contraseña (NUNCA guardar texto plano)
    hashed_password = get_password_hash(user_in.password)

    # 3. Crear instancia del modelo
    # dump_model excluye password, así que lo pasamos manualmente hasheado
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        is_active=user_in.is_active,
        is_superuser=user_in.is_superuser,
    )
    
    # 4. Guardar en DB
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

# --- 1. REGISTRO PÚBLICO (Sign Up) ---
@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserSignup,
):
    """
    Registro abierto de nuevos usuarios.
    Cualquiera puede llamar a este endpoint.
    """
    # 1. Validar duplicados
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="El email ya está registrado.",
        )

    # 2. Hashear password
    hashed_password = get_password_hash(user_in.password)

    # 3. SEGURIDAD CRÍTICA:
    # Ignoramos lo que el usuario mande en 'is_superuser' o 'is_active' en el JSON.
    # Forzamos valores por defecto seguros.
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        
        is_active=True,  # O False si implementarás verificación por email
        is_superuser=False, # SIEMPRE False en registro público
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user