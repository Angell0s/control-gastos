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
    """
    Lista paginada de ingresos del usuario actual.
    """
    query = (
        select(Ingreso)
        .where(Ingreso.user_id == current_user.id)
        .options(selectinload(Ingreso.category)) # Carga ansiosa (Eager loading)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{id}", response_model=IngresoResponse)
async def read_ingreso(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Obtener detalle de un ingreso por ID.
    """
    query = (
        select(Ingreso)
        .where(Ingreso.id == id, Ingreso.user_id == current_user.id)
        .options(selectinload(Ingreso.category))
    )
    result = await db.execute(query)
    ingreso = result.scalars().first()
    
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    return ingreso

@router.post("/", response_model=IngresoResponse, status_code=status.HTTP_201_CREATED)
async def create_ingreso(
    ingreso_in: IngresoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crear nuevo ingreso y registrar en bitácora.
    """
    new_ingreso = Ingreso(
        **ingreso_in.model_dump(),
        user_id=current_user.id
    )
    
    db.add(new_ingreso)
    await db.commit()
    await db.refresh(new_ingreso)
    
    # Auditoría
    await log_activity(
        db=db,
        user_id=current_user.id,
        action="CREATE_INGRESO",
        source="WEB",
        details=f"Created Ingreso ID: {new_ingreso.id} Amount: {new_ingreso.monto}"
    )
    
    return new_ingreso

@router.put("/{id}", response_model=IngresoResponse)
async def update_ingreso(
    id: UUID,
    ingreso_in: IngresoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Actualizar ingreso existente.
    """
    query = select(Ingreso).where(Ingreso.id == id, Ingreso.user_id == current_user.id)
    result = await db.execute(query)
    ingreso = result.scalars().first()
    
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    update_data = ingreso_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ingreso, field, value)
    
    await db.commit()
    await db.refresh(ingreso)
    
    # Auditoría
    await log_activity(
        db=db,
        user_id=current_user.id,
        action="UPDATE_INGRESO",
        source="WEB",
        details=f"Updated Ingreso ID: {id}"
    )
    
    return ingreso

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingreso(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Eliminar ingreso.
    """
    query = select(Ingreso).where(Ingreso.id == id, Ingreso.user_id == current_user.id)
    result = await db.execute(query)
    ingreso = result.scalars().first()
    
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    await db.delete(ingreso)
    await db.commit()
    
    # Auditoría
    await log_activity(
        db=db,
        user_id=current_user.id,
        action="DELETE_INGRESO",
        source="WEB",
        details=f"Deleted Ingreso ID: {id}"
    )
