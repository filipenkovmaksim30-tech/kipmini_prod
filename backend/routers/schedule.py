from typing import List, Optional, Dict
from datetime import date

from fastapi import APIRouter, HTTPException, Query, Depends

from backend.crud import create_schedule, get_schedule_by_id, update_schedule, delete_schedule, get_all_schedules, \
get_daily_group_schedule, get_weekly_group_schedule, get_daily_teacher_schedule, get_weekly_teacher_schedule, \
get_teacher_id_by_user_id, get_student_group_id, copy_schedule
from backend.shemas import UserResponse, ScheduleResponse, ScheduleCreate, ScheduleUpdate, CopyScheduleRequest
from backend.auth import get_current_admin, get_current_user, get_current_teacher, get_current_student
from backend.database import get_session

from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Schedule"])

@router.post("/schedules/", response_model=ScheduleResponse, status_code=201, summary="Создать запись расписания (Админ)")
async def create_schedule_item(
    schedule: ScheduleCreate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    try:
        result = await create_schedule(session, schedule.dict())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/schedules/{schedule_id}", response_model=ScheduleResponse, summary="Получить запись расписания по ID (Админ)")
async def get_schedule_item(
    schedule_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    schedule = await get_schedule_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return schedule

@router.patch("/schedules/{schedule_id}", response_model=ScheduleResponse, summary="Обновить запись расписания по ID (Админ)")
async def update_schedule_item(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    try:
        update_data = schedule_update.dict(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="Нет данных для обновления")
        updated = await update_schedule(session, schedule_id, update_data)
        if not updated:
            raise HTTPException(status_code=404, detail="Запись не найдена")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/schedules/{schedule_id}", status_code=200, summary="Удалить запись расписания по ID (Админ)")
async def delete_schedule_item(
    schedule_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    deleted = await delete_schedule(session, schedule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return {"success": True, "message": "Запись удалена"}

@router.get("/schedules/", response_model=List[ScheduleResponse], summary="Получить все записи расписания (Админ)")
async def get_all_schedules_endpoint(
    academic_year: Optional[int] = Query(None, description="Учебный год"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Месяц (1-12)"),
    day: Optional[int] = Query(None, ge=1, le=31, description="День месяца"),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    group_id: Optional[int] = Query(None),
    teacher_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    schedules = await get_all_schedules(
        session,
        academic_year=academic_year,
        month=month,
        day=day,
        week_num=week_num,
        group_id=group_id,
        teacher_id=teacher_id,
        offset=skip,
        limit=limit
    )
    return schedules

@router.get("/schedules/group/{group_id}/daily", response_model=List[ScheduleResponse], summary="Получить дневное расписание группы (Админ)")
async def get_daily_group_schedule_endpoint(
    group_id: int,
    academic_year: int = Query(..., description="Учебный год"),
    month: int = Query(..., ge=1, le=12, description="Месяц"),
    day: int = Query(..., ge=1, le=31, description="День"),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    schedules = await get_daily_group_schedule(
        session, group_id, academic_year, month, day, week_num
    )
    return schedules

@router.get("/schedules/group/{group_id}/weekly", response_model=Dict[str, List[ScheduleResponse]], summary="Получить недельное расписание группы (Админ)")
async def get_weekly_group_schedule_endpoint(
    group_id: int,
    academic_year: int = Query(..., description="Учебный год"),
    week_start: date = Query(..., description="Дата понедельника (YYYY-MM-DD)"),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    weekly = await get_weekly_group_schedule(
        session, group_id, academic_year, week_start, week_num
    )
    return weekly

@router.get("/schedules/teacher/{teacher_id}/daily", response_model=List[ScheduleResponse], summary="Получить дневное расписания для преподавателя (Админ)")
async def get_daily_teacher_schedule_endpoint(
    teacher_id: int,
    academic_year: int = Query(..., description="Учебный год"),
    month: int = Query(..., ge=1, le=12),
    day: int = Query(..., ge=1, le=31),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    schedules = await get_daily_teacher_schedule(
        session, teacher_id, academic_year, month, day, week_num
    )
    return schedules

@router.get("/schedules/teacher/{teacher_id}/weekly", response_model=Dict[str, List[ScheduleResponse]], summary="Получить недельное расписания для преподавателя (Админ)")
async def get_weekly_teacher_schedule_endpoint(
    teacher_id: int,
    academic_year: int = Query(..., description="Учебный год"),
    week_start: date = Query(..., description="Дата понедельника"),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    weekly = await get_weekly_teacher_schedule(
        session, teacher_id, academic_year, week_start, week_num
    )
    return weekly

@router.get("/schedules/teacher/my-daily", response_model=List[ScheduleResponse], summary="Получить дневное расписание для преподавателя (Преподаватель)")
async def get_my_daily_teacher_schedule(
    academic_year: int = Query(..., description="Учебный год"),
    month: int = Query(..., ge=1, le=12),
    day: int = Query(..., ge=1, le=31),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=404, detail="Профиль преподавателя не найден")
    schedules = await get_daily_teacher_schedule(
        session, teacher_id, academic_year, month, day, week_num
    )
    return schedules

@router.get("/schedules/teacher/my-weekly", response_model=Dict[str, List[ScheduleResponse]], summary="Получить недельное расписание для преподавателя (Преподаватель)")
async def get_my_weekly_teacher_schedule(
    academic_year: int = Query(..., description="Учебный год"),
    week_start: date = Query(..., description="Дата понедельника"),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=404, detail="Профиль преподавателя не найден")
    weekly = await get_weekly_teacher_schedule(
        session, teacher_id, academic_year, week_start, week_num
    )
    return weekly

@router.get("/schedules/student/my-daily", response_model=List[ScheduleResponse], summary="Получить дневное расписание для студента (Студент)")
async def get_my_daily_schedule(
    academic_year: int = Query(..., description="Учебный год"),
    month: int = Query(..., ge=1, le=12),
    day: int = Query(..., ge=1, le=31),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student["id"]
    group_id = await get_student_group_id(session, student_id)
    if not group_id:
        raise HTTPException(status_code=400, detail="Студент не привязан к группе")
    schedules = await get_daily_group_schedule(
        session, group_id, academic_year, month, day, week_num
    )
    return schedules

@router.get("/schedules/student/my-weekly", response_model=Dict[str, List[ScheduleResponse]], summary="Получить недельное расписание для студента (Студент)")
async def get_my_weekly_schedule(
    academic_year: int = Query(..., description="Учебный год"),
    week_start: date = Query(..., description="Дата понедельника"),
    week_num: Optional[int] = Query(None, ge=1, description="Номер недели"),
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student["id"]
    group_id = await get_student_group_id(session, student_id)
    if not group_id:
        raise HTTPException(status_code=400, detail="Студент не привязан к группе")
    weekly = await get_weekly_group_schedule(
        session, group_id, academic_year, week_start, week_num
    )
    return weekly

@router.post("/schedules/copy", response_model=List[ScheduleResponse], summary="Копировать расписание с одной недели/группы на другую (Админ)")
async def copy_schedule_endpoint(
    data: CopyScheduleRequest,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_admin)
):
    try:
        copied = await copy_schedule(
            session,
            source_group_id=data.source_group_id,
            source_academic_year=data.source_academic_year,
            source_week_num=data.source_week_num,
            target_group_id=data.target_group_id,
            target_academic_year=data.target_academic_year,
            target_week_num=data.target_week_num,
            overwrite=data.overwrite
        )
        return copied
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))