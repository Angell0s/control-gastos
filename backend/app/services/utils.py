# backend/app/services/utils.py
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Category  # Asegúrate de importar tu modelo Category correcto

async def get_or_create_category_by_name(db: AsyncSession, name: str = "Otros") -> UUID:
    """
    Busca una categoría por su nombre (insensible a mayúsculas/minúsculas si se desea mejorar).
    Si no existe, la crea y devuelve su ID.
    
    :param db: Sesión asíncrona de base de datos
    :param name: Nombre de la categoría a buscar/crear
    :return: UUID de la categoría
    """
    # 1. Buscar existente
    # Nota: Para producción robusta, considera usar ilike() para búsqueda case-insensitive
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
