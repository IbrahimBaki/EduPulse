import { defineStore } from 'pinia';
import api from '../utils/axios';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null,
        tenantCode: localStorage.getItem('tenantCode') || null,
        roles: JSON.parse(localStorage.getItem('roles')) || [],
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,
        hasRole: (state) => (role) => state.roles.includes(role),
    },

    actions: {
        setTenantCode(code) {
            this.tenantCode = code;
            localStorage.setItem('tenantCode', code);
        },

        async login(tenantCode, email, password) {
            this.setTenantCode(tenantCode);
            try {
                // Calling the new Path-Parameter Multi-Tenant API
                const response = await api.post(`/${tenantCode}/auth/login`, {
                    email,
                    password
                });

                const payload = response.data.data;

                this.token = payload.access_token;
                this.user = payload.user;
                this.roles = payload.user.roles || [];

                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                localStorage.setItem('roles', JSON.stringify(this.roles));

                return response.data;
            } catch (error) {
                throw error;
            }
        },

        async logout() {
            try {
                if (this.tenantCode && this.token) {
                    await api.post(`/${this.tenantCode}/auth/logout`);
                }
            } catch (error) {
                console.error('Logout request failed', error);
            } finally {
                this.clearAuth();
            }
        },

        clearAuth() {
            this.user = null;
            this.token = null;
            this.roles = [];
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('roles');
        }
    }
});
