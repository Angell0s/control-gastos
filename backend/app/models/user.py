#backend\app\models\user.py
import uuid
from sqlalchemy import Boolean, Column, String,BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
from typing import Optional
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True) # El teléfono siempre guárdalo como String

    # NUEVO CAMPO para vincular con Telegram
    telegram_chat_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, 
        unique=True, 
        nullable=True,
        index=True,
        comment="Telegram chat ID for bot integration"
    )
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(onupdate=datetime.utcnow)
    
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
