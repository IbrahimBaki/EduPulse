import axios from 'axios';

const api = axios.create({
    // Use a relative path so all requests go through Vite's dev server proxy
    // which forwards them to http://edupulse.localhost — no CORS issues!
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
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
