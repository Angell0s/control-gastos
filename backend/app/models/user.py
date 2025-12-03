#backend\app\models\user.py
import uuid
from sqlalchemy import Boolean, Column, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
from typing import Optional, List # Importar List
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    telegram_chat_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, 
        unique=True, 
        nullable=True,
        index=True
    )
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(onupdate=datetime.utcnow)
    
    # ✅ NUEVO CAMPO: Último inicio de sesión
    last_login: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)

    # ✅ Relación con la Bitácora (Opcional, útil para ORM)
    logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")

# --- NUEVA TABLA DE BITÁCORA ---
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Quién hizo la acción
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Qué hizo (Ej: "LOGIN", "CREATE_EXPENSE", "UPDATE_PROFILE")
    action = Column(String, index=True, nullable=False)
    
    # Desde dónde (Ej: "WEB", "TELEGRAM", "MOBILE")
    source = Column(String, nullable=False)
    
    # Detalles extra (Opcional, para guardar JSON o texto breve)
    details = Column(String, nullable=True)
    
    # Cuándo
    timestamp: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relación inversa
    user: Mapped["User"] = relationship("User", back_populates="logs")
