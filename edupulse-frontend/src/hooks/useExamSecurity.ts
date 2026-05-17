import { useEffect, useRef, useCallback, useState } from 'react'
import api from '../lib/axios'

export type SecurityLevel = 'none' | 'low' | 'medium' | 'high'
export type ViolationType = 'tab_switch' | 'fullscreen_exit' | 'copy_attempt'

interface UseExamSecurityOptions {
  securityLevel: SecurityLevel
  examId: string | undefined
  enabled: boolean
}

interface UseExamSecurityReturn {
  violationsCount: number
  showViolationModal: boolean
  lastViolationType: ViolationType | null
  dismissViolationModal: () => void
  isFullscreen: boolean
  enterFullscreen: () => void
}

const VIOLATION_DEBOUNCE_MS = 3000

export function useExamSecurity({
  securityLevel,
  examId,
  enabled,
}: UseExamSecurityOptions): UseExamSecurityReturn {
  const [violationsCount, setViolationsCount] = useState(0)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [lastViolationType, setLastViolationType] = useState<ViolationType | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const lastViolationTime = useRef<Record<ViolationType, number>>({
    tab_switch: 0,
    fullscreen_exit: 0,
    copy_attempt: 0,
  })

  const isActive = enabled && securityLevel !== 'none'

  const reportViolation = useCallback(
    async (type: ViolationType) => {
      if (!isActive || !examId) return

      const now = Date.now()
      if (now - lastViolationTime.current[type] < VIOLATION_DEBOUNCE_MS) return
      lastViolationTime.current[type] = now

      setLastViolationType(type)
      setViolationsCount(prev => prev + 1)

      if (securityLevel === 'medium' || securityLevel === 'high') {
        setShowViolationModal(true)
      }

      try {
        const res = await api.post(`/student/exams/${examId}/violation`, { type })
        setViolationsCount(res.data.data.violations_count)
      } catch {
        // Violation is already counted locally; server sync failure is non-blocking
      }
    },
    [isActive, examId, securityLevel],
  )

  // ── Tab switch detection (low / medium / high) ──
  useEffect(() => {
    if (!isActive) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('tab_switch')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isActive, reportViolation])

  // ── Fullscreen management (medium / high) ──
  useEffect(() => {
    if (!isActive || (securityLevel !== 'medium' && securityLevel !== 'high')) return

    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement
      setIsFullscreen(inFullscreen)
      if (!inFullscreen) reportViolation('fullscreen_exit')
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isActive, securityLevel, reportViolation])

  // Auto-attempt fullscreen when exam becomes active — succeeds when the page
  // was reached via a user click (navigation gesture counts in most browsers).
  useEffect(() => {
    if (!isActive || (securityLevel !== 'medium' && securityLevel !== 'high')) return
    if (document.fullscreenElement) return

    document.documentElement.requestFullscreen().catch(() => {
      // Browser blocked it (no prior gesture) — the gate overlay will show instead.
    })
  }, [isActive, securityLevel])

  const enterFullscreen = useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        if (securityLevel === 'high') reportViolation('fullscreen_exit')
      })
    }
  }, [securityLevel, reportViolation])

  const dismissViolationModal = useCallback(() => {
    setShowViolationModal(false)
  }, [])

  return {
    violationsCount,
    showViolationModal,
    lastViolationType,
    dismissViolationModal,
    isFullscreen,
    enterFullscreen,
  }
}
