import { renderHook, act } from '@testing-library/react'
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates'
import { useSocketEvent as _useSocketEvent } from '@/hooks/useSocket'

const mockInvalidateQueries = vi.fn()
const mockToastInfo = vi.fn()
const socketEventHandlers = new Map<string, (data: unknown) => void>()
let reconnectCallback: (() => void) | null = null

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({ toast: { info: mockToastInfo } })),
}))

vi.mock('@/hooks/useSocket', () => ({
  useSocketEvent: vi.fn((event: string, handler: (data: unknown) => void) => {
    socketEventHandlers.set(event, handler)
  }),
  onReconnect: vi.fn((cb: () => void) => {
    reconnectCallback = cb
    return () => { reconnectCallback = null }
  }),
}))

describe('useRealtimeUpdates', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockClear()
    mockToastInfo.mockClear()
    socketEventHandlers.clear()
    reconnectCallback = null
  })

  it('registers socket event listeners on mount', () => {
    renderHook(() => useRealtimeUpdates())
    const useSocketEvent = vi.mocked(_useSocketEvent)

    // Should register handlers for lead, campaign, workflow, message, task, call, reminder events
    expect(useSocketEvent).toHaveBeenCalledWith('lead:update', expect.any(Function))
    expect(useSocketEvent).toHaveBeenCalledWith('campaign:update', expect.any(Function))
    expect(useSocketEvent).toHaveBeenCalledWith('workflow:event', expect.any(Function))
    expect(useSocketEvent).toHaveBeenCalledWith('message:update', expect.any(Function))
    expect(useSocketEvent).toHaveBeenCalledWith('task:update', expect.any(Function))
    expect(useSocketEvent).toHaveBeenCalledWith('call:update', expect.any(Function))
  })

  it('invalidates leads query on lead:update event', () => {
    renderHook(() => useRealtimeUpdates())
    const handler = socketEventHandlers.get('lead:update')
    act(() => handler?.({ type: 'updated' }))

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['leads'] })
  })

  it('shows toast when lead:update type is imported', () => {
    renderHook(() => useRealtimeUpdates())
    const handler = socketEventHandlers.get('lead:update')
    act(() => handler?.({ type: 'imported', count: 5 }))

    expect(mockToastInfo).toHaveBeenCalledWith('5 lead(s) imported by a team member')
  })

  it('invalidates campaigns query on campaign:update event', () => {
    renderHook(() => useRealtimeUpdates())
    const handler = socketEventHandlers.get('campaign:update')
    act(() => handler?.({ id: 'c1', name: 'Newsletter', status: 'ACTIVE' }))

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['campaigns'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['campaign', 'c1'] })
  })

  it('shows toast when campaign status is COMPLETED', () => {
    renderHook(() => useRealtimeUpdates())
    const handler = socketEventHandlers.get('campaign:update')
    act(() => handler?.({ id: 'c2', name: 'Welcome', status: 'COMPLETED' }))

    expect(mockToastInfo).toHaveBeenCalledWith('Campaign "Welcome" finished sending')
  })

  it('invalidates messages on message:update event', () => {
    renderHook(() => useRealtimeUpdates())
    const handler = socketEventHandlers.get('message:update')
    act(() => handler?.({ type: 'new', leadId: 'lead1' }))

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['messages'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['lead-communications', 'lead1'] })
  })

  it('invalidates multiple queries on reconnect', () => {
    renderHook(() => useRealtimeUpdates())
    act(() => reconnectCallback?.())

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['notifications'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['leads'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['campaigns'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['workflows'] })
  })
})
