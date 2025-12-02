from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models import Category
from app.schemas import CategoryCreate, CategoryResponse # Asumiendo que ya creaste estos schemas

router = APIRouter()

@router.post("/", response_model=CategoryResponse)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    # Opcional: Verificar si ya existe por nombre
    # ...
    
    db_obj = Category(
        name=category_in.name,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=List[CategoryResponse])
def read_categories(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user), 
    skip: int = 0,
    limit: int = 100,
):
    return db.query(Category).offset(skip).limit(limit).all()
