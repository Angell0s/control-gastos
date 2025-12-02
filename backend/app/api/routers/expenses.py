from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps  # Asumimos que tienes get_db y get_current_user
from app.models import Expense, ExpenseItem
from app.schemas import ExpenseCreate, ExpenseResponse
from app.models import User  # Importar para type hinting si es necesario

router = APIRouter()

@router.post("/", response_model=ExpenseResponse)
def create_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_in: ExpenseCreate,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Crea un nuevo Gasto y sus Ítems asociados en una sola transacción.
    Calcula el total automáticamente sumando los ítems.
    """
    # 1. Calcular el total del ticket basado en los items recibidos
    calculated_total = sum(item.amount * item.quantity for item in expense_in.items)

    # 2. Crear la instancia de Expense
    db_expense = Expense(
        user_id=current_user.id,
        notes=expense_in.notes,
        total=calculated_total
        # date se llena con default server-side si no se pasa
    )
    if expense_in.date:
        db_expense.date = expense_in.date

    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)

    # 3. Crear los ExpenseItems asociados
    try:
        for item_in in expense_in.items:
            db_item = ExpenseItem(
                expense_id=db_expense.id,
                category_id=item_in.category_id,
                name=item_in.name,
                amount=item_in.amount,
                quantity=item_in.quantity
            )
            db.add(db_item)
        
        db.commit()
        db.refresh(db_expense) # Refrescar para traer la relación 'items' cargada
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating items: {str(e)}")

    return db_expense
