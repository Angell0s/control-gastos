#backend\app\models\gastos.py
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Float, func, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # name sin unique=True aquí, se maneja en __table_args__
    name = Column(String, nullable=False) 
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relaciones
    expense_items = relationship("ExpenseItem", back_populates="category")
    
    # ✅ AGREGADO: Relación inversa para Ingresos (Necesario para el ORM)
    income_items = relationship("IngresoItem", back_populates="category")
    
    __table_args__ = (
        # 1. Evita duplicados para el MISMO usuario
        Index(
            'ix_categories_name_user_id',
            'name', 'user_id',
            unique=True,
            postgresql_where=(user_id != None)
        ),
        
        # 2. Evita duplicados GLOBALES
        Index(
            'ix_categories_name_global',
            'name',
            unique=True,
            postgresql_where=(user_id == None)
        ),
    )

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    date = Column(DateTime(timezone=True), server_default=func.now())
    total = Column(Float, default=0.0)
    notes = Column(String, nullable=True)

    items = relationship("ExpenseItem", back_populates="expense", cascade="all, delete-orphan")

class ExpenseItem(Base):
    __tablename__ = "expense_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)

    expense = relationship("Expense", back_populates="items")
    category = relationship("Category", back_populates="expense_items")
