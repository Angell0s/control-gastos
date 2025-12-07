# backend/app/api/routers/categories.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, update, delete, or_, and_
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Literal
from uuid import UUID

from app.api import deps
from app.models import Category, User, ExpenseItem, Expense
from app.models.incomes import IngresoItem, Ingreso
from app.schemas.gastos import CategoryCreate, CategoryResponse, CategoryUpdate, ExpenseItemResponse, CategoryMergeResponse
from app.schemas.income import IngresoItemResponse
from app.services.audit import log_activity

router = APIRouter()

# ============================================================================
# 🛠️ HELPERS DE CONSULTA (REUTILIZABLES)
# ============================================================================

def _build_base_query(user_id_for_counts: Optional[UUID] = None):
    """
    Construye la Query base optimizada.
    Calcula los contadores de Gastos e Ingresos asociados a cada categoría
    mediante subqueries para evitar el problema N+1.
    """
    # 1. Subquery para contar Gastos (Expenses)
    q_exp = select(ExpenseItem.category_id, func.count(ExpenseItem.id).label('count'))
    if user_id_for_counts:
        q_exp = q_exp.join(Expense, ExpenseItem.expense_id == Expense.id).where(Expense.user_id == user_id_for_counts)
    sq_expenses = q_exp.group_by(ExpenseItem.category_id).subquery()

    # 2. Subquery para contar Ingresos (Incomes)
    q_inc = select(IngresoItem.category_id, func.count(IngresoItem.id).label('count'))
    if user_id_for_counts:
        q_inc = q_inc.join(Ingreso, IngresoItem.ingreso_id == Ingreso.id).where(Ingreso.user_id == user_id_for_counts)
    sq_incomes = q_inc.group_by(IngresoItem.category_id).subquery()

    # 3. Select Principal
    stmt = (
        select(
            Category,
            func.coalesce(sq_expenses.c.count, 0).label("exp_count"),
            func.coalesce(sq_incomes.c.count, 0).label("inc_count")
        )
        .outerjoin(sq_expenses, Category.id == sq_expenses.c.category_id)
        .outerjoin(sq_incomes, Category.id == sq_incomes.c.category_id)
    )
    return stmt

def _apply_filters(stmt, status_filter: str, search: str = None):
    if status_filter == "active":
        stmt = stmt.where(Category.is_active == True)
    elif status_filter == "inactive":
        stmt = stmt.where(Category.is_active == False)
    
    if search:
        stmt = stmt.where(Category.name.ilike(f"%{search}%"))
    
    return stmt.order_by(Category.name)

def _map_results(rows):
    mapped = []
    for cat, exp_c, inc_c in rows:
        cat.expenses_count = exp_c
        cat.incomes_count = inc_c
        cat.total_items_count = exp_c + inc_c
        mapped.append(cat)
    return mapped

async def get_or_create_global_others(db: AsyncSession) -> Category:
    stmt = select(Category).where(Category.name.ilike("Otros"), Category.user_id == None)
    result = await db.execute(stmt)
    otros = result.scalars().first()
    
    if not otros:
        otros = Category(name="Otros", user_id=None, is_active=True)
        db.add(otros)
        await db.commit()
        await db.refresh(otros)
    
    return otros

# ============================================================================
# 👑 ENDPOINTS ADMIN
# ============================================================================

@router.get("/admin/all", response_model=List[CategoryResponse])
async def read_all_categories_admin(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
    skip: int = 0,
    limit: int = 100,
    status: Literal["active", "inactive", "all"] = "all",
    search: Optional[str] = None
):
    try:
        stmt = _build_base_query(user_id_for_counts=None)
        stmt = _apply_filters(stmt, status, search)
        stmt = stmt.offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        return _map_results(result.all())
    except Exception as e:
        await log_activity(db, "system", "ERROR_READ_ADMIN_ALL", "SYSTEM", details=f"Error 500: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno recuperando categorías")

@router.post("/admin/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_categories(
    ids: List[UUID] = Body(...),
    target_category_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
):
    try:
        target_id = None
        target_name_log = "Otros"

        if target_category_id:
            target_cat = await db.get(Category, target_category_id)
            if not target_cat:
                raise HTTPException(404, f"Categoría destino {target_category_id} no encontrada")
            target_id = target_cat.id
            target_name_log = target_cat.name
        else:
            otros = await get_or_create_global_others(db)
            target_id = otros.id

        ids_to_delete = [id for id in ids if id != target_id]
        
        if not ids_to_delete: return

        await db.execute(update(ExpenseItem).where(ExpenseItem.category_id.in_(ids_to_delete)).values(category_id=target_id))
        await db.execute(update(IngresoItem).where(IngresoItem.category_id.in_(ids_to_delete)).values(category_id=target_id))
        await db.execute(delete(Category).where(Category.id.in_(ids_to_delete)))
        await db.commit()
        
        await log_activity(db, current_user.id, "HARD_DELETE_BULK", "ADMIN", f"Eliminó {len(ids_to_delete)} cats. Reasignó a: '{target_name_log}'")

    except HTTPException as he:
        raise he
    except Exception as e:
        await db.rollback()
        await log_activity(db, "system", "ERROR_BULK_DELETE", "SYSTEM", details=f"Error 500: {str(e)}")
        raise HTTPException(status_code=500, detail="Error eliminando categorías masivamente")

# ============================================================================
# 👑 ENDPOINT NUEVO: CREACIÓN GLOBAL CON FUSIÓN
# ============================================================================

@router.post("/admin/create-global-merge", response_model=CategoryMergeResponse, status_code=status.HTTP_201_CREATED)
async def create_global_category_with_merge(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser), # 🔒 SOLO SUPERUSUARIO
):
    try:
        # 1. Verificar duplicado Global
        stmt = select(Category).where(Category.name.ilike(category_in.name), Category.user_id == None)
        existing_global = (await db.execute(stmt)).scalars().first()
        
        if existing_global:
            raise HTTPException(status_code=409, detail=f"Ya existe una categoría Global llamada '{existing_global.name}'.")

        # 2. Crear Global
        new_global_cat = Category(name=category_in.name, user_id=None, is_active=True)
        db.add(new_global_cat)
        await db.flush() 
        await db.refresh(new_global_cat)

        # 3. Buscar Coincidencias Privadas
        stmt_private = select(Category).where(Category.name.ilike(category_in.name), Category.user_id != None)
        private_cats = (await db.execute(stmt_private)).scalars().all()
        private_ids = [cat.id for cat in private_cats]

        expenses_moved = 0
        incomes_moved = 0

        if private_ids:
            # Contar
            q_count_exp = select(func.count(ExpenseItem.id)).where(ExpenseItem.category_id.in_(private_ids))
            expenses_moved = (await db.execute(q_count_exp)).scalar() or 0
            
            q_count_inc = select(func.count(IngresoItem.id)).where(IngresoItem.category_id.in_(private_ids))
            incomes_moved = (await db.execute(q_count_inc)).scalar() or 0

            # Mover y Desactivar
            await db.execute(update(ExpenseItem).where(ExpenseItem.category_id.in_(private_ids)).values(category_id=new_global_cat.id))
            await db.execute(update(IngresoItem).where(IngresoItem.category_id.in_(private_ids)).values(category_id=new_global_cat.id))
            await db.execute(update(Category).where(Category.id.in_(private_ids)).values(is_active=False))

        await db.commit()

        # Log
        log_msg = f"Creó Global '{new_global_cat.name}'. Fusionó {len(private_ids)} privadas. Movió {expenses_moved} gastos, {incomes_moved} ingresos."
        await log_activity(db, current_user.id, "GLOBAL_MERGE_CREATE", "ADMIN", details=log_msg)

        return CategoryMergeResponse(
            **new_global_cat.__dict__,
            expenses_count=0,
            incomes_count=0,
            total_items_count=0,
            merged_private_categories=len(private_ids),
            moved_expenses=expenses_moved,
            moved_incomes=incomes_moved
        )

    except HTTPException as he:
        # ✅ Corrección: Capturar esto explícitamente para que no caiga en el 500
        raise he
    except Exception as e:
        await db.rollback()
        await log_activity(db, "system", "ERROR_GLOBAL_MERGE", "ADMIN", details=str(e))
        raise HTTPException(status_code=500, detail="Error creando categoría global con fusión.")

# ============================================================================
# 👤 ENDPOINTS USUARIO (CRUD Normal)
# ============================================================================

@router.get("/", response_model=List[CategoryResponse])
async def read_categories(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user), 
    skip: int = 0,
    limit: int = 100,
    status: Literal["active", "inactive", "all"] = "active",
    search: Optional[str] = None
):
    try:
        stmt = _build_base_query(user_id_for_counts=current_user.id)
        stmt = stmt.where(or_(Category.user_id == None, Category.user_id == current_user.id))
        stmt = _apply_filters(stmt, status, search)
        stmt = stmt.offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        return _map_results(result.all())
    except Exception as e:
        await log_activity(db, "system", "ERROR_READ_CATEGORIES", "SYSTEM", details=f"Error 500: {str(e)}")
        raise HTTPException(status_code=500, detail="Error cargando tus categorías")

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    try:
        # Crear siempre como privado (Usuario estándar)
        stmt = select(Category).where(
            Category.name.ilike(category_in.name),
            or_(Category.user_id == None, Category.user_id == current_user.id)
        )
        existing = (await db.execute(stmt)).scalars().first()
        
        if existing:
            status_str = "inactiva" if not existing.is_active else "activa"
            msg = f"Ya existe una categoría '{status_str}' con este nombre."
            await log_activity(db, current_user.id, "CREATE_CATEGORY_FAIL", "WEB", details=f"Intento duplicado: {category_in.name}")
            raise HTTPException(status_code=400, detail=msg)

        db_obj = Category(name=category_in.name, user_id=current_user.id, is_active=True)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        await log_activity(db, current_user.id, "CREATE_CATEGORY", "WEB", details=f"Creó: {db_obj.name}")

        db_obj.expenses_count = 0
        db_obj.incomes_count = 0
        db_obj.total_items_count = 0
        return db_obj

    except HTTPException as he:
        raise he 
    except IntegrityError:
        await db.rollback()
        await log_activity(db, "system", "ERROR_CREATE_CATEGORY_INTEGRITY", "SYSTEM", details=f"Race: {category_in.name}")
        raise HTTPException(status_code=400, detail="Error: Categoría duplicada.")
    except Exception as e:
        await db.rollback()
        await log_activity(db, "system", "ERROR_CREATE_CATEGORY", "SYSTEM", details=f"Error 500: {str(e)}")
        raise HTTPException(status_code=500, detail="No se pudo crear la categoría")

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    category_in: CategoryUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    try:
        cat = await db.get(Category, category_id)
        if not cat:
            raise HTTPException(404, "Categoría no encontrada")
        
        if cat.user_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(403, "No puedes editar categorías globales")

        old_name = cat.name
        
        if category_in.name and category_in.name.strip().lower() != old_name.lower():
            stmt = select(Category).where(
                Category.name.ilike(category_in.name.strip()),
                Category.id != category_id,
                or_(Category.user_id == None, Category.user_id == current_user.id)
            )
            existing = (await db.execute(stmt)).scalars().first()
            if existing:
                raise HTTPException(status_code=409, detail="Ya existe una categoría con este nombre.")
            cat.name = category_in.name.strip()

        if category_in.is_active is not None:
            cat.is_active = category_in.is_active

        await db.commit()
        await db.refresh(cat)
        
        await log_activity(db, current_user.id, "UPDATE_CATEGORY", "WEB", details=f"Actualizó ID {category_id}")

        cat.expenses_count = 0 
        cat.incomes_count = 0 
        cat.total_items_count = 0
        return cat

    except HTTPException as he:
        raise he
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Nombre en uso.")
    except Exception as e:
        await db.rollback()
        await log_activity(db, "system", "ERROR_UPDATE_CATEGORY", "SYSTEM", details=f"Error 500: {str(e)}")
        raise HTTPException(status_code=500, detail="Error actualizando categoría")

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_category(
    category_id: UUID,
    target_category_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    try:
        cat = await db.get(Category, category_id)
        if not cat: raise HTTPException(404, "Categoría no encontrada")
            
        if cat.user_id != current_user.id and not current_user.is_superuser: 
            raise HTTPException(403, "Solo puedes eliminar tus categorías privadas")

        final_target_id = None
        target_name_log = "Otros"

        if target_category_id:
            target_cat = await db.get(Category, target_category_id)
            if not target_cat: raise HTTPException(404, "Categoría destino no encontrada")
            
            if target_cat.user_id is not None and target_cat.user_id != current_user.id and not current_user.is_superuser:
                 raise HTTPException(403, "No tienes permiso sobre la categoría destino")
            
            if target_cat.id == category_id:
                raise HTTPException(400, "No puedes mover datos a la misma categoría que eliminas")

            final_target_id = target_cat.id
            target_name_log = target_cat.name
        else:
            otros = await get_or_create_global_others(db)
            final_target_id = otros.id

        await db.execute(update(ExpenseItem).where(ExpenseItem.category_id == category_id).values(category_id=final_target_id))
        await db.execute(update(IngresoItem).where(IngresoItem.category_id == category_id).values(category_id=final_target_id))

        cat.is_active = False
        await db.commit()
        
        actor = "ADMIN" if current_user.is_superuser else "WEB"
        await log_activity(db, current_user.id, "SOFT_DELETE", actor, details=f"Desactivó '{cat.name}'. Movió a: '{target_name_log}'")

    except HTTPException as he:
        raise he
    except Exception as e:
        await db.rollback()
        await log_activity(db, "system", "ERROR_DELETE_CATEGORY", "SYSTEM", details=f"Error 500: {str(e)}")
        raise HTTPException(status_code=500, detail="Error eliminando categoría")

@router.get("/{category_id}/expenses", response_model=List[ExpenseItemResponse])
async def read_category_expenses(category_id: UUID, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    try:
        stmt = select(ExpenseItem).join(Expense).where(ExpenseItem.category_id == category_id, Expense.user_id == current_user.id)
        return (await db.execute(stmt)).scalars().all()
    except Exception as e:
        await log_activity(db, "system", "ERROR_READ_CAT_EXPENSES", "SYSTEM", details=f"Error 500: {str(e)}")
        raise HTTPException(status_code=500, detail="Error leyendo items")

@router.get("/{category_id}/incomes", response_model=List[IngresoItemResponse])
async def read_category_incomes(category_id: UUID, db: AsyncSession = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    try:
        stmt = select(IngresoItem).join(Ingreso).where(IngresoItem.category_id == category_id, Ingreso.user_id == current_user.id)
        return (await db.execute(stmt)).scalars().all()
    except Exception as e:
        await log_activity(db, "system", "ERROR_READ_CAT_INCOMES", "SYSTEM", details=f"Error 500: {str(e)}")
        raise HTTPException(status_code=500, detail="Error leyendo ingresos")
