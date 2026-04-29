from typing import Optional

from fastapi import APIRouter, Depends,  status, HTTPException, Query, Depends

from backend.crud import get_users_with_filter, update_user_role
from backend.shemas import UserListResponse, UserResponse, UserUpdateRole
from backend.auth import get_current_admin
from backend.database import get_session
from backend.models import User

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Admin"])

@router.get("/admin/users",
         response_model=UserListResponse,
         summary="Получить список пользователей")
async def get_users(
        role: Optional[str] = Query(None, description="Фильтр по роли"),
        search: Optional[str] = Query(None, description="Поиск по email или username"),
        page: Optional[int] = Query(None, description="Номер страницы"),
        limit: Optional[int] = Query(None, ge=1, le=1000, description="Количество записей"),
        session: AsyncSession = Depends(get_session),
        current_user: UserResponse = Depends(get_current_admin)
):
    try:
        page = page if page is not None else 1
        limit = limit if limit is not None else 20

        skip = (page - 1) * limit

        print(f"DEBUG: Получение пользователей. Роль: {role}, Поиск: {search}, Страница: {page}, Лимит: {limit}")

        users = await get_users_with_filter(
            session,
            skip=skip,
            limit=limit,
            role=role,
            search=search
        )

        print(f"DEBUG: Найдено пользователей: {len(users)}")

        count_query = select(func.count(User.id))
        if role and role != "all":
            count_query = count_query.where(User.role == role)
        if search:
            count_query = count_query.where(
                or_(
                    User.email.ilike(f"%{search}%"),
                    User.username.ilike(f"%{search}%")
                )
            )
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0

        print(f"DEBUG: Всего пользователей в БД: {total}")

        return {
            "users": users,
            "total": total,
            "page": page,
            "limit": limit
        }

    except Exception as e:
        print(f"Ошибка в /admin/users: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении пользователей: {str(e)}"
        )

@router.patch("/admin/users/{user_id}/role",
           response_model=UserResponse,
           summary="Изменить роль пользователя",
           description="Изменение роли пользователя администратором")
async def update_user_role_endpoint(
        user_id: int,
        role_data: UserUpdateRole,
        session: AsyncSession = Depends(get_session),
        current_user: UserResponse = Depends(get_current_admin)
):
    try:
        updated_user = await update_user_role(
            session,
            user_id=user_id,
            new_role=role_data.role
        )
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении роли: {str(e)}"
        )
