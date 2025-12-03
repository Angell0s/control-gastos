#backend\app\models\gastos.py
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Float, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)

    # Relaciones
    expense_items = relationship("ExpenseItem", back_populates="category")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # CORREGIDO: Ahora coincide con users.id que es UUID
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    date = Column(DateTime(timezone=True), server_default=func.now())
    total = Column(Float, default=0.0)
    notes = Column(String, nullable=True)

    # Relaciones
    items = relationship("ExpenseItem", back_populates="expense", cascade="all, delete-orphan")


class ExpenseItem(Base):
    __tablename__ = "expense_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Estos ya estaban bien (apuntan a tablas que usan UUID)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)

    # Relaciones
    expense = relationship("Expense", back_populates="items")
    category = relationship("Category", back_populates="expense_items")
