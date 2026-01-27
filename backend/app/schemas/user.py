#backend\app\schemas\user.py
from pydantic import BaseModel, EmailStr, ConfigDict, computed_field
from typing import Optional
from uuid import UUID
from datetime import datetime

# UserBase: Datos compartidos
class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    
    last_login: Optional[datetime] = None 

# UserCreate
class UserCreate(UserBase):
    password: str

# UserUpdate
class UserUpdate(BaseModel):
    """Schema para actualizar un usuario (campos opcionales)"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None  
    is_active: Optional[bool] = None  
    is_superuser: Optional[bool] = None  


class UserResponse(UserBase):
    id: UUID
    
    telegram_chat_id: Optional[int] = None 

    @computed_field
    @property
    def telegram_linked(self) -> bool:
        """Indica si la cuenta está vinculada con Telegram"""
        return self.telegram_chat_id is not None

    model_config = ConfigDict(from_attributes=True)

class UserResponseAdmin(UserBase):
    id: UUID
    telegram_chat_id: Optional[int] = None
    
    @computed_field
    @property
    def telegram_linked(self) -> bool:
        return self.telegram_chat_id is not None

    model_config = ConfigDict(from_attributes=True)

# UserSignup
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

