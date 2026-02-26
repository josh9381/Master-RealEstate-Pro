import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// Socket singleton — shared across all hook instances
let socket: Socket | null = null
let listenerCount = 0

function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token')
    const baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

    socket = io(baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id)
    })

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
    })
  }
  return socket
}

/**
 * Low-level hook to subscribe to a Socket.io event.
 * Manages lifecycle (connect/disconnect) automatically.
 *
 * Usage:
 *   useSocketEvent('notification', (data) => { ... })
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return // Don't connect if not authenticated

    const s = getSocket()
    listenerCount++

    const wrappedHandler = (data: T) => handlerRef.current(data)
    s.on(event, wrappedHandler)

    return () => {
      s.off(event, wrappedHandler)
      listenerCount--

      // Disconnect when no listeners remain
      if (listenerCount <= 0 && socket) {
        socket.disconnect()
        socket = null
        listenerCount = 0
      }
    }
  }, [event])
}

/**
 * Hook to emit events to the server.
 */
export function useSocketEmit() {
  const emit = useCallback((event: string, data?: unknown) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const s = getSocket()
    s.emit(event, data)
  }, [])

  return emit
}

/**
 * Disconnect and clean up the socket singleton.
 * Call this on logout.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    listenerCount = 0
  }
}
