from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://kipmini_user:kipmini_password@localhost:5432/kipmini_db"

    # JWT аутентификация
    SECRET_KEY: str = "default_key_change_me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Настройки приложения
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # игнорировать необъявленные переменные

settings = Settings()