from typing import Optional
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import LessonGrade, Schedule, Student, Subject


async def _format_lesson_grade(
    session: AsyncSession,
    grade_obj: LessonGrade,
    include_details: bool = True
):
    result = {
        "id": grade_obj.id,
        "student_id": grade_obj.student_id,
        "schedule_id": grade_obj.schedule_id,
        "grade_type": grade_obj.grade_type,
        "grade": grade_obj.grade,
        "created_at": grade_obj.created_at,
        "updated_at": grade_obj.updated_at,
        "student_name": None,
        "formatted_date": None,
        "subject_name": None,
    }

    if include_details:
        student = await session.get(Student, grade_obj.student_id)
        if student:
            result["student_name"] = f"{student.last_name} {student.first_name}"

        schedule = await session.get(Schedule, grade_obj.schedule_id)
        if schedule:
            result["formatted_date"] = f"{schedule.day:02d}.{schedule.month:02d}"
            subject = await session.get(Subject, schedule.subject_id)
            if subject:
                result["subject_name"] = subject.name

    return result


async def create_lesson_grade(
    session: AsyncSession,
    teacher_id: int,
    student_id: int,
    schedule_id: int,
    grade: int,
    grade_type: Optional[str] = None
):
    schedule = await session.get(Schedule, schedule_id)
    if not schedule:
        raise ValueError(f"Занятие с ID {schedule_id} не найдено")

    if schedule.teacher_id != teacher_id:
        raise ValueError("Вы не можете выставлять оценки для этого занятия")

    student = await session.get(Student, student_id)
    if not student:
        raise ValueError(f"Студент с ID {student_id} не найден")

    if student.group_id != schedule.group_id:
        raise ValueError("Студент не принадлежит к группе этого занятия")

    grade_obj = LessonGrade(
        student_id=student_id,
        schedule_id=schedule_id,
        grade_type=grade_type,
        grade=grade
    )
    session.add(grade_obj)
    await session.commit()
    await session.refresh(grade_obj)

    return await _format_lesson_grade(session, grade_obj)


async def get_lesson_grades_by_schedule(
    session: AsyncSession,
    schedule_id: int
):

    result = await session.execute(
        select(LessonGrade)
        .where(LessonGrade.schedule_id == schedule_id)
        .order_by(LessonGrade.student_id)
    )
    grades = result.scalars().all()
    return [await _format_lesson_grade(session, g) for g in grades]


async def get_lesson_grades_for_student(
    session: AsyncSession,
    student_id: int,
    schedule_id: int
):

    result = await session.execute(
        select(LessonGrade).where(
            LessonGrade.student_id == student_id,
            LessonGrade.schedule_id == schedule_id
        ).order_by(LessonGrade.created_at)
    )
    grades = result.scalars().all()
    return [await _format_lesson_grade(session, g) for g in grades]

async def update_lesson_grade(
    session: AsyncSession,
    grade_id: int,
    teacher_id: int,
    grade: Optional[int] = None,
    grade_type: Optional[str] = None
):

    grade_obj = await session.get(LessonGrade, grade_id)
    if not grade_obj:
        return None

    schedule = await session.get(Schedule, grade_obj.schedule_id)
    if not schedule:
        raise ValueError("Связанное занятие не найдено")

    if schedule.teacher_id != teacher_id:
        raise ValueError("Вы не можете редактировать эту оценку")

    if grade is not None:
        grade_obj.grade = grade
    if grade_type is not None:
        grade_obj.grade_type = grade_type

    grade_obj.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(grade_obj)

    return await _format_lesson_grade(session, grade_obj)



async def delete_lesson_grade(
    session: AsyncSession,
    grade_id: int,
    teacher_id: int
):

    grade_obj = await session.get(LessonGrade, grade_id)
    if not grade_obj:
        return False

    schedule = await session.get(Schedule, grade_obj.schedule_id)
    if not schedule:
        raise ValueError("Связанное занятие не найдено")

    if schedule.teacher_id != teacher_id:
        raise ValueError("Вы не можете удалить эту оценку")

    await session.delete(grade_obj)
    await session.commit()
    return True