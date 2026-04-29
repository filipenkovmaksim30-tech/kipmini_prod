from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from backend.models import Schedule, Student, Subject, LessonGrade

async def get_student_semester_journal(
    session: AsyncSession,
    student_id: int,
    semester: int,
    academic_year: int,
    subject_id: Optional[int] = None
):
    student = await session.get(Student, student_id)
    if not student or not student.group_id:
        raise ValueError("Студент не привязан к группе")
    group_id = student.group_id

    if semester == 1:
        months = [9, 10, 11, 12]
    else:
        months = [1, 2, 3, 4, 5, 6]

    # Базовый запрос для занятий
    query = (
        select(Schedule, Subject.name.label("subject_name"))
        .join(Subject, Schedule.subject_id == Subject.id)
        .where(
            Schedule.group_id == group_id,
            Schedule.academic_year == academic_year,
            Schedule.month.in_(months),
            Schedule.is_active == True
        )
    )
    # Фильтрация по предмету, если указан
    if subject_id is not None:
        query = query.where(Schedule.subject_id == subject_id)

    query = query.order_by(Schedule.month, Schedule.day, Schedule.start_time)
    result = await session.execute(query)
    rows = result.all()

    lessons = []
    schedule_ids = []
    for schedule, subject_name in rows:
        schedule_ids.append(schedule.id)
        lessons.append({
            "id": schedule.id,
            "date": f"{schedule.day:02d}.{schedule.month:02d}",
            "subject_name": subject_name,
            "subject_id": schedule.subject_id
        })

    # Загружаем оценки студента для этих занятий
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