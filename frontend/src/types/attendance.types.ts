export type AttendanceStatus = 'absent' | 'absent_excused' | 'absent_sick' | 'late';

export interface StudentAttendanceSummary {
  subject_id: number;
  subject_name: string;
  total_absences: number;
  absent_count: number;
  absent_excused_count: number;
  absent_sick_count: number;
  late_count: number;
}