import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from backend.database import Base
import backend.models

async def init():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise Exception("DATABASE_URL не задан")
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Таблицы успешно созданы!")



if __name__ == "__main__":
    asyncio.run(init())