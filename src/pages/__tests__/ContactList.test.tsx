import { renderWithProviders } from './test-utils'

import { ContactList } from '@/pages/communication/inbox/ContactList'

describe('ContactList', () => {
  it('renders without crashing', () => {
    renderWithProviders(
      <ContactList
        contacts={[]}
        selectedContact={null}
        searchQuery=""
        folderFilter="inbox"
        filters={{ dateFrom: '', dateTo: '', onlyUnread: false, onlyStarred: false, hasAttachment: false, sender: '' }}
        bulkSelectMode={false}
        selectedContactIds={new Set()}
        loading={false}
        isFetching={false}
        inboxPage={1}
        onSearchChange={vi.fn()}
        onSelectContact={vi.fn()}
        onFolderChange={vi.fn()}
        onToggleBulkSelect={vi.fn()}
        onToggleContactSelect={vi.fn()}
        onToggleStar={vi.fn()}
        onSnooze={vi.fn()}
        onShowFilters={vi.fn()}
        onSetFilter={vi.fn()}
        onSetPage={vi.fn()}
        onCompose={vi.fn()}
        onRefresh={vi.fn()}
        onMarkAllRead={vi.fn()}
        hasActiveFilters={false}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
