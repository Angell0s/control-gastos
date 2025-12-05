# backend\app\api\routers\categories.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, case, select, desc
from typing import List, Optional
import uuid

from app.api import deps
from app.models import Category, User, ExpenseItem, Expense
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate, ExpenseItemResponse
from app.services.audit import log_activity

router = APIRouter()

# --- 1. ENDPOINT ADMIN: VER TODO EL UNIVERSO DE DATOS ---
@router.get("/admin/all", response_model=List[CategoryResponse])
async def read_all_categories_admin(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
    skip: int = 0,
    limit: int = 100,
):
    # Construcción de la consulta con estilo select()
    stmt = (
        select(Category, func.count(ExpenseItem.id).label("count"))
        .outerjoin(ExpenseItem, Category.id == ExpenseItem.category_id)
        .group_by(Category.id)
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()  # Esto devuelve una lista de tuplas (Category, count)

    mapped_results = []
    for cat, count in rows:
        cat.items_count = count
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
    # Subquery para contar items del usuario
    user_items_subquery = (
        select(
            ExpenseItem.category_id,
            func.count(ExpenseItem.id).label('count')
        )
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .where(Expense.user_id == current_user.id)
        .group_by(ExpenseItem.category_id)
        .subquery()
    )

    # Consulta principal
    stmt = (
        select(
            Category, 
            func.coalesce(user_items_subquery.c.count, 0).label("user_count")
        )
        .outerjoin(user_items_subquery, Category.id == user_items_subquery.c.category_id)
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    mapped_results = []
    for cat, count in rows:
        cat.items_count = count
        mapped_results.append(cat)
        
    return mapped_results


# --- 3. ENDPOINT: VER ITEMS DE UNA CATEGORÍA (SOLO DEL USUARIO) ---
@router.get("/{category_id}/items", response_model=List[ExpenseItemResponse])
async def read_category_items(
    category_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100
):
    # Validar categoría
    result_cat = await db.execute(select(Category).where(Category.id == category_id))
    category = result_cat.scalars().first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    # Consulta de items
    stmt = (
        select(ExpenseItem)
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .where(ExpenseItem.category_id == category_id)
        .where(Expense.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    return items


# --- 4. OBTENER UNA CATEGORÍA POR ID ---
@router.get("/{category_id}", response_model=CategoryResponse)
async def read_category(
    category_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    user_items_subquery = (
        select(
            ExpenseItem.category_id,
            func.count(ExpenseItem.id).label('count')
        )
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .where(Expense.user_id == current_user.id)
        .where(ExpenseItem.category_id == category_id)
        .group_by(ExpenseItem.category_id)
        .subquery()
    )

    stmt = (
        select(
            Category, 
            func.coalesce(user_items_subquery.c.count, 0)
        )
        .outerjoin(user_items_subquery, Category.id == user_items_subquery.c.category_id)
        .where(Category.id == category_id)
    )

    result = await db.execute(stmt)
    row = result.first() # En async esto devuelve una Row o None

    if not row:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    category, count = row
    category.items_count = count
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
