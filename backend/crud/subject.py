from typing import Optional
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Subject,  Grade, TeacherSubjectGroup, Schedule

async def create_subject(
    session: AsyncSession,
    name: str,
    code: str,
    description: Optional[str] = None,
):
    existing = await session.execute(
        select(Subject).where((Subject.name == name) | (Subject.code == code))
    )
    if existing.scalar_one_or_none():
        raise ValueError("Предмет с таким названием или кодом уже существует")

    subject = Subject(
        name=name,
        code=code,
        description=description
    )
    session.add(subject)
    await session.commit()
    await session.refresh(subject)

    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "description": subject.description,
        "created_at": subject.created_at
    }

async def get_subject_by_id(
    session: AsyncSession,
    subject_id: int
):
    result = await session.execute(
        select(Subject).where(Subject.id == subject_id)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        return None
    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "description": subject.description,
        "created_at": subject.created_at
    }

async def get_all_subject(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100
):
    result = await session.execute(
        select(Subject)
        .order_by(Subject.id)
        .offset(skip)
        .limit(limit)
    )
    subjects = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "description": s.description,
            "created_at": s.created_at
        }
        for s in subjects
    ]

async def update_subject(
    session: AsyncSession,
    subject_id: int,
    name: Optional[str] = None,
    code: Optional[str] = None,
    description: Optional[str] = None,
):
    result = await session.execute(
        select(Subject).where(Subject.id == subject_id)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        return None
    
    if name is not None and name != subject.name:
        existing = await session.execute(
            select(Subject).where(Subject.name == name)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Предмет с таким названием уже существует")
        subject.name = name

    if code is not None and code != subject.code:
        existing = await session.execute(
            select(Subject).where(Subject.code == code)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Предмет с таким кодом уже существует")
        subject.code = code

    if description is not None:
        subject.description = description

    await session.commit()
    await session.refresh(subject)

    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "description": subject.description,
        "created_at": subject.created_at
    }

async def delete_subject(
    session: AsyncSession,
    subject_id: int
):
    await session.execute(
        delete(Grade).where(Grade.subject_id == subject_id)
    )
    await session.execute(
        delete(TeacherSubjectGroup).where(TeacherSubjectGroup.subject_id == subject_id)
    )
    await session.execute(
        update(Schedule)
        .where(Schedule.subject_id == subject_id)
        .values(subject_id=None)
    )
    result = await session.execute(
        select(Subject).where(Subject.id == subject_id)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        return False
    await session.delete(subject)
    await session.commit()
    return True