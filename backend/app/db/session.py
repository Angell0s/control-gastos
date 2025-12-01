from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Configuración del Motor
engine = create_engine(settings.DATABASE_URL)

# 2. Fábrica de Sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Clase Base para modelos
Base = declarative_base()

# --- ESTO ES LO QUE TE FALTA ---
# 4. Dependencia (El generador de sesiones)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
