#backend\app\api\routers\users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Annotated, Optional
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_active_superuser 
from app.models.user import User, AuditLog
from app.schemas.user import (
    UserResponse, 
    UserResponseAdmin, 
    UserCreate, 
    UserUpdate,      
    UserSignup
)
from app.schemas.audit import AuditLogResponse
from app.core.security import get_password_hash, verify_password
from app.services.audit import log_activity

router = APIRouter()

# ========== CREATE (Crear) ==========

# 1. Crear usuario (Admin)
@router.post("/", response_model=UserResponseAdmin, status_code=status.HTTP_201_CREATED)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(get_current_active_superuser) 
):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="El usuario con este email ya existe.")
    
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        is_active=user_in.is_active,
        is_superuser=user_in.is_superuser,
    )
    db.add(db_user)

    try:
        db.commit()
        db.refresh(db_user)

        # ✅ LOG ÉXITO
        log_activity(
            db=db,
            user_id=current_user.id,
            action="CREATE_USER",
            source="WEB_APP",
            details=f"Creó usuario {db_user.email}"
        )
    except Exception as e:
        db.rollback()
        # ❌ LOG FALLO
        try:
            log_activity(
                db=db, user_id=current_user.id, 
                action="CREATE_USER_FAILED", source="WEB_APP", 
                details=f"Falló creando {user_in.email}: {str(e)}"
            )
            db.commit()
        except: pass
        raise HTTPException(status_code=400, detail=f"Error creando usuario: {str(e)}")

    return db_user


# 2. Registro público
@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserSignup,
):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="El email ya está registrado.")

    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        is_active=True,
        is_superuser=False,
    )
    db.add(db_user)

    try:
        db.commit()
        db.refresh(db_user)

        # ✅ LOG ÉXITO
        # Nota: Aquí usamos el ID del usuario recién creado porque ya existe tras el commit
        log_activity(
            db=db,
            user_id=db_user.id,
            action="SIGNUP",
            source="WEB_APP",
            details="Registro público exitoso"
        )
    except Exception as e:
        db.rollback()
        # Nota: En signup no logueamos el fallo en BD porque el usuario no existe 
        # y no tenemos un user_id válido para la Foreign Key de AuditLog.
        raise HTTPException(status_code=400, detail=f"Error en el registro: {str(e)}")

    return db_user


# ========== READ (Leer) ==========

# 3. Lista de usuarios (Admin)
@router.get("/", response_model=List[UserResponseAdmin])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser) 
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


# 4. Perfil propio
@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)]
):
    return current_user


# 5. Obtener usuario por ID (Admin)
@router.get("/{user_id}", response_model=UserResponseAdmin)
def read_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


# ========== UPDATE (Actualizar) ==========

# 6. Actualizar perfil propio
@router.put("/me", response_model=UserResponse)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Permite al usuario actualizar su propio perfil.
    """
    update_data = user_in.model_dump(exclude_unset=True)
    
    # Si cambia la contraseña, hashearla
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.add(current_user)
    
    try:
        db.commit()
        db.refresh(current_user)

        # ✅ LOG ÉXITO
        log_activity(
            db=db,
            user_id=current_user.id,
            action="UPDATE_PROFILE",
            source="WEB_APP",
            details="Actualizó su perfil"
        )
    except Exception as e:
        db.rollback()
        # ❌ LOG FALLO
        try:
            log_activity(
                db=db, user_id=current_user.id, 
                action="UPDATE_PROFILE_FAILED", source="WEB_APP", 
                details=f"Error actualizando perfil: {str(e)}"
            )
            db.commit()
        except: pass
        raise HTTPException(status_code=400, detail=f"Error actualizando perfil: {str(e)}")

    return current_user


# 7. Actualizar usuario (Admin)
@router.put("/{user_id}", response_model=UserResponseAdmin)
def update_user(
    *,
    user_id: str,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_superuser)
):
    """
    Permite a un admin actualizar cualquier usuario (incluyendo roles y estado).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = user_in.model_dump(exclude_unset=True)
    
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.add(user)

    try:
        db.commit()
        db.refresh(user)

        # ✅ LOG ÉXITO
        log_activity(
            db=db,
            user_id=current_user.id,
            action="UPDATE_USER",
            source="WEB_APP",
            details=f"Actualizó usuario {user.email}"
        )
    except Exception as e:
        db.rollback()
        # ❌ LOG FALLO
        try:
            log_activity(
                db=db, user_id=current_user.id, 
                action="UPDATE_USER_FAILED", source="WEB_APP", 
                details=f"Error actualizando usuario {user.email}: {str(e)}"
            )
            db.commit()
        except: pass
        raise HTTPException(status_code=400, detail=f"Error actualizando usuario: {str(e)}")

    return user


# ========== DELETE (Eliminar) ==========

# 8. Eliminar usuario (Admin)
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    *,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """
    Desactiva un usuario (soft delete).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Evitar que el admin se elimine a sí mismo
    if user.id == current_user.id:
        # ❌ LOG INTENTO FALLIDO
        try:
            log_activity(
                db=db, user_id=current_user.id, 
                action="DELETE_USER_DENIED", source="WEB_APP", 
                details="Intento de auto-eliminación"
            )
            db.commit()
        except: pass
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    user_email = user.email # Guardar para el log

    # Soft Delete
    user.is_active = False
    db.add(user)
    
    try:
        db.commit()

        # ✅ LOG ÉXITO
        log_activity(
            db=db,
            user_id=current_user.id,
            action="DELETE_USER",
            source="WEB_APP",
            details=f"Eliminó/desactivó usuario {user_email}"
        )
    except Exception as e:
        db.rollback()
        # ❌ LOG FALLO
        try:
            log_activity(
                db=db, user_id=current_user.id, 
                action="DELETE_USER_FAILED", source="WEB_APP", 
                details=f"Error eliminando {user_email}: {str(e)}"
            )
            db.commit()
        except: pass
        raise HTTPException(status_code=400, detail=f"Error eliminando usuario: {str(e)}")

    return None


# ========== OTROS ==========

# 9. Bitácora del usuario actual
@router.get("/me/logs", response_model=List[AuditLogResponse])
def read_user_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs


# 10. Bitácora completa (Admin)
@router.get("/logs/all", response_model=List[AuditLogResponse])
def read_all_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    logs = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.user))
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs


# 11. Desvincular Telegram
@router.post("/me/unlink-telegram", response_model=UserResponse)
def unlink_telegram_web(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="No tienes cuenta de Telegram vinculada.")

    old_chat_id = current_user.telegram_chat_id
    current_user.telegram_chat_id = None
    current_user.phone = None
    
    db.add(current_user)
    
    try:
        db.commit()
        db.refresh(current_user)
        
        # ✅ LOG ÉXITO
        log_activity(
            db=db,
            user_id=current_user.id,
            action="UNLINK_TELEGRAM",
            source="WEB_APP",
            details=f"Desvinculación (Chat ID: {old_chat_id})"
        )
    except Exception as e:
        db.rollback()
        # ❌ LOG FALLO
        try:
            log_activity(
                db=db, user_id=current_user.id, 
                action="UNLINK_TELEGRAM_FAILED", source="WEB_APP", 
                details=f"Error desvinculando: {str(e)}"
            )
            db.commit()
        except: pass
        raise HTTPException(status_code=400, detail=f"Error desvinculando: {str(e)}")
    
    return current_user
