#backend\app\api\routers\categories.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api import deps
from app.models import Category, User, ExpenseItem # ✅ Importar ExpenseItem
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services.audit import log_activity

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

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    target_category_id: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):

    try:
        # 1. Buscar categoría a eliminar
        category_to_delete = db.query(Category).filter(Category.id == category_id).first()
        if not category_to_delete:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")

        if category_to_delete.name.lower() == "otros" and not target_category_id:
            raise HTTPException(
                status_code=400,
                detail="No puedes eliminar la categoría 'Otros' sin reasignar a otra específica."
            )

        # 2. Determinar la categoría destino
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

                log_activity(
                    db=db, user_id=current_user.id,
                    action="AUTO_CREATE_CATEGORY", source="SYSTEM",
                    details="Se creó categoría 'Otros' automáticamente por eliminación de otra."
                )

        # 3. Reasignar ítems
        items_to_move = db.query(ExpenseItem).filter(ExpenseItem.category_id == category_id).all()
        count_moved = len(items_to_move)

        if count_moved > 0:
            for item in items_to_move:
                item.category_id = target_category.id
            db.commit()   # <-- necesario

        # 4. Intentar eliminar
        category_name = category_to_delete.name
        db.delete(category_to_delete)
        db.commit()

        # 5. Registrar log final de éxito
        details = (
            f"Eliminó '{category_name}'. "
            f"Reasignó {count_moved} ítems a '{target_category.name}'." 
            if count_moved > 0
            else f"Eliminó '{category_name}'. No tenía ítems asociados."
        )

        log_activity(
            db=db, user_id=current_user.id,
            action="DELETE_CATEGORY", source="WEB",
            details=details
        )
        db.commit()

        return None

    except Exception as e:
        # --------------------------------------------
        #  ⚠️ LOG DE FALLA (AUNQUE TODO HAYA FALLADO)
        # --------------------------------------------
        try:
            error_msg = str(e)
            log_activity(
                db=db, user_id=current_user.id,
                action="DELETE_CATEGORY_FAILED", source="WEB",
                details=f"Falló al eliminar categoría '{category_id}': {error_msg}"
            )
            db.commit()
        except:
            # Si hasta el log truena, pues… el universo quiso que ese error no exista
            pass

        # Propagar el error hacia FastAPI
        raise
