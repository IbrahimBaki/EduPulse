import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import RoleGuard from '../components/RoleGuard'
import api from '../lib/axios'
import styles from './AppLayout.module.css'

// ─── Icons ───────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="var(--color-blue)" />
      <path d="M4 14h4l2.5-5 3 10 2.5-5H24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function BookOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z"/>
      <path d="M5 18l.5 1.5L7 20l-1.5.5L5 22l-.5-1.5L3 20l1.5-.5z"/>
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ─── Nav config ──────────────────────────────────────────────────────────────

type NavItem = { to: string; label: string; Icon: () => React.ReactElement; notif?: boolean }

const NAV_ITEMS: NavItem[] = [
  { to: '/student/dashboard',     label: 'Dashboard',     Icon: HomeIcon },
  { to: '/student/courses',       label: 'Courses',       Icon: BookOpenIcon },
  { to: '/student/ai-tutor',      label: 'AI Tutor',      Icon: SparklesIcon },
  { to: '/student/schedule',      label: 'Schedule',      Icon: CalendarIcon },
  { to: '/student/announcements', label: 'Announcements', Icon: FileTextIcon, notif: true },
  { to: '/student/fees',          label: 'Fees',          Icon: CreditCardIcon },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function StudentLayout() {
  const user       = useAuthStore(s => s.user)
  const tenantCode = useAuthStore(s => s.tenantCode)
  const clearAuth  = useAuthStore(s => s.clearAuth)
  const navigate   = useNavigate()

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['notifications-unread-count'],
    queryFn: () =>
      api.get('/notifications/unread-count').then(r => r.data.data.unread_count as number),
    staleTime:       2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })

  const initials = user?.name
    ? user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  const schoolName = tenantCode
    ? tenantCode.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <RoleGuard role="student">
      <div className={styles.shell}>

        {/* ── Sidebar (desktop) ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <LogoMark />
            <span className={styles.logoText}>
              Edu<span className={styles.logoAccent}>Pulse</span>
            </span>
          </div>

          {schoolName && <div className={styles.schoolLabel}>{schoolName}</div>}

          <nav className={styles.nav} aria-label="Student navigation">
            {NAV_ITEMS.map(({ to, label, Icon, notif }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navActive : ''}`
                }
              >
                <Icon />
                <span>{label}</span>
                {notif && unreadCount > 0 && (
                  <span className={styles.navBadge} aria-label={`${unreadCount} unread`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className={styles.userFooter}>
            <div className={styles.avatar} aria-hidden="true">{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>Student</span>
            </div>
            <button type="button" onClick={handleLogout} className={styles.logoutBtn} aria-label="Sign out">
              <LogOutIcon />
            </button>
          </div>
        </aside>

        {/* ── Mobile top bar ── */}
        <header className={styles.topBar}>
          <div className={styles.topBarLogo}>
            <LogoMark />
            <span className={styles.topBarSchool}>{schoolName || 'EduPulse'}</span>
          </div>
          <NavLink
            to="/student/announcements"
            className={styles.topBarBell}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className={styles.bellBadge} aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        </header>

        {/* ── Main content ── */}
        <main className={styles.main}>
          <Outlet />
        </main>

        {/* ── Bottom nav (mobile) ── */}
        <nav className={styles.bottomNav} aria-label="Student navigation">
          {NAV_ITEMS.map(({ to, label, Icon, notif }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.bottomTab} ${isActive ? styles.bottomTabActive : ''}`
              }
            >
              <span className={styles.bottomIcon}>
                <Icon />
                {notif && unreadCount > 0 && <span className={styles.tabDot} aria-hidden="true" />}
              </span>
              <span className={styles.bottomLabel}>{label}</span>
            </NavLink>
          ))}
        </nav>

      </div>
    </RoleGuard>
  )
}
