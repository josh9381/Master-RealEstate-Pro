import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToastStore } from '@/store/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  it('adds a toast', () => {
    useToastStore.getState().addToast({ type: 'success', message: 'Done' })
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].message).toBe('Done')
    expect(useToastStore.getState().toasts[0].type).toBe('success')
  })

  it('assigns unique IDs', () => {
    const store = useToastStore.getState()
    store.addToast({ type: 'info', message: 'First' })
    store.addToast({ type: 'info', message: 'Second' })
    const toasts = useToastStore.getState().toasts
    expect(toasts[0].id).not.toBe(toasts[1].id)
  })

  it('removes a toast by ID after animation', () => {
    useToastStore.getState().addToast({ type: 'error', message: 'Oops' })
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().removeToast(id)
    // Should be marked as exiting immediately
    expect(useToastStore.getState().toasts[0].exiting).toBe(true)
    // After animation delay, should be fully removed
    vi.advanceTimersByTime(300)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('clears all toasts', () => {
    const store = useToastStore.getState()
    store.addToast({ type: 'info', message: 'A' })
    store.addToast({ type: 'info', message: 'B' })
    store.clearAll()
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('enforces max 5 active toasts', () => {
    const store = useToastStore.getState()
    for (let i = 0; i < 7; i++) {
      store.addToast({ type: 'info', message: `Toast ${i}` })
    }
    const active = useToastStore.getState().toasts.filter(t => !t.exiting)
    expect(active.length).toBeLessThanOrEqual(5)
  })
})
