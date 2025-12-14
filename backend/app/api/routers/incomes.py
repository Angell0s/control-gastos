# backend\app\api\routers\incomes.py
from typing import List, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.api import deps 
from app.models.user import User
from app.models.incomes import Ingreso, IngresoItem
from app.schemas.income import IngresoCreate, IngresoUpdate, IngresoResponse
from app.services.audit import log_activity

# ✅ Importamos los helpers centralizados (DRY)
from app.services.utils import get_or_create_category_by_name, validate_categories_availability

from datetime import timezone

router = APIRouter()

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
    # 1. Validaciones previas (lectura, no requiere transacción)
    await validate_categories_availability(db, ingreso_in.items, current_user.id)

    # 2. Normalización de fecha a UTC
    if ingreso_in.fecha.tzinfo is not None:
        ingreso_in.fecha = ingreso_in.fecha.astimezone(timezone.utc).replace(tzinfo=None)

    total_amount = sum(item.monto for item in ingreso_in.items)

    try:
        # --- INICIO BLOQUE TRANSACCIONAL ---
        new_ingreso = Ingreso(
            user_id=current_user.id,
            descripcion=ingreso_in.descripcion,
            fecha=ingreso_in.fecha,
            fuente=ingreso_in.fuente,
            monto_total=total_amount
        )
        db.add(new_ingreso)
        
        # Flush para obtener el ID del ingreso sin comitear
        await db.flush() 

        default_cat_id = None
        for item_in in ingreso_in.items:
            final_cat_id = item_in.category_id
            
            if not final_cat_id:
                if not default_cat_id:
                    default_cat_id = await get_or_create_category_by_name(db, "Otros")
                final_cat_id = default_cat_id

            new_item = IngresoItem(
                ingreso_id=new_ingreso.id, # Usamos el ID generado por el flush
                category_id=final_cat_id,
                descripcion=item_in.descripcion,
                monto=item_in.monto
            )
            db.add(new_item)

        # Log dentro de la lógica, pero protegido para no romper la transacción principal
        # Opcional: Si el log es vital, déjalo sin try/except. 
        # Si es secundario, usa esto:
        try:
            await log_activity(
                db=db, user_id=current_user.id, action="CREATE_INGRESO", source="WEB",
                details=f"Ingreso creado. Total: {total_amount}"
            )
        except Exception as log_error:
            # Aquí podrías loguear a consola que falló el registro de auditoría
            print(f"Fallo al auditar: {log_error}")

        # 3. COMMIT FINAL (Todo o nada)
        await db.commit()
        # --- FIN BLOQUE TRANSACCIONAL ---

        # 4. Refresh para devolver datos completos
        query = select(Ingreso).where(Ingreso.id == new_ingreso.id).options(selectinload(Ingreso.items))
        result = await db.execute(query)
        return result.scalars().first()

    except Exception as e:
        await db.rollback() # Ahora sí limpia todo si algo falla antes del commit
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
    # 1. Cargar Ingreso con sus Items existentes
    # Usamos selectinload para tener los items listos en memoria
    query = (
        select(Ingreso)
        .where(Ingreso.id == id, Ingreso.user_id == current_user.id)
        .options(selectinload(Ingreso.items))
    )
    result = await db.execute(query)
    ingreso = result.scalars().first()

    if not ingreso:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")

    # Validación previa de categorías (Optimización)
    await validate_categories_availability(db, ingreso_in.items, current_user.id)

    # --- INICIO LÓGICA DE ACTUALIZACIÓN ---
    try:
        # A. Actualizar campos del Padre (Ingreso)
        if ingreso_in.descripcion is not None:
            ingreso.descripcion = ingreso_in.descripcion
        if ingreso_in.fuente is not None:
            ingreso.fuente = ingreso_in.fuente
        if ingreso_in.fecha is not None:
             # Hotfix de fecha (idealmente usar .astimezone(timezone.utc))
            if ingreso_in.fecha.tzinfo is not None:
                ingreso_in.fecha = ingreso_in.fecha.replace(tzinfo=None)
            ingreso.fecha = ingreso_in.fecha

        # B. Estrategia de Reconciliación de Items (Diffing)
        
        # Mapa de items actuales en BD: {uuid: objeto_db}
        # Esto nos permite buscar rápido si un item ya existe.
        existing_items_map = {item.id: item for item in ingreso.items}
        
        # Lista para rastrear qué IDs procesamos (para saber cuáles borrar después)
        processed_item_ids = set()

        default_cat_id = None # Cache para categoría 'Otros'

        for item_in in ingreso_in.items:
            
            # Lógica de Categoría (Compartida para Crear y Actualizar)
            final_cat_id = item_in.category_id
            if not final_cat_id:
                if not default_cat_id:
                    default_cat_id = await get_or_create_category_by_name(db, "Otros")
                final_cat_id = default_cat_id

            # CASO 1: ACTUALIZAR (Tiene ID y existe en el mapa)
            if item_in.id and item_in.id in existing_items_map:
                existing_item = existing_items_map[item_in.id]
                
                # Actualizamos campos
                existing_item.descripcion = item_in.descripcion
                existing_item.monto = item_in.monto
                existing_item.category_id = final_cat_id
                
                processed_item_ids.add(item_in.id)

            # CASO 2: CREAR (No tiene ID o el ID no está en la BD de este ingreso)
            else:
                new_item = IngresoItem(
                    ingreso_id=ingreso.id, # Vinculamos al padre actual
                    category_id=final_cat_id,
                    descripcion=item_in.descripcion,
                    monto=item_in.monto
                )
                db.add(new_item)

        # CASO 3: BORRAR (Estaban en BD pero no vinieron en el request)
        for existing_id, existing_item in existing_items_map.items():
            if existing_id not in processed_item_ids:
                await db.delete(existing_item)

        # C. Recalcular Total (Basado en la entrada, que es la fuente de verdad)
        ingreso.monto_total = sum(item.monto for item in ingreso_in.items)

        # D. Commit Atómico
        # Si algo falla arriba, nada se guarda.
        await db.commit()

        # E. Refresh final
        # Necesario para que el objeto 'ingreso' tenga los nuevos items con sus IDs generados
        await db.refresh(ingreso) 
        # A veces refresh no trae las relaciones anidadas nuevas, recargar es más seguro:
        query_refresh = select(Ingreso).where(Ingreso.id == id).options(selectinload(Ingreso.items))
        result_refresh = await db.execute(query_refresh)
        ingreso_refreshed = result_refresh.scalars().first()

        # Auditoría (Fuera del flujo crítico de error, o manejada con cuidado)
        try:
            await log_activity(
                db=db, user_id=current_user.id, action="UPDATE_INGRESO", source="WEB",
                details=f"Ingreso actualizado ID: {id}. Items procesados: {len(ingreso_in.items)}"
            )
        except: pass

        return ingreso_refreshed

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error actualizando ingreso: {str(e)}")


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
