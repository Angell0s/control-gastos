from pydantic import BaseModel, EmailStr
from typing import Optional

# Esquema base con datos comunes
class UserBase(BaseModel):
    email: EmailStr
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False

# Esquema para crear un usuario (aquí sí pedimos password)
class UserCreate(UserBase):
    password: str

# Esquema para LEER un usuario (respuesta de la API)
# ¡Aquí NO incluimos el password!
class UserResponse(UserBase):
    id: int

    # Esta configuración es vital para que Pydantic lea objetos de SQLAlchemy
    class Config:
        from_attributes = True 
