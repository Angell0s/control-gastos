#backend\app\schemas\gastos.py
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# --- Schemas para Category ---
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str 

class CategoryResponse(CategoryBase):
    id: UUID
    
    # Desglose explícito
    expenses_count: int = 0
    incomes_count: int = 0
    
    # Propiedad calculada (opcional, útil para UI rápida)
    total_items_count: int = 0 

    model_config = ConfigDict(from_attributes=True)

# --- Schemas para ExpenseItem ---
class ExpenseItemBase(BaseModel):
    category_id: UUID
    name: str
    amount: float
    quantity: int = 1

class ExpenseItemCreate(ExpenseItemBase):
    pass

class ExpenseItemResponse(ExpenseItemBase):
    id: UUID
    expense_id: UUID

    class Config:
        from_attributes = True

# --- Schemas para Expense ---
class ExpenseBase(BaseModel):
    notes: Optional[str] = None
    # La fecha y el total suelen calcularse o asignarse en el backend, 
    # pero permitimos entrada opcional si es necesario.
    date: Optional[datetime] = None

class ExpenseCreate(ExpenseBase):
    # Aquí ocurre la magia: recibimos la lista de items al crear el gasto
    items: List[ExpenseItemCreate]

class ExpenseResponse(ExpenseBase):
    id: UUID
    user_id: UUID
    total: float
    date: datetime
    items: List[ExpenseItemResponse] = []

    class Config:
        from_attributes = True
