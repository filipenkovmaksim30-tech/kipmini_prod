from typing import Optional, List, Dict
from datetime import datetime
from sqlalchemy import select, and_, func, delete, case
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Attendance, Schedule, Student, Subject

STORED_STATUSES = {'absent','absent_excused','absent_sick','late'}

async def get_attendance_for_schedule(
    session: AsyncSession,
    schedule_id:int
):
    result = await session.execute(
        select(Attendance.student_id, Attendance.status)
        .where(Attendance.schedule_id == schedule_id)
    )
    rows = result.all()
    return {row.student_id: row.status for row in rows}


async def update_attendance(
    session: AsyncSession, 
    student_id: int, 
    schedule_id: int, 
    status: str,
):
    if status not in STORED_STATUSES:
        # Удаляем запись, если она есть (означает присутствие)
        await session.execute(
            delete(Attendance).where(
                Attendance.student_id == student_id,
                Attendance.schedule_id == schedule_id
            )
        )
        await session.commit()
        return

    existing = await session.execute(
        select(Attendance).where(
            Attendance.student_id == student_id,
            Attendance.schedule_id == schedule_id
        )
    )
    attendance = existing.scalar_one_or_none()
    if attendance:
        attendance.status = status
        attendance.updated_at = datetime.utcnow()
    else:
        attendance = Attendance(
            student_id=student_id,
            schedule_id=schedule_id,
            status=status
        )
        session.add(attendance)
    await session.commit()


async def bulk_update_attendance(
    session: AsyncSession,
    schedule_id: int,
    updates: Dict[int,str]
):
    for student_id, status in updates.items():
        await update_attendance(session, student_id, schedule_id, status)


async def get_student_attendance_summary(
    session: AsyncSession,
    student_id: int,
    semester: int,
    academic_year: int
):
    if semester == 1:
        months = [9, 10, 11, 12]
    else:
        months = [1, 2, 3, 4, 5, 6]

    query = (
        select(
            Subject.id.label('subject_id'),
            Subject.name.label('subject_name'),
            func.sum(case((Attendance.status == 'absent', 1), else_=0)).label('absent_count'),
            func.sum(case((Attendance.status == 'absent_excused', 1), else_=0)).label('absent_excused_count'),
            func.sum(case((Attendance.status == 'absent_sick', 1), else_=0)).label('absent_sick_count'),
            func.sum(case((Attendance.status == 'late', 1), else_=0)).label('late_count'),
        )
        .join(Schedule, Attendance.schedule_id == Schedule.id)
        .join(Subject, Schedule.subject_id == Subject.id)
        .where(
            Attendance.student_id == student_id,
            Schedule.academic_year == academic_year,
            Schedule.month.in_(months),
            Schedule.is_active == True 
        )
        .group_by(Subject.id, Subject.name)
    )
    result = await session.execute(query)
    rows = result.all()

    summaries = []
    for row in rows:
        total_absences = row.absent_count + row.absent_excused_count + row.absent_sick_count + row.late_count
        summaries.append({
            "subject_id": row.subject_id,
            "subject_name": row.subject_name,
            "total_absences": total_absences,
            "absent_count": row.absent_count,
            "absent_excused_count": row.absent_excused_count,
            "absent_sick_count": row.absent_sick_count,
            "late_count": row.late_count,
        })
    return summaries