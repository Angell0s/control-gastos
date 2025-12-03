#backend\app\api\routers\categories.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models import Category, User
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services.audit import log_activity # Asegúrate de importar tu servicio de logs

router = APIRouter()

# --- 1. LISTAR TODAS ---
@router.get("/", response_model=List[CategoryResponse])
def read_categories(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user), 
    skip: int = 0,
    limit: int = 100,
):
    return db.query(Category).offset(skip).limit(limit).all()

# --- 2. OBTENER UNA POR ID ---
@router.get("/{category_id}", response_model=CategoryResponse)
def read_category(
    category_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return category

# --- 3. CREAR ---
@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Verificar si ya existe por nombre (insensible a mayúsculas/minúsculas)
    existing = db.query(Category).filter(Category.name.ilike(category_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con este nombre")
    
    db_obj = Category(name=category_in.name)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    # Log de auditoría
    log_activity(
        db=db, user_id=current_user.id, 
        action="CREATE_CATEGORY", source="WEB", 
        details=f"Creó categoría '{db_obj.name}'"
    )
    
    return db_obj

# --- 4. ACTUALIZAR ---
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

    # Verificar duplicado si cambia el nombre
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

    return category

# --- 5. ELIMINAR ---
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    category_name = category.name

    # Intentar borrar. Si falla por Foreign Key (hay gastos usando la categoría), SQLAlchemy lanzará error.
    try:
        db.delete(category)
        db.commit()
    except Exception as e:
        db.rollback()
        # Capturamos error de integridad (FK violation)
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar la categoría porque tiene gastos asociados. Elimina los gastos primero."
        )

    log_activity(
        db=db, user_id=current_user.id, 
        action="DELETE_CATEGORY", source="WEB", 
        details=f"Eliminó categoría '{category_name}'"
    )
    
    return None
