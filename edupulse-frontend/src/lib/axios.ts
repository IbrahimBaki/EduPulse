import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Inject Bearer token + tenant prefix before every request
api.interceptors.request.use((config) => {
  const { token, tenantCode } = useAuthStore.getState()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (tenantCode && config.url && !config.url.startsWith(`/${tenantCode}`)) {
    config.url = `/${tenantCode}${config.url}`
  }

  return config
})

// On 401 clear auth state so the router redirects to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth()
    }
    return Promise.reject(err)
  },
)

export default api
