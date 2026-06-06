import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useSchoolSettings } from '../hooks/useSchoolSettings'
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

function BookOpenIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}

function TeachersIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
}

function FamilyIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}

function CalendarIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}

function FinanceIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}

function MegaphoneIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
}

function SettingsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}

function BuildingIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}

function LogOutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}

type NavItem = { to: string; tKey: string; Icon: () => React.ReactElement }

const MAIN_NAV: NavItem[] = [
  { to: '/manager/dashboard',  tKey: 'nav.dashboard', Icon: HomeIcon },
  { to: '/manager/students',   tKey: 'nav.students',  Icon: UsersIcon },
  { to: '/manager/parents',    tKey: 'nav.parents',   Icon: FamilyIcon },
  { to: '/manager/teachers',   tKey: 'nav.teachers',  Icon: TeachersIcon },
  { to: '/manager/courses',    tKey: 'nav.courses',   Icon: BookOpenIcon },
  { to: '/manager/schedule',   tKey: 'nav.schedule',  Icon: CalendarIcon },
]

const MGMT_NAV: NavItem[] = [
  { to: '/manager/finance',       tKey: 'nav.finance',      Icon: FinanceIcon },
  { to: '/manager/announcements', tKey: 'nav.announcements', Icon: MegaphoneIcon },
  { to: '/manager/school-profile', tKey: 'nav.schoolProfile', Icon: BuildingIcon },
  { to: '/manager/settings',      tKey: 'nav.settings',      Icon: SettingsIcon },
]

export default function ManagerLayout() {
  const { t } = useTranslation()
  const user       = useAuthStore(s => s.user)
  const tenantCode = useAuthStore(s => s.tenantCode)
  const clearAuth  = useAuthStore(s => s.clearAuth)
  const navigate   = useNavigate()
  const { data: schoolSettings } = useSchoolSettings()

  const initials = user?.name
    ? user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  const fallbackName = tenantCode
    ? tenantCode.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''
  const schoolName = schoolSettings?.academy_name || fallbackName

  const renderNavItem = ({ to, tKey, Icon }: NavItem) => (
    <NavLink key={to} to={to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
      <span className={styles.navIcon}><Icon /></span>
      <span className={styles.navLabel}>{t(tKey)}</span>
    </NavLink>
  )

  return (
    <RoleGuard role="manager">
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            {schoolSettings?.logo_url
              ? <img src={schoolSettings.logo_url} alt={schoolName} style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'contain' }} />
              : <LogoMark />
            }
            <span className={styles.logoText}>Edu<span className={styles.logoAccent}>Pulse</span></span>
          </div>
          {schoolName && <div className={styles.schoolLabel}>{schoolName}</div>}
          <nav className={styles.nav} aria-label="Manager navigation">
            {MAIN_NAV.map(renderNavItem)}
            <div className={styles.navSection}>{t('nav.management')}</div>
            {MGMT_NAV.map(renderNavItem)}
          </nav>
          <TopControls />
          <div className={styles.userFooter}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt={user.name} className={styles.avatar} />
              : <div className={styles.avatar} aria-hidden="true">{initials}</div>
            }
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>{t('roles.manager')}</span>
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
