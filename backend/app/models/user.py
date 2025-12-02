import uuid
from sqlalchemy import Boolean, Column, String
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    # 1. Cambio a UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # 2. Nuevos Campos
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True) # El teléfono siempre guárdalo como String
    
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
