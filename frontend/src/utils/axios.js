import axios from 'axios';

const api = axios.create({
    baseURL: 'http://edupulse.localhost/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // For Sanctum CSRF cookies if needed
});

// Request interceptor to attach the Sanctum bearer token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
