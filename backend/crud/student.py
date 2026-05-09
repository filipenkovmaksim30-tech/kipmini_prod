from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, func
from backend.models import Student, Group, Subject, Grade, Schedule, LessonGrade

async def insert_student(
    session: AsyncSession,
    first_name: str,
    last_name: str,
    group_id: Optional[int] = None,
    user_id: Optional[int] = None,
):
    student = Student(
        first_name=first_name,
        last_name=last_name,
        group_id=group_id,
        user_id=user_id,
    )
    session.add(student)
    await session.flush()
    await session.commit()

    query = (
        select(Student, Group.name)
        .join(Group, Student.group_id == Group.id, isouter=True)
        .where(Student.id == student.id)
    )
    result = await session.execute(query)
    row = result.first()

    if not row:
        raise Exception("Студент не найден после создания")
    
    student_obj, group_name = row

    return {
        "first_name": student_obj.first_name,
        "last_name": student_obj.last_name,
        "group_id": student_obj.group_id,
        "group_name": group_name,
        "created_at": student_obj.created_at
    }

async def get_all_students(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100
):
    """Получить всех студентов с пагинацией и названиями групп"""
    query = (
        select(Student, Group.name)
        .join(Group, Student.group_id == Group.id, isouter=True)
        .order_by(Student.id)
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(query)
    students_data = result.all()

    student_list = []
    for student, group_name in students_data:
        student_list.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "group_id": student.group_id,
            "group_name": group_name,
            "user_id": student.user_id,
            "created_at": student.created_at
        })
    return student_list

async def get_student_by_id(
    session: AsyncSession,
    student_id: int
):
    """Получить студента по ID с названием группы"""
    query = (
        select(Student, Group.name)
        .join(Group, Student.group_id == Group.id, isouter=True)
        .where(Student.id == student_id)
    )
    result = await session.execute(query)
    row = result.first()
    if not row:
        return None
    student, group_name = row
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "group_id": student.group_id,
        "group_name": group_name,
        "user_id": student.user_id,
        "created_at": student.created_at
    }

async def get_student_by_name_basic(
    session: AsyncSession,
    student_name: str
):
    """Поиск студентов по имени (без оценок)"""
    query = (
        select(Student, Group.name)
        .join(Group, Student.group_id == Group.id, isouter=True)
        .where(
            or_(
                Student.first_name.ilike(f"%{student_name}%"),
                Student.last_name.ilike(f"%{student_name}%")
            )
        )
    )
    result = await session.execute(query)
    student_list = []
    for student, group_name in result.all():
        student_list.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "group_id": student.group_id,
            "group_name": group_name,
            "created_at": student.created_at
        })
    return student_list

async def get_student_by_name_with_grades(
    session: AsyncSession,
    name: str
):
    """Поиск студентов по имени с их оценками"""
    query = (
        select(Student, Group.name)
        .join(Group, Student.group_id == Group.id, isouter=True)
        .where(
            or_(
                Student.first_name.ilike(f"%{name}%"),
                Student.last_name.ilike(f"%{name}%")
            )
        )
    )
    result = await session.execute(query)
    student_list = []
    for student, group_name in result.all():
        # Получаем оценки студента
        grades_query = (
            select(Grade, Subject.name, Subject.code)
            .join(Subject, Grade.subject_id == Subject.id)
            .where(Grade.student_id == student.id)
        )
        grades_result = await session.execute(grades_query)
        grade_data = []
        for grade, subject_name, subject_code in grades_result.all():
            grade_data.append({
                "id": grade.id,
                "student_id": student.id,
                "subject_id": grade.subject_id,
                "subject_name": subject_name,
                "subject_code": subject_code,
                "grade": grade.grade,
                "semester": grade.semester,
                "academic_year": grade.academic_year,
                "date_assigned": grade.date_assigned
            })

        student_list.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "group_id": student.group_id,
            "group_name": group_name,
            "created_at": student.created_at,
            "grades": grade_data,
        })
    return student_list

async def delete_student_by_id(
    session: AsyncSession,
    student_id: int
) -> bool:
    await session.execute(
        delete(Grade).where(Grade.student_id == student_id)
    )
    result = await session.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if student:
        await session.delete(student)
        await session.commit()
        return True
    return False

async def update_student(
    session: AsyncSession,
    student_id: int,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    group_id: Optional[int] = None,
) -> bool:
    result = await session.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        return False
    if first_name is not None:
        student.first_name = first_name
    if last_name is not None:
        student.last_name = last_name
    if group_id is not None:
        student.group_id = group_id
    await session.commit()
    return True

async def replace_student_by_id(
    session: AsyncSession,
    student_id: int,
    first_name: str,
    last_name: str,
    group_id: Optional[int] = None,
) -> bool:
    result = await session.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        return False
    student.first_name = first_name
    student.last_name = last_name
    student.group_id = group_id
    await session.commit()
    return True

async def get_student_by_user_id(
    session: AsyncSession,
    user_id: int
):
    query = (
        select(Student, Group.name)
        .join(Group, Student.group_id == Group.id, isouter=True)
        .where(Student.user_id == user_id)
    )
    result = await session.execute(query)
    row = result.first()
    if not row:
        return None
    student, group_name = row
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "group_id": student.group_id,
        "group_name": group_name,
        "user_id": student.user_id,
        "created_at": student.created_at
    }

async def get_student_group_id(
    session: AsyncSession,
    student_id: int
) -> Optional[int]:
    result = await session.execute(
        select(Student.group_id).where(Student.id == student_id)
    )
    return result.scalar_one_or_none()


async def get_student_semester_journal(
    session: AsyncSession,
    student_id: int,
    semester: int,
    academic_year: int
):
    student = await session.get(Student, student_id)
    if not student or not student.group_id:
        raise ValueError("Студент не привязан к группе")
    group_id = student.group_id

    if semester == 1:
        months = [9, 10, 11, 12]
    else:
        months = [1, 2, 3, 4, 5, 6]


    schedules_query = (
        select(Schedule, Subject.name.label("subject_name"))
        .join(Subject, Schedule.subject_id == Subject.id)
        .where(
            Schedule.group_id == group_id,
            Schedule.academic_year == academic_year,
            Schedule.month.in_(months),
            Schedule.is_active == True
        )
        .order_by(Schedule.month, Schedule.day, Schedule.start_time)
    )
    schedules_result = await session.execute(schedules_query)
    lessons = []
    schedule_ids = []
    for schedule, subject_name in schedules_result.all():
        schedule_ids.append(schedule.id)
        lessons.append({
            "id": schedule.id,
            "date": f"{schedule.day:02d}.{schedule.month:02d}",
            "subject_name": subject_name,
            "subject_id": schedule.subject_id
        })

    grades = []
    if schedule_ids:
        grades_result = await session.execute(
            select(LessonGrade)
            .where(
                LessonGrade.student_id == student_id,
                LessonGrade.schedule_id.in_(schedule_ids)
            )
        )
        for grade in grades_result.scalars().all():
            grades.append({
                "schedule_id": grade.schedule_id,
                "grade": grade.grade,
                "grade_type": grade.grade_type
            })

    return {
        "lessons": lessons,
        "grades": grades
    }