from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    # Token del bot (lo toma de TELEGRAM_TOKEN)
    BOT_TOKEN: str = Field(..., validation_alias="TELEGRAM_TOKEN")

    # URL de tu backend API
    API_URL: str = Field("http://localhost:8000", env="API_URL")

    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        # Ruta al .env global en la raíz del proyecto
        env_file=Path(__file__).parent.parent / ".env",
        env_file_encoding="utf-8",

        # IMPORTANTE: permite variables sobrantes del .env global
        extra="allow",
    )

# Debug para confirmar de dónde carga el .env
print("Buscando .env en:", Path(__file__).parent.parent / ".env")

settings = Settings()
