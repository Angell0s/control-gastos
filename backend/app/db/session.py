#backend\app\db\session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Ajustamos la URL de conexión para usar asyncpg si no está explícito
# Si tu .env dice "postgresql://...", esto lo cambia a "postgresql+asyncpg://..."
SQLALCHEMY_DATABASE_URL = str(settings.DATABASE_URL).replace(
    "postgresql://", "postgresql+asyncpg://"
)

# 1. Crear el motor asíncrono
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True,  # Pon False en producción
    future=True
)

# 2. Crear la fábrica de sesiones asíncronas
# expire_on_commit=False es CRÍTICO en async para evitar errores de atributos faltantes
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

# 3. Clase Base declarativa (Igual que antes)
Base = declarative_base()

# (Nota: La función get_db ya no se pone aquí, se queda en deps.py para evitar importaciones circulares)
