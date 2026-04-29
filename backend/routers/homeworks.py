import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, Depends,  HTTPException, status, UploadFile, File,Query
from fastapi.responses import FileResponse
from backend.crud import create_homework, get_homework_by_id, update_homework, delete_homework,\
get_homeworks_for_teacher_group, get_homework_by_schedule, get_teacher_id_by_user_id, get_student_group_id, get_schedule_by_id , \
get_student_id_by_user_id, add_homework_file, get_homework_files, delete_homework_file
from backend.shemas import UserResponse, HomeworkBase, HomeworkCreate, HomeworkUpdate, HomeworkResponse, HomeworkFileResponse
from backend.auth import get_current_student, get_current_teacher, get_current_user
from backend.database import get_session
from backend.models import Homework, Schedule, HomeworkFile

from sqlalchemy.ext.asyncio import AsyncSession

UPLOAD_DIR = "uploads/homework"
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.pptx', '.xlsx', '.xls'}
MAX_FILE_SIZE = 30 * 1024 * 1024

router = APIRouter(tags=["Homework"])

@router.post("/homework/", response_model=HomeworkResponse, status_code=201,
             summary="Создать домашнее задание (Преподаватель)")
async def create_homework_endpoint(
    data: HomeworkCreate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    try:
        result = await create_homework(
            session,
            teacher_id=teacher_id,
            schedule_id=data.schedule_id,
            text=data.text,
            topic=data.topic
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/homework/student/schedule/{schedule_id}", response_model=HomeworkResponse,
            summary="Получить домашнее задание на занятие (Студент)")
async def get_homework_for_student(
    schedule_id: int,
    session: AsyncSession = Depends(get_session),
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student["id"]
    group_id = await get_student_group_id(session, student_id)
    if not group_id:
        raise HTTPException(status_code=400, detail="Студент не привязан к группе")

    schedule = await get_schedule_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if schedule.get("group_id") != group_id:
        raise HTTPException(status_code=403, detail="У вас нет доступа к этому занятию")

    homework = await get_homework_by_schedule(session, schedule_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Домашнее задание не найдено")
    return homework


@router.get("/homework/teacher/schedule/{schedule_id}", response_model=HomeworkResponse,
            summary="Получить домашнее задание на занятие (Преподаватель)")
async def get_homework_for_teacher(
    schedule_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    schedule = await get_schedule_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if schedule.get("teacher_id") != teacher_id:
        raise HTTPException(status_code=403, detail="Вы не ведёте это занятие")

    homework = await get_homework_by_schedule(session, schedule_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Домашнее задание не найдено")
    return homework


@router.patch("/homework/{homework_id}", response_model=HomeworkResponse,
              summary="Обновить домашнее задание (Преподаватель)")
async def update_homework_endpoint(
    homework_id: int,
    data: HomeworkUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    try:
        updated = await update_homework(
            session,
            homework_id=homework_id,
            teacher_id=teacher_id,
            text=data.text,
            topic=data.topic
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Задание не найдено")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/homework/{homework_id}", status_code=204,
               summary="Удалить домашнее задание (Преподаватель)")
async def delete_homework_endpoint(
    homework_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    try:
        deleted = await delete_homework(session, homework_id, teacher_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Задание не найдено")
        return None
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/homework/teacher/group/{group_id}", response_model=List[HomeworkResponse],
            summary="Получить все домашние задания преподавателя для группы (Преподаватель)")
async def get_teacher_homeworks_for_group(
    group_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    homeworks = await get_homeworks_for_teacher_group(session, teacher_id, group_id)
    return homeworks

@router.post("/homework/{homework_id}/files",
    response_model= HomeworkFileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Прикрепить файл к домашнему заданию"
    )
async def upload_homework_file(
    homework_id: int,
    file: UploadFile = File(...),
    session: AsyncSession  = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")

    homework = await session.get(Homework, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Домашнее задание не найдено")
    schedule = await session.get(Schedule, homework.schedule_id)
    if not schedule or schedule.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="Вы не можете прикреплять файлы к этому заданию")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Недопустимый тип файла. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Размер файла не должен превышать 30 МБ")
    await file.seek(0)

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Ошибка при сохранении файла")
    finally:
        await file.close()

    try:
        hw_file = await add_homework_file(
            session,
            homework_id=homework_id,
            filename=file.filename,
            file_path=file_path,
            content_type=file.content_type,
            size=len(content)
        )
    except ValueError as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail="Ошибка при сохранении в БД")

    return hw_file
@router.get("/homework/{homework_id}/files",
    response_model=List[HomeworkFileResponse],
    summary="Получение списка файлов домашнего задания"
    )
async def get_homework_files_endpoint(
    homework_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_user)
):
    homework = await session.get(Homework, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Домашнее задание не найдено")
    schedule = await session.get(Schedule, homework.schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Занятие не найдено")

    # Проверка прав доступа
    if current_user.role == "teacher":
        teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
        if not teacher_id or schedule.teacher_id != teacher_id:
            raise HTTPException(status_code=403, detail="Нет доступа")
    elif current_user.role == "student":
        student_id = await get_student_id_by_user_id(session, current_user.id)
        if not student_id:
            raise HTTPException(status_code=403, detail="Профиль студента не найден")
        group_id = await get_student_group_id(session, student_id)
        if group_id != schedule.group_id:
            raise HTTPException(status_code=403, detail="Нет доступа")
    # Администратор – полный доступ

    files = await get_homework_files(session, homework_id)
    return files

@router.delete("/homework/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить файл домашнего задания"
    )
async def delete_homework_file_endpoint(
    file_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_teacher)
):
    teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Профиль преподавателя не найден")
    try:
        deleted = await delete_homework_file(session, file_id, teacher_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Файл не найден")
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return None

@router.get("/download/{file_id}")
async def download_homework_file(
    file_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: UserResponse = Depends(get_current_user)
):
    file_record = await session.get(HomeworkFile, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Файл не найден")
    homework = await session.get(Homework, file_record.homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Домашнее задание не найдено")
    schedule = await session.get(Schedule, homework.schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Занятие не найдено")

    # Проверка прав
    if current_user.role == "teacher":
        teacher_id = await get_teacher_id_by_user_id(session, current_user.id)
        if not teacher_id or schedule.teacher_id != teacher_id:
            raise HTTPException(status_code=403, detail="Нет доступа")
    elif current_user.role == "student":
        student_id = await get_student_id_by_user_id(session, current_user.id)
        if not student_id:
            raise HTTPException(status_code=403, detail="Профиль студента не найден")
        group_id = await get_student_group_id(session, student_id)
        if group_id != schedule.group_id:
            raise HTTPException(status_code=403, detail="Нет доступа")
    # Администратор – полный доступ

    return FileResponse(
        path=file_record.file_path,
        filename=file_record.filename,
        media_type=file_record.content_type or 'application/octet-stream'
    )