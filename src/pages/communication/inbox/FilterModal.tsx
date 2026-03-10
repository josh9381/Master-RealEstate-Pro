import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { InboxFilters } from './types'

interface FilterModalProps {
  filters: InboxFilters
  onSetFilters: (filters: InboxFilters) => void
  onClose: () => void
  onApply: () => void
  onClear: () => void
}

export const FilterModal = ({
  filters,
  onSetFilters,
  onClose,
  onApply,
  onClear,
}: FilterModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="filter-dialog-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-md mx-4" tabIndex={-1}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="filter-dialog-title" className="text-lg font-semibold">Filter Conversations</h3>
              <Button size="sm" variant="ghost" onClick={onClose}>×</Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onlyUnread"
                  checked={filters.onlyUnread}
                  onChange={(e) => onSetFilters({ ...filters, onlyUnread: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="onlyUnread" className="text-sm cursor-pointer">
                  Show only unread messages
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onlyStarred"
                  checked={filters.onlyStarred}
                  onChange={(e) => onSetFilters({ ...filters, onlyStarred: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="onlyStarred" className="text-sm cursor-pointer">
                  Show only starred conversations
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasAttachment"
                  checked={filters.hasAttachment}
                  onChange={(e) => onSetFilters({ ...filters, hasAttachment: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="hasAttachment" className="text-sm cursor-pointer">
                  Has attachments
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onSetFilters({ ...filters, dateFrom: e.target.value })}
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onSetFilters({ ...filters, dateTo: e.target.value })}
                    placeholder="To"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sender/Recipient</label>
                <Input
                  value={filters.sender}
                  onChange={(e) => onSetFilters({ ...filters, sender: e.target.value })}
                  placeholder="Filter by name..."
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClear}>Clear All</Button>
              <Button onClick={onApply}>Apply Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
