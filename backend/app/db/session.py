from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Crear el motor de base de datos
# Usamos la propiedad DATABASE_URL que definiste en tu config
engine = create_engine(settings.DATABASE_URL)

# 2. Crear la fábrica de sesiones
# autocommit=False: Para tener control total de cuándo guardar (db.commit())
# autoflush=False: Para evitar que SQLA envíe cambios parciales a la DB automáticamente
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Clase Base declarativa
# Todos tus modelos (User, Expense, etc.) heredarán de esta clase
Base = declarative_base()

# --- ESTO ES LO QUE TE FALTA ---
# 4. Dependencia (El generador de sesiones)
def get_db():
    """
    Generador de sesiones de base de datos.
    Abre una sesión por cada request y la cierra al terminar, 
    incluso si ocurre un error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()