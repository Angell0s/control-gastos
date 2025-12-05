#backend\app\models\incomes.py
import uuid
from typing import List, Optional # 1. Importar Optional
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Ingreso(Base):
    __tablename__ = "ingresos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    descripcion: Mapped[str] = mapped_column(String, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # 2. CAMBIO AQUÍ: Optional[str] y nullable=True
    fuente: Mapped[Optional[str]] = mapped_column(String, nullable=True) 
    
    monto_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    user = relationship("User", back_populates="ingresos") 
    
    items: Mapped[List["IngresoItem"]] = relationship(
        "IngresoItem", 
        back_populates="ingreso", 
        cascade="all, delete-orphan",
        lazy="selectin"
    )

class IngresoItem(Base):
    __tablename__ = "ingreso_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    ingreso_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingresos.id"), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    descripcion: Mapped[str] = mapped_column(String, nullable=False)
    monto: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    ingreso = relationship("Ingreso", back_populates="items")
    category = relationship("Category")
