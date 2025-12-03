#backend\app\schemas\user.py
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID

# 1. UserBase: Datos compartidos
class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    
    # Nuevos campos (Opcionales porque en la DB son nullable=True)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

# 2. UserCreate: Lo necesario para registrarse
class UserCreate(UserBase):
    password: str

# 3. UserUpdate: Para actualizar perfil (Opcional pero recomendado)
class UserUpdate(BaseModel):
    # En update, todos los campos suelen ser opcionales
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    email: Optional[EmailStr] = None

# 4. UserResponse: Lo que devuelve la API
class UserResponse(UserBase):
    id: UUID
    
    # Configuración para Pydantic V2 (compatible con ORMs)
    model_config = ConfigDict(from_attributes=True)
    
    # Si usas una versión vieja de Pydantic (v1), usa esto en su lugar:
    # class Config:
    #     orm_mode = True

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None