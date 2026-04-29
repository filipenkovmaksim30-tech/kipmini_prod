from typing import List

from fastapi import Depends, HTTPException, status, Query, APIRouter

from backend.crud import create_group, get_all_groups, get_group_by_id, get_group_by_name, get_students_by_group_name, update_group
from backend.shemas import GroupCreate, GroupResponse, UserResponse, StudentResponse, GroupUpdate
from backend.auth import get_current_admin, get_current_teacher_or_admin
from backend.database import get_session

from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Groups"])

@router.post("/groups/",
          response_model=GroupResponse,
          status_code=status.HTTP_201_CREATED,
          summary="Создать новую группу (Админ)",
          description="Создает новую группу с указанными данными")
async def create_group_endpoint(group: GroupCreate, session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_admin)):
    group_data = await create_group(
        session,
        name=group.name,
        course=group.course,
    )
    if not group_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при создании группы"
        )
    return group_data



@router.get("/groups/",
         response_model=List[GroupResponse],
         status_code=status.HTTP_200_OK,
         summary="Получить все группы (Админ)",
         description="Возвращает список всех учебных групп")
async def read_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    groups = await get_all_groups(session, skip=skip, limit=limit)
    return groups

@router.get("/groups/{group_id}",
         response_model=GroupResponse,
         summary="Получить группу по ID (Админ)",
         description="Возвращает Группу по ID")
async def read_group_by_id(group_id: int,session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_admin)):
    group = await get_group_by_id(session, group_id)
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Группа с ID {group_id} не найдена"
        )
    return group

@router.get("/groups/by-name/{group_name}",
         response_model=GroupResponse,
         summary="Получить группу по ее имени (Админ)",
         description="Возвращает группу по ее имени")
async def read_group_by_name(group_name: str, session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_admin)):
    group = await get_group_by_name(session, group_name)
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Группа с названием '{group_name}' не найдена"
        )
    return group

@router.get("/groups/{group_name}/students",
         response_model=List[StudentResponse],
         summary="Получить студентов группы (Админ/Преподаватель)",
         description="Возвращает всех студентов группы")
async def read_group_students(group_name: str, session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_teacher_or_admin)):
    students = await get_students_by_group_name(session, group_name)
    if not students:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Группа '{group_name}' не найдена или в ней нет студентов"
        )
    return students

@router.patch("/groups/{group_id}",
           response_model=GroupResponse,
           summary="Обновить группу (Админ)",
           description="Обновляет название и/или курс группы")
async def update_group_endpoint(
        group_id: int,
        group_update: GroupUpdate,
        session: AsyncSession = Depends(get_session),
        current_user: UserResponse = Depends(get_current_admin),
):
    try:
        update_data = group_update.dict(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нет данных для обновления"
            )
        updated_group = await update_group(
            session,
            group_id=group_id,
            **update_data
        )

        if not updated_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Группа с ID {group_id} не найдена"
            )

        return updated_group

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )