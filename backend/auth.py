from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from backend.shemas import UserResponse
from backend.database import async_session_factory
from backend.crud import get_user_by_id, get_student_by_user_id, get_student_group_id, check_teacher_permission
from .config import settings


SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def safe_verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("Password too long (max 72 bytes)")
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        password_bytes = password.encode("utf-8")[:72]
        password = password_bytes.decode("utf-8", errors="ignore")
    return pwd_context.hash(password)


# Работа с JWT
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
        token: str = Depends(oauth2_scheme),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        async with async_session_factory() as session:
            user = await get_user_by_id(session, int(user_id))
        if user is None:
            raise credentials_exception

        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            is_active=user.is_active,
            role=user.role
        )
    except JWTError:
        raise credentials_exception


async def get_current_admin(
        current_user: UserResponse = Depends(get_current_user)
) -> UserResponse:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуются права администратора"
        )
    return current_user


async def get_current_student(
        current_user: UserResponse = Depends(get_current_user)
):
    async with async_session_factory() as session:
        student = await get_student_by_user_id(session, current_user.id)

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль студента не найден. Возможно, вы не привязаны к студенту."
        )

    return student

async def get_current_teacher(
    current_user: UserResponse = Depends(get_current_user)
) -> UserResponse:
    """Проверка, что текущий пользователь - преподаватель"""
    print(f"DEBUG: Current user role: {current_user.role}")

    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуются права преподавателя"
        )
    return current_user

async def get_current_teacher_or_admin(
    current_user: UserResponse = Depends(get_current_user)
) -> UserResponse:
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуются права преподавателя или администратора"
        )
    return current_user



# ======== ФУНКЦИЯ УСТАРЕЛА В НЕ ИСПОЛЬЗУЕТСЯ ПОСЛЕ ПРОВЕРКИ УДАЛИТЬ =======

async def check_teacher_permission_for_grade(
    teacher_id: int,
    student_id: int,
    subject_id: int,
):
    async with async_session_factory() as session:
        group_id = await get_student_group_id(session, student_id)
    if not group_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Студент не привязан к группе"
        )
    has_permission = await check_teacher_permission(
        teacher_id=teacher_id,
        subject_id=subject_id,
        group_id=group_id
    )
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Преподаватель не ведет этот предмет в группе студента"
        )
    return True