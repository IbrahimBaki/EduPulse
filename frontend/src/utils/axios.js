import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    withCredentials: true, // Required for Sanctum CSRF and Session Cookies
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});

// Interceptor to add Authorization token if available in local storage
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');

    // For specific tenant handling matching our backend X-Tenant-Domain middleware
    // We could either send a domain header or rely on the actual Subdomain
    const tenantDomain = localStorage.getItem('tenant_domain');
    if (tenantDomain) {
        config.headers['X-Tenant-Domain'] = tenantDomain;
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Optional: Automatically logout user and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default api;
