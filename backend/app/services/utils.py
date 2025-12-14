# backend/app/services/utils.py
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException
from app.models import Category  

async def get_or_create_category_by_name(db: AsyncSession, name: str = "Otros") -> UUID:
    """
    Busca una categoría por su nombre (exacto).
    Si no existe, la crea y devuelve su ID.
    
    :param db: Sesión asíncrona de base de datos
    :param name: Nombre de la categoría a buscar/crear
    :return: UUID de la categoría
    """
    # 1. Buscar existente
    query = select(Category).where(Category.name == name)
    result = await db.execute(query)
    category = result.scalars().first()

    if category:
        return category.id

    # 2. Si no existe, crearla
    new_category = Category(name=name)
    db.add(new_category)
    
    # Hacemos flush para que SQLAlchemy genere el ID y lo asigne al objeto
    # sin necesidad de cerrar la transacción principal con commit()
    await db.flush() 
    
    return new_category.id


async def validate_categories_availability(db: AsyncSession, items: list, user_id: UUID) -> None:
    """
    Valida que todas las categorías usadas en una lista de items existan, 
    sean del usuario (o globales) y estén activas.
    
    Esta función es genérica y puede usarse para items de Gastos o Ingresos,
    siempre que los objetos 'item' tengan un atributo 'category_id'.
    
    :param db: Sesión de base de datos
    :param items: Lista de objetos (Pydantic models) que contienen 'category_id'
    :param user_id: ID del usuario actual para validar propiedad
    :raises HTTPException: Si alguna categoría no existe, no es propia o está inactiva.
    """
    if not items:
        return

    # Solo validar las categorías que realmente tienen ID (ignorar None)
    category_ids = {item.category_id for item in items if item.category_id is not None}
    
    if not category_ids:  # Todos son null o lista vacía → todo OK
        return

    stmt = select(Category).where(
        Category.id.in_(category_ids),
        or_(Category.user_id == user_id, Category.user_id.is_(None))
    )
    result = await db.execute(stmt)
    found_categories = result.scalars().all()
    found_map = {cat.id: cat for cat in found_categories}

    for cat_id in category_ids:
        cat = found_map.get(cat_id)
        
        # 1. ¿Existe y tengo permiso?
        if not cat:
            raise HTTPException(
                status_code=400,
                detail=f"Categoría con ID {cat_id} no existe o no tienes acceso."
            )
        
        # 2. ¿Está activa?
        if not cat.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"La categoría '{cat.name}' está desactivada y no puede usarse en nuevos registros."
            )
