from typing import Dict, Optional

from fastapi import APIRouter,HTTPException, Query, Depends

from backend.crud import get_attendance_for_schedule, get_student_attendance_summary, \
update_attendance, bulk_update_attendance, get_schedule_by_id, get_teacher_id_by_user_id
from backend.shemas import AttendanceStatus, AttendanceResponse, AttendanceUpdate, \
AttendanceBulkUpdate, StudentAttendanceSummary
from backend.auth import get_current_teacher, get_current_student
from backend.database import get_session

from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Attendance"])

@router.get("/attendance/schedule/{schedule_id}", response_model=Dict[int,str], summary="Получить посещаемость занятия (Преподаватель)")
async def get_schedule_attendance(
    schedule_id: int,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")
    schedule = await get_schedule_by_id(session, schedule_id)
    if not schedule or schedule.get("teacher_id") != teacher_id:
        raise HTTPException(status_code=403, detail="Вы не ведёте это занятие")
    attendance = await get_attendance_for_schedule(session, schedule_id)
    return attendance

@router.post("/attendance/schedule/{schedule_id}", summary='Обновить посещаемость занятия (Преподаватель)')
async def update_schedule_attendance(
    schedule_id: int,
    data: AttendanceBulkUpdate,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")
    schedule = await get_schedule_by_id(session, schedule_id)
    if not schedule or schedule.get("teacher_id") != teacher_id:
        raise HTTPException(status_code=403, detail="Вы не ведёте это занятие")
    await bulk_update_attendance(session, schedule_id, data.attendance)
    return {"status": "success", "message": "Посещаемость обновлена"}

@router.get("/attendance/student/my", response_model=list[StudentAttendanceSummary], summary='Получить свою статистику посещаемости (Студент)')
async def get_my_attendance_summary(
    semester: int = Query(..., ge=1, le=2),
    academic_year: int = Query(...),
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student["id"]
    summary = await get_student_attendance_summary(session, student_id, semester, academic_year)
    return summary

@router.get("/attendance/student/schedule/{schedule_id}", response_model=Optional[str])
async def get_student_attendance_for_schedule(
    schedule_id: int,
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student['id']
    attendance = await get_attendance_for_schedule(session, schedule_id)
    return attendance.get(student_id)