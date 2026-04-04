import { renderHook, act } from '@testing-library/react'

// Mock dependencies
vi.mock('axios', () => ({
  default: { post: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), log: vi.fn() },
}))

const mockClearAuth = vi.fn()
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    clearAuth: mockClearAuth,
  })),
}))

import { useSessionManager } from '@/hooks/useSessionManager'
import { useAuthStore } from '@/store/authStore'

describe('useSessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    localStorage.clear()
    localStorage.setItem('accessToken', 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSIsImV4cCI6OTk5OTk5OTk5OX0.sig')
    localStorage.setItem('refreshToken', 'refresh-token-123')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mounts without errors when authenticated', () => {
    const { unmount } = renderHook(() => useSessionManager())
    expect(unmount).toBeDefined()
    unmount()
  })

  it('registers activity event listeners when authenticated', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const { unmount } = renderHook(() => useSessionManager())

    const eventNames = addSpy.mock.calls.map(c => c[0])
    expect(eventNames).toContain('mousedown')
    expect(eventNames).toContain('keydown')

    unmount()
    addSpy.mockRestore()
  })

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useSessionManager())
    unmount()

    const eventNames = removeSpy.mock.calls.map(c => c[0])
    expect(eventNames).toContain('mousedown')
    expect(eventNames).toContain('keydown')

    removeSpy.mockRestore()
  })

  it('does not set up timers when not authenticated', () => {
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      clearAuth: mockClearAuth,
    })

    const addSpy = vi.spyOn(window, 'addEventListener')
    const { unmount } = renderHook(() => useSessionManager())

    // Should not register activity listeners
    const activityEvents = addSpy.mock.calls.filter(c =>
      ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'].includes(c[0] as string)
    )
    expect(activityEvents).toHaveLength(0)

    unmount()
    addSpy.mockRestore()

    // Restore for subsequent tests
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      clearAuth: mockClearAuth,
    })
  })

  it('dispatches idle warning event after idle period', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    renderHook(() => useSessionManager())

    // Advance to 25 minutes (idle warning threshold)
    act(() => { vi.advanceTimersByTime(25 * 60 * 1000) })

    const warningEvent = dispatchSpy.mock.calls.find(
      c => c[0] instanceof CustomEvent && c[0].type === 'session:idle-warning'
    )
    expect(warningEvent).toBeDefined()

    dispatchSpy.mockRestore()
  })

  it('listens for visibility change events', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const { unmount } = renderHook(() => useSessionManager())

    const visibilityCall = addSpy.mock.calls.find(c => c[0] === 'visibilitychange')
    expect(visibilityCall).toBeDefined()

    unmount()
    addSpy.mockRestore()
  })
})
