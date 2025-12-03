from pydantic import BaseModel, EmailStr

# Paso 1: Verificar teléfono
class TelegramAuthStep1(BaseModel):
    phone: str

# Paso 2: Login seguro con email y vinculación
class TelegramAuthStep2(BaseModel):
    phone: str
    email: EmailStr
    telegram_chat_id: int

# Paso 3: Login silencioso (reconexión automática)
class TelegramLoginRequest(BaseModel):
    telegram_chat_id: int

# Respuesta común con el Token
class TelegramAuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_name: str
