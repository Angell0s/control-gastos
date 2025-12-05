#backend\app\schemas\income.py
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# --- SCHEMAS DE ITEMS (HIJOS) ---

class IngresoItemBase(BaseModel):
    descripcion: str
    monto: float = Field(..., gt=0)
    category_id: UUID

class IngresoItemCreate(IngresoItemBase):
    pass

class IngresoItemResponse(IngresoItemBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# --- SCHEMAS DE INGRESO (PADRE) ---

class IngresoBase(BaseModel):
    descripcion: str
    fecha: datetime
    fuente: str

class IngresoCreate(IngresoBase):
    # Recibimos una lista de items al crear
    items: List[IngresoItemCreate]

class IngresoUpdate(BaseModel):
    descripcion: Optional[str] = None
    fecha: Optional[datetime] = None
    fuente: Optional[str] = None
    # Actualizar items es complejo, usualmente se maneja en endpoints separados 
    # o reemplazando la lista completa.
    
class IngresoResponse(IngresoBase):
    id: UUID
    user_id: UUID
    monto_total: float # Se devuelve el calculado/persistido
    created_at: datetime
    updated_at: datetime
    
    # Devolvemos los detalles anidados
    items: List[IngresoItemResponse]
    
    model_config = ConfigDict(from_attributes=True)
