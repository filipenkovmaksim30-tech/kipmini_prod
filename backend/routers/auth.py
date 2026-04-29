import os
import uuid
import shutil

from fastapi import APIRouter, status, HTTPException, Query, Depends, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.crud import create_user, get_user_by_id, authenticate_user, change_user_password, change_user_email
from backend.auth import create_access_token,  get_current_user, get_current_admin
from backend.database import get_session
from backend.shemas import UserResponse, UserCreate, Token, ChangePasswordRequest, ChangeEmailRequest, AdminResetPasswordRequest
from backend.models import User

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime


AVATAR_DIR = "uploads/avatar"
ALLOWED_AVATAR_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif'}
MAX_AVATAR_SIZE = 2 * 1024 * 1024

router = APIRouter(tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/auth/register",
          response_model=UserResponse,
          status_code=status.HTTP_201_CREATED,
          summary="Регистрация пользователей",
          description="Создаёт нового пользователя в системе")
@limiter.limit("7/minute")
async def register(request: Request, user_data: UserCreate, session: AsyncSession = Depends(get_session),):
    try:
        user_id = await create_user(
            session,
            email=user_data.email,
            username=user_data.username,
            password=user_data.password,
            role="user"
        )
        user = await get_user_by_id(session, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при создании пользователя",
            )
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            is_active=user.is_active,
            role=user.role
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/auth/login",
          response_model=Token,
          summary="Вход в систему",
          description="Аутентификация пользователя и получение JWT токена")
@limiter.limit("3/minute")
async def login(request: Request,form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session),):
    user = await authenticate_user(session, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }


@router.get("/auth/me",
         response_model=UserResponse,
         summary="Текущий пользователь",
         description="Получение информации о текущем аутентифицированном пользователе")
async def read_users_me(session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_user)):
    return current_user


@router.post("/auth/check-password",)
async def check_password_strength(password: str = Query(..., min_length=8)):
    password_bytes = password.encode("utf-8")
    byte_length = len(password_bytes)
    return {
        "password": password[:50] + "..." if len(password) > 50 else password,
        "character_length": len(password),
        "byte_length": byte_length,
        "is_safe": byte_length <= 72,
        "message": "Пароль безопасен" if byte_length <= 72
                  else f"Пароль слишком длинный ({byte_length} байт > 72 байт)",
        "bytes_per_character": byte_length / len(password) if password else 0
    }

@router.post("/auth/change-password",
          summary="Смена пароля",
          description="Позволяет пользователю сменить свой пароль")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    password_data: ChangePasswordRequest,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_user)
):
    result = await change_user_password(
        session,
        user_id=current_user.id,
        old_password=password_data.old_password,
        new_password=password_data.new_password,
    )
    return {
        "status": "success",
        "message": result["message"],
        "user_id": result["user_id"],
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.post("/auth/change-email", response_model=UserResponse, summary="Смена Почты")
async def change_email(
    data: ChangeEmailRequest,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_user)
):
    try:
        updated_user = await change_user_email(session, current_user.id, data.new_email)
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/admin/reset-password",
          summary="Сброс пароля администратором")
async def admin_reset_password(
    request: AdminResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    try:
        result = await admin_reset_password(
            session,
            user_id=request.user_id,
            new_password=request.new_password
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
@router.post("/auth/upload-avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Недопустимый тип файла. Разрешены: jpg, jpeg, png, gif")
    
    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="Размер файла не должен превышать 2 МБ")
    await file.seek(0)
    
    os.makedirs(AVATAR_DIR, exist_ok=True)
    
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(AVATAR_DIR, unique_name)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при сохранении файла")
    finally:
        await file.close()

    if current_user.avatar:
        old_path = current_user.avatar
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    user = await session.get(User, current_user.id)
    user.avatar = file_path
    await session.commit()
    await session.refresh(user)
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "avatar": user.avatar,
    }