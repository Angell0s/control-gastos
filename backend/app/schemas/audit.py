#backend\app\schemas\audit.py
from pydantic import BaseModel, ConfigDict, computed_field
from typing import Optional
from uuid import UUID
from datetime import datetime

# Un esquema pequeño del usuario que sí tenga esos campos:
class AuditUserMinimal(BaseModel):
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class AuditLogBase(BaseModel):
    action: str
    source: str
    details: Optional[str] = None
    timestamp: datetime

class AuditLogResponse(AuditLogBase):
    id: UUID
    user_id: Optional[UUID] = None

    # 🔥 AGREGAR AQUÍ EL ATRIBUTO QUE FALTABA
    user: Optional[AuditUserMinimal] = None

    @computed_field
    def user_email(self) -> Optional[str]:
        return self.user.email if self.user else None

    @computed_field
    def user_name(self) -> Optional[str]:
        if not self.user:
            return None
        parts = [p for p in [self.user.first_name, self.user.last_name] if p]
        return " ".join(parts) if parts else "Usuario sin nombre"

    @computed_field
    def user_phone(self) -> Optional[str]:
        return self.user.phone if self.user else None

    model_config = ConfigDict(from_attributes=True)
