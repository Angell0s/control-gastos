#backend\app\models\incomes.py
import uuid
from typing import List
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Ingreso(Base):
    __tablename__ = "ingresos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    descripcion: Mapped[str] = mapped_column(String, nullable=False) # Ej: "Nómina Enero"
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fuente: Mapped[str] = mapped_column(String, nullable=False) # Ej: "Banco X"
    
    # El total se calcula sumando los items, pero es útil persistirlo para consultas rápidas
    monto_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    user = relationship("User", back_populates="ingresos") # Asegúrate de tener "ingresos" en User
    
    # Relación con los detalles (Cascade para borrar items si se borra el ingreso)
    items: Mapped[List["IngresoItem"]] = relationship(
        "IngresoItem", 
        back_populates="ingreso", 
        cascade="all, delete-orphan",
        lazy="selectin" # Carga eficiente async
    )

class IngresoItem(Base):
    __tablename__ = "ingreso_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # FKs
    ingreso_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingresos.id"), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    descripcion: Mapped[str] = mapped_column(String, nullable=False) # Ej: "Bono productividad"
    monto: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # Relaciones
    ingreso = relationship("Ingreso", back_populates="items")
    category = relationship("Category") # Relación unidireccional a categoría está bien por ahora
