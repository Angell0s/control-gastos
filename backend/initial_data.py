import sys
import os
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.core.config import settings
from passlib.context import CryptContext

# Configuración de Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init():
    db = SessionLocal()
    try:
        # Verificar si ya existe
        user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not user:
            print(f"Creando admin: {settings.ADMIN_EMAIL}")
            new_user = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=pwd_context.hash(settings.ADMIN_PASSWORD),
                is_superuser=True,
                is_active=True
            )
            db.add(new_user)
            db.commit()
            print("¡Usuario creado exitosamente!")
        else:
            print("El usuario ya existe.")
    finally:
        db.close()

if __name__ == "__main__":
    print("Iniciando carga de datos...")
    init()
