import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { h, resolveComponent } from 'vue';

// Lazy loading views for better performance
const Home = () => import('../views/Home.vue');
const Login = () => import('../views/auth/Login.vue');

// Layouts
const StudentLayout = () => import('../layouts/StudentLayout.vue');
const TeacherLayout = () => import('../layouts/TeacherLayout.vue');
const ParentLayout = () => import('../layouts/ParentLayout.vue');
const ManagerLayout = () => import('../layouts/ManagerLayout.vue');

// Views
const StudentDashboard = () => import('../views/student/Dashboard.vue');
const StudentCourses = () => import('../views/student/Courses.vue');
const TeacherDashboard = () => import('../views/teacher/Dashboard.vue');
const TeacherCourses = () => import('../views/teacher/Courses.vue');
const ParentDashboard = () => import('../views/parent/Dashboard.vue');
const ManagerDashboard = () => import('../views/manager/Dashboard.vue');
const ManagerUsers = () => import('../views/manager/Users.vue');
const ManagerCourses = () => import('../views/manager/Courses.vue');
const ManagerSettings = () => import('../views/manager/Settings.vue');

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
    },
    {
        path: '/manager',
        component: ManagerLayout,
        meta: { requiresAuth: true, role: 'manager' },
        children: [
            { path: '', name: 'ManagerDashboard', component: ManagerDashboard },
            { path: 'users', name: 'ManagerUsers', component: ManagerUsers },
            { path: 'courses', name: 'ManagerCourses', component: ManagerCourses },
            { path: 'settings', name: 'ManagerSettings', component: ManagerSettings }
        ]
    },
    {
        // Wrapper for all tenant-specific routes
        path: '/:tenantCode',
        component: { render: () => h(resolveComponent('router-view')) },
        children: [
            {
                path: 'login',
                name: 'Login',
                component: Login,
                meta: { guest: true }
            },
            {
                path: 'student',
                component: StudentLayout,
                meta: { requiresAuth: true, role: 'student' },
                children: [
                    { path: '', name: 'StudentDashboard', component: StudentDashboard },
                    { path: 'courses', name: 'StudentCourses', component: StudentCourses }
                ]
            },
            {
                path: 'teacher',
                component: TeacherLayout,
                meta: { requiresAuth: true, role: 'teacher' },
                children: [
                    { path: '', name: 'TeacherDashboard', component: TeacherDashboard },
                    { path: 'courses', name: 'TeacherCourses', component: TeacherCourses }
                ]
            },
            {
                path: 'parent',
                component: ParentLayout,
                meta: { requiresAuth: true, role: 'parent' },
                children: [
                    { path: '', name: 'ParentDashboard', component: ParentDashboard }
                ]
            }
        ]
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Vue Router Navigation Guards
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();

    // Check if route requires auth
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        // Fallback login redirect. If no tenantCode in route, try to get from store.
        const code = to.params.tenantCode || authStore.tenantCode || 'alpha';
        return next(`/${code}/login`);
    }

    // Role-based authorization
    if (to.meta.requiresAuth && to.meta.role) {
        if (!authStore.hasRole(to.meta.role)) {
            return next('/');
        }
    }

    // If logged in, block access to guest routes (e.g., login)
    if (to.meta.guest && authStore.isAuthenticated) {
        // Redirect to their respective dashboard based on role
        if (authStore.hasRole('manager')) return next(`/manager`);
        if (authStore.hasRole('teacher')) return next(`/${to.params.tenantCode || authStore.tenantCode}/teacher`);
        if (authStore.hasRole('student')) return next(`/${to.params.tenantCode || authStore.tenantCode}/student`);
        if (authStore.hasRole('parent')) return next(`/${to.params.tenantCode || authStore.tenantCode}/parent`);

        return next('/');
    }

    next();
});

export default router;
