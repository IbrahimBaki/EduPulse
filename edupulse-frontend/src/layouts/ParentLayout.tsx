import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import RoleGuard from '../components/RoleGuard'
import TopControls from '../components/TopControls'
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

function UsersIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}

function CreditCardIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
}

function FileTextIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
}

function LogOutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}

function CalendarIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}

function ClipboardListIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
}

type NavItem = { to: string; tKey: string; Icon: () => React.ReactElement }

const NAV_ITEMS: NavItem[] = [
  { to: '/parent/dashboard',     tKey: 'nav.dashboard',     Icon: HomeIcon },
  { to: '/parent/children',      tKey: 'nav.myChildren',    Icon: UsersIcon },
  { to: '/parent/attendance',    tKey: 'nav.attendance',    Icon: CalendarIcon },
  { to: '/parent/exams',         tKey: 'nav.examsResults',  Icon: ClipboardListIcon },
  { to: '/parent/fees',          tKey: 'nav.fees',          Icon: CreditCardIcon },
  { to: '/parent/announcements', tKey: 'nav.announcements', Icon: FileTextIcon },
]

export default function ParentLayout() {
  const { t } = useTranslation()
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
    <RoleGuard role="parent">
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <LogoMark />
            <span className={styles.logoText}>Edu<span className={styles.logoAccent}>Pulse</span></span>
          </div>
          {schoolName && <div className={styles.schoolLabel}>{schoolName}</div>}
          <nav className={styles.nav} aria-label="Parent navigation">
            {NAV_ITEMS.map(({ to, tKey, Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
                <Icon /><span>{t(tKey)}</span>
              </NavLink>
            ))}
          </nav>
          <TopControls />
          <div className={styles.userFooter}>
            <div className={styles.avatar} aria-hidden="true">{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>{t('roles.parent')}</span>
            </div>
            <button type="button" onClick={() => { clearAuth(); navigate('/login', { replace: true }) }} className={styles.logoutBtn} aria-label={t('auth.signOut')}>
              <LogOutIcon />
            </button>
          </div>
        </aside>
        <main className={styles.main}><Outlet /></main>
      </div>
    </RoleGuard>
  )
}
