from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

# --- Schemas para Category ---
class CategoryBase(BaseModel):
    name: str
    user_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: UUID

    class Config:
        from_attributes = True  # Reemplaza orm_mode en Pydantic v2

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
    user_id: int
    total: float
    date: datetime
    items: List[ExpenseItemResponse] = []

    class Config:
        from_attributes = True
