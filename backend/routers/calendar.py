from typing import List
from datetime import date

from fastapi import APIRouter, Query, Depends, HTTPException

from backend.shemas import UserResponse, CalendarEventResponse, CalendarEventCreate
from backend.auth import get_current_user, get_current_admin

router = APIRouter()

@router.get("/calendar/events",
         response_model=List[CalendarEventResponse],
         tags=["Calendar"],
         summary="Получить календарные события",
         description="Возвращает события календаря (праздники, выходные и т.д.)")
async def get_calendar_events(
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    current_user: UserResponse = Depends(get_current_user)
):
    # Реализацию нужно добавить в ORM
    # Пока заглушка
    return []

@router.post("/calendar/events/",
          response_model=CalendarEventResponse,
          tags=["Calendar"],
          summary="Создать календарное событие")
async def create_calendar_event(
    event: CalendarEventCreate,
    current_user: UserResponse = Depends(get_current_admin)
):
    # Реализацию нужно добавить в ORM
    raise HTTPException(status_code=501, detail="В разработке")