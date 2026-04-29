export interface Homework {
  id: number;
  schedule_id: number;
  text: string;
  topic?: string;           // новая необязательная тема
  created_at: string;
  updated_at: string;
  formatted_date?: string;
  group_name?: string;
  subject_name?: string;
  teacher_name?: string;
  week_num?: number;
}

export interface HomeworkCreate {
  schedule_id: number;
  text: string;
  topic?: string;           // новая необязательная тема
}

export interface HomeworkUpdate {
  text: string;
  topic?: string;           // новая необязательная тема
}