import axiosInstance from './axiosConfig';
import {
  TeacherProfile,
  StudentForTeacher,
  ScheduleItem,
  GradeForTeacher,
  SubjectAssignment,
  LessonGrade,
  LessonGradeCreate,
  LessonGradeUpdate,
  TeacherJournalResponse,
} from '../types/teacher.types';
import { AttendanceStatus } from '../types/attendance.types';

class TeacherApi {
  // ---------- Профиль ----------
  async getProfile(): Promise<TeacherProfile> {
    const response = await axiosInstance.get('/teacher/my-profile');
    return response.data;
  }

  // ---------- Расписание ----------
  async getDailySchedule(
    academicYear: number,
    month: number,
    day: number,
    weekNum?: number
  ): Promise<ScheduleItem[]> {
    const params = new URLSearchParams({
      academic_year: academicYear.toString(),
      month: month.toString(),
      day: day.toString(),
    });
    if (weekNum !== undefined) {
      params.append('week_num', weekNum.toString());
    }
    const response = await axiosInstance.get(`/schedules/teacher/my-daily?${params.toString()}`);
    return response.data;
  }

  async getWeeklySchedule(
    academicYear: number,
    weekStart: string,
    weekNum?: number
  ): Promise<Record<string, ScheduleItem[]>> {
    const params = new URLSearchParams({
      academic_year: academicYear.toString(),
      week_start: weekStart,
    });
    if (weekNum !== undefined) {
      params.append('week_num', weekNum.toString());
    }
    const response = await axiosInstance.get(`/schedules/teacher/my-weekly?${params.toString()}`);
    return response.data;
  }

  // ---------- Домашние задания ----------
  async createHomework(data: any): Promise<any> {
    const response = await axiosInstance.post('/homework/', data);
    return response.data;
  }

  async getHomeworkForSchedule(scheduleId: number): Promise<any | null> {
    try {
      const response = await axiosInstance.get(`/homework/teacher/schedule/${scheduleId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async getHomeworksForGroup(groupId: number): Promise<any[]> {
    const response = await axiosInstance.get(`/homework/teacher/group/${groupId}`);
    return response.data;
  }

  async updateHomework(homeworkId: number, data: { text: string; topic?: string }): Promise<any> {
    const response = await axiosInstance.patch(`/homework/${homeworkId}`, data);
    return response.data;
  }

  async deleteHomework(homeworkId: number): Promise<void> {
    await axiosInstance.delete(`/homework/${homeworkId}`);
  }

  // ---------- Файлы домашних заданий ----------
  async uploadHomeworkFile(homeworkId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/homework/${homeworkId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getHomeworkFiles(homeworkId: number): Promise<any[]> {
    const response = await axiosInstance.get(`/homework/${homeworkId}/files`);
    return response.data;
  }

  async deleteHomeworkFile(fileId: number): Promise<void> {
    await axiosInstance.delete(`/homework/files/${fileId}`);
  }

  // ---------- Оценки за занятие ----------
  async getLessonGradesBySchedule(scheduleId: number): Promise<LessonGrade[]> {
    const response = await axiosInstance.get(`/lesson-grades/schedule/${scheduleId}`);
    return response.data;
  }

  async createLessonGrade(data: LessonGradeCreate): Promise<LessonGrade> {
    const response = await axiosInstance.post('/lesson-grades/', data);
    return response.data;
  }

  async updateLessonGrade(gradeId: number, data: LessonGradeUpdate): Promise<LessonGrade> {
    const response = await axiosInstance.patch(`/lesson-grades/${gradeId}`, data);
    return response.data;
  }

  async deleteLessonGrade(gradeId: number): Promise<void> {
    await axiosInstance.delete(`/lesson-grades/${gradeId}`);
  }

  // ---------- Журнал успеваемости группы ----------
  async getGroupJournal(groupId: number, semester: number, academicYear: number): Promise<TeacherJournalResponse> {
    const response = await axiosInstance.get(`/teacher/group/${groupId}/journal?semester=${semester}&academic_year=${academicYear}`);
    return response.data;
  }

  // ---------- Получение оценок студента (семестровых) ----------
  async getStudentGrades(studentId: number): Promise<any[]> {
    const response = await axiosInstance.get(`/teacher/students/${studentId}/grades`);
    return response.data;
  }

  // ---------- Посещаемость ----------
  async getAttendanceForSchedule(scheduleId: number): Promise<Record<number, AttendanceStatus>> {
    const response = await axiosInstance.get(`/attendance/schedule/${scheduleId}`);
    return response.data;
  }

  async updateAttendanceBulk(scheduleId: number, attendance: Record<number, AttendanceStatus>): Promise<void> {
    await axiosInstance.post(`/attendance/schedule/${scheduleId}`, { attendance });
  }

  // ---------- Студенты и предметы ----------
  async getMyStudents(): Promise<StudentForTeacher[]> {
    try {
      const profile = await this.getProfile();
      if (!profile.assignments || profile.assignments.length === 0) return [];

      const allStudents: StudentForTeacher[] = [];
      for (const assignment of profile.assignments) {
        try {
          const response = await axiosInstance.get(`/groups/${assignment.group.name}/students`);
          const students: StudentForTeacher[] = response.data;
          students.forEach(student => {
            if (!allStudents.some(s => s.id === student.id)) {
              allStudents.push(student);
            }
          });
        } catch (error) {
          console.error(`Ошибка загрузки студентов для группы ${assignment.group.name}:`, error);
        }
      }
      return allStudents;
    } catch (error: any) {
      console.error('Ошибка загрузки студентов преподавателя:', error);
      throw error;
    }
  }

  async getMyGrades(): Promise<GradeForTeacher[]> {
    try {
      const response = await axiosInstance.get('/teacher/my-grades');
      return response.data;
    } catch (error: any) {
      console.error('Ошибка загрузки оценок преподавателя:', error);
      if (error.response?.status === 404) return [];
      // fallback
      try {
        const students = await this.getMyStudents();
        const profile = await this.getProfile();
        if (!profile.assignments || profile.assignments.length === 0) return [];

        const allGrades: GradeForTeacher[] = [];
        const teacherSubjectIds = profile.assignments.map(a => a.subject.id);

        for (const student of students) {
          try {
            const gradesResponse = await axiosInstance.get(`/students/${student.id}/grades`);
            const studentGrades = gradesResponse.data;
            const filteredGrades = studentGrades
              .filter((grade: any) => teacherSubjectIds.includes(grade.subject_id))
              .map((grade: any) => ({
                ...grade,
                student_name: `${student.first_name} ${student.last_name}`,
                group_name: student.group_name,
                subject_name: grade.subject_name || `Предмет ID ${grade.subject_id}`,
                group_id: student.group_id,
              }));
            allGrades.push(...filteredGrades);
          } catch (studentError) {
            console.error(`Не удалось получить оценки для студента ${student.id}:`, studentError);
          }
        }
        return allGrades;
      } catch (fallbackError) {
        console.error('Альтернативный способ также не сработал:', fallbackError);
        return [];
      }
    }
  }

  async getMySubjects(): Promise<SubjectAssignment[]> {
    try {
      const profile = await this.getProfile();
      if (!profile.assignments) return [];
      const uniqueSubjects = new Map<number, SubjectAssignment>();
      profile.assignments.forEach(assignment => {
        if (!uniqueSubjects.has(assignment.subject.id)) {
          uniqueSubjects.set(assignment.subject.id, {
            id: assignment.subject.id,
            name: assignment.subject.name,
            code: assignment.subject.code,
          });
        }
      });
      return Array.from(uniqueSubjects.values());
    } catch (error) {
      console.error('Ошибка загрузки предметов преподавателя:', error);
      return [];
    }
  }

  async getMyGroups(): Promise<Array<{id: number, name: string, course: number}>> {
    try {
      const profile = await this.getProfile();
      if (!profile.assignments) return [];
      const uniqueGroups = new Map<number, {id: number, name: string, course: number}>();
      profile.assignments.forEach(assignment => {
        if (!uniqueGroups.has(assignment.group.id)) {
          uniqueGroups.set(assignment.group.id, assignment.group);
        }
      });
      return Array.from(uniqueGroups.values());
    } catch (error) {
      console.error('Ошибка загрузки групп преподавателя:', error);
      return [];
    }
  }

  // ---------- Семестровые оценки (создание/обновление) ----------
  async createGrade(gradeData: {
    student_id: number;
    subject_id: number;
    grade: number;
    semester: number;
    academic_year: number;
  }) {
    const response = await axiosInstance.post('/grades/', gradeData);
    return response.data;
  }

  async updateGrade(gradeId: number, grade: number) {
    const response = await axiosInstance.patch(`/grades/${gradeId}`, { grade });
    return response.data;
  }

  getCurrentSemester(): { semester: number; academicYear: number } {
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
  }
}

export const teacherApi = new TeacherApi();