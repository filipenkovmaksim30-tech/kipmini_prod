from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Group, Student

async def create_group(
    session: AsyncSession,
    name: str,
    course: int
):
    existing = await session.execute(
        select(Group).where(Group.name == name)
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Группа с названием '{name}' уже существует")

    group = Group(name=name, course=course)
    session.add(group)
    await session.commit()
    await session.refresh(group)

    return {
        "id": group.id,
        "name": group.name,
        "course": group.course,
        "created_at": group.created_at
    }

async def get_all_groups(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100
):
    result = await session.execute(
        select(Group)
        .order_by(Group.name)
        .offset(skip)
        .limit(limit)
    )
    groups = result.scalars().all()

    return [
        {
            "id": group.id,
            "name": group.name,
            "course": group.course,
            "created_at": group.created_at,
        }
        for group in groups
    ]

async def get_group_by_id(
    session: AsyncSession,
    group_id: int
):
    result = await session.execute(
        select(Group).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        return None
    student_count_result = await session.execute(
        select(func.count(Student.id)).where(Student.group_id == group_id)
    )
    student_count = student_count_result.scalar()

    return {
        "id": group.id,
        "name": group.name,
        "course": group.course,
        "created_at": group.created_at,
        "student_count": student_count
    }

async def get_group_by_name(
    session: AsyncSession,
    group_name: str
):
    result = await session.execute(
        select(Group).where(Group.name == group_name)
    )
    group = result.scalar_one_or_none()
    if not group:
        return None
    return {
        "id": group.id,
        "name": group.name,
        "course": group.course,
        "created_at": group.created_at,
    }

async def get_students_by_group_name(
    session: AsyncSession,
    group_name: str
):
    group_result = await session.execute(
        select(Group).where(Group.name == group_name)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        return []

    query = (
        select(Student, Group.name)
        .join(Group, Student.group_id == Group.id)
        .where(Group.name == group_name)
        .order_by(Student.last_name, Student.first_name)
    )
    result = await session.execute(query)
    students_data = result.all()

    student_list = []
    for student, group_name_val in students_data:
        student_list.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "group_id": student.group_id,
            "group_name": group_name_val,
            "created_at": student.created_at
        })

    return student_list

async def update_group(
    session: AsyncSession,
    group_id: int,
    name: Optional[str] = None,
    course: Optional[int] = None,
):
    result = await session.execute(
        select(Group).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        return None

    if name is not None and name != group.name:
        existing = await session.execute(
            select(Group).where(Group.name == name)
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Группа с названием '{name}' уже существует")
        group.name = name

    if course is not None:
        group.course = course

    await session.commit()
    await session.refresh(group)

    return {
        "id": group.id,
        "name": group.name,
        "course": group.course,
        "created_at": group.created_at,
    }