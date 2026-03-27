import { renderHook, act } from '@testing-library/react'
import { useInboxState } from '@/hooks/useInboxState'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector) => selector({ user: { id: 'user1' } })),
}))

vi.mock('@/lib/userStorage', () => ({
  getUserItem: vi.fn(() => null),
}))

describe('useInboxState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useInboxState())

    expect(result.current.folderFilter).toBe('inbox')
    expect(result.current.contacts).toEqual([])
    expect(result.current.selectedContact).toBeNull()
    expect(result.current.searchQuery).toBe('')
    expect(result.current.inboxPage).toBe(1)
    expect(result.current.showFilters).toBe(false)
    expect(result.current.replyChannel).toBe('email')
    expect(result.current.replyText).toBe('')
    expect(result.current.showComposeModal).toBe(false)
    expect(result.current.bulkSelectMode).toBe(false)
    expect(result.current.selectedContactIds.size).toBe(0)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('updates folderFilter via setter', () => {
    const { result } = renderHook(() => useInboxState())

    act(() => result.current.setFolderFilter('unread'))
    expect(result.current.folderFilter).toBe('unread')
  })

  it('updates searchQuery via setter', () => {
    const { result } = renderHook(() => useInboxState())

    act(() => result.current.setSearchQuery('test query'))
    expect(result.current.searchQuery).toBe('test query')
  })

  it('updates selectedContact via setter', () => {
    const { result } = renderHook(() => useInboxState())
    const contact = { id: 'c1', name: 'John Doe' } as any

    act(() => result.current.setSelectedContact(contact))
    expect(result.current.selectedContact).toEqual(contact)
  })

  it('toggles showFilters via setter', () => {
    const { result } = renderHook(() => useInboxState())

    act(() => result.current.setShowFilters(true))
    expect(result.current.showFilters).toBe(true)
  })

  it('hasActiveFilters is true when onlyUnread is set', () => {
    const { result } = renderHook(() => useInboxState())

    act(() => result.current.setFilters({ ...result.current.filters, onlyUnread: true }))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('hasActiveFilters is true when sender is set', () => {
    const { result } = renderHook(() => useInboxState())

    act(() => result.current.setFilters({ ...result.current.filters, sender: 'john@example.com' }))
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('resetCompose clears all compose fields', () => {
    const { result } = renderHook(() => useInboxState())

    act(() => {
      result.current.setComposeTo('test@test.com')
      result.current.setComposeSubject('Subject')
      result.current.setComposeBody('Body text')
      result.current.setComposeLeadId('lead123')
    })
    act(() => result.current.resetCompose())

    expect(result.current.composeTo).toBe('')
    expect(result.current.composeSubject).toBe('')
    expect(result.current.composeBody).toBe('')
    expect(result.current.composeLeadId).toBe('')
    expect(result.current.composeType).toBe('email')
  })

  it('manages bulk select state', () => {
    const { result } = renderHook(() => useInboxState())

    act(() => result.current.setBulkSelectMode(true))
    expect(result.current.bulkSelectMode).toBe(true)

    act(() => result.current.setSelectedContactIds(new Set(['a', 'b'])))
    expect(result.current.selectedContactIds.size).toBe(2)
  })

  it('initializes replyChannel as email', () => {
    const { result } = renderHook(() => useInboxState())
    expect(result.current.replyChannel).toBe('email')
  })

  it('updates replyChannel to sms', () => {
    const { result } = renderHook(() => useInboxState())
    act(() => result.current.setReplyChannel('sms'))
    expect(result.current.replyChannel).toBe('sms')
  })
})
