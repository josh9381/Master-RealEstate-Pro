export interface Message {
  id: number | string
  threadId?: number | string
  type: 'email' | 'sms' | 'call'
  direction?: 'INBOUND' | 'OUTBOUND'
  from: string
  to: string
  contact: string
  subject?: string
  body: string
  timestamp: string
  date?: string
  unread: boolean
  starred: boolean
  hasAttachment?: boolean
  emailOpened?: boolean
  emailClicked?: boolean
  status?: string
  snoozedUntil?: string | null
  archived?: boolean
  trashed?: boolean
  attachments?: Array<{
    id: number | string
    name: string
    size: string
    type: 'image' | 'pdf' | 'doc' | 'other'
    url?: string
  }>
}

export interface ChannelThread {
  messages: Message[]
  unread: number
  lastMessage: string
  lastMessageAt: string
}

export interface Contact {
  id: string | number
  name: string
  lead?: {
    id: string | number
    firstName: string
    lastName: string
    phone?: string
    email?: string
  }
  leadId?: string | null
  lastMessageAt: string
  totalUnread: number
  channels: string[]
  lastMessage: string
  lastChannel: string
  threads: Record<string, ChannelThread>
}

// Keep backward compat alias
export interface Thread {
  id: number
  contact: string
  lastMessage: string
  timestamp: string
  unread: number
  type: 'email' | 'sms' | 'call'
  messages: Message[]
  subject?: string
  lead?: {
    id: number
    firstName: string
    lastName: string
    phone?: string
    email?: string
  }
}

export interface InboxLead {
  id: number
  firstName: string
  lastName: string
  phone: string
  email: string
}

export interface InboxFilters {
  dateFrom: string
  dateTo: string
  onlyUnread: boolean
  onlyStarred: boolean
  hasAttachment: boolean
  sender: string
}

export const FALLBACK_TEMPLATES = [
  { id: 'fallback-1', name: 'Schedule a Call', content: 'Hi {{contact}},\n\nI\'d like to schedule a call to discuss this further. What times work best for you this week?\n\nBest regards' },
  { id: 'fallback-2', name: 'Follow-up Reminder', content: 'Hi {{contact}},\n\nI wanted to follow up on our previous conversation. Do you have any updates or questions I can help with?\n\nBest regards' },
]

export const FALLBACK_QUICK_REPLIES = [
  { id: 'fallback-qr-1', name: 'Thanks!', content: 'Thanks! 👍' },
  { id: 'fallback-qr-2', name: 'Got it', content: 'Got it 👌' },
]

export const INBOX_PAGE_SIZE = 25

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr || dateStr === 'Just now') return dateStr || ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
