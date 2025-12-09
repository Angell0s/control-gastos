# backend\app\api\routers\incomes.py
from typing import List, Any, Set
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.api import deps 
from app.models.user import User
from app.models.incomes import Ingreso, IngresoItem
from app.models.gastos import Category  # <--- IMPORTANTE: Importamos el modelo de Categoría
from app.schemas.income import IngresoCreate, IngresoUpdate, IngresoResponse
from app.services.audit import log_activity
from app.services.utils import get_or_create_category_by_name

router = APIRouter()

# -----------------------------------------------------------------------------
# HELPER: VALIDACIÓN DE CATEGORÍAS
# -----------------------------------------------------------------------------
async def validate_categories(db: AsyncSession, user_id: UUID, items: List[Any]):
    """
    Verifica que las categorías enviadas:
    1. Existan.
    2. Pertenezcan al usuario (o sean globales).
    3. Estén activas (is_active=True).
    Ignora los items con category_id=None (estos se asignarán a 'Otros' después).
    """
    # 1. Extraer IDs únicos que NO sean None
    category_ids: Set[UUID] = {item.category_id for item in items if item.category_id}

    if not category_ids:
        return  # Si todo viene vacío (para asignar a Otros), no hay nada que validar

    # 2. Consultar todas las categorías solicitadas en una sola query
    query = select(Category).where(Category.id.in_(category_ids))
    result = await db.execute(query)
    found_categories = result.scalars().all()
    
    # Mapa para búsqueda rápida: {id: category_obj}
    cat_map = {cat.id: cat for cat in found_categories}

    # 3. Validar una por una
    for cat_id in category_ids:
        # A) ¿Existe?
        if cat_id not in cat_map:
            raise HTTPException(
                status_code=400, 
                detail=f"La categoría con ID {cat_id} no existe."
            )
        
        category = cat_map[cat_id]

        # B) ¿Pertenece al usuario o es global?
        # Si tiene user_id y es diferente al actual, error. (Si user_id es None, es global).
        if category.user_id is not None and category.user_id != user_id:
             raise HTTPException(
                status_code=403, 
                detail=f"No tienes permiso para usar la categoría '{category.name}'."
            )

        # C) ¿Está activa?
        if not category.is_active:
            raise HTTPException(
                status_code=400, 
                detail=f"La categoría '{category.name}' está inactiva y no puede seleccionarse."
            )


# -----------------------------------------------------------------------------
# 1. READ ALL (GET LIST)
# -----------------------------------------------------------------------------
@router.get("/", response_model=List[IngresoResponse])
async def read_ingresos(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = (
        select(Ingreso)
        .where(Ingreso.user_id == current_user.id)
        .options(selectinload(Ingreso.items)) 
        .order_by(Ingreso.fecha.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()


# -----------------------------------------------------------------------------
# 2. CREATE (POST)
# -----------------------------------------------------------------------------
@router.post("/", response_model=IngresoResponse, status_code=status.HTTP_201_CREATED)
async def create_ingreso(
    ingreso_in: IngresoCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # --- VALIDACIÓN PREVIA ---
    # Verifica existencia y estado activo antes de hacer nada
    await validate_categories(db, current_user.id, ingreso_in.items)
    # -------------------------

    # Hotfix para fechas offset-aware 
    if ingreso_in.fecha.tzinfo is not None:
        ingreso_in.fecha = ingreso_in.fecha.replace(tzinfo=None)

    # 1. Calcular total
    total_amount = sum(item.monto for item in ingreso_in.items)

    # 2. Crear Padre (Ingreso)
    new_ingreso = Ingreso(
        user_id=current_user.id,
        descripcion=ingreso_in.descripcion,
        fecha=ingreso_in.fecha,
        fuente=ingreso_in.fuente,
        monto_total=total_amount
    )
    db.add(new_ingreso)
    
    try:
        # Caché local para el ID de "Otros" en esta petición
        default_cat_id = None
        
        # 3. Crear Hijos (Items)
        for item_in in ingreso_in.items:
            
            final_cat_id = item_in.category_id
            
            # Si no viene categoría, usar la utilidad centralizada ("Otros")
            if not final_cat_id:
                if not default_cat_id:
                    default_cat_id = await get_or_create_category_by_name(db, "Otros")
                final_cat_id = default_cat_id

            new_item = IngresoItem(
                ingreso=new_ingreso, # Vinculación directa ORM
                category_id=final_cat_id,
                descripcion=item_in.descripcion,
                monto=item_in.monto
            )
            db.add(new_item)

        # 4. Commit Atómico
        await db.commit()
        
        # 5. Refresh para devolver datos completos
        query = select(Ingreso).where(Ingreso.id == new_ingreso.id).options(selectinload(Ingreso.items))
        result = await db.execute(query)
        ingreso_refreshed = result.scalars().first()

        # Auditoría
        await log_activity(
            db=db, user_id=current_user.id, action="CREATE_INGRESO", source="WEB",
            details=f"Ingreso creado con {len(ingreso_in.items)} items. Total: {total_amount}"
        )
        
        return ingreso_refreshed
        
    except Exception as e:
        await db.rollback()
        try:
            await log_activity(db=db, user_id=current_user.id, action="CREATE_INGRESO_FAILED", source="WEB", details=str(e))
        except: pass
            
        raise HTTPException(status_code=400, detail=f"Error creando ingreso: {str(e)}")


# -----------------------------------------------------------------------------
# 3. READ ONE (GET BY ID)
# -----------------------------------------------------------------------------
@router.get("/{id}", response_model=IngresoResponse)
async def read_ingreso(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = (
        select(Ingreso)
        .where(Ingreso.id == id, Ingreso.user_id == current_user.id)
        .options(selectinload(Ingreso.items))
    )
    result = await db.execute(query)
    ingreso = result.scalars().first()
    
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    return ingreso


# -----------------------------------------------------------------------------
# 4. UPDATE (PUT)
# -----------------------------------------------------------------------------
@router.put("/{id}", response_model=IngresoResponse)
async def update_ingreso(
    id: UUID,
    ingreso_in: IngresoUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. Buscar existente y validar propiedad
    query = select(Ingreso).where(Ingreso.id == id, Ingreso.user_id == current_user.id)
    result = await db.execute(query)
    ingreso = result.scalars().first()

    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")

    # --- VALIDACIÓN PREVIA ---
    # Validamos los nuevos items antes de intentar guardarlos
    await validate_categories(db, current_user.id, ingreso_in.items)
    # -------------------------

    # Hotfix fechas
    if ingreso_in.fecha and ingreso_in.fecha.tzinfo is not None:
        ingreso_in.fecha = ingreso_in.fecha.replace(tzinfo=None)

    try:
        # 2. Actualizar campos Padre
        ingreso.descripcion = ingreso_in.descripcion
        ingreso.fecha = ingreso_in.fecha
        ingreso.fuente = ingreso_in.fuente
        
        # Recalcular total
        new_total = sum(item.monto for item in ingreso_in.items)
        ingreso.monto_total = new_total

        # 3. Reemplazar Items (Estrategia: Delete & Insert)
        await db.execute(delete(IngresoItem).where(IngresoItem.ingreso_id == id))
        
        default_cat_id = None

        for item_in in ingreso_in.items:
            
            final_cat_id = item_in.category_id
            
            # Lógica de categoría default ("Otros")
            if not final_cat_id:
                if not default_cat_id:
                    default_cat_id = await get_or_create_category_by_name(db, "Otros")
                final_cat_id = default_cat_id

            new_item = IngresoItem(
                ingreso_id=ingreso.id, 
                category_id=final_cat_id,
                descripcion=item_in.descripcion,
                monto=item_in.monto
            )
            db.add(new_item)

        # 4. Commit
        await db.commit()
        
        # 5. Refresh
        query_refresh = select(Ingreso).where(Ingreso.id == id).options(selectinload(Ingreso.items))
        result_refresh = await db.execute(query_refresh)
        ingreso_refreshed = result_refresh.scalars().first()

        await log_activity(
            db=db, user_id=current_user.id, action="UPDATE_INGRESO", source="WEB",
            details=f"Ingreso actualizado ID: {id}"
        )
        
        return ingreso_refreshed

    except Exception as e:
        await db.rollback()
        try:
             await log_activity(db=db, user_id=current_user.id, action="UPDATE_INGRESO_FAILED", source="WEB", details=str(e))
        except: pass
        raise HTTPException(status_code=400, detail=f"Error actualizando: {str(e)}")


# -----------------------------------------------------------------------------
# 5. DELETE
# -----------------------------------------------------------------------------
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingreso(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = select(Ingreso).where(Ingreso.id == id, Ingreso.user_id == current_user.id)
    result = await db.execute(query)
    ingreso = result.scalars().first()
    
    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    
    try:
        # cascade="all, delete-orphan" en el modelo se encarga de los items
        await db.delete(ingreso)
        await db.commit()
        
        await log_activity(
            db=db, user_id=current_user.id, action="DELETE_INGRESO", source="WEB",
            details=f"Deleted Ingreso ID: {id}"
        )
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error borrando: {str(e)}")
