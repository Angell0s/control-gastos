#backend\app\api\routers\incomes.py
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.incomes import Ingreso
from app.schemas.income import IngresoCreate, IngresoUpdate, IngresoResponse
from app.services.audit import log_activity 

router = APIRouter()

@router.get("/", response_model=List[IngresoResponse])
async def read_ingresos(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # selectinload(Ingreso.items) es crucial para traer los hijos en modo async
    query = (
        select(Ingreso)
        .where(Ingreso.user_id == current_user.id)
        .options(selectinload(Ingreso.items)) 
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=IngresoResponse, status_code=status.HTTP_201_CREATED)
async def create_ingreso(
    ingreso_in: IngresoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Calcular monto total basado en los items
    total_amount = sum(item.monto for item in ingreso_in.items)

    # 2. Crear instancia del Padre
    new_ingreso = Ingreso(
        user_id=current_user.id,
        descripcion=ingreso_in.descripcion,
        fecha=ingreso_in.fecha,
        fuente=ingreso_in.fuente,
        monto_total=total_amount
    )
    
    # 3. Agregar a la sesión para generar el ID (aunque UUID se genera auto, SQLAlchemy necesita trackearlo)
    db.add(new_ingreso)
    
    # 4. Crear instancias de los Hijos y vincularlos
    for item_in in ingreso_in.items:
        new_item = IngresoItem(
            # Importante: No asignamos ingreso_id manualmente si usamos la relación ORM,
            # pero asignarlo al padre .items.append es más seguro en ciertos contextos.
            # Aquí usaremos la asignación directa al padre:
            ingreso=new_ingreso, 
            category_id=item_in.category_id,
            descripcion=item_in.descripcion,
            monto=item_in.monto
        )
        db.add(new_item)

    # 5. Commit único (Atomicidad)
    await db.commit()
    
    # 6. Refresh con carga de relaciones para devolver el JSON completo
    # Es vital hacer selectinload aquí para que Pydantic pueda leer .items
    query = select(Ingreso).where(Ingreso.id == new_ingreso.id).options(selectinload(Ingreso.items))
    result = await db.execute(query)
    ingreso_refreshed = result.scalars().first()

    # Auditoría
    await log_activity(
        db=db,
        user_id=current_user.id,
        action="CREATE_INGRESO",
        source="WEB",
        details=f"Ingreso creado con {len(ingreso_in.items)} items. Total: {total_amount}"
    )
    
    return ingreso_refreshed

@router.get("/{id}", response_model=IngresoResponse)
async def read_ingreso(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Ingreso)
        .where(Ingreso.id == id, Ingreso.user_id == current_user.id)
        .options(selectinload(Ingreso.items)) # Cargar items
    )
    result = await db.execute(query)
    ingreso = result.scalars().first()
    
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    return ingreso

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingreso(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Buscamos el ingreso
    query = select(Ingreso).where(Ingreso.id == id, Ingreso.user_id == current_user.id)
    result = await db.execute(query)
    ingreso = result.scalars().first()
    
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    # Al borrar el padre, cascade="all, delete-orphan" borrará los items automáticamente
    await db.delete(ingreso)
    await db.commit()
    
    await log_activity(
        db=db,
        user_id=current_user.id,
        action="DELETE_INGRESO",
        source="WEB",
        details=f"Deleted Ingreso ID: {id}"
    )
