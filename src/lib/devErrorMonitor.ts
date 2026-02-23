/**
 * Development Error Monitor
 * 
 * Catches and aggregates errors in development mode to make
 * debugging easier. Intercepts:
 * - Unhandled promise rejections
 * - API response shape mismatches
 * - Runtime errors
 * - React Query errors
 * 
 * Errors are stored in sessionStorage and can be viewed via
 * the DevErrorPanel component or by calling window.__getDevErrors()
 */

interface DevError {
  id: string
  type: 'api' | 'runtime' | 'promise' | 'react-query' | 'network'
  message: string
  stack?: string
  url?: string
  method?: string
  status?: number
  timestamp: string
  count: number
}

const MAX_ERRORS = 50
const STORAGE_KEY = '__dev_errors'
const isDev = import.meta.env.DEV

function getErrors(): DevError[] {
  if (!isDev) return []
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveErrors(errors: DevError[]) {
  if (!isDev) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(-MAX_ERRORS)))
  } catch { /* quota exceeded — clear old */ 
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

function addError(error: Omit<DevError, 'id' | 'timestamp' | 'count'>) {
  if (!isDev) return
  const errors = getErrors()
  
  // Deduplicate by message
  const existing = errors.find(e => e.message === error.message && e.type === error.type)
  if (existing) {
    existing.count++
    existing.timestamp = new Date().toISOString()
    saveErrors(errors)
    return
  }
  
  errors.push({
    ...error,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    count: 1,
  })
  saveErrors(errors)
}

function clearErrors() {
  sessionStorage.removeItem(STORAGE_KEY)
}

/**
 * Initialize global error monitoring (call once at app startup)
 */
export function initDevErrorMonitor() {
  if (!isDev) return

  // Expose helpers on window for console debugging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  w.__getDevErrors = getErrors
  w.__clearDevErrors = clearErrors
  w.__devErrorCount = () => getErrors().length

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    addError({
      type: 'promise',
      message: error?.message || String(error),
      stack: error?.stack,
      url: error?.config?.url,
      method: error?.config?.method?.toUpperCase(),
      status: error?.response?.status,
    })
  })

  // Catch uncaught errors
  window.addEventListener('error', (event) => {
    addError({
      type: 'runtime',
      message: event.message,
      stack: event.error?.stack,
      url: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
    })
  })
}

/**
 * Axios response interceptor for API error tracking.
 * Add to your axios instance: api.interceptors.response.use(devApiSuccessInterceptor, devApiErrorInterceptor)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devApiErrorInterceptor(error: any) {
  if (!isDev) return Promise.reject(error)

  const url = error?.config?.url || 'unknown'
  const method = error?.config?.method?.toUpperCase() || 'unknown'
  const status = error?.response?.status

  addError({
    type: status ? 'api' : 'network',
    message: status
      ? `${method} ${url} → ${status} ${error?.response?.statusText || ''}`
      : `${method} ${url} → Network Error`,
    status,
    url,
    method,
    stack: error?.stack,
  })

  return Promise.reject(error)
}

/**
 * Success interceptor that warns about unexpected response shapes.
 * Detects the common bug of not unwrapping { success, data: { ... } }.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devApiSuccessInterceptor(response: any) {
  if (!isDev) return response

  // Warn if response has our standard wrapper but consumer might forget to unwrap
  const data = response?.data
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    // This is expected — the standard wrapper. No error.
    // But log a dev hint if the response data.data is also an object with 'success' (double-wrapped)
    if (data.data && typeof data.data === 'object' && 'success' in data.data) {
      addError({
        type: 'api',
        message: `Double-wrapped response detected: ${response.config?.method?.toUpperCase()} ${response.config?.url}`,
        url: response.config?.url,
        method: response.config?.method?.toUpperCase(),
        status: response.status,
      })
    }
  }

  return response
}

export { getErrors as getDevErrors, clearErrors as clearDevErrors, addError as addDevError }
