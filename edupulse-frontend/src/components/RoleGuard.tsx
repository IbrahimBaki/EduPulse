import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export type AppRole = 'manager' | 'teacher' | 'student' | 'parent'

const ROLE_PRIORITY: AppRole[] = ['manager', 'teacher', 'student', 'parent']

export function getPrimaryRole(roles: string[]): AppRole {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role
  }
  return 'student'
}

interface Props {
  role: AppRole
  children: React.ReactNode
}

export default function RoleGuard({ role, children }: Props) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const user            = useAuthStore(s => s.user)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const primary = getPrimaryRole(user?.roles ?? [])
  if (primary !== role) return <Navigate to={`/${primary}/dashboard`} replace />

  return <>{children}</>
}
