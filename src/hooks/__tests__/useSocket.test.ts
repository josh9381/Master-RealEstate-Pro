import { renderHook, act } from '@testing-library/react'

// Mock socket.io-client before importing the hook
const mockOn = vi.fn()
const mockOff = vi.fn()
const mockEmit = vi.fn()
const mockDisconnect = vi.fn()
const mockIoOn = vi.fn()

const mockSocket = {
  on: mockOn,
  off: mockOff,
  emit: mockEmit,
  disconnect: mockDisconnect,
  io: { on: mockIoOn },
  auth: {},
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

import { useSocketEvent, useSocketEmit, disconnectSocket, onReconnect } from '@/hooks/useSocket'

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Reset socket singleton by disconnecting
    disconnectSocket()
  })

  describe('onReconnect', () => {
    it('registers and returns an unsubscribe function', () => {
      const cb = vi.fn()
      const unsub = onReconnect(cb)
      expect(typeof unsub).toBe('function')
      unsub()
    })
  })

  describe('useSocketEvent', () => {
    it('does not connect when no access token is present', () => {
      const handler = vi.fn()
      renderHook(() => useSocketEvent('test-event', handler))
      expect(mockOn).not.toHaveBeenCalled()
    })

    it('subscribes to event when authenticated', () => {
      localStorage.setItem('accessToken', 'test-token')
      const handler = vi.fn()
      renderHook(() => useSocketEvent('notification', handler))
      expect(mockOn).toHaveBeenCalledWith('notification', expect.any(Function))
    })

    it('unsubscribes on unmount', () => {
      localStorage.setItem('accessToken', 'test-token')
      const handler = vi.fn()
      const { unmount } = renderHook(() => useSocketEvent('notification', handler))
      unmount()
      expect(mockOff).toHaveBeenCalledWith('notification', expect.any(Function))
    })

    it('calls handler when event fires', () => {
      localStorage.setItem('accessToken', 'test-token')
      const handler = vi.fn()
      renderHook(() => useSocketEvent('update', handler))

      // Find the registered handler and invoke it
      const registeredHandler = mockOn.mock.calls.find(
        (call: any[]) => call[0] === 'update'
      )?.[1]
      expect(registeredHandler).toBeDefined()
      registeredHandler({ id: 1 })
      expect(handler).toHaveBeenCalledWith({ id: 1 })
    })
  })

  describe('useSocketEmit', () => {
    it('does not emit when no access token', () => {
      const { result } = renderHook(() => useSocketEmit())
      act(() => { result.current('test', { data: 1 }) })
      expect(mockEmit).not.toHaveBeenCalled()
    })

    it('emits events when authenticated', () => {
      localStorage.setItem('accessToken', 'test-token')
      const { result } = renderHook(() => useSocketEmit())
      act(() => { result.current('message:send', { text: 'hi' }) })
      expect(mockEmit).toHaveBeenCalledWith('message:send', { text: 'hi' })
    })
  })

  describe('disconnectSocket', () => {
    it('disconnects and cleans up the socket singleton', () => {
      localStorage.setItem('accessToken', 'test-token')
      // Trigger socket creation by emitting
      const { result } = renderHook(() => useSocketEmit())
      act(() => { result.current('ping', null) })

      disconnectSocket()
      expect(mockDisconnect).toHaveBeenCalled()
    })

    it('is safe to call when no socket exists', () => {
      expect(() => disconnectSocket()).not.toThrow()
    })
  })
})
