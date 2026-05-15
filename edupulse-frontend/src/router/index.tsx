import { createBrowserRouter, Navigate } from 'react-router-dom'

import LoginPage      from '../pages/LoginPage'
import NotFoundPage   from '../pages/NotFoundPage'

import StudentLayout  from '../layouts/StudentLayout'
import ManagerLayout  from '../layouts/ManagerLayout'
import TeacherLayout  from '../layouts/TeacherLayout'
import ParentLayout   from '../layouts/ParentLayout'

import StudentDashboard from '../pages/student/Dashboard'
import ManagerDashboard from '../pages/manager/Dashboard'
import ManagerStudents  from '../pages/manager/Students'
import ManagerTeachers  from '../pages/manager/Teachers'
import ManagerCourses   from '../pages/manager/Courses'
import ManagerSettings  from '../pages/manager/Settings'
import ManagerSchedule  from '../pages/manager/Schedule'
import ManagerFinance   from '../pages/manager/Finance'
import ManagerAnnouncements from '../pages/manager/Announcements'
import TeacherDashboard      from '../pages/teacher/Dashboard'
import TeacherCourses         from '../pages/teacher/Courses'
import TeacherCourseDetail    from '../pages/teacher/CourseDetail'
import TeacherSchedule        from '../pages/teacher/Schedule'
import TeacherStudents        from '../pages/teacher/Students'
import TeacherAnnouncements   from '../pages/teacher/Announcements'
import ParentDashboard  from '../pages/parent/Dashboard'

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: '40px 48px' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
        {title}
      </h1>
      <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Coming soon.</p>
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  // ── Student ──────────────────────────────────────────────────────────────
  {
    path: '/student',
    element: <StudentLayout />,
    children: [
      { index: true,              element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',        element: <StudentDashboard /> },
      { path: 'courses',          element: <Placeholder title="My Courses" /> },
      { path: 'schedule',         element: <Placeholder title="Schedule" /> },
      { path: 'announcements',    element: <Placeholder title="Announcements" /> },
      { path: 'fees',             element: <Placeholder title="Fees" /> },
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
      { path: 'teachers',            element: <ManagerTeachers /> },
      { path: 'courses',             element: <ManagerCourses /> },
      { path: 'schedule',            element: <ManagerSchedule /> },
      { path: 'finance',             element: <ManagerFinance /> },
      { path: 'announcements',       element: <ManagerAnnouncements /> },
      { path: 'settings',            element: <ManagerSettings /> },
    ],
  },

  // ── Teacher ──────────────────────────────────────────────────────────────
  {
    path: '/teacher',
    element: <TeacherLayout />,
    children: [
      { index: true,              element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',        element: <TeacherDashboard /> },
      { path: 'courses',          element: <TeacherCourses /> },
      { path: 'courses/:courseId', element: <TeacherCourseDetail /> },
      { path: 'schedule',         element: <TeacherSchedule /> },
      { path: 'students',         element: <TeacherStudents /> },
      { path: 'announcements',    element: <TeacherAnnouncements /> },
    ],
  },

  // ── Parent ───────────────────────────────────────────────────────────────
  {
    path: '/parent',
    element: <ParentLayout />,
    children: [
      { index: true,             element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',       element: <ParentDashboard /> },
      { path: 'children',        element: <Placeholder title="Children" /> },
      { path: 'fees',            element: <Placeholder title="Fees" /> },
      { path: 'announcements',   element: <Placeholder title="Announcements" /> },
    ],
  },

  // ── Root redirect (unauthenticated lands on /login via RoleGuard) ────────
  { path: '/', element: <Navigate to="/login" replace /> },

  { path: '*', element: <NotFoundPage /> },
])

export default router
