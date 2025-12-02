from typing import List, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.api import deps
from app.models import Expense, ExpenseItem, User
from app.schemas import ExpenseCreate, ExpenseResponse

router = APIRouter()

# -----------------------------------------------------------------------------
# 1. CREATE (POST) - Ya lo conoces, pero repasamos
# -----------------------------------------------------------------------------
@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_in: ExpenseCreate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Crea un nuevo Gasto con sus ítems.
    """
    # Calculamos el total sumando los items
    calculated_total = sum(item.amount * item.quantity for item in expense_in.items)

    # 1. Crear Cabecera
    db_expense = Expense(
        user_id=current_user.id,
        notes=expense_in.notes,
        total=calculated_total,
        date=expense_in.date # Si es None, la BD pone default now()
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)

    # 2. Crear Items
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
        db.refresh(db_expense) # Refrescamos para cargar la relación .items
    except Exception as e:
        db.rollback()
        # Borramos el expense huérfano si fallan los items
        db.delete(db_expense) 
        db.commit()
        raise HTTPException(status_code=400, detail=f"Error creando ítems: {str(e)}")

    return db_expense


# -----------------------------------------------------------------------------
# 2. READ ALL (GET LIST)
# -----------------------------------------------------------------------------
@router.get("/", response_model=List[ExpenseResponse])
def read_expenses(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Obtiene los gastos del usuario actual.
    """
    return db.query(Expense)\
        .filter(Expense.user_id == current_user.id)\
        .order_by(Expense.date.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()


# -----------------------------------------------------------------------------
# 3. READ ONE (GET BY ID)
# -----------------------------------------------------------------------------
@router.get("/{expense_id}", response_model=ExpenseResponse)
def read_expense_by_id(
    expense_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Obtiene un gasto específico por ID. Valida que pertenezca al usuario.
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Seguridad: Evitar que vea gastos de otro usuario
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este gasto")
        
    return expense


# -----------------------------------------------------------------------------
# 4. DELETE (DELETE)
# -----------------------------------------------------------------------------
@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response
)
def delete_expense(
    expense_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para borrar este gasto")

    db.delete(expense)
    db.commit()
    return Response(status_code=204)
    


# -----------------------------------------------------------------------------
# 5. UPDATE (PUT) - La parte difícil
# -----------------------------------------------------------------------------
# Nota: Para simplificar, la edición reemplaza TODOS los ítems.
# Es decir, borramos los viejos y creamos los nuevos que mande el frontend.
@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: UUID,
    expense_in: ExpenseCreate, # Reusamos el schema de crear
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Actualiza un gasto. ESTRATEGIA: Actualiza cabecera y reemplaza TODOS los ítems.
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
        
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este gasto")

    # 1. Actualizar campos simples de la cabecera
    if expense_in.notes is not None:
        expense.notes = expense_in.notes
    if expense_in.date is not None:
        expense.date = expense_in.date

    # 2. Recalcular total con los NUEVOS items
    new_total = sum(item.amount * item.quantity for item in expense_in.items)
    expense.total = new_total

    # 3. Reemplazo inteligente de Items
    # Borramos los ítems existentes de este gasto
    db.query(ExpenseItem).filter(ExpenseItem.expense_id == expense_id).delete()
    
    # Creamos los nuevos
    for item_in in expense_in.items:
        db_item = ExpenseItem(
            expense_id=expense.id,
            category_id=item_in.category_id,
            name=item_in.name,
            amount=item_in.amount,
            quantity=item_in.quantity
        )
        db.add(db_item)

    try:
        db.commit()
        db.refresh(expense)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error actualizando: {str(e)}")

    return expense
