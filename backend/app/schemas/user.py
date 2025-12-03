#backend\app\schemas\user.py
from pydantic import BaseModel, EmailStr, ConfigDict, computed_field
from typing import Optional
from uuid import UUID
from datetime import datetime

# 1. UserBase: Datos compartidos
class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    
    # ✅ Nuevo campo de bitácora
    last_login: Optional[datetime] = None 

# 2. UserCreate
class UserCreate(UserBase):
    password: str

# 3. UserUpdate
class UserUpdate(BaseModel):
    """Schema para actualizar un usuario (campos opcionales)"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None  # Si se envía, se hasheará
    is_active: Optional[bool] = None  # Solo admin
    is_superuser: Optional[bool] = None  # Solo admin


# ✅ 4. UserResponse (Perfil Público/Propio)
# NO muestra el ID de Telegram, solo si está vinculado
class UserResponse(UserBase):
    id: UUID
    
    # Campo interno para leer del ORM (excluido del JSON final si no se pide explícitamente)
    telegram_chat_id: Optional[int] = None 

    @computed_field
    @property
    def telegram_linked(self) -> bool:
        """Indica si la cuenta está vinculada con Telegram"""
        return self.telegram_chat_id is not None

    model_config = ConfigDict(from_attributes=True)

# ✅ 5. UserResponseAdmin (Vista de Administrador)
# SÍ muestra el ID de Telegram para soporte/debug
class UserResponseAdmin(UserBase):
    id: UUID
    telegram_chat_id: Optional[int] = None
    
    @computed_field
    @property
    def telegram_linked(self) -> bool:
        return self.telegram_chat_id is not None

    model_config = ConfigDict(from_attributes=True)

# 6. UserSignup
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

