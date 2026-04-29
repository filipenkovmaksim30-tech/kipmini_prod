from typing import List

from fastapi import APIRouter, status, HTTPException, Query, Depends

from backend.crud import create_grade, get_grade_info, update_grade, get_all_grades,\
check_teacher_permission_by_user_id, get_grades_by_student_id, get_student_semester_grades
from backend.shemas import UserResponse, GradeResponse, GradeCreate, GradeUpdate, GradeWithSubjectInfo, StudentSemesterGradesResponse
from backend.auth import get_current_teacher_or_admin, get_current_admin
from backend.database import get_session

from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(tags=["Grades"],)

@router.post("/grades/",
          response_model=GradeResponse,
          status_code=status.HTTP_201_CREATED,
          summary="Поставить оценку студенту (Админ/Преподаватель)",
          description="Создает новую оценку для студента по предмету")
async def create_grade_endpoint(
    grade: GradeCreate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher_or_admin)
):
    try:
        if current_user.role == "teacher":
            has_permission = await check_teacher_permission_by_user_id(
                session,
                user_id=current_user.id,
                subject_id=grade.subject_id,
                student_id=grade.student_id
            )

            if not has_permission:
                raise ValueError("Преподаватель не ведет этот предмет в группе студента")

        grade_data = await create_grade(
            session,
            student_id=grade.student_id,
            subject_id=grade.subject_id,
            grade=grade.grade,
            semester=grade.semester,
            academic_year=grade.academic_year
        )
        return grade_data
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


@router.patch("/grades/{grade_id}",
           response_model=GradeResponse,
           summary="Обновить оценку студенту (Админ/Преподаватель)",
           description="Обновляет только оценку (2-5)")
async def update_grade_endpoint(
    grade_id: int,
    grade: GradeUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher_or_admin)
):
    try:
        if current_user.role == "teacher":
            grade_info = await get_grade_info(session, grade_id)
            if not grade_info:
                raise HTTPException(status_code=404, detail=f"Оценка с ID {grade_id} не найдена")

            has_permission = await check_teacher_permission_by_user_id(
                session,
                user_id=current_user.id,
                subject_id=grade_info["subject_id"],
                student_id=grade_info["student_id"]
            )
            if not has_permission:
                raise HTTPException(status_code=403, detail="Преподаватель не ведет этот предмет в группе студента")

        update_data = grade.dict(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="Нет данных для обновления")

        updated_grade = await update_grade(session, grade_id=grade_id, **update_data)
        if not updated_grade:
            raise HTTPException(status_code=404, detail=f"Оценка с ID {grade_id} не найдена")
        return updated_grade
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/grades/",
         response_model=List[dict],
         summary="Получить все оценки (Админ)")
async def get_all_grades_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    grades = await get_all_grades(session,skip=skip, limit=limit)
    return grades

@router.get("/students/{student_id}/grades",
         response_model=List[GradeWithSubjectInfo],
         summary="Получить оценки студента (Админа)",
         description="Возвращает все оценки студента по его ID")
async def get_student_grades_endpoint(
    student_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    grades = await get_grades_by_student_id(session, student_id)
    return grades

# =========== ОЦЕНКИ ЗА СЕМЕСТР =================

@router.get("/students/{student_id}/grades/semester",
         response_model=StudentSemesterGradesResponse,
         summary="Получить оценки студента за семестер (Админ)",
         description="Возвращает все оценки студента за указанный семестр и учебный год")
async def get_student_semester_grades_endpoint(
        student_id: int,
        semester: int = Query(..., ge=1, le=2, description="Семестр (1 или 2)"),
        session: AsyncSession = Depends(get_session),
        academic_year: int = Query(..., ge=2000, le=2100, description="Учебный год"),
        current_user: UserResponse = Depends(get_current_admin)
):
    result = await get_student_semester_grades(session, student_id, semester, academic_year)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Студент с ID {student_id} не найден"
        )
    return result