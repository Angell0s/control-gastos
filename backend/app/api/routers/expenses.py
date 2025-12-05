#backend\app\api\routers\expenses.py
from typing import List, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models import Expense, ExpenseItem, User
from app.schemas import ExpenseCreate, ExpenseResponse
from app.services.audit import log_activity 

router = APIRouter()

# -----------------------------------------------------------------------------
# 1. CREATE (POST) - ATÓMICO
# -----------------------------------------------------------------------------
@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    *,
    db: AsyncSession = Depends(deps.get_db),
    expense_in: ExpenseCreate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Crea un nuevo Gasto con sus ítems en una sola transacción atómica.
    """
    # 1. Calcular total en memoria (Regla de negocio: no confiar en el frontend para totales)
    calculated_total = sum(item.amount * item.quantity for item in expense_in.items)

    # 2. Instanciar Cabecera (Padre)
    # NO hacemos commit todavía, solo agregamos a la sesión
    db_expense = Expense(
        user_id=current_user.id,
        notes=expense_in.notes,
        total=calculated_total,
        date=expense_in.date 
    )
    db.add(db_expense)
    
    try:
        # 3. Instanciar Items (Hijos)
        # Iteramos y agregamos a la sesión vinculando al padre
        for item_in in expense_in.items:
            db_item = ExpenseItem(
                expense=db_expense, # Vinculación directa ORM (más segura que usar ID)
                category_id=item_in.category_id,
                name=item_in.name,
                amount=item_in.amount,
                quantity=item_in.quantity
            )
            db.add(db_item)
        
        # 4. COMMIT ÚNICO (Atomicidad)
        # Aquí se guardan padre e hijos al mismo tiempo. O todo o nada.
        await db.commit()
        
        # 5. Refresh inteligente
        # Necesitamos recargar el objeto para traer los IDs generados y los items
        # Usamos una consulta explícita con eager loading para eficiencia
        stmt = (
            select(Expense)
            .options(selectinload(Expense.items))
            .where(Expense.id == db_expense.id)
        )
        result = await db.execute(stmt)
        db_expense = result.scalars().first()

        # ✅ LOG EXITOSO
        await log_activity(
            db=db, user_id=current_user.id, action="CREATE_EXPENSE", source="WEB",
            details=f"Gasto creado por ${calculated_total:.2f} con {len(expense_in.items)} ítems."
        )

    except Exception as e:
        # ⛔ ROLLBACK CRÍTICO
        # Si algo falla (ej. ID de categoría inválido), deshacemos todo (padre e hijos)
        await db.rollback()
        
        error_msg = str(e)
        
        # Log de fallo (silencioso para no interrumpir el raise)
        try:
            await log_activity(
                db=db, user_id=current_user.id, action="CREATE_EXPENSE_FAILED", source="WEB",
                details=f"Falló al crear gasto: {error_msg}"
            )
        except: pass 

        raise HTTPException(status_code=400, detail=f"Error procesando el gasto: {error_msg}")

    return db_expense


# -----------------------------------------------------------------------------
# 2. READ ALL (GET LIST)
# -----------------------------------------------------------------------------
@router.get("/", response_model=List[ExpenseResponse])
async def read_expenses(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    stmt = (
        select(Expense)
        .options(selectinload(Expense.items)) # Carga ansiosa eficiente
        .where(Expense.user_id == current_user.id)
        .order_by(Expense.date.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# -----------------------------------------------------------------------------
# 3. READ ONE (GET BY ID)
# -----------------------------------------------------------------------------
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
    
    # Seguridad de propiedad
    if expense.user_id != current_user.id:
        await log_activity(
            db=db, user_id=current_user.id, action="ACCESS_DENIED", source="WEB",
            details=f"Intento de ver gasto ajeno {expense_id}"
        )
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este gasto")
        
    return expense


# -----------------------------------------------------------------------------
# 4. DELETE (DELETE)
# -----------------------------------------------------------------------------
@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Validar existencia y propiedad
    stmt = select(Expense).where(Expense.id == expense_id)
    result = await db.execute(stmt)
    expense = result.scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    if expense.user_id != current_user.id:
        await log_activity(
            db=db, user_id=current_user.id, action="ACCESS_DENIED_DELETE", source="WEB",
            details=f"Intento de borrar gasto ajeno {expense_id}"
        )
        raise HTTPException(status_code=403, detail="No tienes permiso para borrar este gasto")

    # Datos para el log antes de borrar
    total_deleted = expense.total
    
    try:
        # Al borrar el padre, el 'cascade="all, delete-orphan"' del modelo 
        # se encarga de borrar los items. No hace falta borrarlos manualmente.
        await db.delete(expense)
        await db.commit()

        await log_activity(
            db=db, user_id=current_user.id, action="DELETE_EXPENSE", source="WEB",
            details=f"Gasto eliminado (${total_deleted:.2f})."
        )
    except Exception as e:
        await db.rollback()
        try:
            await log_activity(
                db=db, user_id=current_user.id, action="DELETE_EXPENSE_FAILED", source="WEB",
                details=f"Error borrando ID {expense_id}: {str(e)}"
            )
        except: pass
        raise HTTPException(status_code=400, detail=f"No se pudo eliminar: {str(e)}")

    return Response(status_code=204)
    

# -----------------------------------------------------------------------------
# 5. UPDATE (PUT) - REEMPLAZO COMPLETO ATÓMICO
# -----------------------------------------------------------------------------
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
        await log_activity(
            db=db, user_id=current_user.id, action="ACCESS_DENIED_UPDATE", source="WEB",
            details=f"Intento de editar gasto ajeno {expense_id}"
        )
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este gasto")

    old_total = expense.total

    try:
        # 2. Actualizar campos directos
        if expense_in.notes is not None:
            expense.notes = expense_in.notes
        if expense_in.date is not None:
            expense.date = expense_in.date

        # 3. Calcular nuevo total
        new_total = sum(item.amount * item.quantity for item in expense_in.items)
        expense.total = new_total

        # 4. Gestión de Ítems (Estrategia: Wipe & Replace)
        # Borramos los ítems viejos
        await db.execute(delete(ExpenseItem).where(ExpenseItem.expense_id == expense_id))
        
        # Insertamos los nuevos
        for item_in in expense_in.items:
            db_item = ExpenseItem(
                expense_id=expense.id, # Aquí usamos ID porque el objeto 'expense' ya existe en BD
                category_id=item_in.category_id,
                name=item_in.name,
                amount=item_in.amount,
                quantity=item_in.quantity
            )
            db.add(db_item)

        # 5. COMMIT ÚNICO
        await db.commit()
        
        # 6. Refresh para respuesta
        stmt_refresh = (
            select(Expense)
            .options(selectinload(Expense.items))
            .where(Expense.id == expense_id)
        )
        result_refresh = await db.execute(stmt_refresh)
        expense = result_refresh.scalars().first()

        await log_activity(
            db=db, user_id=current_user.id, action="UPDATE_EXPENSE", source="WEB",
            details=f"Gasto actualizado. Nuevo total: ${new_total:.2f} (Anterior: ${old_total:.2f})."
        )

    except Exception as e:
        await db.rollback()
        try:
            await log_activity(
                db=db, user_id=current_user.id, action="UPDATE_EXPENSE_FAILED", source="WEB",
                details=f"Error actualizando ID {expense_id}: {str(e)}"
            )
        except: pass
        raise HTTPException(status_code=400, detail=f"Error actualizando: {str(e)}")

    return expense
