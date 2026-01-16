import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# 1. Agregar ruta actual
sys.path.append(os.getcwd())

# 2. Importar MODELOS (Vital para que Alembic vea las tablas)
from app.db.session import Base
from app.models import User 

# NOTA: NO importamos 'settings' para la URL para evitar conflictos.
# Leemos directo del entorno.

config = context.config

# =======================================================
# LÓGICA DE URL SEGURA
# =======================================================
def get_url():
    # Leemos la variable que YA VIMOS que existe con grep
    url = os.getenv("DATABASE_URL")
    
    if not url:
        # Fallback solo si algo muy raro pasa
        return "postgresql://user:pass@localhost/dbname"

    # Imprimimos para que veas en consola qué está usando
    print(f"🔵 DEBUG ALEMBIC - URL ENCONTRADA: {url}")

    # FIX: Alembic no soporta 'asyncpg', lo cambiamos a driver estándar
    if "+asyncpg" in url:
        url = url.replace("+asyncpg", "")
    
    return url

# Sobrescribimos la configuración
config.set_main_option("sqlalchemy.url", get_url())

# Configurar logs
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()