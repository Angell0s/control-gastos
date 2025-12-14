# backend\app\api\routers\expenses.py
from typing import List, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models import Expense, ExpenseItem, User
from app.schemas import ExpenseCreate, ExpenseResponse
from app.services.audit import log_activity 
# Importamos helpers reutilizables
from app.services.utils import get_or_create_category_by_name, validate_categories_availability 

router = APIRouter()

# ============================================================================
# 1. CREATE (POST)
# ============================================================================
@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    *,
    db: AsyncSession = Depends(deps.get_db),
    expense_in: ExpenseCreate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Crea un nuevo Gasto. 
    - Valida categorías activas antes de guardar.
    - Asigna 'Otros' si no hay categoría.
    """
    # 🔍 Validar Categorías explícitas usando helper compartido
    await validate_categories_availability(db, expense_in.items, current_user.id)

    # 1. Calcular total en memoria
    calculated_total = sum(item.amount * item.quantity for item in expense_in.items)

    # 2. Instanciar Cabecera
    db_expense = Expense(
        user_id=current_user.id,
        notes=expense_in.notes,
        total=calculated_total,
        date=expense_in.date 
    )
    db.add(db_expense)
    
    try:
        # Caché local para el ID de "Otros" en esta petición
        default_cat_id = None

        # 3. Instanciar Items
        for item_in in expense_in.items:
            
            final_cat_id = item_in.category_id

            # ✅ Lógica de asignación automática a "Otros"
            if not final_cat_id:
                if not default_cat_id:
                    default_cat_id = await get_or_create_category_by_name(db, "Otros")
                final_cat_id = default_cat_id

            db_item = ExpenseItem(
                expense=db_expense,
                category_id=final_cat_id,
                name=item_in.name,
                amount=item_in.amount,
                quantity=item_in.quantity
            )
            db.add(db_item)
        
        # 4. COMMIT ÚNICO
        await db.commit()
        
        # 5. Refresh con items
        stmt = (
            select(Expense)
            .options(selectinload(Expense.items))
            .where(Expense.id == db_expense.id)
        )
        result = await db.execute(stmt)
        db_expense = result.scalars().first()

        await log_activity(
            db=db, user_id=current_user.id, action="CREATE_EXPENSE", source="WEB",
            details=f"Gasto creado por ${calculated_total:.2f} con {len(expense_in.items)} ítems."
        )

    except HTTPException as he:
        await db.rollback()
        raise he
    except Exception as e:
        await db.rollback()
        await log_activity(db, current_user.id, "CREATE_EXPENSE_FAILED", "WEB", f"Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error procesando el gasto: {str(e)}")

    return db_expense


# ============================================================================
# 2. READ ALL (GET LIST)
# ============================================================================
@router.get("/", response_model=List[ExpenseResponse])
async def read_expenses(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: Optional[int] = Query(100, description="Límite de registros. 0 para 'sin límite'."),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    stmt = (
        select(Expense)
        .options(selectinload(Expense.items))
        .where(Expense.user_id == current_user.id)
        .order_by(Expense.date.desc())
        .offset(skip)
    )

    # Lógica para "Sin Límites"
    if limit is not None and limit > 0:
        stmt = stmt.limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()


# ============================================================================
# 3. READ ONE (GET BY ID)
# ============================================================================
@router.get("/{expense_id}", response_model=ExpenseResponse)
async def read_expense_by_id(
    expense_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    stmt = (
        select(Expense)
        .options(selectinload(Expense.items))
        .where(Expense.id == expense_id)
    )
    result = await db.execute(stmt)
    expense = result.scalars().first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este gasto")
        
    return expense


# ============================================================================
# 4. DELETE
# ============================================================================
@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    stmt = select(Expense).where(Expense.id == expense_id)
    result = await db.execute(stmt)
    expense = result.scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para borrar este gasto")

    try:
        await db.delete(expense)
        await db.commit()
        await log_activity(db, current_user.id, "DELETE_EXPENSE", "WEB", f"Gasto {expense_id} eliminado.")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo eliminar: {str(e)}")

    return Response(status_code=204)


# ============================================================================
# 5. UPDATE (PUT)
# ============================================================================
@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    expense_in: ExpenseCreate, 
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    # 1. Obtener Gasto existente
    stmt = select(Expense).where(Expense.id == expense_id)
    result = await db.execute(stmt)
    expense = result.scalars().first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
        
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este gasto")

    # 🔍 Validar Nuevas Categorías explícitas usando helper compartido
    await validate_categories_availability(db, expense_in.items, current_user.id)

    try:
        # 2. Actualizar campos directos
        if expense_in.notes is not None:
            expense.notes = expense_in.notes
        if expense_in.date is not None:
            expense.date = expense_in.date

        # 3. Calcular nuevo total
        new_total = sum(item.amount * item.quantity for item in expense_in.items)
        expense.total = new_total

        # 4. Gestión de Ítems (Wipe & Replace)
        await db.execute(delete(ExpenseItem).where(ExpenseItem.expense_id == expense_id))
        
        default_cat_id = None

        for item_in in expense_in.items:
            
            final_cat_id = item_in.category_id

            # ✅ Lógica de asignación automática a "Otros"
            if not final_cat_id:
                if not default_cat_id:
                    default_cat_id = await get_or_create_category_by_name(db, "Otros")
                final_cat_id = default_cat_id

            db_item = ExpenseItem(
                expense_id=expense.id,
                category_id=final_cat_id,
                name=item_in.name,
                amount=item_in.amount,
                quantity=item_in.quantity
            )
            db.add(db_item)

        # 5. COMMIT
        await db.commit()
        
        # 6. Refresh
        stmt_refresh = (
            select(Expense)
            .options(selectinload(Expense.items))
            .where(Expense.id == expense_id)
        )
        result_refresh = await db.execute(stmt_refresh)
        expense = result_refresh.scalars().first()

        await log_activity(
            db=db, user_id=current_user.id, action="UPDATE_EXPENSE", source="WEB",
            details=f"Actualizado. Total: ${new_total:.2f}"
        )

    except HTTPException as he:
        await db.rollback()
        raise he
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error actualizando: {str(e)}")

    return expense
