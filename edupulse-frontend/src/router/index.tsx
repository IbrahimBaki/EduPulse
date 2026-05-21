import { createBrowserRouter, Navigate } from 'react-router-dom'

import LoginPage      from '../pages/LoginPage'
import NotFoundPage   from '../pages/NotFoundPage'

import StudentLayout  from '../layouts/StudentLayout'
import ManagerLayout  from '../layouts/ManagerLayout'
import TeacherLayout  from '../layouts/TeacherLayout'
import ParentLayout   from '../layouts/ParentLayout'

import StudentDashboard      from '../pages/student/Dashboard'
import StudentCourses        from '../pages/student/Courses'
import StudentCourseDetail   from '../pages/student/CourseDetail'
import StudentAiTutor        from '../pages/student/AiTutor'
import StudentSchedule       from '../pages/student/Schedule'
import StudentAnnouncements  from '../pages/student/Announcements'
import StudentFees           from '../pages/student/Fees'
import StudentExams          from '../pages/student/Exams'
import StudentExamTaking     from '../pages/student/ExamTaking'
import StudentExamResult     from '../pages/student/ExamResult'
import ManagerDashboard from '../pages/manager/Dashboard'
import ManagerStudents  from '../pages/manager/Students'
import ManagerParents   from '../pages/manager/Parents'
import ManagerTeachers  from '../pages/manager/Teachers'
import ManagerCourses   from '../pages/manager/Courses'
import ManagerSettings  from '../pages/manager/Settings'
import ManagerSchedule  from '../pages/manager/Schedule'
import ManagerFinance   from '../pages/manager/Finance'
import ManagerAnnouncements from '../pages/manager/Announcements'
import ManagerSchoolProfile from '../pages/manager/SchoolProfile'
import TeacherDashboard      from '../pages/teacher/Dashboard'
import TeacherCourses         from '../pages/teacher/Courses'
import TeacherCourseDetail    from '../pages/teacher/CourseDetail'
import TeacherSchedule        from '../pages/teacher/Schedule'
import TeacherStudents        from '../pages/teacher/Students'
import TeacherAnnouncements   from '../pages/teacher/Announcements'
import TeacherExams           from '../pages/teacher/Exams'
import TeacherExamGenerator   from '../pages/teacher/ExamGenerator'
import TeacherExamPreview     from '../pages/teacher/ExamPreview'
import TeacherExamResults     from '../pages/teacher/ExamResults'
import TeacherProfile     from '../pages/teacher/Profile'
import StudentProfile     from '../pages/student/Profile'
import ParentProfile      from '../pages/parent/Profile'
import ParentDashboard    from '../pages/parent/Dashboard'
import ParentChildren    from '../pages/parent/Children'
import ParentChildDetail from '../pages/parent/ChildDetail'
import ParentAttendance  from '../pages/parent/Attendance'
import ParentExams       from '../pages/parent/Exams'
import ParentFees        from '../pages/parent/Fees'
import ParentAnnouncements from '../pages/parent/Announcements'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  // ── Student ──────────────────────────────────────────────────────────────
  {
    path: '/student',
    element: <StudentLayout />,
    children: [
      { index: true,                   element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',             element: <StudentDashboard /> },
      { path: 'courses',               element: <StudentCourses /> },
      { path: 'courses/:courseId',     element: <StudentCourseDetail /> },
      { path: 'ai-tutor',              element: <StudentAiTutor /> },
      { path: 'exams',                 element: <StudentExams /> },
      { path: 'exams/:examId/take',    element: <StudentExamTaking /> },
      { path: 'exams/:examId/result',  element: <StudentExamResult /> },
      { path: 'schedule',              element: <StudentSchedule /> },
      { path: 'announcements',         element: <StudentAnnouncements /> },
      { path: 'fees',                  element: <StudentFees /> },
      { path: 'profile',               element: <StudentProfile /> },
    ],
  },

  // ── Manager ──────────────────────────────────────────────────────────────
  {
    path: '/manager',
    element: <ManagerLayout />,
    children: [
      { index: true,                 element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',           element: <ManagerDashboard /> },
      { path: 'students',            element: <ManagerStudents /> },
      { path: 'parents',             element: <ManagerParents /> },
      { path: 'teachers',            element: <ManagerTeachers /> },
      { path: 'courses',             element: <ManagerCourses /> },
      { path: 'schedule',            element: <ManagerSchedule /> },
      { path: 'finance',             element: <ManagerFinance /> },
      { path: 'announcements',       element: <ManagerAnnouncements /> },
      { path: 'settings',            element: <ManagerSettings /> },
      { path: 'school-profile',      element: <ManagerSchoolProfile /> },
    ],
  },

  // ── Teacher ──────────────────────────────────────────────────────────────
  {
    path: '/teacher',
    element: <TeacherLayout />,
    children: [
      { index: true,                    element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',              element: <TeacherDashboard /> },
      { path: 'courses',                element: <TeacherCourses /> },
      { path: 'courses/:courseId',      element: <TeacherCourseDetail /> },
      { path: 'schedule',               element: <TeacherSchedule /> },
      { path: 'students',               element: <TeacherStudents /> },
      { path: 'exams',                  element: <TeacherExams /> },
      { path: 'exams/generate',         element: <TeacherExamGenerator /> },
      { path: 'exams/:examId',          element: <TeacherExamPreview /> },
      { path: 'exams/:examId/results',  element: <TeacherExamResults /> },
      { path: 'announcements',          element: <TeacherAnnouncements /> },
      { path: 'profile',                element: <TeacherProfile /> },
    ],
  },

  // ── Parent ───────────────────────────────────────────────────────────────
  {
    path: '/parent',
    element: <ParentLayout />,
    children: [
      { index: true,                    element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',             element: <ParentDashboard /> },
      { path: 'children',              element: <ParentChildren /> },
      { path: 'children/:childId',     element: <ParentChildDetail /> },
      { path: 'attendance',            element: <ParentAttendance /> },
      { path: 'exams',                 element: <ParentExams /> },
      { path: 'fees',                  element: <ParentFees /> },
      { path: 'announcements',         element: <ParentAnnouncements /> },
      { path: 'profile',               element: <ParentProfile /> },
    ],
  },

  // ── Root redirect (unauthenticated lands on /login via RoleGuard) ────────
  { path: '/', element: <Navigate to="/login" replace /> },

  { path: '*', element: <NotFoundPage /> },
])

export default router
