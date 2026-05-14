import { useAuthStore } from '../../stores/authStore'

export default function TeacherDashboard() {
  const user = useAuthStore(s => s.user)
  return (
    <div style={{ padding: '40px 48px' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.2 }}>
        Dashboard
      </h1>
      <p style={{ marginTop: '6px', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
        Welcome back, {user?.name?.split(' ')[0]}. Teacher dashboard coming soon.
      </p>
    </div>
  )
}
