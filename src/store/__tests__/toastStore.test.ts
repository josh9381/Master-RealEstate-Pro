import { useToastStore } from '@/store/toastStore'
import { act } from '@testing-library/react'

describe('toastStore', () => {
  beforeEach(() => {
    act(() => useToastStore.getState().clearAll())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([])
  })

  it('adds a toast with auto-generated id', () => {
    act(() => {
      useToastStore.getState().addToast({ type: 'success', message: 'Done!' })
    })
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('Done!')
    expect(toasts[0].id).toBeDefined()
  })

  it('removes a toast by id', () => {
    act(() => {
      useToastStore.getState().addToast({ type: 'error', message: 'Oops' })
    })
    const id = useToastStore.getState().toasts[0].id
    act(() => {
      useToastStore.getState().removeToast(id)
    })
    // Should be marked as exiting first
    expect(useToastStore.getState().toasts[0]?.exiting).toBe(true)
    // Actually removed after animation timeout
    act(() => { vi.advanceTimersByTime(400) })
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('clears all toasts', () => {
    act(() => {
      useToastStore.getState().addToast({ type: 'info', message: 'A' })
      useToastStore.getState().addToast({ type: 'info', message: 'B' })
    })
    expect(useToastStore.getState().toasts.length).toBeGreaterThanOrEqual(2)
    act(() => {
      useToastStore.getState().clearAll()
    })
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('auto-removes toast after duration', () => {
    act(() => {
      useToastStore.getState().addToast({ type: 'success', message: 'Temp', duration: 1000 })
    })
    expect(useToastStore.getState().toasts).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(1100) }) // duration + buffer
    // Should be exiting
    act(() => { vi.advanceTimersByTime(400) }) // animation delay
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('supports description field', () => {
    act(() => {
      useToastStore.getState().addToast({ type: 'warning', message: 'Watch out', description: 'Details here' })
    })
    expect(useToastStore.getState().toasts[0].description).toBe('Details here')
  })
})
