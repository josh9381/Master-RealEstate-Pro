import {
  Mail,
  MessageSquare,
  Phone,
  Send,
  Search,
  Star,
  Clock,
  CheckCheck,
  RefreshCw,
  Filter,
  ArrowDownLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import type { Thread, InboxFilters } from './types'
import { INBOX_PAGE_SIZE } from './types'

interface ThreadListProps {
  threads: Thread[]
  selectedThread: Thread | null
  searchQuery: string
  filters: InboxFilters
  bulkSelectMode: boolean
  selectedThreadIds: Set<number>
  loading: boolean
  isFetching: boolean
  inboxPage: number
  onSearchChange: (query: string) => void
  onSelectThread: (thread: Thread) => void
  onToggleBulkSelect: () => void
  onToggleThreadSelect: (threadId: number) => void
  onToggleStar: (threadId: number) => void
  onSnooze: (threadId: number, minutes: number) => void
  onShowFilters: () => void
  onSetFilter: (filters: InboxFilters) => void
  onSetPage: (page: number | ((p: number) => number)) => void
  onCompose: () => void
  onRefresh: () => void
  hasActiveFilters: boolean
}

const getChannelIcon = (type: string) => {
  switch (type) {
    case 'email': return Mail
    case 'sms': return MessageSquare
    case 'call': return Phone
    default: return Mail
  }
}

const getChannelColor = (type: string) => {
  switch (type) {
    case 'email': return 'text-blue-500'
    case 'sms': return 'text-green-500'
    case 'call': return 'text-purple-500'
    default: return 'text-gray-500'
  }
}

export const ThreadList = ({
  threads,
  selectedThread,
  searchQuery,
  filters,
  bulkSelectMode,
  selectedThreadIds,
  loading,
  isFetching,
  inboxPage,
  onSearchChange,
  onSelectThread,
  onToggleBulkSelect,
  onToggleThreadSelect,
  onToggleStar,
  onSnooze,
  onShowFilters,
  onSetFilter,
  onSetPage,
  onCompose,
  onRefresh,
  hasActiveFilters,
}: ThreadListProps) => {
  return (
    <Card className="col-span-4 flex flex-col overflow-hidden">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Search Header */}
        <div className="p-4 border-b space-y-2 flex-shrink-0">
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant={bulkSelectMode ? 'default' : 'outline'}
              onClick={onToggleBulkSelect}
              title="Toggle bulk selection mode"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onShowFilters}
              className={hasActiveFilters ? 'bg-primary/10' : ''}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex gap-2 flex-wrap">
              {filters.onlyUnread && (
                <Badge variant="secondary" className="text-xs">
                  Unread only
                  <button onClick={() => onSetFilter({ ...filters, onlyUnread: false })} className="ml-1">×</button>
                </Badge>
              )}
              {filters.onlyStarred && (
                <Badge variant="secondary" className="text-xs">
                  Starred only
                  <button onClick={() => onSetFilter({ ...filters, onlyStarred: false })} className="ml-1">×</button>
                </Badge>
              )}
              {filters.hasAttachment && (
                <Badge variant="secondary" className="text-xs">
                  Has attachment
                  <button onClick={() => onSetFilter({ ...filters, hasAttachment: false })} className="ml-1">×</button>
                </Badge>
              )}
              {filters.sender && (
                <Badge variant="secondary" className="text-xs">
                  Sender: {filters.sender}
                  <button onClick={() => onSetFilter({ ...filters, sender: '' })} className="ml-1">×</button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Thread List - Scrollable area */}
        <div className="overflow-y-auto flex-1 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Your inbox is empty. Start a conversation by composing a new message, or wait for incoming messages from your leads.
              </p>
              <div className="flex gap-2">
                <Button onClick={onCompose}>
                  <Send className="h-4 w-4 mr-2" />
                  Compose Message
                </Button>
                <Button variant="outline" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="mt-6 text-xs text-muted-foreground">
                <p>💡 Tip: Configure your Twilio settings to receive SMS messages</p>
              </div>
            </div>
          ) : (
            threads.map((thread) => {
              const Icon = getChannelIcon(thread.type)
              const isSelected = selectedThread?.id === thread.id

              return (
                <div
                  key={thread.id}
                  className={`p-4 border-b cursor-pointer transition-colors hover:bg-accent ${
                    isSelected ? 'bg-accent' : ''
                  } ${thread.unread > 0 ? 'bg-blue-50/50' : ''} ${
                    selectedThreadIds.has(thread.id) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => bulkSelectMode ? onToggleThreadSelect(thread.id) : onSelectThread(thread)}
                >
                  <div className="flex items-start gap-3">
                    {bulkSelectMode && (
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedThreadIds.has(thread.id)}
                          onChange={() => onToggleThreadSelect(thread.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </div>
                    )}
                    <div className={`mt-1 ${getChannelColor(thread.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          {thread.messages.some(m => m.starred) && (
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                          )}
                          <p className="font-medium truncate">{thread.contact}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {thread.timestamp}
                        </span>
                      </div>
                      {thread.subject && (
                        <p className="text-sm font-medium truncate mb-1">{thread.subject}</p>
                      )}
                      <p className="text-sm text-muted-foreground truncate">{thread.lastMessage}</p>
                      <div className="flex gap-2 mt-2 items-center">
                        {thread.unread > 0 && (
                          <Badge variant="default" className="text-xs">
                            {thread.unread} new
                          </Badge>
                        )}
                        {thread.messages.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {thread.messages.length} messages
                          </Badge>
                        )}
                        {thread.messages[thread.messages.length - 1]?.direction === 'INBOUND' && (
                          <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-300 bg-green-50">
                            <ArrowDownLeft className="h-3 w-3" />
                            Incoming
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="ml-2 flex flex-col gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onToggleStar(thread.id) }} title="Star (starred threads sort to top)">
                        <Star className={`h-4 w-4 ${thread.messages.some(m => m.starred) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSnooze(thread.id, 60) }} title="Snooze">
                        <Clock className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {/* Load More / Pagination */}
          {threads.length >= INBOX_PAGE_SIZE && (
            <div className="p-3 text-center border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetPage(p => p + 1)}
                disabled={isFetching}
              >
                {isFetching ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
          {inboxPage > 1 && (
            <div className="p-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetPage(1)}
              >
                Back to first page
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
