#backend\app\models\incomes.py
import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
from typing import Optional

class Ingreso(Base):
    __tablename__ = "ingresos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relación con Usuario (Propietario)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Relación con Categoría
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    descripcion: Mapped[str] = mapped_column(String, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    monto: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    fuente: Mapped[str] = mapped_column(String, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    # Se permite actualización manual desde endpoint, pero por defecto se actualiza sola
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones ORM
    user = relationship("User", back_populates="ingresos") 
    category = relationship("Category", backref="ingresos") # Usamos backref simple si no modificamos Category
