export interface TeacherProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  patronymic: string;
  full_name: string;
  created_at: string;
  assignments?: Array<{
    assignment_id: number;
    subject: {
      id: number;
      name: string;
      code: string;
      description: string | null;
    };
    group: {
      id: number;
      name: string;
      course: number;
    };
  }>;
}

export interface Teacher {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  patronymic: string;
  full_name: string;
  created_at: string;
}

export interface TeacherCreate {
  user_id: number;
  first_name: string;
  last_name: string;
  patronymic: string;
}

export interface TeacherUpdate {
  first_name?: string;
  last_name?: string;
  patronymic?: string;
}

export interface TeacherAssignment {
  assignment_id: number;
  subject: {
    id: number;
    name: string;
    code: string;
    description?: string;
  };
  group: {
    id: number;
    name: string;
    course: number;
  };
}

export interface TeacherAssignmentCreate {
  teacher_id: number;
  subject_id: number;
  group_id: number;
}

export interface TeacherAssignmentResponse {
  id: number;
  teacher_id: number;
  subject_id: number;
  group_id: number;
  created_at: string;
  teacher_name: string;
  subject_name: string;
  group_name: string;
}

export interface TeacherSimple {
  teacher_id: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  patronymic?: string;
}

export interface StudentForTeacher {
  id: number;
  first_name: string;
  last_name: string;
  group_id: number | null;
  group_name: string | null;
  user_id: number | null;
  created_at: string;
}

export interface ScheduleItem {
  id: number;
  week_num: number;           // новое поле
  month: number;               // новое поле
  day: number;                 // новое поле
  academic_year: number | null;
  day_of_week: number;
  day_name: string;            // новое поле
  formatted_date: string;      // новое поле
  start_time: string;
  end_time: string;
  period: number | null;
  group_id: number;
  group_name: string | null;
  subject_id: number | null;
  subject_name: string | null;
  subject_code: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  classroom: string | null;
  lesson_type: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GradeForTeacher {
  id: number;
  student_id: number;
  student_name: string;
  subject_id: number;
  subject_name: string;
  group_id: number;
  group_name: string;
  grade: number;
  semester: number;
  academic_year: number;
  date_assigned: string;
}

export interface SubjectAssignment {
  id: number;
  name: string;
  code: string;
}

export interface LessonJournalFilters {
  group_id?: number;
  group_name?: string;
  subject_id?: number;
  subject_name?: string;
  month?: number;
  year?: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
  error?: string;
}

export interface GradeCreateData {
  student_id: number;
  subject_id: number;
  grade: number;
  semester: number;
  academic_year: number;
}

export interface GradeUpdateData {
  grade: number;
}


export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  group_id: number | null;
}

export interface Grade {
  id: number;
  student_id: number;
  grade: number;
  date_assigned: string;
}

// ===== ОЦЕНКИ ЗА ЗАНЯТИЕ =====
export interface LessonGrade {
  id: number;
  student_id: number;
  schedule_id: number;
  grade_type?: string | null;
  grade: number;
  created_at: string;
  updated_at: string;
  student_name?: string;
  formatted_date?: string;
  subject_name?: string;
}

export interface LessonGradeCreate {
  student_id: number;
  schedule_id: number;
  grade: number;
  grade_type?: string | null;
}

export interface LessonGradeUpdate {
  grade?: number;
  grade_type?: string | null;
}

// ===== ЖУРНАЛ УСПЕВАЕМОСТИ ПРЕПОДАВАТЕЛЯ =====
export interface TeacherJournalStudent {
  id: number;
  first_name: string;
  last_name: string;
}

export interface TeacherJournalLesson {
  id: number;
  date: string;          // "dd.mm"
  subject_id: number;
  subject_name: string;
}

export interface TeacherJournalGrade {
  student_id: number;
  grade: number;
  grade_type: string | null;
}

export interface TeacherJournalResponse {
  students: TeacherJournalStudent[];
  lessons: TeacherJournalLesson[];
  grades: Record<number, TeacherJournalGrade[]>; // ключ - schedule_id
  attendance?: Record<number, Array<{ student_id: number; status: string }>>; // новое поле
  final_grades?: Record<number, Record<number, number>>;
}