import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// Socket singleton — shared across all hook instances
let socket: Socket | null = null
let listenerCount = 0

// Reconnect callbacks — registered by consumers to fetch missed data on reconnect
type ReconnectCallback = () => void
const reconnectCallbacks = new Set<ReconnectCallback>()

export function onReconnect(cb: ReconnectCallback): () => void {
  reconnectCallbacks.add(cb)
  return () => { reconnectCallbacks.delete(cb) }
}

function getBackendBaseURL(): string {
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl) return envApiUrl.replace(/\/api\/?$/, '')
  if (window.location.hostname.includes('app.github.dev')) {
    return window.location.origin.replace('-3000.', '-8000.')
  }
  return window.location.origin
}

function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('accessToken')
    const baseURL = getBackendBaseURL()

    socket = io(baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
    })

    socket.on('connect', () => {
      // Silent connect — no user-facing banner
    })

    // On reconnect, update auth token (may have been refreshed) and fire callbacks
    socket.io.on('reconnect', () => {
      const freshToken = localStorage.getItem('accessToken')
      if (socket && freshToken) {
        socket.auth = { token: freshToken }
      }
      // Notify all registered consumers to refetch missed data
      reconnectCallbacks.forEach((cb) => cb())
    })

    socket.on('connect_error', () => {
      // Silent — reconnection is automatic
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
    const token = localStorage.getItem('accessToken')
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
    const token = localStorage.getItem('accessToken')
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
