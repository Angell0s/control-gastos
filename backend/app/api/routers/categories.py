# backend/app/api/routers/categories.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, desc
from typing import List, Optional
from uuid import UUID

from app.api import deps
from app.models import Category, User, ExpenseItem, Expense
from app.models.incomes import IngresoItem, Ingreso # Importamos modelos de ingreso
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate, ExpenseItemResponse
from app.services.audit import log_activity
from app.schemas.income import IngresoItemResponse 

router = APIRouter()

# --- 1. ENDPOINT ADMIN: VER TODO EL UNIVERSO DE DATOS ---
@router.get("/admin/all", response_model=List[CategoryResponse])
async def read_all_categories_admin(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
    skip: int = 0,
    limit: int = 100,
):
    # Subquery para Gastos (Globales)
    sq_expenses = (
        select(ExpenseItem.category_id, func.count(ExpenseItem.id).label("count"))
        .group_by(ExpenseItem.category_id)
        .subquery()
    )

    # Subquery para Ingresos (Globales)
    sq_incomes = (
        select(IngresoItem.category_id, func.count(IngresoItem.id).label("count"))
        .group_by(IngresoItem.category_id)
        .subquery()
    )

    stmt = (
        select(
            Category,
            func.coalesce(sq_expenses.c.count, 0).label("exp_count"),
            func.coalesce(sq_incomes.c.count, 0).label("inc_count")
        )
        .outerjoin(sq_expenses, Category.id == sq_expenses.c.category_id)
        .outerjoin(sq_incomes, Category.id == sq_incomes.c.category_id)
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()

    mapped_results = []
    for cat, exp_c, inc_c in rows:
        cat.expenses_count = exp_c
        cat.incomes_count = inc_c
        cat.total_items_count = exp_c + inc_c
        mapped_results.append(cat)
        
    return mapped_results


# --- 2. ENDPOINT USUARIO: LISTAR CATEGORÍAS (CON CONTEO PROPIO) ---
@router.get("/", response_model=List[CategoryResponse])
async def read_categories(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user), 
    skip: int = 0,
    limit: int = 100,
):
    # 1. Subquery Gastos del Usuario
    sq_expenses = (
        select(
            ExpenseItem.category_id,
            func.count(ExpenseItem.id).label('count')
        )
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .where(Expense.user_id == current_user.id)
        .group_by(ExpenseItem.category_id)
        .subquery()
    )

    # 2. Subquery Ingresos del Usuario
    sq_incomes = (
        select(
            IngresoItem.category_id,
            func.count(IngresoItem.id).label('count')
        )
        .join(Ingreso, IngresoItem.ingreso_id == Ingreso.id)
        .where(Ingreso.user_id == current_user.id)
        .group_by(IngresoItem.category_id)
        .subquery()
    )

    # 3. Consulta Principal con Doble Join
    stmt = (
        select(
            Category, 
            func.coalesce(sq_expenses.c.count, 0).label("exp_count"),
            func.coalesce(sq_incomes.c.count, 0).label("inc_count")
        )
        .outerjoin(sq_expenses, Category.id == sq_expenses.c.category_id)
        .outerjoin(sq_incomes, Category.id == sq_incomes.c.category_id)
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    mapped_results = []
    for cat, exp_c, inc_c in rows:
        cat.expenses_count = exp_c
        cat.incomes_count = inc_c
        cat.total_items_count = exp_c + inc_c
        mapped_results.append(cat)
        
    return mapped_results

# --- 2.1. ENDPOINT: LISTAR SOLO CATEGORÍAS ACTIVAS (CON MOVIMIENTOS) ---
@router.get("/active", response_model=List[CategoryResponse])
async def read_active_categories(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retorna solo las categorías donde el usuario tiene al menos un gasto o un ingreso.
    Útil para filtros de reportes y selectores limpios.
    """
    
    # 1. Subquery Gastos del Usuario (Igual que arriba)
    sq_expenses = (
        select(
            ExpenseItem.category_id,
            func.count(ExpenseItem.id).label('count')
        )
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .where(Expense.user_id == current_user.id)
        .group_by(ExpenseItem.category_id)
        .subquery()
    )

    # 2. Subquery Ingresos del Usuario (Igual que arriba)
    sq_incomes = (
        select(
            IngresoItem.category_id,
            func.count(IngresoItem.id).label('count')
        )
        .join(Ingreso, IngresoItem.ingreso_id == Ingreso.id)
        .where(Ingreso.user_id == current_user.id)
        .group_by(IngresoItem.category_id)
        .subquery()
    )

    # 3. Consulta Principal con FILTRO (WHERE)
    # Aquí está la magia: Usamos INNER JOIN implícito o WHERE para filtrar
    stmt = (
        select(
            Category, 
            func.coalesce(sq_expenses.c.count, 0).label("exp_count"),
            func.coalesce(sq_incomes.c.count, 0).label("inc_count")
        )
        # Usamos outerjoin para calcular los números...
        .outerjoin(sq_expenses, Category.id == sq_expenses.c.category_id)
        .outerjoin(sq_incomes, Category.id == sq_incomes.c.category_id)
        # ...PERO filtramos para que al menos uno de los dos contadores sea mayor a 0
        .where(
            (func.coalesce(sq_expenses.c.count, 0) > 0) | 
            (func.coalesce(sq_incomes.c.count, 0) > 0)
        )
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    mapped_results = []
    for cat, exp_c, inc_c in rows:
        cat.expenses_count = exp_c
        cat.incomes_count = inc_c
        cat.total_items_count = exp_c + inc_c
        mapped_results.append(cat)
        
    return mapped_results

# --- 3. NUEVOS ENDPOINTS SEPARADOS PARA LISTAR ITEMS ---

@router.get("/{category_id}/expenses", response_model=List[ExpenseItemResponse])
async def read_category_expenses(
    category_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Devuelve solo los gastos de una categoría para este usuario."""
    # Validar existencia categoría (opcional, si quieres 404 estricto)
    # ...

    stmt = (
        select(ExpenseItem)
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .where(ExpenseItem.category_id == category_id)
        .where(Expense.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{category_id}/incomes", response_model=List[IngresoItemResponse])
async def read_category_incomes(
    category_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Devuelve solo los ingresos de una categoría para este usuario."""
    stmt = (
        select(IngresoItem)
        .join(Ingreso, IngresoItem.ingreso_id == Ingreso.id)
        .where(IngresoItem.category_id == category_id)
        .where(Ingreso.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# --- 4. OBTENER UNA CATEGORÍA POR ID (CON CONTEO) ---
@router.get("/{category_id}", response_model=CategoryResponse)
async def read_category(
    category_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # Reutilizamos la lógica de subqueries pero filtrada por ID
    
    sq_expenses = (
        select(func.count(ExpenseItem.id))
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .where(Expense.user_id == current_user.id)
        .where(ExpenseItem.category_id == category_id)
        .scalar_subquery()
    )

    sq_incomes = (
        select(func.count(IngresoItem.id))
        .join(Ingreso, IngresoItem.ingreso_id == Ingreso.id)
        .where(Ingreso.user_id == current_user.id)
        .where(IngresoItem.category_id == category_id)
        .scalar_subquery()
    )

    stmt = (
        select(
            Category, 
            func.coalesce(sq_expenses, 0),
            func.coalesce(sq_incomes, 0)
        )
        .where(Category.id == category_id)
    )

    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    category, exp_c, inc_c = row
    category.expenses_count = exp_c
    category.incomes_count = inc_c
    category.total_items_count = exp_c + inc_c
    return category

# --- 5. CREAR ---
@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Verificar existencia (ilike funciona igual)
    stmt = select(Category).where(Category.name.ilike(category_in.name))
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con este nombre")
    
    db_obj = Category(name=category_in.name)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    # Audit Log (con await)
    await log_activity(
        db=db, user_id=current_user.id, 
        action="CREATE_CATEGORY", source="WEB", 
        details=f"Creó categoría '{db_obj.name}'"
    )
    
    db_obj.items_count = 0
    return db_obj


# --- 6. ACTUALIZAR ---
@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_in: CategoryUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalars().first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    if category_in.name != category.name:
        stmt_exist = select(Category).where(Category.name.ilike(category_in.name))
        result_exist = await db.execute(stmt_exist)
        existing = result_exist.scalars().first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe otra categoría con este nombre")

    old_name = category.name
    category.name = category_in.name
    
    db.add(category)
    await db.commit()
    await db.refresh(category)

    await log_activity(
        db=db, user_id=current_user.id, 
        action="UPDATE_CATEGORY", source="WEB", 
        details=f"Renombró '{old_name}' a '{category.name}'"
    )

    # Recalcular conteo para devolver respuesta correcta
    stmt_count = (
        select(func.count(ExpenseItem.id))
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .where(ExpenseItem.category_id == category.id)
        .where(Expense.user_id == current_user.id)
    )
    result_count = await db.execute(stmt_count)
    count = result_count.scalar()
    
    category.items_count = count if count else 0
    return category


# --- 7. ELIMINAR ---
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    target_category_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    try:
        result = await db.execute(select(Category).where(Category.id == category_id))
        category_to_delete = result.scalars().first()
        
        if not category_to_delete:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")

        if category_to_delete.name.lower() == "otros" and not target_category_id:
            raise HTTPException(
                status_code=400,
                detail="No puedes eliminar la categoría 'Otros' sin reasignar a otra específica."
            )

        target_category = None
        if target_category_id:
            if target_category_id == category_id:
                raise HTTPException(status_code=400, detail="La categoría de destino no puede ser la misma que se elimina.")
            
            res_target = await db.execute(select(Category).where(Category.id == target_category_id))
            target_category = res_target.scalars().first()
            
            if not target_category:
                raise HTTPException(status_code=404, detail="Categoría de destino no encontrada")
        else:
            res_target = await db.execute(select(Category).where(Category.name.ilike("Otros")))
            target_category = res_target.scalars().first()
            
            if not target_category:
                target_category = Category(name="Otros")
                db.add(target_category)
                await db.commit()
                await db.refresh(target_category)
                
                await log_activity(db=db, user_id=current_user.id, action="AUTO_CREATE_CATEGORY", source="SYSTEM", details="Se creó categoría 'Otros' automáticamente.")

        # Mover items
        # En async, actualizar items masivamente se hace mejor iterando si son objetos ORM cargados, 
        # o con update() statement. Aquí usaremos iteración para mantener consistencia simple.
        res_items = await db.execute(select(ExpenseItem).where(ExpenseItem.category_id == category_id))
        items_to_move = res_items.scalars().all()
        count_moved = len(items_to_move)

        if count_moved > 0:
            for item in items_to_move:
                item.category_id = target_category.id
            # No es necesario commit aquí, lo hacemos al final junto con el delete

        category_name = category_to_delete.name
        await db.delete(category_to_delete)
        await db.commit() # Un solo commit para todo

        details = f"Eliminó '{category_name}'. Reasignó {count_moved} ítems." if count_moved > 0 else f"Eliminó '{category_name}'."
        await log_activity(db=db, user_id=current_user.id, action="DELETE_CATEGORY", source="WEB", details=details)
        
        return None

    except Exception as e:
        # Rollback manual en caso de error
        await db.rollback()
        try:
            # Intentamos loguear el fallo en una nueva transacción si es posible, 
            # pero en async a veces es complicado dentro del mismo scope de error.
            # Aquí simplificamos omitiéndolo o imprimiéndolo.
            print(f"Error eliminando categoría: {e}")
        except: pass
        raise e
