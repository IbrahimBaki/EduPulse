import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import RoleGuard from '../components/RoleGuard'
import styles from './AppLayout.module.css'

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="var(--color-blue)" />
      <path d="M4 14h4l2.5-5 3 10 2.5-5H24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HomeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}

function BookOpenIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}

function ClipboardIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
}

function BarChartIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}

function CalendarIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}

function LogOutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}

type NavItem = { to: string; label: string; Icon: () => React.ReactElement }

const NAV_ITEMS: NavItem[] = [
  { to: '/teacher/dashboard',   label: 'Dashboard',   Icon: HomeIcon },
  { to: '/teacher/classes',     label: 'My Classes',  Icon: BookOpenIcon },
  { to: '/teacher/assignments', label: 'Assignments', Icon: ClipboardIcon },
  { to: '/teacher/grades',      label: 'Grades',      Icon: BarChartIcon },
  { to: '/teacher/schedule',    label: 'Schedule',    Icon: CalendarIcon },
]

export default function TeacherLayout() {
  const user       = useAuthStore(s => s.user)
  const tenantCode = useAuthStore(s => s.tenantCode)
  const clearAuth  = useAuthStore(s => s.clearAuth)
  const navigate   = useNavigate()

  const initials = user?.name
    ? user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  const schoolName = tenantCode
    ? tenantCode.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''

  return (
    <RoleGuard role="teacher">
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <LogoMark />
            <span className={styles.logoText}>Edu<span className={styles.logoAccent}>Pulse</span></span>
          </div>
          {schoolName && <div className={styles.schoolLabel}>{schoolName}</div>}
          <nav className={styles.nav} aria-label="Teacher navigation">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
                <Icon /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className={styles.userFooter}>
            <div className={styles.avatar} aria-hidden="true">{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>Teacher</span>
            </div>
            <button type="button" onClick={() => { clearAuth(); navigate('/login', { replace: true }) }} className={styles.logoutBtn} aria-label="Sign out">
              <LogOutIcon />
            </button>
          </div>
        </aside>
        <main className={styles.main}><Outlet /></main>
      </div>
    </RoleGuard>
  )
}
