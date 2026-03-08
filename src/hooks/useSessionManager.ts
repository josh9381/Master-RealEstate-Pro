import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

// ─── Configuration ──────────────────────────────────────────────
const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000       // 15 minutes (must match backend)
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000        // refresh 2 min before expiry ⇒ every ~13 min
const IDLE_TIMEOUT_MS = 30 * 60 * 1000                 // 30 minutes of inactivity → auto-logout
const IDLE_WARNING_MS = 25 * 60 * 1000                 // Show warning at 25 min
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const

// ─── Helpers ────────────────────────────────────────────────────
const getApiBaseUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl) return envApiUrl
  if (window.location.hostname.includes('app.github.dev')) {
    return window.location.origin.replace('-3000.', '-8000.') + '/api'
  }
  return '/api'
}

/**
 * Decode a JWT payload without verification (client-side only).
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): { exp?: number; iat?: number } | null {
  try {
    const base64 = token.split('.')[1]
    if (!base64) return null
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

/**
 * Calculates how many ms until the access token expires.
 * Falls back to a fixed window if `exp` can't be read.
 */
function msUntilExpiry(accessToken: string | null): number {
  if (!accessToken) return 0
  const payload = decodeJwtPayload(accessToken)
  if (payload?.exp) {
    return payload.exp * 1000 - Date.now()
  }
  // Can't decode → assume full lifetime remaining (worst-case: we'll refresh on 401 reactively)
  return ACCESS_TOKEN_LIFETIME_MS
}

// ─── Hook ───────────────────────────────────────────────────────
/**
 * Manages proactive token refresh and idle-timeout auto-logout.
 *
 * Mount this once in a top-level authenticated component (e.g. inside ProtectedRoute or App).
 *
 * - **Proactive refresh**: Schedules a silent refresh ~2 min before the access token expires.
 *   Falls back to the reactive 401 interceptor in api.ts if the proactive refresh fails.
 *
 * - **Idle timeout**: Tracks user activity and auto-logs-out after 30 min of inactivity.
 *   Shows a warning via a dispatched custom event at 25 min (can be consumed by a toast/modal).
 */
export function useSessionManager() {
  const { isAuthenticated, clearAuth } = useAuthStore()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const warningShownRef = useRef(false)

  // ── Proactive token refresh ──────────────────────────────────
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    if (!accessToken || !refreshToken) return

    const remaining = msUntilExpiry(accessToken)
    const delay = Math.max(remaining - REFRESH_BEFORE_EXPIRY_MS, 1000) // at least 1s

    refreshTimerRef.current = setTimeout(async () => {
      const currentRefresh = localStorage.getItem('refreshToken')
      if (!currentRefresh) return

      try {
        const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
          refreshToken: currentRefresh,
        })
        const data = response.data.data || response.data
        const newAccess = data.tokens?.accessToken || data.accessToken
        const newRefresh = data.tokens?.refreshToken || data.refreshToken

        if (newAccess) {
          localStorage.setItem('accessToken', newAccess)
          if (newRefresh) localStorage.setItem('refreshToken', newRefresh)
          // Re-schedule the next refresh based on the new token
          scheduleRefresh()
        }
      } catch (err) {
        console.warn('[SessionManager] Proactive refresh failed, will rely on reactive interceptor', err)
        // Don't logout—the interceptor in api.ts will handle 401 on next request
      }
    }, delay)
  }, [])

  // ── Idle timeout ─────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    warningTimerRef.current = setTimeout(() => {
      warningShownRef.current = true
      // Dispatch a custom event that UI components (toast/modal) can listen to
      window.dispatchEvent(new CustomEvent('session:idle-warning', {
        detail: { remainingMs: IDLE_TIMEOUT_MS - IDLE_WARNING_MS },
      }))
    }, IDLE_WARNING_MS)

    idleTimerRef.current = setTimeout(() => {
      console.info('[SessionManager] Auto-logout due to inactivity')
      clearAuth()
      window.location.href = '/auth/login?reason=idle'
    }, IDLE_TIMEOUT_MS)
  }, [clearAuth])

  // ── Lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up everything if not authenticated
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      return
    }

    // Start proactive refresh schedule
    scheduleRefresh()

    // Start idle timer
    resetIdleTimer()

    // Throttled activity handler (max 1 reset per 30 seconds)
    let activityThrottleTimer: ReturnType<typeof setTimeout> | null = null
    const handleActivity = () => {
      if (activityThrottleTimer) return
      activityThrottleTimer = setTimeout(() => {
        activityThrottleTimer = null
      }, 30_000)
      resetIdleTimer()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true })
    }

    // Re-schedule refresh when tab becomes visible (in case timer drifted while inactive)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        scheduleRefresh()
        resetIdleTimer()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (activityThrottleTimer) clearTimeout(activityThrottleTimer)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity)
      }
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isAuthenticated, scheduleRefresh, resetIdleTimer])
}
