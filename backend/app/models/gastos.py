#backend\app\models\gastos.py
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Float, func, Boolean, Index, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    expense_items = relationship("ExpenseItem", back_populates="category")
    income_items = relationship("IngresoItem", back_populates="category")

    __table_args__ = (
        # Nombre único por usuario (privadas)
        Index(
            'ix_categories_name_user_unique',
            'name',
            'user_id',
            unique=True,
            postgresql_where=text("user_id IS NOT NULL")
        ),
        # Nombre único para globales
        Index(
            'ix_categories_name_global_unique',
            'name',
            unique=True,
            postgresql_where=text("user_id IS NULL")
        ),
        Index('ix_categories_user_id', 'user_id'),
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
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)

    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    expense = relationship("Expense", back_populates="items")
    category = relationship("Category", back_populates="expense_items")

    __table_args__ = (
        Index('ix_expense_items_expense_id', 'expense_id'),
        Index('ix_expense_items_category_id', 'category_id'),
    )