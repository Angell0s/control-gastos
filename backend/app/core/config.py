import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Control de Gastos API"

    # Base de datos
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    # === BACKEND API / SEGURIDAD ===
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Admin Inicial (Para el script)
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    
    @property
    def DATABASE_URL(self) -> str:
        host = self.POSTGRES_HOST
        # Si NO estamos en Docker, forzamos localhost
        if os.getenv("RUNNING_IN_DOCKER") != "true":
            host = "localhost"
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{host}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file="../.env", # Busca el archivo un nivel arriba
        extra="ignore"
    )

settings = Settings()
