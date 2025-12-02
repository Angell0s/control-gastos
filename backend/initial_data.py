import sys
import os
# Aseguramos que el path incluya el directorio actual para encontrar 'app'
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.core.config import settings
from app.core.security import get_password_hash # <--- Reusamos esto

def init():
    db = SessionLocal()
    try:
        # 1. Verificar si ya existe
        user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        
        if not user:
            print(f"Creando superusuario: {settings.ADMIN_EMAIL}")
            
            # 2. Crear usuario usando los datos del Settings
            # Nota: Asegúrate de haber agregado ADMIN_FIRST_NAME y LAST_NAME a tu Settings en config.py
            # Si no los agregaste a config.py, pon strings fijos aquí temporalmente o usa os.getenv
            
            new_user = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                first_name=getattr(settings, "ADMIN_FIRST_NAME", "Admin"), # Fallback seguro
                last_name=getattr(settings, "ADMIN_LAST_NAME", "Sistema"),
                is_superuser=True,
                is_active=True
            )
            
            db.add(new_user)
            db.commit()
            print("✅ ¡Usuario administrador creado exitosamente!")
        else:
            print(f"ℹ️ El usuario {settings.ADMIN_EMAIL} ya existe.")
            
    except Exception as e:
        print(f"❌ Error al crear datos iniciales: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Iniciando carga de datos...")
    init()
