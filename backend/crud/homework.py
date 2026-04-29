import os
from typing import Optional
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Homework, HomeworkFile, Schedule, Group, Subject, Teacher

async def _format_homework(
    session: AsyncSession,
    homework: Homework,
    include_schedule: bool = True
):
    result = {
        "id": homework.id,
        "schedule_id": homework.schedule_id,
        "text": homework.text,
        "topic":homework.topic,
        "created_at": homework.created_at,
        "updated_at": homework.updated_at,
        "formatted_date": None,
        "group_name": None,
        "subject_name": None,
        "teacher_name": None,
        "week_num": None,
    }

    if include_schedule and homework.schedule_id:
        query = (
            select(Schedule, Group, Subject, Teacher)
            .join(Group, Schedule.group_id == Group.id)
            .join(Subject, Schedule.subject_id == Subject.id)
            .join(Teacher, Schedule.teacher_id == Teacher.id)
            .where(Schedule.id == homework.schedule_id)
        )
        row = await session.execute(query)
        row_data = row.first()
        if row_data:
            schedule, group, subject, teacher = row_data
            result["formatted_date"] = f"{schedule.day:02d}.{schedule.month:02d}"
            result["group_name"] = group.name
            result["subject_name"] = subject.name
            if teacher: 
                result["teacher_name"] = f"{teacher.last_name} {teacher.first_name} {teacher.patronymic}"
            result["week_num"] = schedule.week_num

    return result

async def create_homework(
    session: AsyncSession,
    teacher_id: int,
    schedule_id: int,
    text: str,
    topic: Optional[str] = None
):

    schedule = await session.get(Schedule, schedule_id)
    if not schedule:
        raise ValueError(f"Занятие с ID {schedule_id} не найдено")

    if schedule.teacher_id != teacher_id:
        raise ValueError("Вы не можете создать задание для этого занятия")

    existing = await session.execute(
        select(Homework).where(Homework.schedule_id == schedule_id)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Для этого занятия уже есть домашнее задание")

    homework = Homework(schedule_id=schedule_id, text=text, topic=topic)
    session.add(homework)
    await session.commit()
    await session.refresh(homework)

    return await _format_homework(session, homework)


async def get_homework_by_schedule(
    session: AsyncSession,
    schedule_id: int
):
    result = await session.execute(
        select(Homework).where(Homework.schedule_id == schedule_id)
    )
    homework = result.scalar_one_or_none()
    if not homework:
        return None
    return await _format_homework(session, homework)


async def get_homework_by_id(
    session: AsyncSession,
    homework_id: int
) -> Optional[dict]:
    """Возвращает задание по его ID."""
    homework = await session.get(Homework, homework_id)
    if not homework:
        return None
    return await _format_homework(session, homework)


async def update_homework(
    session: AsyncSession,
    homework_id: int,
    teacher_id: int,
    text: str,
    topic: Optional[str] = None
):
    homework = await session.get(Homework, homework_id)
    if not homework:
        return None

    schedule = await session.get(Schedule, homework.schedule_id)
    if not schedule:
        raise ValueError("Связанное занятие не найдено")

    if schedule.teacher_id != teacher_id:
        raise ValueError("Вы не можете редактировать это задание")

    homework.text = text
    if topic is not None:
        homework.topic = topic
    homework.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(homework)

    return await _format_homework(session, homework)


async def delete_homework(
    session: AsyncSession,
    homework_id: int,
    teacher_id: int
) -> bool:
    """Удаляет задание. Проверяет, что преподаватель ведёт занятие."""
    homework = await session.get(Homework, homework_id)
    if not homework:
        return False

    schedule = await session.get(Schedule, homework.schedule_id)
    if not schedule:
        raise ValueError("Связанное занятие не найдено")

    if schedule.teacher_id != teacher_id:
        raise ValueError("Вы не можете удалить это задание")

    await session.delete(homework)
    await session.commit()
    return True

async def get_homeworks_for_teacher_group(
    session: AsyncSession,
    teacher_id: int,
    group_id: int
):
    query = (
        select(Homework)
        .join(Schedule, Homework.schedule_id == Schedule.id)
        .where(
            Schedule.teacher_id == teacher_id,
            Schedule.group_id == group_id
        )
        .order_by(Schedule.month, Schedule.day, Schedule.start_time)
    )
    result = await session.execute(query)
    homeworks = result.scalars().all()
    return [await _format_homework(session, hw) for hw in homeworks]


async def get_homeworks_for_student_group(
    session: AsyncSession,
    group_id: int
):
    query = (
        select(Homework)
        .join(Schedule, Homework.schedule_id == Schedule.id)
        .where(Schedule.group_id == group_id)
        .order_by(Schedule.month, Schedule.day, Schedule.start_time)
    )
    result = await session.execute(query)
    homeworks = result.scalars().all()
    return [await _format_homework(session, hw) for hw in homeworks]

async def add_homework_file(
    session: AsyncSession,
    homework_id: int,
    filename: str,
    file_path: str,
    content_type: str = None,
    size: int = None
):
    count_result = await session.execute(
        select(func.count(HomeworkFile.id)).where(HomeworkFile.homework_id == homework_id)
    )
    count = count_result.scalar_one_or_none()
    if count > 5:
        raise ValueError("Максимум можно прикрепить 5 файлов на домашнее задание")
    
    hw_file = HomeworkFile(
        homework_id=homework_id,
        filename=filename,
        file_path=file_path,
        content_type=content_type,
        size=size
    )
    session.add(hw_file)
    await session.commit()
    await session.refresh(hw_file)
    return hw_file

async def get_homework_files(session: AsyncSession, homework_id: int):
    result = await session.execute(
        select(HomeworkFile).where(HomeworkFile.homework_id == homework_id)
    )
    return result.scalars().all()

async def delete_homework_file(session: AsyncSession, file_id: int, teacher_id: int):
    file = await session.get(HomeworkFile, file_id)
    if not file:
        return False
    homework = await session.get(Homework, file.homework_id)
    if not homework:
        return False
    
    schedule = await session.get(Schedule, homework.schedule_id)
    if not schedule or schedule.teacher_id != teacher_id:
        raise ValueError("У вас нет прав на удаление этого файла")
    await session.delete(file)
    await session.commit()
    try:
        os.remove(file.file_path)
    except OSError:
        pass
    return True