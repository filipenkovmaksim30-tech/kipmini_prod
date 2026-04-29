from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Student, Grade, Subject

async def create_grade(
    session: AsyncSession,
    student_id: int,
    subject_id: int,
    grade: int,
    semester: int,
    academic_year: int
):
    student = await session.get(Student, student_id)
    if not student:
        raise ValueError(f"Студент с ID {student_id} не найден")

    subject = await session.get(Subject, subject_id)
    if not subject:
        raise ValueError(f"Предмет с ID {subject_id} не найден")

    existing = await session.execute(
        select(Grade).where(
            Grade.student_id == student_id,
            Grade.subject_id == subject_id,
            Grade.semester == semester,
            Grade.academic_year == academic_year
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Оценка за этот семестр уже существует")

    new_grade = Grade(
        student_id=student_id,
        subject_id=subject_id,
        grade=grade,
        semester=semester,
        academic_year=academic_year,
    )
    session.add(new_grade)
    await session.commit()
    await session.refresh(new_grade)

    return {
        "id": new_grade.id,
        "student_id": new_grade.student_id,
        "subject_id": new_grade.subject_id,
        "grade": new_grade.grade,
        "semester": new_grade.semester,
        "academic_year": new_grade.academic_year,
        "date_assigned": new_grade.date_assigned
    }

async def update_grade(
    session: AsyncSession,
    grade_id: int,
    grade: int
):
    grade_obj = await session.get(Grade, grade_id)
    if not grade_obj:
        return None

    if grade is not None:
        grade_obj.grade = grade

    await session.commit()
    await session.refresh(grade_obj)

    return {
        "id": grade_obj.id,
        "student_id": grade_obj.student_id,
        "subject_id": grade_obj.subject_id,
        "grade": grade_obj.grade,
        "semester": grade_obj.semester,
        "academic_year": grade_obj.academic_year,
        "date_assigned": grade_obj.date_assigned
    }

async def get_grades_by_student_id(
    session: AsyncSession,
    student_id: int,
):
    query = (
        select(Grade, Subject.name, Subject.code)
        .join(Subject, Grade.subject_id == Subject.id)
        .where(Grade.student_id == student_id)
    )
    result = await session.execute(query)
    grades = []
    for grade, subject_name, subject_code in result.all():
        grades.append({
            "id": grade.id,
            "student_id": grade.student_id,
            "subject_id": grade.subject_id,
            "grade": grade.grade,
            "semester": grade.semester,
            "academic_year": grade.academic_year,
            "date_assigned": grade.date_assigned,
            "subject_name": subject_name,
            "subject_code": subject_code,
        })
    return grades

async def get_all_grades(
    session: AsyncSession,
    skip: 0,
    limit: 100
):
    query = (
        select(Grade, Student.first_name, Student.last_name, Subject.name)
        .join(Student, Grade.student_id == Student.id)
        .join(Subject, Grade.subject_id == Subject.id)
        .order_by(Grade.id)
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(query)
    grades_data = result.all()

    grades_list = []
    for grade, first_name, last_name, subject_name in grades_data:
        grades_list.append({
            "id": grade.id,
            "student_id": grade.student_id,
            "student_name": f"{first_name} {last_name}",
            "subject_id": grade.subject_id,
            "subject_name": subject_name,
            "grade": grade.grade,
            "semester": grade.semester,
            "academic_year": grade.academic_year,
            "date_assigned": grade.date_assigned
        })
    return grades_list

async def get_grade_info(
    session: AsyncSession,
    grade_id: int
):
    grade = await session.get(Grade, grade_id)
    if not grade:
        return None
    return {
        "id": grade.id,
        "student_id": grade.student_id,
        "subject_id": grade.subject_id,
        "grade": grade.grade,
        "semester": grade.semester,
        "academic_year": grade.academic_year
    }

async def get_student_semester_grades(
    session: AsyncSession,
    student_id: int,
    semester: int,
    academic_year: int
):
    student = await session.get(Student, student_id)
    if not student:
        return None

    query = (
        select(Grade, Subject.name, Subject.code)
        .join(Subject, Grade.subject_id == Subject.id)
        .where(
            Grade.student_id == student_id,
            Grade.semester == semester,
            Grade.academic_year == academic_year,
        )
        .order_by(Subject.id)
    )
    result = await session.execute(query)

    grades = []
    for grade, subject_name, subject_code in result.all():
        grades.append({
            "id": grade.id,
            "subject_id": grade.subject_id,
            "subject_name": subject_name,
            "subject_code": subject_code,
            "grade": grade.grade,
            "date_assigned": grade.date_assigned,
        })
    return {
        "student_id": student_id,
        "semester": semester,
        "academic_year": academic_year,
        "grades": grades
    }