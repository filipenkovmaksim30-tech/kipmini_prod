from typing import List

from fastapi import APIRouter, status, HTTPException, Depends

from backend.crud import create_subject, get_all_subject, get_subject_by_id, update_subject, delete_subject
from backend.shemas import SubjectResponse, SubjectCreate, SubjectUpdate, UserResponse
from backend.auth import get_current_admin
from backend.database import get_session

from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Subjects"],)

@router.post("/subjects/",
          response_model=SubjectResponse,
          status_code=status.HTTP_201_CREATED,
          summary="Создать новый предмет (Админ)",
          description="Создает новый учебный предмет в системе")
async def create_subject_crud(subject: SubjectCreate, session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_admin)):
    try:
        subject_data = await create_subject(
            session,
            name=subject.name,
            code=subject.code,
            description=subject.description
        )
        return subject_data
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

@router.get("/subjects/",
         response_model=List[SubjectResponse],
         summary="Получить все предметы (Админ)",
         description="Возвращает все предметы")
async def get_all_subjects(session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_admin)):
    subjects = await get_all_subject(session)
    return subjects

@router.get("/subjects/{subject_id}",
         response_model=SubjectResponse,
         summary="Получить предмет по ID (Админ)",
         description="Возвращает предмет по его ID")
async def read_subject_by_id(subject_id: int,session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_admin)):
    subject = await get_subject_by_id(session, subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Предмет с ID {subject_id} не найден")
    return subject

@router.patch("/subjects/{subject_id}",
           response_model=SubjectResponse,
           summary="Обновить предмет (Админ)",
           description="Обновляет данные предмета (название, код, описание)")
async def update_subject_crud(
    subject_id: int,
    subject_update: SubjectUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    try:
        update_data = subject_update.dict(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нет данных для обновления"
            )

        updated_subject = await update_subject(
            session,
            subject_id=subject_id,
            **update_data
        )

        if not updated_subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Предмет с ID {subject_id} не найден"
            )

        return updated_subject
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении предмета: {str(e)}"
        )

@router.delete("/subjects/{subject_id}",
            status_code=status.HTTP_204_NO_CONTENT,
            summary="Удалить предмет (Админ)",
            description="Удаляет предмет и все связанные данные (оценки, расписание)")
async def delete_subject_crud(subject_id: int,session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_admin)):
    deleted = await delete_subject(session, subject_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Предмет с ID {subject_id} не найден")
    return {"success": True, "message": "Запись удалена"}