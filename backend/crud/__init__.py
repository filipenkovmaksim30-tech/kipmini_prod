from .user import (
    create_user,
    authenticate_user,
    get_user_by_id,
    get_users_with_filter,
    update_user_role,
    change_user_password,
    change_user_email,
    admin_reset_password,
    get_student_id_by_user_id
)

from .student import (
    insert_student,
    get_all_students,
    get_student_by_id,
    get_student_by_name_basic,
    get_student_by_name_with_grades,
    delete_student_by_id,
    update_student,
    replace_student_by_id,
    get_student_by_user_id,
    get_student_group_id,
    get_student_semester_journal
)


from .group import (
    create_group,
    get_all_groups,
    get_group_by_id,
    get_group_by_name,
    get_students_by_group_name,
    update_group,
)

from .subject import (
    create_subject,
    get_all_subject,
    get_subject_by_id,
    update_subject,
    delete_subject,
)


from .grade import (
    create_grade,
    update_grade,
    get_grades_by_student_id,
    get_all_grades,
    get_grade_info,
    get_student_semester_grades,
)



from .teacher import (
    create_teacher,
    update_teacher,
    get_teacher_by_id,
    get_teacher_id_by_user_id,
    get_all_teachers,
    assign_teacher_to_subject_group,
    get_teacher_subjects_and_groups,
    get_teachers_by_subject_and_group,
    check_teacher_permission,
    get_grades_by_student_id_for_teacher,
    get_all_grades_for_teacher,
    get_teacher_by_user_id_with_details,
    check_teacher_permission_by_user_id,
)

from .schedule import (
    create_schedule,
    update_schedule,
    delete_schedule,
    get_schedule_by_id,
    get_all_schedules,
    get_daily_group_schedule,
    get_weekly_group_schedule,
    get_daily_teacher_schedule,
    get_weekly_teacher_schedule,
    copy_schedule,
)

from .homework import (
    create_homework,
    get_homework_by_id,
    update_homework,
    delete_homework,
    get_homeworks_for_teacher_group,
    get_homework_by_schedule,
    add_homework_file,
    get_homework_files,
    delete_homework_file
)

from .lesson_grade import (
    create_lesson_grade,
    update_lesson_grade,
    delete_lesson_grade,
    get_lesson_grades_by_schedule,
    get_lesson_grades_for_student,

)

from .journal import (
    get_student_semester_journal
)

from .attendance import (
    get_attendance_for_schedule,
    update_attendance,
    bulk_update_attendance,
    get_student_attendance_summary,
)