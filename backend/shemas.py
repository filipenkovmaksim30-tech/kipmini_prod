from datetime import datetime, date
from pydantic import BaseModel, Field, EmailStr, field_validator, validator
from typing import Optional, List, Literal, Dict
import re
from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class UserCreate(BaseModel):
    """Схема для регистрации"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=50)
    role: UserRole = Field(default=UserRole.USER)

    @validator("password")
    def password_not_equal(cls, v, values):
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        if not re.search(r'[A-ZА-ЯЁ]', v):
            raise ValueError('Пароль должен содержать хотя бы одну заглавную букву')
        if not re.search(r'[a-zа-яё]', v):
            raise ValueError('Пароль должен содержать хотя бы одну строчную букву')
        return v


class UserLogin(BaseModel):
    """Схема для входа"""
    username: str
    password: str

class UserResponse(BaseModel):
    """Схема ответа с данными пользователя (без пароля)"""
    id: int
    email: str
    username: str
    avatar: Optional[str] = None
    is_active: bool
    role: str

    class Config:
        from_attributes = True

class UserUpdateRole(BaseModel):
    """Схема для обновления роли пользователя администратором"""
    role: str

class AdminUserResponse(BaseModel):
    """Схема для админ-панели без created_at"""
    id: int
    email: str
    username: str
    is_active: bool
    role: str

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int
    page: int
    limit: int


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=8, max_length=50, description="Текущий пароль")
    new_password: str = Field(..., min_length=8, max_length=50, description="Новый пароль минимум 8 символов")

    @field_validator("new_password")
    @classmethod
    def password_not_equal(cls, v: str, info) -> str:
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        if not re.search(r'[A-ZА-Я]', v):
            raise ValueError('Пароль должен содержать хотя бы одну заглавную букву (латинскую или русскую)')
        if not re.search(r'[a-zа-я]', v):
            raise ValueError('Пароль должен содержать хотя бы одну строчную букву (латинскую или русскую)')
        if 'old_password' in info.data and v == info.data['old_password']:
            raise ValueError("Новый пароль должен отличаться от старого")
        return v

class ChangeEmailRequest(BaseModel):
    new_email: EmailStr


class AdminResetPasswordRequest(BaseModel):
    user_id: int = Field(..., description="ID пользователя, которому сбрасывается пароль")
    new_password: str = Field(..., min_length=8, max_length=50, description="Новый пароль")
#============================

class GroupCreate(BaseModel):
    name: str = Field(...,min_length=2,max_length=20,description="Уникальное название группы")
    course: int = Field(...,ge=1,le=5,description="Курс на котором учится группа")

class GroupResponse(BaseModel):
    id: int
    name: str
    course: int
    created_at: datetime
    class Config:
        from_attributes = True

class GroupUpdate(BaseModel):
    name: Optional[str] = Field(...,min_length=2,max_length=20,description="Новое название группы")
    course: Optional[int] = Field(...,ge=1,le=5,description="Новый курс группы")

    class Config:
        extra = "forbid"
#======================================

class StudentCreate(BaseModel):
    first_name: str = Field(..., min_length=3, max_length=50, description="Имя студента")
    last_name: str = Field(..., min_length=3, max_length=50, description="Фамилия студента")
    group_id: Optional[int] = Field(None, description="ID учебной группы, в которую зачисляется студент. Может быть пустым.")
    user_id: Optional[int] = Field(None,description = "ID пользователя, к которому привязывается студент. Если не указать, студент будет без привязанного пользователя.")


class StudentUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=3, max_length=50)
    last_name: Optional[str] = Field(None, min_length=3, max_length=50)
    group_id: Optional[int] = None

class StudentResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ============ ================
class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Полное название предмета")
    code: str = Field(..., min_length=2, max_length=20, description="Уникальный код предмета (например, 'MATH101')")
    description: str = Field(None, max_length=500, description="Описание предмета")

class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=20)
    description: Optional[str] = Field(None, max_length=500)

class SubjectResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

# ========== СХЕМЫ ДЛЯ ОЦЕНОК  ==========
class GradeCreate(BaseModel):
    student_id: int = Field(..., description="ID студента")
    subject_id: int = Field(..., description="ID предмета")
    grade: int = Field(..., ge=2, le=5, description="Оценка от 2 до 5")
    semester: int = Field(..., ge=1, le=2, description="Номер семестра (1-2)")
    academic_year: int = Field(..., ge=2000, le=2100,description="Учебный год, за который ставится оценка (например, 2024)")

class GradeResponse(BaseModel):
    id: int
    student_id: int
    subject_id: int
    grade: int
    semester: int
    academic_year: int
    date_assigned: datetime
    student: Optional["StudentResponse"] = None
    subject: Optional["SubjectResponse"] = None
    class Config:
        from_attributes = True

class GradeWithSubjectInfo(BaseModel):
    id: int
    student_id: int
    subject_id: int
    grade: int
    semester: int
    academic_year: int
    date_assigned: datetime
    subject_name: str  
    subject_code: str 

    class Config:
        from_attributes = True

class GradeUpdate(BaseModel):
    grade: Optional[int] = Field(None,ge=2,le=5,description="Новая оценка (2-5)")

    class Config:
        extra = "forbid"
#===========================================

class StudentDetailResponse(BaseModel):
    """Схема для администраторов - с оценками"""
    id: int
    first_name: str
    last_name: str
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    created_at: datetime
    grades: List[GradeWithSubjectInfo] = []  # Все оценки студента

    class Config:
        from_attributes = True

#  ================= СХЕМЫ ПОЛУЧЕНИЯ ОЦЕНОК ЗА СЕМЕСТР =================

class GradeSemesterInfo(BaseModel):
    id: int
    subject_id: int
    subject_name: str
    subject_code: str
    grade: int
    date_assigned: datetime

    class Config:
        from_attributes = True

class StudentSemesterGradesResponse(BaseModel):
    student_id: int
    semester: int
    academic_year: int
    grades: List[GradeSemesterInfo] = []

    class Config:
        from_attributes = True

#================ СХЕМЫ ПРЕПОДОВАТЕЛЕЙ =================


class TeacherCreate(BaseModel):
    user_id: int = Field(..., description="ID пользователя (должен быть с ролью teacher)")
    first_name: str = Field(..., min_length=2, max_length=50, description="Имя преподавателя")
    last_name: str = Field(..., min_length=2, max_length=50, description="Фамилия преподавателя")
    patronymic: str = Field(..., min_length=2, max_length=50, description="Отчество преподавателя")


class TeacherResponse(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    patronymic: str
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class TeacherUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=2, max_length=50, description="Имя преподавателя")
    last_name: Optional[str] = Field(None, min_length=2, max_length=50, description="Фамилия преподавателя")
    patronymic: Optional[str] = Field(None, min_length=2, max_length=50, description="Отчество преподавателя")

    class Config:
        extra = "forbid"

class TeacherSubjectGroupCreate(BaseModel):
    teacher_id: int = Field(..., description="ID преподавателя")
    subject_id: int = Field(..., description="ID предмета")
    group_id: int = Field(..., description="ID группы")


class TeacherSubjectGroupResponse(BaseModel):
    id: int
    teacher_id: int
    subject_id: int
    group_id: int
    created_at: datetime
    teacher_name: Optional[str] = None
    subject_name: Optional[str] = None
    group_name: Optional[str] = None

    class Config:
        from_attributes = True

class TeacherSimpleResponse(BaseModel):
    teacher_id: int
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    patronymic: Optional[str] = None

    class Config:
        from_attributes = True

class SubjectAssignment(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class GroupAssignment(BaseModel):
    id: int
    name: str
    course: int

    class Config:
        from_attributes = True


class TeacherAssignmentResponse(BaseModel):
    assignment_id: int
    subject: SubjectAssignment
    group: GroupAssignment

    class Config:
        from_attributes = True


# ============ СХЕМЫ РАСПИСАНИЯ =============

class ScheduleBase(BaseModel):
    month: int = Field(..., ge=1, le=12, description="Месяц (1-12)")
    week_num: int = Field(..., ge=1, description="Номер учебной недели")
    day: int = Field(..., ge=1, le=31, description="День месяца (1-31)")
    day_of_week: int = Field(..., ge=1, le=7, description="День недели (1-пн, 7-вс)")
    start_time: str = Field(..., pattern=r'^\d{2}:\d{2}$', description="Время начала (HH:MM)")
    end_time: str = Field(..., pattern=r'^\d{2}:\d{2}$', description="Время окончания (HH:MM)")
    period: Optional[int] = Field(None, ge=1, le=8, description="Номер пары (1-8)")
    academic_year: Optional[int] = Field(None, ge=2000, le=2100, description="Учебный год")
    group_id: int = Field(..., description="ID группы")
    subject_id: Optional[int] = Field(None, description="ID предмета")
    teacher_id: Optional[int] = Field(None, description="ID преподавателя")
    classroom: Optional[str] = Field(None, max_length=20, description="Аудитория")
    lesson_type: Optional[str] = Field(None, description="Тип занятия: lecture/practice/lab/seminar")
    description: Optional[str] = Field(None, max_length=500, description="Описание")

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    month: Optional[int] = Field(None, ge=1, le=12)
    week_num: Optional[int] = Field(None, ge=1, description="Номер учебной недели")
    day: Optional[int] = Field(None, ge=1, le=31)
    day_of_week: Optional[int] = Field(None, ge=1, le=7)
    start_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    end_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    period: Optional[int] = Field(None, ge=1, le=8)
    academic_year: Optional[int] = Field(None, ge=2000, le=2100)
    group_id: Optional[int] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    classroom: Optional[str] = Field(None, max_length=20)
    lesson_type: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

class ScheduleResponse(BaseModel):
    id: int
    month: int
    week_num: int
    day: int
    day_of_week: int
    day_name: str
    formatted_date: str
    start_time: str
    end_time: str
    period: Optional[int]
    academic_year: Optional[int]
    group_id: int
    group_name: Optional[str]
    subject_id: Optional[int]
    subject_name: Optional[str]
    subject_code: Optional[str]
    teacher_id: Optional[int]
    teacher_name: Optional[str]
    classroom: Optional[str]
    lesson_type: Optional[str]
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CopyScheduleRequest(BaseModel):
    source_group_id: int
    source_academic_year: int
    source_week_num: int
    target_group_id: int
    target_academic_year: int
    target_week_num: int
    overwrite: bool = True

# ============ ДОМАШНЕЕ ЗАДАНИЕ ========

class HomeworkBase(BaseModel):
    text: str
    topic: Optional[str] = None

class HomeworkCreate(BaseModel):
    schedule_id: int
    text: str
    topic: Optional[str] = None

class HomeworkUpdate(BaseModel):
    text: str
    topic: Optional[str] = None

class HomeworkResponse(BaseModel):
    id: int
    schedule_id: int
    text: str
    topic: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    formatted_date: Optional[str] = None
    group_name: Optional[str] = None
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None
    week_num: Optional[int] = None

    class Config:
        from_attributes = True


class HomeworkFileResponse(BaseModel):
    id: int
    homework_id: int
    filename: str
    content_type: Optional[str] = None
    size: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ========= ОЦЕНКИ ЗА ЗАНЯТИЕ ==========

class LessonGradeBase(BaseModel):
    grade_type: Optional[str] = Field(None, max_length=100)
    grade: int = Field(..., ge=2, le=5)

class LessonGradeCreate(LessonGradeBase):
    student_id: int
    schedule_id: int

class LessonGradeUpdate(BaseModel):
    grade: Optional[int] = Field(None, ge=2, le=5)
    grade_type: Optional[str] = Field(None, max_length=100)

class LessonGradeResponse(LessonGradeBase):
    id: int
    student_id: int
    schedule_id: int
    created_at: datetime
    updated_at: datetime
    student_name: Optional[str] = None
    formatted_date: Optional[str] = None
    subject_name: Optional[str] = None

    class Config:
        from_attributes = True

# ========= ПОСЕЩАЕМОСТЬ ============
AttendanceStatusLiteral = Literal['absent','absent_excused','absent_sick','late']

class AttendanceStatus(BaseModel):
    status: AttendanceStatusLiteral

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    schedule_id: int
    status: AttendanceStatusLiteral
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AttendanceUpdate(BaseModel):
    status: AttendanceStatusLiteral

class AttendanceBulkUpdate(BaseModel):
    attendance: Dict[int, AttendanceStatusLiteral] = Field(
        ...,
        example={1:"absent", 2:"late", 3:"absent_sick"}
    )

class StudentAttendanceSummary(BaseModel):
    subject_id: int
    subject_name: str
    total_absences: int
    absent_count: int
    absent_excused_count: int
    absent_sick_count: int
    late_count: int
    
# ========= КАЛЕНДАРНЫЕ СОБЫТИЯ ========

class CalendarEventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    event_date: date = Field(..., description="Дата события")
    event_type: str = Field("holiday", description="Тип: holiday/no_classes/exam/other")
    affects_groups: Optional[List[int]] = Field(None, description="Список ID групп или пусто для всех")

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    event_date: date
    event_type: str
    affects_groups: Optional[List[int]]
    affects_all_groups: bool
    created_at: datetime
    class Config:
        from_attributes = True
