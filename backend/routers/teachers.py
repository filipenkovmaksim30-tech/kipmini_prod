from typing import List, Dict

from fastapi import APIRouter, status, HTTPException, Depends, Query

from backend.crud import create_teacher, get_all_teachers, update_teacher, assign_teacher_to_subject_group, \
get_teacher_subjects_and_groups, get_teachers_by_subject_and_group, get_teacher_id_by_user_id, get_grades_by_student_id_for_teacher, \
get_teacher_by_user_id_with_details, get_all_grades_for_teacher
from backend.shemas import UserResponse, TeacherResponse, TeacherCreate, TeacherUpdate, TeacherSubjectGroupResponse,\
TeacherSubjectGroupCreate, TeacherAssignmentResponse, TeacherSimpleResponse, GradeWithSubjectInfo

from backend.auth import get_current_admin, get_current_teacher_or_admin, get_current_teacher
from backend.database import get_session
from backend.models import TeacherSubjectGroup, Student, Schedule, LessonGrade, Subject, Attendance

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter(tags=["Teachers"],)

@router.post("/teachers/",
          response_model=TeacherResponse,
          status_code=status.HTTP_201_CREATED,
          summary="Создать профиль преподавателя (Админ)",
          description="Создает профиль преподавателя с ФИО")
async def create_teacher_endpoint(
    teacher: TeacherCreate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    try:
        teacher_data = await create_teacher(
            session,
            user_id=teacher.user_id,
            first_name=teacher.first_name,
            last_name=teacher.last_name,
            patronymic=teacher.patronymic
        )
        return teacher_data
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


@router.get("/teachers/",
         response_model=List[TeacherResponse],
         summary="Получить всех преподавателей (Админ)",
         description="Возвращает список всех преподавателей с ФИО")
async def read_all_teachers(
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    teachers = await get_all_teachers(session)
    return teachers

@router.post("/teacher/assign-subject-group",
          response_model=TeacherSubjectGroupResponse,
          status_code=status.HTTP_201_CREATED,
          summary="Назначить преподавателя на предмет в группе (Админ)",
          description="Привязывает преподавателя к предмету и группе")
async def assign_teacher_to_subject_group_endpoint(
    assignment: TeacherSubjectGroupCreate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    try:
        assignment_data = await assign_teacher_to_subject_group(
            session,
            teacher_id=assignment.teacher_id,
            subject_id=assignment.subject_id,
            group_id=assignment.group_id
        )
        return assignment_data
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

@router.patch("/teachers/{teacher_id}",
           response_model=TeacherResponse,
           summary="Обновить данные преподавателя (Админ)",
           description="Обновляет данные преподавателя (ФИО). Только для администраторов.")
async def update_teacher_endpoint(
    teacher_id: int,
    teacher_update: TeacherUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    try:
        update_data = teacher_update.dict(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нет данных для обновления"
            )

        updated_teacher = await update_teacher(session, teacher_id, **update_data)

        if not updated_teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Преподаватель с ID {teacher_id} не найден"
            )

        return updated_teacher

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/teacher/{teacher_id}/assignments",
         response_model=List[TeacherAssignmentResponse],
         summary="Получить предметы и группы преподавателя (Админ/Преподаватель)",
         description="Возвращает все предметы и группы, которые ведет преподаватель")
async def get_teacher_assignments(
        teacher_id: int,
        session: AsyncSession = Depends(get_session),
        current_user: UserResponse = Depends(get_current_teacher_or_admin)
):
    if current_user.role == "teacher" and current_user.id == teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы можете просматривать только свои назначения"
        )
    assignments = await get_teacher_subjects_and_groups(session, teacher_id)
    return assignments

@router.get("/subjects/{subject_id}/groups/{group_id}/teachers",
         response_model=List[TeacherSimpleResponse],
         summary="Получить преподавателей предмета в группе (Админ)",
         description="Возвращает всех преподавателей, ведущих предмет в группе")
async def get_teachers_for_subject_group(
    subject_id: int,
    group_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    teachers = await get_teachers_by_subject_and_group(session, subject_id, group_id)
    if not teachers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Для предмета ID {subject_id} в группе ID {group_id} не найдены преподаватели"
        )
    return teachers

@router.get("/teacher/students/{student_id}/grades",
         response_model=List[GradeWithSubjectInfo],
         summary="Получить оценки студента (Преподаватель)",
         description="Возвращает оценки указанного студента только по предметам, которые ведёт текущий преподаватель")
async def get_student_grades_for_teacher(
    student_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=404, detail="Профиль преподавателя не найден")

    grades = await get_grades_by_student_id_for_teacher(
        session,
        student_id=student_id,
        teacher_id=teacher_id
    )
    return grades


@router.get("/teacher/my-profile",
         response_model=dict,
         summary="Получить свой профиль преподавателя (Преподаватель)",
         description="Возвращает профиль текущего преподавателя с назначениями")
async def get_my_teacher_profile(
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher_or_admin)
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только для преподавателей"
        )

    teacher = await get_teacher_by_user_id_with_details(session, current_user.id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль преподавателя не найден"
        )
    return teacher

@router.get("/teacher/my-grades",
         response_model=List[GradeWithSubjectInfo],
         summary="Получить мои оценки (Преподаватель)",
         description="Возвращает все оценки, выставленные текущим преподавателем")
async def get_my_teacher_grades(
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль преподавателя не найден"
        )

    grades = await get_all_grades_for_teacher(session, teacher_id)
    return grades


@router.get("/teacher/group/{group_id}/journal")
async def get_group_journal(
    group_id: int,
    semester: int = Query(..., ge=1, le=2, description="Семестр (1 или 2)"),
    academic_year: int = Query(..., description="Учебный год (например, 2024)"),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher_or_admin)
):
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    teacher_id = None
    if current_user.role == "teacher":
        teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
        if not teacher_id:
            raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")
       
    students_query = select(Student).where(Student.group_id == group_id).order_by(Student.last_name, Student.first_name)
    students_result = await session.execute(students_query)
    students = students_result.scalars().all()

    schedules_query = select(Schedule).where(
        Schedule.group_id == group_id,
        Schedule.academic_year == academic_year,
        Schedule.is_active == True
    ).order_by(Schedule.month, Schedule.day, Schedule.start_time)
    schedules_result = await session.execute(schedules_query)
    all_schedules = schedules_result.scalars().all()

    lessons = []
    for sch in all_schedules:
        if semester == 1:
            if sch.month in [9, 10, 11, 12] and not (sch.month == 12 and sch.day > 27):
                lessons.append(sch)
        else:  
            if sch.month in [1, 2, 3, 4, 5, 6] and not (sch.month == 1 and sch.day < 13):
                lessons.append(sch)

    subject_ids = {sch.subject_id for sch in lessons if sch.subject_id}
    subjects_map = {}
    if subject_ids:
        subjects_query = select(Subject).where(Subject.id.in_(subject_ids))
        subjects_result = await session.execute(subjects_query)
        subjects = subjects_result.scalars().all()
        subjects_map = {s.id: s.name for s in subjects}

    schedule_ids = [sch.id for sch in lessons]
    grades_query = select(LessonGrade).where(LessonGrade.schedule_id.in_(schedule_ids))
    grades_result = await session.execute(grades_query)
    grades = grades_result.scalars().all()


    grades_by_schedule: Dict[int, List[Dict]] = {}
    for g in grades:
        grades_by_schedule.setdefault(g.schedule_id, []).append({
            "student_id": g.student_id,
            "grade": g.grade,
            "grade_type": g.grade_type
        })

    attendance_query = select(Attendance).where(Attendance.schedule_id.in_(schedule_ids))
    attendance_result = await session.execute(attendance_query)
    attendance_records = attendance_result.scalars().all()

    attendance_by_schedule: Dict[int, List[Dict]] = {}
    for a in attendance_records:
        attendance_by_schedule.setdefault(a.schedule_id, []).append({
            "student_id": a.student_id,
            "status": a.status
        })

    response = {
        "students": [
            {"id": s.id, "first_name": s.first_name, "last_name": s.last_name}
            for s in students
        ],
        "lessons": [
            {
                "id": sch.id,
                "date": f"{sch.day:02d}.{sch.month:02d}",
                "subject_id": sch.subject_id,
                "subject_name": subjects_map.get(sch.subject_id, "Неизвестно")
            }
            for sch in lessons
        ],
        "grades": grades_by_schedule,
        "attendance": attendance_by_schedule
    }

    return response