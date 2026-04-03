import { renderWithProviders } from './test-utils'

import { FilterModal } from '@/pages/communication/inbox/FilterModal'

describe('FilterModal', () => {
  it('renders without crashing', () => {
    renderWithProviders(
      <FilterModal
        filters={{ dateFrom: '', dateTo: '', onlyUnread: false, onlyStarred: false, hasAttachment: false, sender: '' }}
        onSetFilters={vi.fn()}
        onClose={vi.fn()}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
