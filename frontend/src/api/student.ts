import axiosInstance from './axiosConfig';
import {
  StudentProfile,
  Grade,
  ScheduleItem,
  SemesterGrades,
  LessonGrade,
  StudentJournalResponse,
  StudentJournalLesson,
  StudentJournalGrade,
} from '../types/student.types';
import { Homework } from '../types/homework.types';
import { StudentAttendanceSummary, AttendanceStatus } from '../types/attendance.types';
import { getCurrentAcademicYear } from '../utils/dateUtils';

export const studentApi = {
  // ---------- Профиль ----------
  getProfile: async (): Promise<StudentProfile> => {
    const response = await axiosInstance.get('/student/me');
    return response.data;
  },

  // ---------- Оценки (все) ----------
  getGrades: async (): Promise<Grade[]> => {
    const response = await axiosInstance.get('/student/my-grades');
    return response.data;
  },

  // ---------- Оценки за семестр ----------
  getSemesterGrades: async (semester: number, academicYear: number): Promise<SemesterGrades> => {
    const response = await axiosInstance.get(
      `/student/my-semester-grades?semester=${semester}&academic_year=${academicYear}`
    );
    return response.data;
  },

  // ---------- Расписание ----------
  getDailySchedule: async (
    academicYear: number,
    month: number,
    day: number,
    weekNum?: number
  ): Promise<ScheduleItem[]> => {
    const params = new URLSearchParams({
      academic_year: academicYear.toString(),
      month: month.toString(),
      day: day.toString(),
    });
    if (weekNum !== undefined) {
      params.append('week_num', weekNum.toString());
    }
    const response = await axiosInstance.get(`/schedules/student/my-daily?${params.toString()}`);
    return response.data;
  },

  getWeeklySchedule: async (
    academicYear: number,
    weekStart: string,
    weekNum?: number
  ): Promise<Record<string, ScheduleItem[]>> => {
    const params = new URLSearchParams({
      academic_year: academicYear.toString(),
      week_start: weekStart,
    });
    if (weekNum !== undefined) {
      params.append('week_num', weekNum.toString());
    }
    const response = await axiosInstance.get(`/schedules/student/my-weekly?${params.toString()}`);
    return response.data;
  },

  // ---------- Домашние задания ----------
  getHomeworkForSchedule: async (scheduleId: number): Promise<Homework | null> => {
    try {
      const response = await axiosInstance.get(`/homework/student/schedule/${scheduleId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  getHomeworkFiles: async (homeworkId: number): Promise<any[]> => {
    const response = await axiosInstance.get(`/homework/${homeworkId}/files`);
    return response.data;
  },

  // ---------- Оценки за занятие ----------
  getLessonGradesForSchedule: async (scheduleId: number): Promise<LessonGrade[]> => {
    const response = await axiosInstance.get(`/lesson-grades/student/schedule/${scheduleId}`);
    return response.data;
  },

  // ---------- Журнал успеваемости (все занятия и оценки) ----------
  getSemesterJournal: async (semester: number, academicYear: number): Promise<StudentJournalResponse> => {
    const response = await axiosInstance.get(`/student/my-semester-journal?semester=${semester}&academic_year=${academicYear}`);
    return response.data;
  },

  // ---------- Детализация по предмету ----------
  getSubjectGrades: async (
    subjectId: number,
    semester: number,
    academicYear: number
  ): Promise<{ lessons: StudentJournalLesson[]; grades: StudentJournalGrade[] }> => {
    const response = await axiosInstance.get(
      `/student/my-semester-journal?semester=${semester}&academic_year=${academicYear}&subject_id=${subjectId}`
    );
    return response.data;
  },

  // ---------- Посещаемость ----------
  getMyAttendanceSummary: async (semester: number, academicYear: number): Promise<StudentAttendanceSummary[]> => {
    const response = await axiosInstance.get(`/attendance/student/my?semester=${semester}&academic_year=${academicYear}`);
    return response.data;
  },

  // Получить статус посещаемости для конкретного занятия
  getMyAttendanceForSchedule: async (scheduleId: number): Promise<AttendanceStatus | null> => {
    try {
      const response = await axiosInstance.get(`/attendance/student/schedule/${scheduleId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  // ---------- Текущий семестр ----------
  getCurrentSemester: (): { semester: number; academicYear: number } => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let academicYear = year;
    let semester = 1;
    if (month >= 2 && month <= 6) {
      academicYear = year - 1;
      semester = 2;
    } else if (month >= 9) {
      semester = 1;
    }
    return { semester, academicYear };
  },
};