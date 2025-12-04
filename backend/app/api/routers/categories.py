# backend\app\api\routers\categories.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional

from app.api import deps
from app.models import Category, User, ExpenseItem, Expense
# ✅ Asegúrate de importar ExpenseItemResponse para el return type
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate, ExpenseItemResponse
from app.services.audit import log_activity

router = APIRouter()

# --- 1. ENDPOINT ADMIN: VER TODO EL UNIVERSO DE DATOS ---
@router.get("/admin/all", response_model=List[CategoryResponse])
def read_all_categories_admin(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
    skip: int = 0,
    limit: int = 100,
):
    results = (
        db.query(Category, func.count(ExpenseItem.id).label("count"))
        .outerjoin(ExpenseItem, Category.id == ExpenseItem.category_id)
        .group_by(Category.id)
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
        .all()
    )

    mapped_results = []
    for cat, count in results:
        cat.items_count = count
        mapped_results.append(cat)
        
    return mapped_results


# --- 2. ENDPOINT USUARIO: LISTAR CATEGORÍAS (CON CONTEO PROPIO) ---
@router.get("/", response_model=List[CategoryResponse])
def read_categories(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user), 
    skip: int = 0,
    limit: int = 100,
):
    user_items_subquery = (
        db.query(
            ExpenseItem.category_id,
            func.count(ExpenseItem.id).label('count')
        )
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .filter(Expense.user_id == current_user.id)
        .group_by(ExpenseItem.category_id)
        .subquery()
    )

    results = (
        db.query(
            Category, 
            func.coalesce(user_items_subquery.c.count, 0).label("user_count")
        )
        .outerjoin(user_items_subquery, Category.id == user_items_subquery.c.category_id)
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    mapped_results = []
    for cat, count in results:
        cat.items_count = count
        mapped_results.append(cat)
        
    return mapped_results


# --- ✅ NUEVO ENDPOINT: VER ITEMS DE UNA CATEGORÍA (SOLO DEL USUARIO) ---
@router.get("/{category_id}/items", response_model=List[ExpenseItemResponse])
def read_category_items(
    category_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """
    Devuelve la lista de items (gastos individuales) asociados a esta categoría,
    pero restringido estrictamente a los gastos del usuario actual.
    """
    # Primero verificamos que la categoría exista (opcional, pero buena práctica)
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    # Consulta con JOIN para filtrar por el dueño del gasto (Expense.user_id)
    items = (
        db.query(ExpenseItem)
        .join(Expense, ExpenseItem.expense_id == Expense.id) # Relación Item -> Gasto
        .filter(ExpenseItem.category_id == category_id)      # Filtro por Categoría
        .filter(Expense.user_id == current_user.id)          # Filtro por Dueño
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return items


# --- 3. OBTENER UNA CATEGORÍA POR ID ---
@router.get("/{category_id}", response_model=CategoryResponse)
def read_category(
    category_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    user_items_subquery = (
        db.query(
            ExpenseItem.category_id,
            func.count(ExpenseItem.id).label('count')
        )
        .join(Expense, ExpenseItem.expense_id == Expense.id)
        .filter(Expense.user_id == current_user.id)
        .filter(ExpenseItem.category_id == category_id)
        .group_by(ExpenseItem.category_id)
        .subquery()
    )

    result = (
        db.query(
            Category, 
            func.coalesce(user_items_subquery.c.count, 0)
        )
        .outerjoin(user_items_subquery, Category.id == user_items_subquery.c.category_id)
        .filter(Category.id == category_id)
        .first()
    )

    if not result:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    category, count = result
    category.items_count = count
    return category


# --- 4. CREAR ---
@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    existing = db.query(Category).filter(Category.name.ilike(category_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con este nombre")
    
    db_obj = Category(name=category_in.name)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    log_activity(
        db=db, user_id=current_user.id, 
        action="CREATE_CATEGORY", source="WEB", 
        details=f"Creó categoría '{db_obj.name}'"
    )
    
    db_obj.items_count = 0
    return db_obj


# --- 5. ACTUALIZAR ---
@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    category_in: CategoryUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    if category_in.name != category.name:
        existing = db.query(Category).filter(Category.name.ilike(category_in.name)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe otra categoría con este nombre")

    old_name = category.name
    category.name = category_in.name
    
    db.add(category)
    db.commit()
    db.refresh(category)

    log_activity(
        db=db, user_id=current_user.id, 
        action="UPDATE_CATEGORY", source="WEB", 
        details=f"Renombró '{old_name}' a '{category.name}'"
    )

    count = db.query(func.count(ExpenseItem.id))\
        .join(Expense, ExpenseItem.expense_id == Expense.id)\
        .filter(ExpenseItem.category_id == category.id)\
        .filter(Expense.user_id == current_user.id)\
        .scalar()
    
    category.items_count = count if count else 0
    return category


# --- 6. ELIMINAR ---
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    target_category_id: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    try:
        category_to_delete = db.query(Category).filter(Category.id == category_id).first()
        if not category_to_delete:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")

        if category_to_delete.name.lower() == "otros" and not target_category_id:
            raise HTTPException(
                status_code=400,
                detail="No puedes eliminar la categoría 'Otros' sin reasignar a otra específica."
            )

        if target_category_id:
            if target_category_id == category_id:
                raise HTTPException(status_code=400, detail="La categoría de destino no puede ser la misma que se elimina.")
            target_category = db.query(Category).filter(Category.id == target_category_id).first()
            if not target_category:
                raise HTTPException(status_code=404, detail="Categoría de destino no encontrada")
        else:
            target_category = db.query(Category).filter(Category.name.ilike("Otros")).first()
            if not target_category:
                target_category = Category(name="Otros")
                db.add(target_category)
                db.commit()
                db.refresh(target_category)
                log_activity(db=db, user_id=current_user.id, action="AUTO_CREATE_CATEGORY", source="SYSTEM", details="Se creó categoría 'Otros' automáticamente.")

        items_to_move = db.query(ExpenseItem).filter(ExpenseItem.category_id == category_id).all()
        count_moved = len(items_to_move)

        if count_moved > 0:
            for item in items_to_move:
                item.category_id = target_category.id
            db.commit()

        category_name = category_to_delete.name
        db.delete(category_to_delete)
        db.commit()

        details = f"Eliminó '{category_name}'. Reasignó {count_moved} ítems." if count_moved > 0 else f"Eliminó '{category_name}'."
        log_activity(db=db, user_id=current_user.id, action="DELETE_CATEGORY", source="WEB", details=details)
        db.commit()
        return None

    except Exception as e:
        try:
            log_activity(db=db, user_id=current_user.id, action="DELETE_CATEGORY_FAILED", source="WEB", details=str(e))
            db.commit()
        except: pass
        raise
