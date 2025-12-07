#backend\app\schemas\gastos.py
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, computed_field

# --- Schemas para Category ---

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    # El usuario no envía is_active ni user_id, eso lo pone el backend
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryResponse(CategoryBase):
    id: UUID
    user_id: Optional[UUID] = None # Si es None, es global
    is_active: bool
    
    # Contadores (calculados en backend)
    expenses_count: int = 0
    incomes_count: int = 0
    
    @computed_field
    def is_global(self) -> bool:
        return self.user_id is None

    model_config = ConfigDict(from_attributes=True)

class CategoryMergeResponse(CategoryResponse):
    merged_private_categories: int # Cuántas categorías privadas se desactivaron
    moved_expenses: int            # Cuántos gastos se movieron
    moved_incomes: int


# --- Schemas para ExpenseItem ---

class ExpenseItemBase(BaseModel):
    category_id: Optional[UUID] = None
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
    date: Optional[datetime] = None

class ExpenseCreate(ExpenseBase):
    items: List[ExpenseItemCreate]

class ExpenseResponse(ExpenseBase):
    id: UUID
    user_id: UUID
    total: float
    date: datetime
    items: List[ExpenseItemResponse] = []

    class Config:
        from_attributes = True
