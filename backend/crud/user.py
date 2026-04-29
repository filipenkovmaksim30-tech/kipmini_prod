from typing import Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import User, Student
from backend.shemas import UserResponse

async def get_users_with_filter(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    search: Optional[str] = None
):
    """Получить пользователей с фильтрацией"""
    query = select(User)

    if role and role != "all":
        query = query.where(User.role == role)

    if search:
        query = query.where(
            or_(
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%")
            )
        )

    query = query.order_by(User.id.desc())

    if skip > 0:
        query = query.offset(skip)
    if limit > 0:
        query = query.limit(limit)

    result = await session.execute(query)
    users = result.scalars().all()

    return [
        {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "is_active": user.is_active,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None
        } for user in users
    ]

async def update_user_role(
    session: AsyncSession,
    user_id: int,
    new_role: str
):
    """Обновить роль пользователя"""
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError(f"Пользователь с ID {user_id} не найден")

    valid_roles = ["user", "student", "teacher", "admin"]
    if new_role not in valid_roles:
        raise ValueError(f"Недопустимая роль. Допустимые: {valid_roles}")

    old_role = user.role
    user.role = new_role

    # Если новая роль - "student", создаем запись в таблице students
    if new_role == "student":
        existing_student = await session.execute(
            select(Student).where(Student.user_id == user_id)
        )
        if not existing_student.scalar_one_or_none():
            student = Student(
                first_name=user.username,
                last_name="",
                user_id=user_id,
                group_id=None
            )
            session.add(student)

    # Если старая роль была "student", а новая - нет, можно удалить запись студента
    elif old_role == "student" and new_role != "student":
        student_result = await session.execute(
            select(Student).where(Student.user_id == user_id)
        )
        student = student_result.scalar_one_or_none()
        if student:
            await session.delete(student)

    await session.commit()
    await session.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        role=user.role
    )

async def create_user(
    session: AsyncSession,
    email: str,
    username: str,
    password: str,
    role: str = "user"
):
    """Создать нового пользователя"""
    existing_user = await session.execute(
        select(User).where(
            (email == User.email) | (User.username == username)
        )
    )
    if existing_user.scalar_one_or_none():
        raise ValueError("Пользователь с таким email или username уже существует")

    from backend.auth import get_password_hash

    password_hash = get_password_hash(password)
    user = User(
        email=email,
        username=username,
        password_hash=password_hash,
        role=role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user.id

async def authenticate_user(
    session: AsyncSession,
    username: str,
    password: str
) -> Optional[User]:
    """Аутентификация пользователя"""
    result = await session.execute(
        select(User).where(username == User.username)
    )
    user = result.scalar_one_or_none()

    if not user:
        return None
    
    from backend.auth import safe_verify_password

    if not safe_verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None

    return user

async def get_user_by_id(
    session: AsyncSession,
    user_id: int
) -> Optional[User]:
    """Получить пользователя по ID"""
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()

async def change_user_password(
    session: AsyncSession,
    user_id: int,
    old_password: str,
    new_password: str
):
    """Смена пароля пользователем"""
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError("Пользователь не найден")

    from backend.auth import safe_verify_password, get_password_hash

    if not safe_verify_password(old_password, user.password_hash):
        raise ValueError("Неверный текущий пароль")

    user.password_hash = get_password_hash(new_password)

    await session.commit()

    return {
        "success": True,
        "message": "Пароль успешно изменен",
        "user_id": user.id
    }

async def change_user_email(
    session: AsyncSession,
    user_id: int,
    new_email: str
):
    user = await session.get(User, user_id)
    if not user:
        raise ValueError("Пользователь не найден")
    existing = await session.execute(
        select(User).where(User.email == new_email)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Email уже используется")
    user.email = new_email
    await session.commit()
    await session.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }



async def admin_reset_password(
    session: AsyncSession,
    user_id: int,
    new_password: str
):
    """Сброс пароля администратором"""
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError("Пользователь не найден")

    from backend.auth import get_password_hash

    user.password_hash = get_password_hash(new_password)
    await session.commit()

    return {"success": True, "message": f"Пароль для {user.email} сброшен"}

async def get_student_id_by_user_id(session: AsyncSession, user_id: int) -> Optional[int]:
    result = await session.execute(
        select(Student.id).where(Student.user_id == user_id)
    )
    return result.scalar_one_or_none()