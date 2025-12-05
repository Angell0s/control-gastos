import sys
import os
import asyncio  # <--- Necesario para correr código async
from sqlalchemy import select

# Aseguramos que el path incluya el directorio actual
sys.path.append(os.getcwd())

# Importamos la sesión ASÍNCRONA
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.config import settings
from app.core.security import get_password_hash

async def init():
    # Usamos el contexto asíncrono
    async with AsyncSessionLocal() as db:
        try:
            # ==========================================
            # 1. USUARIO ADMIN (Desde Settings)
            # ==========================================
            print(f"🔍 Verificando Admin: {settings.ADMIN_EMAIL}")
            
            # Consulta asíncrona
            result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
            user = result.scalars().first()
            
            if not user:
                print(f"✨ Creando superusuario: {settings.ADMIN_EMAIL}")
                new_user = User(
                    email=settings.ADMIN_EMAIL,
                    hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                    first_name=getattr(settings, "ADMIN_FIRST_NAME", "Admin"),
                    last_name=getattr(settings, "ADMIN_LAST_NAME", "Principal"),
                    is_superuser=True,
                    is_active=True
                )
                db.add(new_user)
                await db.commit() # Commit asíncrono
                print("✅ ¡Admin creado!")
            else:
                print(f"ℹ️ El Admin ya existe.")

            # ==========================================
            # 2. USUARIO SISTEMA (Hardcoded)
            # ==========================================
            system_email = "system@angell0s.com"
            system_pass = "Vwim4320."
            
            print(f"🔍 Verificando Sistema: {system_email}")

            # Consulta asíncrona
            result_sys = await db.execute(select(User).where(User.email == system_email))
            user_system = result_sys.scalars().first()

            if not user_system:
                print(f"✨ Creando usuario Sistema...")
                new_system = User(
                    email=system_email,
                    hashed_password=get_password_hash(system_pass),
                    first_name="Sistema",
                    last_name="System",
                    phone=None, # Opcional
                    is_superuser=True, # Pediste que fuera superusuario
                    is_active=True
                )
                db.add(new_system)
                await db.commit()
                print("✅ ¡Usuario Sistema creado!")
            else:
                print(f"ℹ️ El usuario Sistema ya existe.")
                
        except Exception as e:
            print(f"❌ Error al crear datos iniciales: {e}")
            # En scripts de un solo uso, el rollback suele ser automático al fallar, 
            # pero podemos hacerlo explícito si queremos.
            await db.rollback()

if __name__ == "__main__":
    print("🚀 Iniciando carga de datos (Modo Async)...")
    # Ejecutamos la función asíncrona en el event loop
    asyncio.run(init())
