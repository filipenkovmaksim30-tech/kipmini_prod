from typing import Optional, List, Dict, Any
from datetime import date, timedelta, datetime
from sqlalchemy import select, and_, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Schedule, Group, Subject, Teacher

# ---------- Вспомогательная функция форматирования ----------
async def _format_schedule_response(session: AsyncSession, schedule: Schedule) -> Dict[str, Any]:
    """Форматирование ответа с добавлением formatted_date и day_name."""
    group_name = None
    subject_name = None
    subject_code = None
    teacher_name = None

    if schedule.group_id:
        group = await session.get(Group, schedule.group_id)
        group_name = group.name if group else None

    if schedule.subject_id:
        subject = await session.get(Subject, schedule.subject_id)
        subject_name = subject.name if subject else None
        subject_code = subject.code if subject else None

    if schedule.teacher_id:
        teacher = await session.get(Teacher, schedule.teacher_id)
        if teacher:
            teacher_name = f"{teacher.last_name} {teacher.first_name} {teacher.patronymic}"

    formatted_date = f"{schedule.day:02d}.{schedule.month:02d}"

    day_names = {
        1: "Понедельник",
        2: "Вторник",
        3: "Среда",
        4: "Четверг",
        5: "Пятница",
        6: "Суббота",
        7: "Воскресенье",
    }
    day_name = day_names.get(schedule.day_of_week, "Неизвестно")

    return {
        "id": schedule.id,
        "week_num": schedule.week_num,
        "month": schedule.month,
        "day": schedule.day,
        "academic_year": schedule.academic_year,
        "day_of_week": schedule.day_of_week,
        "day_name": day_name,
        "formatted_date": formatted_date,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
        "period": schedule.period,
        "group_id": schedule.group_id,
        "group_name": group_name,
        "subject_id": schedule.subject_id,
        "subject_name": subject_name,
        "subject_code": subject_code,
        "teacher_id": schedule.teacher_id,
        "teacher_name": teacher_name,
        "classroom": schedule.classroom,
        "lesson_type": schedule.lesson_type,
        "description": schedule.description,
        "is_active": schedule.is_active,
        "created_at": schedule.created_at
    }


# ---------- Проверка наложения ----------
async def _check_overlapping(
    session: AsyncSession,
    group_id: int,
    academic_year: int,
    month: int,
    day: int,
    start_time: str,
    end_time: str,
    exclude_id: Optional[int] = None
) -> bool:
    """Проверяет, есть ли у группы занятие в указанное время (без учёта week_num)."""
    conditions = [
        Schedule.group_id == group_id,
        Schedule.academic_year == academic_year,
        Schedule.month == month,
        Schedule.day == day,
        Schedule.is_active == True,
        Schedule.start_time < end_time,
        Schedule.end_time > start_time
    ]
    if exclude_id:
        conditions.append(Schedule.id != exclude_id)

    query = select(Schedule).where(and_(*conditions))
    result = await session.execute(query)
    return result.scalar_one_or_none() is not None


# ---------- CRUD ----------
async def create_schedule(session: AsyncSession, data: dict):
    """Создание записи в расписании."""
    required = ["group_id", "academic_year", "week_num", "month", "day", "day_of_week", "start_time", "end_time"]
    for field in required:
        if not data.get(field):
            raise ValueError(f"Не указано поле {field}")

    group = await session.get(Group, data["group_id"])
    if not group:
        raise ValueError(f"Группа с ID {data['group_id']} не найдена")

    if data.get("subject_id"):
        subject = await session.get(Subject, data["subject_id"])
        if not subject:
            raise ValueError(f"Предмет с ID {data['subject_id']} не найден")

    if data.get("teacher_id"):
        teacher = await session.get(Teacher, data["teacher_id"])
        if not teacher:
            raise ValueError(f"Преподаватель с ID {data['teacher_id']} не найден")

    # Проверка наложения (без week_num)
    overlapping = await _check_overlapping(
        session,
        group_id=data["group_id"],
        academic_year=data["academic_year"],
        month=data["month"],
        day=data["day"],
        start_time=data["start_time"],
        end_time=data["end_time"]
    )
    if overlapping:
        raise ValueError("В это время у группы уже есть занятие")

    schedule = Schedule(**data)
    session.add(schedule)
    await session.commit()
    await session.refresh(schedule)

    return await _format_schedule_response(session, schedule)


async def get_schedule_by_id(session: AsyncSession, schedule_id: int):
    schedule = await session.get(Schedule, schedule_id)
    if not schedule:
        return None
    return await _format_schedule_response(session, schedule)


async def update_schedule(session: AsyncSession, schedule_id: int, update_data: dict):
    schedule = await session.get(Schedule, schedule_id)
    if not schedule:
        return None

    # Новые значения (или старые, если не переданы)
    new_group = update_data.get("group_id", schedule.group_id)
    new_academic_year = update_data.get("academic_year", schedule.academic_year)
    new_month = update_data.get("month", schedule.month)
    new_day = update_data.get("day", schedule.day)
    new_start = update_data.get("start_time", schedule.start_time)
    new_end = update_data.get("end_time", schedule.end_time)

    # Проверка наложения, если изменились ключевые поля (без week_num)
    if (new_group != schedule.group_id or
        new_academic_year != schedule.academic_year or
        new_month != schedule.month or
        new_day != schedule.day or
        new_start != schedule.start_time or
        new_end != schedule.end_time):
        overlapping = await _check_overlapping(
            session,
            group_id=new_group,
            academic_year=new_academic_year,
            month=new_month,
            day=new_day,
            start_time=new_start,
            end_time=new_end,
            exclude_id=schedule_id
        )
        if overlapping:
            raise ValueError("В это время у группы уже есть занятие")

    for key, value in update_data.items():
        if hasattr(schedule, key) and value is not None:
            setattr(schedule, key, value)

    schedule.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(schedule)

    return await _format_schedule_response(session, schedule)


async def delete_schedule(session: AsyncSession, schedule_id: int) -> bool:
    schedule = await session.get(Schedule, schedule_id)
    if not schedule:
        return False
    await session.delete(schedule)
    await session.commit()
    return True


# ---------- Получение всех записей (админ) с фильтрацией ----------
async def get_all_schedules(
    session: AsyncSession,
    academic_year: Optional[int] = None,
    month: Optional[int] = None,
    day: Optional[int] = None,
    week_num: Optional[int] = None,  # новый параметр
    group_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0
):
    conditions = [Schedule.is_active == True]
    if academic_year is not None:
        conditions.append(Schedule.academic_year == academic_year)
    if month is not None:
        conditions.append(Schedule.month == month)
    if day is not None:
        conditions.append(Schedule.day == day)
    if week_num is not None:
        conditions.append(Schedule.week_num == week_num)
    if group_id:
        conditions.append(Schedule.group_id == group_id)
    if teacher_id:
        conditions.append(Schedule.teacher_id == teacher_id)

    query = (
        select(Schedule)
        .where(and_(*conditions))
        .order_by(Schedule.academic_year, Schedule.month, Schedule.day, Schedule.start_time)
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(query)
    schedules = result.scalars().all()

    return [await _format_schedule_response(session, s) for s in schedules]


# ---------- Расписание на день для группы ----------
async def get_daily_group_schedule(
    session: AsyncSession,
    group_id: int,
    academic_year: int,
    month: int,
    day: int,
    week_num: Optional[int] = None  # новый параметр
) -> List[Dict]:
    conditions = [
        Schedule.group_id == group_id,
        Schedule.academic_year == academic_year,
        Schedule.month == month,
        Schedule.day == day,
        Schedule.is_active == True
    ]
    if week_num is not None:
        conditions.append(Schedule.week_num == week_num)

    query = select(Schedule).where(and_(*conditions)).order_by(Schedule.start_time)
    result = await session.execute(query)
    schedules = result.scalars().all()
    return [await _format_schedule_response(session, s) for s in schedules]


# ---------- Недельное расписание для группы ----------
async def get_weekly_group_schedule(
    session: AsyncSession,
    group_id: int,
    academic_year: int,
    week_start: date,
    week_num: Optional[int] = None  # новый параметр
) -> Dict[str, List[Dict]]:
    """week_start - дата понедельника."""
    days = [week_start + timedelta(days=i) for i in range(7)]
    day_conditions = [
        and_(
            Schedule.month == d.month,
            Schedule.day == d.day
        )
        for d in days
    ]

    conditions = [
        Schedule.group_id == group_id,
        Schedule.academic_year == academic_year,
        Schedule.is_active == True,
        or_(*day_conditions)
    ]
    if week_num is not None:
        conditions.append(Schedule.week_num == week_num)

    query = (
        select(Schedule)
        .where(and_(*conditions))
        .order_by(Schedule.month, Schedule.day, Schedule.start_time)
    )
    result = await session.execute(query)
    schedules = result.scalars().all()

    grouped = {}
    for s in schedules:
        key = f"{s.day:02d}.{s.month:02d}"
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(await _format_schedule_response(session, s))

    return grouped


# ---------- Аналогично для преподавателя ----------
async def get_daily_teacher_schedule(
    session: AsyncSession,
    teacher_id: int,
    academic_year: int,
    month: int,
    day: int,
    week_num: Optional[int] = None
) -> List[Dict]:
    conditions = [
        Schedule.teacher_id == teacher_id,
        Schedule.academic_year == academic_year,
        Schedule.month == month,
        Schedule.day == day,
        Schedule.is_active == True
    ]
    if week_num is not None:
        conditions.append(Schedule.week_num == week_num)

    query = select(Schedule).where(and_(*conditions)).order_by(Schedule.start_time)
    result = await session.execute(query)
    schedules = result.scalars().all()
    return [await _format_schedule_response(session, s) for s in schedules]


async def get_weekly_teacher_schedule(
    session: AsyncSession,
    teacher_id: int,
    academic_year: int,
    week_start: date,
    week_num: Optional[int] = None
) -> Dict[str, List[Dict]]:
    days = [week_start + timedelta(days=i) for i in range(7)]
    day_conditions = [
        and_(
            Schedule.month == d.month,
            Schedule.day == d.day
        )
        for d in days
    ]

    conditions = [
        Schedule.teacher_id == teacher_id,
        Schedule.academic_year == academic_year,
        Schedule.is_active == True,
        or_(*day_conditions)
    ]
    if week_num is not None:
        conditions.append(Schedule.week_num == week_num)

    query = (
        select(Schedule)
        .where(and_(*conditions))
        .order_by(Schedule.month, Schedule.day, Schedule.start_time)
    )
    result = await session.execute(query)
    schedules = result.scalars().all()

    grouped = {}
    for s in schedules:
        key = f"{s.day:02d}.{s.month:02d}"
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(await _format_schedule_response(session, s))

    return grouped

async def copy_schedule(
    session: AsyncSession,
    source_group_id: int,
    source_academic_year: int,
    source_week_num: int,
    target_group_id: int,
    target_academic_year: int,
    target_week_num: int,
    overwrite: bool = True
) -> List[Dict]:
    source_query = select(Schedule).where(
        Schedule.group_id == source_group_id,
        Schedule.academic_year == source_academic_year,
        Schedule.week_num == source_week_num,
        Schedule.is_active == True
    )
    source_result = await session.execute(source_query)
    source_schedules = source_result.scalars().all()
    
    if not source_schedules:
        raise ValueError(f"Нет расписания для группы {source_group_id} на неделе {source_week_num}")

    if overwrite:
        await session.execute(
            delete(Schedule).where(
                Schedule.group_id == target_group_id,
                Schedule.academic_year == target_academic_year,
                Schedule.week_num == target_week_num
            )
        )
        await session.flush()

    delta_days = (target_week_num - source_week_num) * 7

    for sch in source_schedules:
    
        src_date = date(sch.academic_year, sch.month, sch.day)
        new_date = src_date + timedelta(days=delta_days)

        new_schedule = Schedule(
            month=new_date.month,
            week_num=target_week_num,
            day=new_date.day,
            day_of_week=sch.day_of_week,
            start_time=sch.start_time,
            end_time=sch.end_time,
            period=sch.period,
            academic_year=target_academic_year,
            group_id=target_group_id,
            subject_id=sch.subject_id,
            teacher_id=sch.teacher_id,
            classroom=sch.classroom,
            lesson_type=sch.lesson_type,
            description=sch.description,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(new_schedule)
    
    await session.commit()
    
    return [await _format_schedule_response(session, s) for s in source_schedules]