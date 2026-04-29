from backend.database import Base
from sqlalchemy import ForeignKey, Column, Integer, String, Boolean, DateTime, UniqueConstraint, Index, Date, Text
from sqlalchemy.orm import relationship
from datetime import datetime


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    avatar = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('email', name='uq_user_email'),
        UniqueConstraint('username', name='uq_user_username'),
    )


class Group(Base):
    __tablename__ = 'groups'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    course = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('name', name='uq_group_name'),
    )


class Student(Base):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    group_id = Column(Integer, ForeignKey('groups.id', name='fk_student_group'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id', name='fk_student_user'), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    attendances = relationship("Attendance", back_populates="student")


class Subject(Base):
    __tablename__ = 'subjects'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('name', name='uq_subject_name'),
        UniqueConstraint('code', name='uq_subject_code'),
    )


class Grade(Base):
    __tablename__ = 'grades'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE', name='fk_grade_student'), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id', ondelete='CASCADE', name='fk_grade_subject'), nullable=False)
    grade = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    academic_year = Column(Integer, nullable=False)
    date_assigned = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            'student_id',
            'subject_id',
            'semester',
            'academic_year',
            name='uq_grade_per_semester'
        ),
    )


class Teacher(Base):
    __tablename__ = 'teachers'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', name='fk_teacher_user'), unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    patronymic = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class TeacherSubjectGroup(Base):
    __tablename__ = 'teacher_subject_group'
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey('teachers.id', name='fk_tsg_teacher'), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id', name='fk_tsg_subject'), nullable=False)
    group_id = Column(Integer, ForeignKey('groups.id', name='fk_tsg_group'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            'teacher_id',
            'subject_id',
            'group_id',
            name='uq_teacher_subject_group'
        ),
    )

class Schedule(Base):
    __tablename__ = 'schedules'

    id = Column(Integer, primary_key=True, index=True)
    
    month = Column(Integer, nullable=False)          # 1-12
    week_num = Column(Integer, nullable=False)
    day = Column(Integer, nullable=False)            # 1-31
    day_of_week = Column(Integer, nullable=False)    # 1-7 (Пн-Вс)
    
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    period = Column(Integer, nullable=True)
    
    academic_year = Column(Integer, nullable=True)

    subject_id = Column(Integer, ForeignKey('subjects.id', name='fk_schedule_subject'), nullable=True)
    teacher_id = Column(Integer, ForeignKey('teachers.id', name='fk_schedule_teacher'), nullable=True)
    group_id = Column(Integer, ForeignKey('groups.id', name='fk_schedule_group'), nullable=False)

    classroom = Column(String, nullable=True)
    lesson_type = Column(String, nullable=True)
    description = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint(
            'group_id', 'month', 'day', 'start_time', 'academic_year', 'week_num',
            name='uq_schedule_unique_per_week'
        ),
        Index('ix_schedule_group_month_day', 'group_id', 'month', 'day'),
        Index('ix_schedule_teacher_month_day', 'teacher_id', 'month', 'day'),
    )


class Homework(Base):
    __tablename__ = 'homeworks'
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete='CASCADE'), nullable=False, unique=True)
    topic = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    files = relationship("HomeworkFile", back_populates="homework", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_homework_schedule_id', 'schedule_id'),
    )

class HomeworkFile(Base):
    __tablename__ = "homework_files"
    id = Column(Integer, primary_key=True, index=True)
    homework_id = Column(Integer, ForeignKey('homeworks.id', ondelete="CASCADE"),nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    homework = relationship("Homework", back_populates="files")


class LessonGrade(Base):
    __tablename__ = 'lesson_grades'

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    schedule_id = Column(Integer, ForeignKey('schedules.id', ondelete='CASCADE'), nullable=False)
    grade_type = Column(String(100), nullable=True)
    grade = Column(Integer, nullable=False)  # оценка 2-5
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_lesson_grade_schedule', 'schedule_id'),
        Index('ix_lesson_grade_student', 'student_id'),
    )

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete="CASCADE"), nullable=False)
    schedule_id = Column(Integer, ForeignKey('schedules.id', ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('student_id', 'schedule_id', name='uq_attendance_student_schedule'),
        Index('ix_attendance_schedule', 'schedule_id'),
        Index('ix_attendance_student', 'student_id'),
    )
    student = relationship("Student", back_populates="attendances")


class CalendarEvent(Base):
    __tablename__ = 'calendar_events'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    event_data = Column(Date, nullable=False)
    event_type = Column(String, default="holiday")
    affects_groups = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_calendar_event_data', 'event_data'),
    )