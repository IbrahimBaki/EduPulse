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

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
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
            },
            {
                path: 'manager',
                component: ManagerLayout,
                meta: { requiresAuth: true, role: 'manager' }, // Matches the Spatie role initialized in seeding
                children: [
                    { path: '', name: 'ManagerDashboard', component: ManagerDashboard }
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
        // Redirect to that specific tenant's login component
        return next(`/${to.params.tenantCode}/login`);
    }

    // Role-based authorization
    if (to.meta.requiresAuth && to.meta.role) {
        if (!authStore.hasRole(to.meta.role)) {
            // E.g. A teacher trying to access /manager
            // Send back to home or a 403 fallback
            return next('/');
        }
    }

    // If logged in, block access to guest routes (e.g., login)
    if (to.meta.guest && authStore.isAuthenticated) {
        // Redirect to their respective dashboard based on role
        if (authStore.hasRole('manager')) return next(`/${to.params.tenantCode}/manager`);
        if (authStore.hasRole('teacher')) return next(`/${to.params.tenantCode}/teacher`);
        if (authStore.hasRole('student')) return next(`/${to.params.tenantCode}/student`);
        if (authStore.hasRole('parent')) return next(`/${to.params.tenantCode}/parent`);

        return next('/');
    }

    next();
});

export default router;
