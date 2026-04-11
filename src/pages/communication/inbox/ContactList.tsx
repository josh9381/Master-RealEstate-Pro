import {
  Mail,
  MessageSquare,
  Phone,
  Search,
  Star,
  Clock,
  CheckCheck,
  RefreshCw,
  Filter,
  Send,
  Archive,
  Trash2,
  Inbox,
  FileText,
  CalendarClock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import type { Contact, InboxFilters } from './types'
import { INBOX_PAGE_SIZE, formatRelativeTime } from './types'

type FolderFilter = 'inbox' | 'unread' | 'starred' | 'snoozed' | 'drafts' | 'scheduled' | 'archived' | 'trash'

interface ContactListProps {
  contacts: Contact[]
  selectedContact: Contact | null
  searchQuery: string
  folderFilter: FolderFilter
  filters: InboxFilters
  bulkSelectMode: boolean
  selectedContactIds: Set<string | number>
  loading: boolean
  isFetching: boolean
  inboxPage: number
  onSearchChange: (query: string) => void
  onSelectContact: (contact: Contact) => void
  onFolderChange: (folder: FolderFilter) => void
  onToggleBulkSelect: () => void
  onToggleContactSelect: (contactId: string | number) => void
  onToggleStar: (contactId: string | number) => void
  onSnooze: (contactId: string | number, minutes: number) => void
  onShowFilters: () => void
  onSetFilter: (filters: InboxFilters) => void
  onSetPage: (page: number | ((p: number) => number)) => void
  onCompose: () => void
  onRefresh: () => void
  onMarkAllRead: () => void
  hasActiveFilters: boolean
}

const channelIcon = (ch: string) => {
  switch (ch) {
    case 'email': return <Mail className="h-3.5 w-3.5 text-primary" />
    case 'sms': return <MessageSquare className="h-3.5 w-3.5 text-success" />
    case 'call': return <Phone className="h-3.5 w-3.5 text-purple-500" />
    default: return null
  }
}

const folderItems: { key: FolderFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'inbox', label: 'Inbox', icon: <Inbox className="h-3.5 w-3.5" /> },
  { key: 'unread', label: 'Unread', icon: <Mail className="h-3.5 w-3.5" /> },
  { key: 'starred', label: 'Starred', icon: <Star className="h-3.5 w-3.5" /> },
  { key: 'snoozed', label: 'Snoozed', icon: <Clock className="h-3.5 w-3.5" /> },
  { key: 'drafts', label: 'Drafts', icon: <FileText className="h-3.5 w-3.5" /> },
  { key: 'scheduled', label: 'Scheduled', icon: <CalendarClock className="h-3.5 w-3.5" /> },
  { key: 'archived', label: 'Archived', icon: <Archive className="h-3.5 w-3.5" /> },
  { key: 'trash', label: 'Trash', icon: <Trash2 className="h-3.5 w-3.5" /> },
]

export const ContactList = ({
  contacts,
  selectedContact,
  searchQuery,
  folderFilter,
  filters,
  bulkSelectMode,
  selectedContactIds,
  loading,
  isFetching,
  inboxPage,
  onSearchChange,
  onSelectContact,
  onFolderChange,
  onToggleBulkSelect,
  onToggleContactSelect,
  onToggleStar,
  onSnooze,
  onShowFilters,
  onSetFilter,
  onSetPage,
  onCompose,
  onRefresh,
  onMarkAllRead,
  hasActiveFilters,
}: ContactListProps) => {
  return (
    <Card className="col-span-12 md:col-span-4 flex flex-col overflow-hidden">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Folder Tabs */}
        <div className="px-3 pt-3 pb-1 border-b flex-shrink-0">
          <div className="flex gap-1 flex-wrap">
            {folderItems.map(f => (
              <Button
                key={f.key}
                size="sm"
                variant={folderFilter === f.key ? 'default' : 'ghost'}
                className="h-7 text-xs gap-1 px-2"
                onClick={() => onFolderChange(f.key)}
              >
                {f.icon}
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Search & Actions */}
        <div className="p-3 border-b space-y-2 flex-shrink-0">
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant={bulkSelectMode ? 'default' : 'outline'}
              onClick={onToggleBulkSelect}
              title="Toggle bulk selection mode"
              className="h-8 w-8 p-0"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onMarkAllRead}
              title="Mark all messages as read"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />Mark all read
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onShowFilters}
              className={`h-8 w-8 p-0 ${hasActiveFilters ? 'bg-primary/10' : ''}`}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex gap-1 flex-wrap">
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

        {/* Contact List - Scrollable */}
        <div className="overflow-y-auto flex-1" aria-live="polite">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <h3 className="text-base font-semibold mb-1">
                {folderFilter === 'unread' ? 'All caught up!' :
                 folderFilter === 'starred' ? 'No starred conversations' :
                 folderFilter === 'archived' ? 'No archived conversations' :
                 folderFilter === 'trash' ? 'Trash is empty' :
                 folderFilter === 'snoozed' ? 'No snoozed conversations' :
                 'No messages yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {folderFilter === 'inbox' 
                  ? 'Start a conversation by composing a new message.' 
                  : `No conversations in ${folderFilter}.`}
              </p>
              {folderFilter === 'inbox' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={onCompose}>
                    <Send className="h-4 w-4 mr-1" /> Compose
                  </Button>
                  <Button size="sm" variant="outline" onClick={onRefresh}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                </div>
              )}
            </div>
          ) : (
            contacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id
              const allMessages = Object.values(contact.threads).flatMap(t => t.messages)
              const hasStarred = allMessages.some(m => m.starred)

              return (
                <div
                  key={contact.id}
                  className={`p-3 border-b cursor-pointer transition-colors hover:bg-accent ${
                    isSelected ? 'bg-accent' : ''
                  } ${contact.totalUnread > 0 ? 'bg-primary/10' : ''} ${
                    selectedContactIds.has(contact.id) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => bulkSelectMode ? onToggleContactSelect(contact.id) : onSelectContact(contact)}
                >
                  <div className="flex items-start gap-3">
                    {bulkSelectMode && (
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(contact.id)}
                          onChange={() => onToggleContactSelect(contact.id)}
                          className="w-4 h-4 rounded border-border"
                        />
                      </div>
                    )}

                    {/* Contact avatar / initials */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {contact.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          {hasStarred && (
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                          )}
                          <p className={`font-medium truncate text-sm ${contact.totalUnread > 0 ? 'font-semibold' : ''}`}>
                            {contact.name}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {formatRelativeTime(contact.lastMessageAt)}
                        </span>
                      </div>

                      {/* Channel icons row */}
                      <div className="flex items-center gap-1 mb-1">
                        {contact.channels.map(ch => (
                          <span key={ch} title={ch}>{channelIcon(ch)}</span>
                        ))}
                        {contact.totalUnread > 0 && (
                          <Badge variant="default" className="text-[10px] h-4 px-1.5 ml-1">
                            {contact.totalUnread}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                    </div>

                    <div className="ml-1 flex flex-col gap-0.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); onToggleStar(contact.id) }}
                        title="Star"
                      >
                        <Star className={`h-3.5 w-3.5 ${hasStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); onSnooze(contact.id, 60) }}
                        title="Snooze 1 hour"
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {/* Pagination */}
          {contacts.length >= INBOX_PAGE_SIZE && (
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
              <Button variant="ghost" size="sm" onClick={() => onSetPage(1)}>
                Back to first page
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
