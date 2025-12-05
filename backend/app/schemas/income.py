#backend\app\schemas\income.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

# Base: Campos comunes
class IngresoBase(BaseModel):
    descripcion: str
    fecha: datetime
    monto: float = Field(..., gt=0, description="Monto del ingreso debe ser positivo")
    fuente: str
    category_id: UUID

# Create: Campos necesarios para crear (id y user_id se manejan en backend)
class IngresoCreate(IngresoBase):
    pass

# Update: Todos los campos opcionales
class IngresoUpdate(BaseModel):
    descripcion: Optional[str] = None
    fecha: Optional[datetime] = None
    monto: Optional[float] = None
    fuente: Optional[str] = None
    category_id: Optional[UUID] = None
    updated_at: Optional[datetime] = None # Permitir actualización manual si se requiere

# Response: Retorno completo a la API
class IngresoResponse(IngresoBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Configuración para leer desde objetos ORM
    model_config = ConfigDict(from_attributes=True)
