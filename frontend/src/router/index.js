import { createRouter, createWebHistory } from 'vue-router';

// Lazy loading views for better performance
const Home = () => import('../views/Home.vue');
const Login = () => import('../views/auth/Login.vue');

// Layouts
const StudentLayout = () => import('../layouts/StudentLayout.vue');

// Student Views
const StudentDashboard = () => import('../views/student/Dashboard.vue');
const StudentCourses = () => import('../views/student/Courses.vue');

// Teacher Views
const TeacherLayout = () => import('../layouts/TeacherLayout.vue');
const TeacherDashboard = () => import('../views/teacher/Dashboard.vue');
const TeacherCourses = () => import('../views/teacher/Courses.vue');

// Parent Views
const ParentLayout = () => import('../layouts/ParentLayout.vue');
const ParentDashboard = () => import('../views/parent/Dashboard.vue');

// Manager Views
const ManagerLayout = () => import('../layouts/ManagerLayout.vue');
const ManagerDashboard = () => import('../views/manager/Dashboard.vue');

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
    },
    {
        path: '/student',
        component: StudentLayout,
        children: [
            { path: '', name: 'StudentDashboard', component: StudentDashboard },
            { path: 'courses', name: 'StudentCourses', component: StudentCourses }
        ]
    },
    {
        path: '/teacher',
        component: TeacherLayout,
        children: [
            { path: '', name: 'TeacherDashboard', component: TeacherDashboard },
            { path: 'courses', name: 'TeacherCourses', component: TeacherCourses }
        ]
    },
    {
        path: '/parent',
        component: ParentLayout,
        children: [
            { path: '', name: 'ParentDashboard', component: ParentDashboard }
        ]
    },
    {
        path: '/manager',
        component: ManagerLayout,
        children: [
            { path: '', name: 'ManagerDashboard', component: ManagerDashboard }
        ]
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
