from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Test(BaseSettings):
    TELEGRAM_TOKEN: str | None = None

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent / ".env",
    )

print(Test())
