export interface Message {
  id: number
  threadId: number
  type: 'email' | 'sms' | 'call'
  direction?: 'INBOUND' | 'OUTBOUND'
  from: string
  to: string
  contact: string
  subject?: string
  body: string
  timestamp: string
  date: string
  unread: boolean
  starred: boolean
  hasAttachment?: boolean
  emailOpened?: boolean
  emailClicked?: boolean
  status?: 'sent' | 'delivered' | 'read'
  snoozed?: number
  archived?: boolean
  trashed?: boolean
  attachments?: Array<{
    id: number
    name: string
    size: string
    type: 'image' | 'pdf' | 'doc' | 'other'
    url?: string
  }>
}

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
