from typing import List, Optional

from fastapi import APIRouter, status, HTTPException, Query, Depends

from backend.crud import insert_student, get_all_students, get_student_by_id, get_student_by_name_basic,\
get_student_by_name_with_grades, replace_student_by_id, update_student, delete_student_by_id, \
get_grades_by_student_id, get_student_semester_grades, get_student_semester_journal
from backend.shemas import UserResponse, StudentResponse, StudentCreate, StudentDetailResponse, StudentUpdate, \
GradeWithSubjectInfo, StudentSemesterGradesResponse
from backend.auth import get_current_admin, get_current_user, get_current_student
from backend.database import get_session
from backend.models import User

from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Student"],)


@router.post("/students/",
         response_model=StudentResponse,
         status_code=status.HTTP_201_CREATED,
         summary="Создать нового студента (Админ)",
         description="Создает нового студента с указанными данными. Все оценки должны быть от 2 до 5.",)
async def create_student(student: StudentCreate, session: AsyncSession = Depends(get_session), current_user: UserResponse = Depends(get_current_admin)):
    student_data = await insert_student(
        session,
        first_name=student.first_name,
        last_name=student.last_name,
        group_id=student.group_id,
        user_id=student.user_id,
    )
    if not student_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при создании студента")
    return student_data

@router.get("/students/",
        response_model=List[StudentResponse],
        summary="Получить всех студентов (Админ)",
        description="Возвращает всех студентов при помощи пагинации.")

async def read_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin)
):
    students = await get_all_students(session, skip=skip, limit=limit)
    return students

@router.get("/students/{student_id}",
         response_model=StudentResponse,
         summary="Получить студента по ID (Админ)",
         description="Возвращает информацию о студенте по его ID.")
async def read_student(
        student_id: int,
        session: AsyncSession = Depends(get_session),
        current_user: UserResponse = Depends(get_current_admin)
):
    student = await get_student_by_id(session, student_id,)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Студент с ID {student_id} не найден"
        )
    return student

@router.get("/students/search/by-name",
         response_model=List[StudentResponse],
         summary="Найти студента по имени (Админ)",
         description="Поиск студента по точному совпадению имени.")
async def search_students_by_name(
    name: str = Query(..., min_length=3, description="Имя студента для поиска"),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    students = await get_student_by_name_basic(session, name)
    if not students:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Студент с именем {name} не найден"
        )
    return students

@router.get("/admins/students/search/by-name",
         response_model=List[StudentDetailResponse],
         summary="Найти студента по имени детально (Админ)",
         description="Поиск студента по имени. Возвращает полную информацию с оценками. Только для администраторов.")
async def search_students_by_name_detailed(
        name: str = Query(..., min_length=3, description="Имя студента для поиска"),
        session: AsyncSession = Depends(get_session),
        current_user: UserResponse = Depends(get_current_admin)
):
    students = await get_student_by_name_with_grades(session, name)
    if not students:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Студент с именем {name} не найден"
        )
    return students


@router.put("/students/{student_id}",
         response_model=StudentResponse,
         summary="Полностью обновить студента (Админ)",
         description="Полностью обновить студента все поля обязательны.")
async def update_student_fully(
    student_id: int,
    student_update: StudentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    if student_update.first_name is None or student_update.last_name is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Для полного обновления необходимо указать имя и фамилию"
        )
    updated = await replace_student_by_id(
        session,
        student_id=student_id,
        first_name=student_update.first_name,
        last_name=student_update.last_name,
        group_id=student_update.group_id
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Студент с ID {student_id} не найден"
        )
    updated_student = await get_student_by_id(session, student_id)
    if not updated_student:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Данные обновлены, но произошла ошибка при их получении"
        )
    return updated_student

@router.patch("/students/{student_id}",
           response_model=StudentResponse,
           summary="Частично обонволяет студента (Админ)",
           description="Обновляет только указанные поля студента..")
async def update_student_partially(
    student_id: int,
    student_update: StudentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    updated_data = student_update.dict(exclude_unset=True)
    if not updated_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нет данных для обновления"
        )
    updated = await update_student(
        session,
        student_id=student_id,
        **updated_data
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Студент с Id {student_id} не найден"
        )
    updated_student = await get_student_by_id(session, student_id)
    return updated_student

@router.delete("/students/{student_id}",
            status_code=status.HTTP_204_NO_CONTENT,
            summary="Удалить студента (Админ)",
            description="Удаляет студента и все связанные с ним данные.")
async def delete_student(
    student_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    deleted = await delete_student_by_id(session, student_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Студент с Id {student_id} не найден"
        )


@router.get("/student/me",
         response_model=StudentResponse,
         summary="Получить свой профиль студента (Студент)")
async def get_my_student_profile(
    current_student: dict = Depends(get_current_student)
):
    return current_student

@router.get("/student/my-grades",
         response_model=List[GradeWithSubjectInfo],
         summary="Получить все свои оценки (Студент)")
async def get_my_grades(
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    grades = await get_grades_by_student_id(session, current_student["id"])
    return grades

@router.get("/student/my-semester-grades",
         response_model=StudentSemesterGradesResponse,
         summary="Получить свои оценки за семестр (Студент)")
async def get_my_semester_grades(
    semester: int = Query(..., ge=1, le=2, description="Семестр (1 или 2)"),
    academic_year: int = Query(..., ge=2000, le=2100, description="Учебный год"),
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    result = await get_student_semester_grades(
        session,
        student_id=current_student["id"],
        semester=semester,
        academic_year=academic_year
    )
    return result


@router.get("/student/my-semester-journal",
            response_model=dict,
            summary="Получить журнал успеваемости студента за семестр (с возможностью фильтрации по предмету)")
async def get_my_semester_journal(
    semester: int = Query(..., ge=1, le=2, description="Семестр (1 или 2)"),
    academic_year: int = Query(..., ge=2000, le=2100, description="Учебный год"),
    subject_id: Optional[int] = Query(None, description="ID предмета (если не указан, возвращаются все занятия)"),
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student["id"]
    try:
        journal = await get_student_semester_journal(
            session,
            student_id=student_id,
            semester=semester,
            academic_year=academic_year,
            subject_id=subject_id
        )
        return journal
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")