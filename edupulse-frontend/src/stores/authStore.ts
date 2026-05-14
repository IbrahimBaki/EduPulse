import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: number
  name: string
  email: string
  roles: string[]
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  tenantCode: string | null
  setAuth: (token: string, user: AuthUser, tenantCode: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      tenantCode: null,

      setAuth: (token, user, tenantCode) => set({ token, user, tenantCode }),

      clearAuth: () => set({ token: null, user: null, tenantCode: null }),

      isAuthenticated: () => !!get().token,
    }),
    { name: 'edupulse-auth' },
  ),
)
