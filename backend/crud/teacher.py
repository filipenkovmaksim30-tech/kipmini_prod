from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import User, Teacher, Subject, Group, TeacherSubjectGroup, Student, Grade

async def create_teacher(
    session: AsyncSession,
    user_id: int,
    first_name: str,
    last_name: str,
    patronymic: str
):
    user_result = await session.execute(
        select(User).where(User.id == user_id, User.role == "teacher")
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise ValueError("Пользователь не найден или не является преподавателем")

    existing = await session.execute(
        select(Teacher).where(Teacher.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Профиль преподавателя уже существует для этого пользователя")

    teacher = Teacher(
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        patronymic=patronymic
    )
    session.add(teacher)
    await session.commit()
    await session.refresh(teacher)

    full_name = f"{last_name} {first_name} {patronymic}"
    return {
        "id": teacher.id,
        "user_id": teacher.user_id,
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "patronymic": teacher.patronymic,
        "full_name": full_name,
        "created_at": teacher.created_at
    }


async def update_teacher(
    session: AsyncSession,
    teacher_id: int,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    patronymic: Optional[str] = None,
):
    teacher = await session.get(Teacher, teacher_id)
    if not teacher:
        return None

    if first_name is not None:
        teacher.first_name = first_name
    if last_name is not None:
        teacher.last_name = last_name
    if patronymic is not None:
        teacher.patronymic = patronymic

    await session.commit()
    await session.refresh(teacher)

    full_name = f"{teacher.last_name} {teacher.first_name} {teacher.patronymic}"
    return {
        "id": teacher.id,
        "user_id": teacher.user_id,
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "patronymic": teacher.patronymic,
        "full_name": full_name,
        "created_at": teacher.created_at
    }


async def get_teacher_by_id(session: AsyncSession, teacher_id: int):
    teacher = await session.get(Teacher, teacher_id)
    if not teacher:
        return None
    full_name = f"{teacher.last_name} {teacher.first_name} {teacher.patronymic}"
    return {
        "id": teacher.id,
        "user_id": teacher.user_id,
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "patronymic": teacher.patronymic,
        "full_name": full_name,
        "created_at": teacher.created_at
    }


async def get_teacher_id_by_user_id(session: AsyncSession, user_id: int) -> Optional[int]:
    result = await session.execute(
        select(Teacher.id).where(Teacher.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_all_teachers(session: AsyncSession):
    result = await session.execute(
        select(Teacher).order_by(Teacher.last_name, Teacher.first_name)
    )
    teachers = result.scalars().all()
    teacher_list = []
    for teacher in teachers:
        full_name = f"{teacher.last_name} {teacher.first_name} {teacher.patronymic}"
        teacher_list.append({
            "id": teacher.id,
            "user_id": teacher.user_id,
            "first_name": teacher.first_name,
            "last_name": teacher.last_name,
            "patronymic": teacher.patronymic,
            "full_name": full_name,
            "created_at": teacher.created_at
        })
    return teacher_list

async def assign_teacher_to_subject_group(
    session: AsyncSession,
    teacher_id: int,
    subject_id: int,
    group_id: int
):
    teacher = await session.get(Teacher, teacher_id)
    if not teacher:
        raise ValueError("Преподаватель не найден")

    subject = await session.get(Subject, subject_id)
    if not subject:
        raise ValueError("Предмет не найден")

    group = await session.get(Group, group_id)
    if not group:
        raise ValueError("Группа не найдена")
    
    existing = await session.execute(
        select(TeacherSubjectGroup).where(
            TeacherSubjectGroup.teacher_id == teacher_id,
            TeacherSubjectGroup.subject_id == subject_id,
            TeacherSubjectGroup.group_id == group_id
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Преподаватель уже привязан к этому предмету в этой группе")

    tsg = TeacherSubjectGroup(
        teacher_id=teacher_id,
        subject_id=subject_id,
        group_id=group_id
    )
    session.add(tsg)
    await session.commit()
    await session.refresh(tsg)

    teacher_name = f"{teacher.last_name} {teacher.first_name} {teacher.patronymic}"
    return {
        "id": tsg.id,
        "teacher_id": tsg.teacher_id,
        "subject_id": tsg.subject_id,
        "group_id": tsg.group_id,
        "created_at": tsg.created_at,
        "teacher_name": teacher_name,
        "subject_name": subject.name,
        "group_name": group.name
    }


async def get_teacher_subjects_and_groups(session: AsyncSession, teacher_id: int):
    teacher = await session.get(Teacher, teacher_id)
    if not teacher:
        return []

    query = (
        select(TeacherSubjectGroup, Subject, Group)
        .join(Subject, TeacherSubjectGroup.subject_id == Subject.id)
        .join(Group, TeacherSubjectGroup.group_id == Group.id)
        .where(TeacherSubjectGroup.teacher_id == teacher_id)
    )
    result = await session.execute(query)

    assignments = []
    for tsg, subject, group in result.all():
        assignments.append({
            "assignment_id": tsg.id,
            "subject": {
                "id": subject.id,
                "name": subject.name,
                "code": subject.code,
                "description": subject.description
            },
            "group": {
                "id": group.id,
                "name": group.name,
                "course": group.course
            }
        })
    return assignments


async def get_teachers_by_subject_and_group(
    session: AsyncSession,
    subject_id: int,
    group_id: int
):
    query = (
        select(Teacher)
        .join(TeacherSubjectGroup, Teacher.id == TeacherSubjectGroup.teacher_id)
        .where(
            TeacherSubjectGroup.subject_id == subject_id,
            TeacherSubjectGroup.group_id == group_id,
        )
    )
    result = await session.execute(query)
    teachers = result.scalars().all()

    teachers_list = []
    for teacher in teachers:
        teachers_list.append({
            "teacher_id": teacher.id,
            "full_name": f"{teacher.last_name} {teacher.first_name} {teacher.patronymic}",
            "first_name": teacher.first_name,
            "last_name": teacher.last_name,
            "patronymic": teacher.patronymic,
        })
    return teachers_list


async def check_teacher_permission(
    session: AsyncSession,
    teacher_id: int,
    subject_id: int,
    group_id: int,
) -> bool:
    """Проверить, ведёт ли преподаватель предмет в группе (по teacher_id)"""
    result = await session.execute(
        select(TeacherSubjectGroup).where(
            TeacherSubjectGroup.teacher_id == teacher_id,
            TeacherSubjectGroup.subject_id == subject_id,
            TeacherSubjectGroup.group_id == group_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def check_teacher_permission_by_user_id(
    session: AsyncSession,
    user_id: int,
    subject_id: int,
    student_id: int
) -> bool:
    """
    Проверяет, имеет ли преподаватель (по user_id) право ставить оценки
    по предмету для данного студента.
    """
    teacher_id = await get_teacher_id_by_user_id(session, user_id)
    if not teacher_id:
        return False

    student = await session.get(Student, student_id)
    if not student or not student.group_id:
        return False

    return await check_teacher_permission(
        session,
        teacher_id=teacher_id,
        subject_id=subject_id,
        group_id=student.group_id
    )

async def get_teacher_by_user_id_with_details(session: AsyncSession, user_id: int):
    teacher_result = await session.execute(
        select(Teacher).where(Teacher.user_id == user_id)
    )
    teacher = teacher_result.scalar_one_or_none()
    if not teacher:
        return None

    full_name = f"{teacher.last_name} {teacher.first_name} {teacher.patronymic}"

    query = (
        select(TeacherSubjectGroup, Subject, Group)
        .join(Subject, TeacherSubjectGroup.subject_id == Subject.id)
        .join(Group, TeacherSubjectGroup.group_id == Group.id)
        .where(TeacherSubjectGroup.teacher_id == teacher.id)
    )
    assignments_result = await session.execute(query)

    assignments = []
    for tsg, subject, group in assignments_result.all():
        assignments.append({
            "assignment_id": tsg.id,
            "subject": {
                "id": subject.id,
                "name": subject.name,
                "code": subject.code,
                "description": subject.description
            },
            "group": {
                "id": group.id,
                "name": group.name,
                "course": group.course
            }
        })

    return {
        "id": teacher.id,
        "user_id": teacher.user_id,
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "patronymic": teacher.patronymic,
        "full_name": full_name,
        "created_at": teacher.created_at,
        "assignments": assignments
    }

async def get_student_group_id(session: AsyncSession, student_id: int) -> Optional[int]:
    """Вспомогательная функция – получить ID группы студента"""
    result = await session.execute(
        select(Student.group_id).where(Student.id == student_id)
    )
    return result.scalar_one_or_none()


async def get_grades_by_student_id_for_teacher(
    session: AsyncSession,
    student_id: int,
    teacher_id: int
):
    group_id = await get_student_group_id(session, student_id)
    if not group_id:
        return []

    teacher_subjects_query = select(TeacherSubjectGroup.subject_id).where(
        TeacherSubjectGroup.teacher_id == teacher_id,
        TeacherSubjectGroup.group_id == group_id
    )
    teacher_subjects_result = await session.execute(teacher_subjects_query)
    teacher_subject_ids = [row[0] for row in teacher_subjects_result.all()]

    if not teacher_subject_ids:
        return []

    query = (
        select(Grade, Subject.name, Subject.code)
        .join(Subject, Grade.subject_id == Subject.id)
        .where(
            Grade.student_id == student_id,
            Grade.subject_id.in_(teacher_subject_ids)
        )
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


async def get_all_grades_for_teacher(
    session: AsyncSession,
    teacher_id: int
):
    query = (
        select(
            Grade,
            Student.first_name,
            Student.last_name,
            Subject.name,
            Subject.code, 
            Group.name,
            Group.id
        )
        .join(Student, Grade.student_id == Student.id)
        .join(Subject, Grade.subject_id == Subject.id)
        .join(Group, Student.group_id == Group.id)
        .join(
            TeacherSubjectGroup,
            and_(
                TeacherSubjectGroup.subject_id == Grade.subject_id,
                TeacherSubjectGroup.group_id == Student.group_id
            )
        )
        .where(TeacherSubjectGroup.teacher_id == teacher_id)
        .order_by(Grade.date_assigned.desc())
    )
    result = await session.execute(query)
    rows = result.all()

    all_grades = []
    for grade, first_name, last_name, subject_name, subject_code, group_name, group_id in rows:
        all_grades.append({
            "id": grade.id,
            "student_id": grade.student_id,
            "student_name": f"{first_name} {last_name}",
            "subject_id": grade.subject_id,
            "subject_name": subject_name,
            "subject_code": subject_code, 
            "group_id": group_id,
            "group_name": group_name,
            "grade": grade.grade,
            "semester": grade.semester,
            "academic_year": grade.academic_year,
            "date_assigned": grade.date_assigned
        })
    return all_grades


