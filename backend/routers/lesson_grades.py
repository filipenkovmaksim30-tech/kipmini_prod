from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from backend.crud import get_teacher_id_by_user_id, get_student_group_id, get_schedule_by_id, \
create_lesson_grade, update_lesson_grade, delete_lesson_grade, get_lesson_grades_by_schedule, get_lesson_grades_for_student
from backend.shemas import UserResponse, LessonGradeCreate, LessonGradeUpdate, LessonGradeResponse
from backend.auth import get_current_teacher, get_current_student

router = APIRouter(tags=["Lesson Grades"])


@router.post("/lesson-grades/", response_model=LessonGradeResponse, status_code=201,
             summary="Выставить оценку студенту за занятие (Преподаватель)")
async def create_lesson_grade_endpoint(
    data: LessonGradeCreate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    try:
        result = await create_lesson_grade(
            session,
            teacher_id=teacher_id,
            student_id=data.student_id,
            schedule_id=data.schedule_id,
            grade=data.grade,
            grade_type=data.grade_type
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lesson-grades/schedule/{schedule_id}", response_model=List[LessonGradeResponse],
            summary="Получить все оценки занятия (Преподаватель)")
async def get_lesson_grades_by_schedule_endpoint(
    schedule_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    schedule = await get_schedule_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if schedule.get("teacher_id") != teacher_id:
        raise HTTPException(status_code=403, detail="Вы не ведёте это занятие")

    grades = await get_lesson_grades_by_schedule(session, schedule_id)
    return grades


@router.get("/lesson-grades/student/schedule/{schedule_id}", response_model=List[LessonGradeResponse],
            summary="Получить свои оценки за занятие (Студент)")
async def get_my_lesson_grades_endpoint(
    schedule_id: int,
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student["id"]
    group_id = await get_student_group_id(session, student_id)
    if not group_id:
        raise HTTPException(status_code=400, detail="Студент не привязан к группе")

    schedule = await get_schedule_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if schedule.get("group_id") != group_id:
        raise HTTPException(status_code=403, detail="У вас нет доступа к этому занятию")

    grades = await get_lesson_grades_for_student(session, student_id, schedule_id)
    return grades


@router.patch("/lesson-grades/{grade_id}", response_model=LessonGradeResponse,
              summary="Обновить оценку (Преподаватель)")
async def update_lesson_grade_endpoint(
    grade_id: int,
    data: LessonGradeUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    try:
        updated = await update_lesson_grade(
            session,
            grade_id=grade_id,
            teacher_id=teacher_id,
            grade=data.grade,
            grade_type=data.grade_type
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Запись не найдена")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/lesson-grades/{grade_id}", status_code=204,
               summary="Удалить оценку (Преподаватель)")
async def delete_lesson_grade_endpoint(
    grade_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    try:
        deleted = await delete_lesson_grade(session, grade_id, teacher_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Запись не найдена")
        return None
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))