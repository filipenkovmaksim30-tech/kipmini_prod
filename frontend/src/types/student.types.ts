export interface StudentProfile {
  id: number;
  first_name: string;
  last_name: string;
  group_id: number | null;
  group_name: string | null;
  user_id: number;
  created_at: string;
}

export interface Grade {
  id: number;
  student_id: number;
  subject_id: number;
  grade: number;
  semester: number;
  academic_year: number;
  date_assigned: string;
  subject_name: string;
  subject_code: string;
}

export interface ScheduleItem {
  id: number;
  week_num: number;           // номер учебной недели
  month: number;               // месяц (1-12)
  day: number;                 // день месяца (1-31)
  academic_year: number | null;
  day_of_week: number;         // 1-7 (пн-вс)
  day_name: string;            // название дня недели
  formatted_date: string;      // отформатированная дата "ДД.ММ"
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

export interface SemesterGrades {
  student_id: number;
  semester: number;
  academic_year: number;
  grades: {
    id: number;
    subject_id: number;
    subject_name: string;
    subject_code: string;
    grade: number;
    date_assigned: string;
  }[];
}

// ===== ОЦЕНКИ ЗА ЗАНЯТИЕ ДЛЯ СТУДЕНТА =====
export interface LessonGrade {
  id: number;
  student_id: number;
  schedule_id: number;
  grade_type?: string;
  grade: number;
  created_at: string;
  updated_at: string;
  student_name?: string;
  formatted_date?: string;
  subject_name?: string;
}

// ===== ЖУРНАЛ УСПЕВАЕМОСТИ СТУДЕНТА =====
export interface StudentJournalLesson {
  id: number;
  date: string;          // "dd.mm"
  subject_name: string;
  subject_id: number;
}

export interface StudentJournalGrade {
  schedule_id: number;
  grade: number;
  grade_type: string | null;
}

export interface StudentJournalResponse {
  lessons: StudentJournalLesson[];
  grades: StudentJournalGrade[];
}