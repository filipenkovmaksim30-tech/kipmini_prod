import os
import sys
import logging
import traceback
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.routers import auth, users, groups, grades, subjects, students,\
schedule, teachers, homeworks, lesson_grades, attendance, calendar

from backend.middleware.logging_middleware import logging_middleware

sys.path.insert(1, os.path.join(sys.path[0], '..'))

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """"Можно будет добавить ресурсы"""
    yield
    """Можно будет корректно закрыть ресурсы"""


app = FastAPI(
    title="KipMini - Student Management System",
    description="""
    ## Учебная система управления студентами и оценками

    ### Возможности:
    - ✅ Полная аутентификация и авторизация (JWT)
    - 👥 Управление студентами, группами, преподавателями
    - 📊 Выставление и отслеживание оценок
    - 🔐 Ролевая модель (админ, преподаватель, студент)

    ### Роли:
    - **Администратор**: полный доступ
    - **Преподаватель**: управление своими предметами и группами
    - **Студент**: просмотр своих оценок
    - **Пользователь**: базовая регистрация

    ### Технологии:
    - FastAPI + SQLAlchemy + PostgreSQL
    - JWT аутентификация
    - Pydantic валидация
    """,
    version="1.0.0",
    lifespan=lifespan
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.middleware("http")(logging_middleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Тип: {type(exc).__name__}")
    print(f"Сообщение: {str(exc)}")
    print("\n Полный Traceback:")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "exception_type": type(exc).__name__,
            "exception_msg": str(exc),
            "traceback": traceback.format_exc()
        }
    )

# Обработчик для ошибок валидации Pydantic/FastAPI (422)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        # Преобразуем msg, если это объект Exception
        msg = err.get('msg')
        if isinstance(msg, Exception):
            msg = str(msg)
        clean_err = {
            "loc": err.get('loc'),
            "msg": msg,
            "type": err.get('type')
        }
        errors.append(clean_err)
    return JSONResponse(
        status_code=422,
        content={"detail": errors}
    )

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(subjects.router)
app.include_router(grades.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(schedule.router)
app.include_router(homeworks.router)
app.include_router(lesson_grades.router)
app.include_router(attendance.router)
app.include_router(calendar.router)

@app.get("/", tags=["root"])
async def root():
    return {
        "message": "KipMini",
        "version": "1.0.0",
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        },
        "available_endpoints": [
            {"method": "GET", "path": "/students", "description": "Получить всех студентов"},
            {"method": "POST", "path": "/students", "description": "Создать нового студента"},
            {"method": "GET", "path": "/students/{id}", "description": "Получить студента по ID"},
            {"method": "GET", "path": "/students/search/by-name", "description": "Поиск студента по имени"},
            {"method": "PUT", "path": "/students/{id}", "description": "Полностью обновить студента"},
            {"method": "PATCH", "path": "/students/{id}", "description": "Частично обновить студента"},
            {"method": "DELETE", "path": "/students/{id}", "description": "Удалить студента"}
        ]
    }

if __name__ == "__main__":
    logging.basicConfig()
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    logging.getLogger('fastapi').setLevel(logging.DEBUG)
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )