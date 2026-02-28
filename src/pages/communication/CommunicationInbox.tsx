import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Send, 
  Search,
  Archive,
  Star,
  Trash2,
  MoreHorizontal,
  Paperclip,
  Smile,
  Eye,
  MousePointerClick,
  Clock,
  Check,
  CheckCheck,
  Sparkles,
  FileText,
  Settings,
  X,
  Download,
  Filter,
  RefreshCw,
  ArrowDownLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/Dialog'
import { useToast } from '@/hooks/useToast'
import { MockModeBanner } from '@/components/shared/MockModeBanner'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { messagesApi, leadsApi, aiApi } from '@/lib/api'
import { AIComposer } from '@/components/ai/AIComposer'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'
import type { ApiSendResponse } from '@/types'

interface Message {
  id: number
  threadId: number
  type: 'email' | 'sms' | 'call'
  direction?: 'INBOUND' | 'OUTBOUND' // Added direction field from backend
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
  // Smart folder flags
  snoozed?: number // timestamp (ms) until which the message is snoozed
  archived?: boolean
  trashed?: boolean
  // Attachments
  attachments?: Array<{
    id: number
    name: string
    size: string
    type: 'image' | 'pdf' | 'doc' | 'other'
    url?: string
  }>
}

interface Thread {
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

// Mock data removed - using real API data

// Configurable message templates – replace with API fetch when backend supports it
const MESSAGE_TEMPLATES = [
  { id: 1, name: 'Schedule a call', content: 'Hi {contact},\n\nI\'d like to schedule a call to discuss this further. What times work best for you this week?\n\nBest regards' },
  { id: 2, name: 'Request more info', content: 'Hi {contact},\n\nThank you for your message. Could you provide some additional information about [specific topic]?\n\nLooking forward to your response.' },
  { id: 3, name: 'Send pricing', content: 'Hi {contact},\n\nThank you for your interest! I\'ve attached our pricing information. Please let me know if you have any questions.\n\nBest regards' },
  { id: 4, name: 'Follow-up reminder', content: 'Hi {contact},\n\nI wanted to follow up on our previous conversation. Do you have any updates or questions I can help with?\n\nBest regards' },
  { id: 5, name: 'Thank you', content: 'Hi {contact},\n\nThank you so much for your time today. I really appreciated our conversation. Please don\'t hesitate to reach out if you need anything.\n\nBest regards' },
];

const QUICK_REPLIES = [
  { id: 1, text: 'Thanks! 👍', emoji: '👍' },
  { id: 2, text: 'Will call you soon 📞', emoji: '📞' },
  { id: 3, text: 'Received ✅', emoji: '✅' },
  { id: 4, text: 'Perfect! 🎉', emoji: '🎉' },
  { id: 5, text: 'Got it 👌', emoji: '👌' },
  { id: 6, text: 'On my way! 🚗', emoji: '🚗' },
];

const CommunicationInbox = () => {
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'sms' | 'call'>('all')
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'unread' | 'starred' | 'snoozed' | 'archived' | 'trash'>('inbox')
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [replyText, setReplyText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSignatureEditor, setShowSignatureEditor] = useState(false)
  const [signature, setSignature] = useState(() => {
    return localStorage.getItem('emailSignature') || '\n\n---\nBest regards,\nYour Name\nCompany Name\nyour.email@company.com'
  })
  const [editingSignature, setEditingSignature] = useState(signature)
  const [autoAppendSignature, setAutoAppendSignature] = useState(() => {
    return localStorage.getItem('autoAppendSignature') === 'true'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    onlyUnread: false,
    onlyStarred: false,
    hasAttachment: false,
    sender: ''
  })
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [composeType, setComposeType] = useState<'email' | 'sms' | 'call'>('sms')
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeLeadId, setComposeLeadId] = useState<string>('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [_pendingAttachments, setPendingAttachments] = useState<File[]>([])
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<number>>(new Set())
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [threadToDelete, setThreadToDelete] = useState<number | null>(null)
  const [inboxPage, setInboxPage] = useState(1)
  const INBOX_PAGE_SIZE = 25
  const [showAIComposer, setShowAIComposer] = useState(false)
  const [, setShowEnhanceMode] = useState(false)
  const [enhancedMessage, setEnhancedMessage] = useState('')
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [showReplaceWarning, setShowReplaceWarning] = useState(false)
  const [enhanceTone, setEnhanceTone] = useState('professional')
  const [enhancingMessage, setEnhancingMessage] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Fetch threads via useQuery
  const { data: threadsData, isLoading: loading, isFetching, refetch: refetchMessages } = useQuery({
    queryKey: ['communication-threads', searchQuery, inboxPage],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: inboxPage, limit: INBOX_PAGE_SIZE }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      const response = await messagesApi.getMessages(params)
      const threadsData = response?.data?.threads || response?.threads || response
      return (threadsData && Array.isArray(threadsData)) ? threadsData as Thread[] : []
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  const refreshing = isFetching && !loading

  // Fetch leads via useQuery
  interface InboxLead { id: number; firstName: string; lastName: string; phone: string; email: string }
  const { data: leads = [] } = useQuery<InboxLead[]>({
    queryKey: ['communication-leads'],
    queryFn: async () => {
      const response = await leadsApi.getLeads({ limit: 100 })
      const leadsData = response?.data?.leads || response?.leads || response || []
      return leadsData.map((lead: { id: number; firstName?: string; lastName?: string; phone?: string; email?: string }) => ({
        id: lead.id,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        phone: lead.phone || '',
        email: lead.email || ''
      }))
    },
    staleTime: 60_000,
  })

  // Track selectedThread id in a ref to avoid stale closure in threadsData sync effect
  const selectedThreadIdRef = useRef<number | null>(null)
  useEffect(() => {
    selectedThreadIdRef.current = selectedThread?.id ?? null
  }, [selectedThread])

  // Sync query data to local threads state (kept mutable for optimistic updates)
  useEffect(() => {
    if (threadsData) {
      setThreads(threadsData)
      const currentId = selectedThreadIdRef.current
      if (currentId !== null) {
        const updated = threadsData.find((t: Thread) => t.id === currentId)
        if (updated) setSelectedThread(updated)
      } else if (threadsData.length > 0) {
        setSelectedThread(threadsData[0])
      }
    }
  }, [threadsData])

  // Scroll to bottom of messages (most recent)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auto-scroll to bottom when thread or messages change
  useEffect(() => {
    if (selectedThread) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100)
    }
  }, [selectedThread?.id, selectedThread?.messages?.length])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Cmd/Ctrl + R: Mark as read
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && selectedThread) {
        e.preventDefault()
        handleMarkRead()
      }

      // Cmd/Ctrl + U: Mark as unread
      if ((e.metaKey || e.ctrlKey) && e.key === 'u' && selectedThread) {
        e.preventDefault()
        handleMarkUnread()
      }

      // Cmd/Ctrl + Shift + A: Mark all as read
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        handleMarkAllAsRead()
      }

      // E: Archive
      if (e.key === 'e' && selectedThread) {
        e.preventDefault()
        archiveThread(selectedThread.id)
      }

      // S: Star/Unstar
      if (e.key === 's' && selectedThread) {
        e.preventDefault()
        toggleStarThread(selectedThread.id)
      }

      // X: Bulk select mode
      if (e.key === 'x') {
        e.preventDefault()
        handleToggleBulkSelect()
      }

      // Delete: Move to trash
      if (e.key === 'Delete' && selectedThread) {
        e.preventDefault()
        trashThread(selectedThread.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedThread, bulkSelectMode])

  const handleRefresh = () => {
    refetchMessages()
  }

  const templates = MESSAGE_TEMPLATES

  const quickReplies = QUICK_REPLIES

  const insertTemplate = (templateContent: string) => {
    const personalizedContent = templateContent.replace('{contact}', selectedThread?.contact || 'there')
    setReplyText(personalizedContent)
    setShowTemplates(false)
    toast.success('Template inserted')
  }

  const insertQuickReply = async (text: string) => {
    if (!selectedThread) return
    
    setReplyText(text)
    setShowQuickReplies(false)
    
    // Auto-send the quick reply immediately
    setTimeout(() => {
      handleSendReply()
    }, 100)
  }

  const insertEmoji = (emoji: string) => {
    setReplyText(replyText + emoji)
    setShowEmojiPicker(false)
  }

  const handleMarkUnread = async () => {
    if (!selectedThread) return
    
    try {
      // Get all inbound message IDs in the thread
      const inboundMessageIds = selectedThread.messages
        .filter(m => m.direction === 'INBOUND')
        .map(m => String(m.id))
      
      if (inboundMessageIds.length > 0) {
        // Call API to mark messages as unread
        await messagesApi.markAsUnread({ messageIds: inboundMessageIds })
      }
      
      // Update local state
      setThreads(prev => prev.map(t => 
        t.id === selectedThread.id 
          ? { 
              ...t, 
              unread: inboundMessageIds.length,
              messages: t.messages.map(m => ({ 
                ...m, 
                unread: m.direction === 'INBOUND' 
              }))
            } 
          : t
      ))
      
      // Update selected thread
      setSelectedThread(prev => prev ? {
        ...prev,
        unread: inboundMessageIds.length,
        messages: prev.messages.map(m => ({ 
          ...m, 
          unread: m.direction === 'INBOUND' 
        }))
      } : null)
      
      toast.success('Marked as unread')
    } catch (error) {
      console.error('Failed to mark as unread:', error)
      toast.error('Failed to mark as unread')
    }
    setShowMoreMenu(false)
  }

  const handleMarkRead = async () => {
    if (!selectedThread) return
    
    try {
      // Get all unread message IDs in the thread
      const unreadMessageIds = selectedThread.messages
        .filter(m => m.unread)
        .map(m => String(m.id))
      
      if (unreadMessageIds.length > 0) {
        // Call API to mark messages as read
        await messagesApi.markAsRead({ messageIds: unreadMessageIds })
      }
      
      // Update local state
      setThreads(prev => prev.map(t => 
        t.id === selectedThread.id 
          ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, unread: false })) } 
          : t
      ))
      
      // Update selected thread
      setSelectedThread(prev => prev ? {
        ...prev,
        unread: 0,
        messages: prev.messages.map(m => ({ ...m, unread: false }))
      } : null)
      
      toast.success('Marked as read')
    } catch (error) {
      console.error('Failed to mark as read:', error)
      toast.error('Failed to mark as read')
    }
    setShowMoreMenu(false)
  }

  const handleSelectThread = async (thread: Thread, autoMarkRead = true) => {
    setSelectedThread(thread)
    
    // Auto-mark as read when opening a thread (only if explicitly requested)
    if (autoMarkRead && thread.unread > 0) {
      try {
        const unreadMessageIds = thread.messages
          .filter(m => m.unread && m.id) // Ensure message has an ID
          .map(m => String(m.id))
          .filter(id => id && id !== 'undefined' && id !== 'null') // Filter out invalid IDs
        
        // Update local state immediately for responsive UI
        setThreads(prev => prev.map(t => 
          t.id === thread.id 
            ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, unread: false })) } 
            : t
        ))
        
        // Call API and await it to ensure it completes before any potential reload
        if (unreadMessageIds.length > 0) {
          await messagesApi.markAsRead({ messageIds: unreadMessageIds })
        }
      } catch (error: unknown) {
        console.error('❌ Error marking thread as read:', error)
        const axiosError = error as { response?: { status?: number; data?: { error?: string; details?: unknown } }; message?: string }
        console.error('Error response:', axiosError.response)
        console.error('Error data:', JSON.stringify(axiosError.response?.data, null, 2))
        console.error('Thread ID:', thread.id)
        console.error('Status code:', axiosError.response?.status)
        // Revert local state if API call failed
        setThreads(prev => prev.map(t => 
          t.id === thread.id 
            ? { ...t, unread: thread.unread, messages: thread.messages } 
            : t
        ))
        const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Unknown error'
        const details = axiosError.response?.data?.details ? ` (${JSON.stringify(axiosError.response.data.details)})` : ''
        toast.error(`Failed to mark as read: ${errorMsg}${details}`)
      }
    }
  }

  const handleForward = async () => {
    setShowMoreMenu(false)
    if (!selectedThread) {
      toast.error('No message selected to forward')
      return
    }
    const forwardTo = window.prompt('Enter email address to forward to:')
    if (!forwardTo || !forwardTo.trim()) return
    try {
      const lastMsg = selectedThread.messages[selectedThread.messages.length - 1]
      await messagesApi.sendEmail({
        to: forwardTo.trim(),
        subject: `Fwd: ${lastMsg?.subject || selectedThread.contact}`,
        body: `---------- Forwarded message ----------\nFrom: ${selectedThread.contact}\n\n${lastMsg?.body || selectedThread.lastMessage}`,
      })
      toast.success(`Forwarded to ${forwardTo.trim()}`)
    } catch {
      toast.error('Failed to forward message')
    }
  }

  const handlePrint = () => {
    window.print()
    setShowMoreMenu(false)
  }

  const filteredThreads = threads.filter((thread: Thread) => {
    // Folder filtering
    if (selectedFolder === 'unread' && thread.unread === 0) return false
    if (selectedFolder === 'starred' && !thread.messages.some(m => m.starred)) return false
    if (selectedFolder === 'snoozed' && !thread.messages.some(m => m.snoozed)) return false
    if (selectedFolder === 'archived' && !thread.messages.some(m => m.archived)) return false
    if (selectedFolder === 'trash' && !thread.messages.some(m => m.trashed)) return false

    const matchesChannel = selectedChannel === 'all' || thread.type === selectedChannel
    const matchesSearch = thread.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Advanced filters
    if (filters.onlyUnread && thread.unread === 0) return false
    if (filters.onlyStarred && !thread.messages.some(m => m.starred)) return false
    if (filters.hasAttachment && !thread.messages.some(m => m.hasAttachment)) return false
    if (filters.sender && !thread.contact.toLowerCase().includes(filters.sender.toLowerCase())) return false
    if (filters.dateFrom) {
      const threadDate = new Date(thread.messages[thread.messages.length - 1]?.timestamp || 0)
      if (threadDate < new Date(filters.dateFrom)) return false
    }
    if (filters.dateTo) {
      const threadDate = new Date(thread.messages[thread.messages.length - 1]?.timestamp || 0)
      if (threadDate > new Date(filters.dateTo)) return false
    }

    return matchesChannel && matchesSearch
  }).sort((a, b) => {
    // Starred threads always at the top
    const aStarred = a.messages.some(m => m.starred)
    const bStarred = b.messages.some(m => m.starred)
    if (aStarred && !bStarred) return -1
    if (!aStarred && bStarred) return 1
    return 0 // Keep original order for non-starred threads
  })

  const totalUnread = threads.reduce((acc: number, thread: Thread) => acc + thread.unread, 0)
  const emailUnread = threads.filter((t: Thread) => t.type === 'email').reduce((acc: number, t: Thread) => acc + t.unread, 0)
  const smsUnread = threads.filter((t: Thread) => t.type === 'sms').reduce((acc: number, t: Thread) => acc + t.unread, 0)
  const callUnread = threads.filter((t: Thread) => t.type === 'call').reduce((acc: number, t: Thread) => acc + t.unread, 0)

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

  const handleSendReply = async () => {
    if (!replyText.trim()) return
    if (!selectedThread) return
    
    try {
      const messageBody = autoAppendSignature && selectedThread.type === 'email' 
        ? replyText + signature 
        : replyText

      // Determine the correct recipient (for inbound messages, reply to the sender)
      const firstMsg = selectedThread.messages[0]
      const replyTo = firstMsg.direction === 'INBOUND' ? firstMsg.from : firstMsg.to

      // Call API based on message type
      if (selectedThread.type === 'email') {
        await messagesApi.sendEmail({
          to: replyTo,
          subject: selectedThread.subject,
          body: messageBody,
          threadId: selectedThread.id
        })
      } else if (selectedThread.type === 'sms') {
        await messagesApi.sendSMS({
          to: replyTo,
          body: messageBody,
          threadId: selectedThread.id
        })
      }

      const newMessage: Message = {
        id: Date.now(),
        threadId: selectedThread.id,
        type: selectedThread.type,
        from: 'you@company.com',
        to: selectedThread.type === 'email' ? replyTo : replyTo,
        contact: selectedThread.contact,
        subject: selectedThread.subject,
        body: messageBody,
        timestamp: 'Just now',
        date: new Date().toLocaleString(),
        unread: false,
        starred: false,
        status: 'sent'
      }

      // Show reply immediately for better UX
      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, messages: [...t.messages, newMessage], lastMessage: newMessage.body, timestamp: 'Just now' } : t))
      toast.success('Reply sent successfully')
      setReplyText('')
      
      // Scroll to bottom to show new message
      setTimeout(scrollToBottom, 100)
      
      // Refresh from backend to ensure persistence
      setTimeout(async () => {
        await refetchMessages()
      }, 500)
    } catch (error) {
      console.error('Failed to send reply:', error)
      toast.error('Failed to send reply, please try again')
    }
  }

  const saveSignature = () => {
    setSignature(editingSignature)
    localStorage.setItem('emailSignature', editingSignature)
    localStorage.setItem('autoAppendSignature', String(autoAppendSignature))
    setShowSignatureEditor(false)
    toast.success('Signature saved')
  }

  const toggleStarThread = async (threadId: number) => {
    const thread = threads.find(t => t.id === threadId)
    if (!thread) return
    const isStarred = thread.messages.some(m => m.starred)
    
    // Optimistically update local state
    const previousThreads = [...threads]
    setThreads(prev => prev.map(t => 
      t.id === threadId 
        ? { ...t, messages: t.messages.map(m => ({ ...m, starred: !isStarred })) } 
        : t
    ))

    // Persist to backend
    try {
      await Promise.all(
        thread.messages.map(m => messagesApi.starMessage(String(m.id), !isStarred))
      )
      toast.success(isStarred ? 'Removed star' : 'Starred')
    } catch (error) {
      setThreads(previousThreads)
      toast.error('Failed to update star status')
    }
  }

  const archiveThread = async (threadId: number) => {
    const thread = threads.find(t => t.id === threadId)
    
    // Optimistically update local state
    const previousThreads = [...threads]
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, archived: true })) } : t))
    setSelectedThread(null)

    // Persist to backend
    if (thread) {
      try {
        await Promise.all(
          thread.messages.map(m => messagesApi.archiveMessage(String(m.id), true))
        )
        toast.success('Thread archived')
      } catch (error) {
        setThreads(previousThreads)
        toast.error('Failed to archive thread')
      }
    }
  }

  const trashThread = (threadId: number) => {
    setThreadToDelete(threadId)
    setShowDeleteConfirm(true)
  }

  const confirmTrashThread = async () => {
    if (threadToDelete) {
      const thread = threads.find(t => t.id === threadToDelete)
      const previousThreads = [...threads]
      setThreads(prev => prev.map(t => t.id === threadToDelete ? { ...t, messages: t.messages.map(m => ({ ...m, trashed: true })) } : t))
      setSelectedThread(null)

      // Persist to backend
      if (thread) {
        try {
          await Promise.all(
            thread.messages.map(m => messagesApi.deleteMessage(String(m.id)))
          )
          toast.success('Moved to trash')
        } catch (error) {
          setThreads(previousThreads)
          toast.error('Failed to move to trash')
        }
      }
    }
    setShowDeleteConfirm(false)
    setThreadToDelete(null)
  }

  const cancelTrashThread = () => {
    setShowDeleteConfirm(false)
    setThreadToDelete(null)
  }

  const snoozeThread = async (threadId: number, minutes = 60) => {
    const thread = threads.find(t => t.id === threadId)
    const snoozeUntil = Date.now() + minutes * 60 * 1000
    
    // Optimistically update local state
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, snoozed: snoozeUntil })) } : t))
    toast.success('Thread snoozed')

    // Persist to backend
    if (thread) {
      try {
        const snoozedUntilISO = new Date(snoozeUntil).toISOString()
        await Promise.all(
          thread.messages.map(m => messagesApi.snoozeMessage(String(m.id), snoozedUntilISO))
        )
      } catch (error) {
        console.error('Failed to snooze message:', error)
      }
    }
  }

  const handleMessageGenerated = (message: string, subject?: string) => {
    setReplyText(message)
    if (subject) {
      setEmailSubject(subject)
    }
    setShowAIComposer(false)
    toast.success('AI-generated message has been added to your reply box')
  }

  const handleEnhance = async () => {
    if (!replyText || replyText.length < 10) {
      toast.error('Type a message first (at least 10 characters)')
      return
    }
    
    setEnhancingMessage(true)
    setShowEnhanceMode(true)
    
    try {
      const result = await aiApi.enhanceMessage({
        message: replyText,
        tone: enhanceTone
      })
      
      setEnhancedMessage(result.data.enhanced)
      setShowBeforeAfter(true)
    } catch (error) {
      console.error('Enhance error:', error)
      const aiMsg = getAIUnavailableMessage(error)
      toast.error(aiMsg || 'Failed to enhance message')
      setShowEnhanceMode(false)
    } finally {
      setEnhancingMessage(false)
    }
  }

  const applyEnhanced = () => {
    setReplyText(enhancedMessage)
    setShowBeforeAfter(false)
    setShowEnhanceMode(false)
    toast.success('Enhanced message applied!')
  }

  const cancelEnhance = () => {
    setShowBeforeAfter(false)
    setShowEnhanceMode(false)
    setEnhancedMessage('')
  }

  const handleGenerateClick = () => {
    if (replyText.length > 10) {
      setShowReplaceWarning(true)
    } else {
      setShowAIComposer(true)
    }
  }

  const confirmGenerate = () => {
    setShowReplaceWarning(false)
    setShowAIComposer(true)
  }

  const handleMarkAllAsRead = async () => {
    try {
      const result = await messagesApi.markAllAsRead()
      toast.success(result.message || 'All messages marked as read')
      // Reload messages to reflect changes
      await refetchMessages()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast.error('Failed to mark all as read')
    }
  }

  const handleToggleBulkSelect = () => {
    setBulkSelectMode(!bulkSelectMode)
    setSelectedThreadIds(new Set())
  }

  const handleToggleThreadSelect = (threadId: number) => {
    setSelectedThreadIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(threadId)) {
        newSet.delete(threadId)
      } else {
        newSet.add(threadId)
      }
      return newSet
    })
  }

  const handleBulkMarkRead = async () => {
    if (selectedThreadIds.size === 0) {
      toast.error('No threads selected')
      return
    }

    try {
      const selectedThreadsList = threads.filter(t => selectedThreadIds.has(t.id))
      const allMessageIds = selectedThreadsList.flatMap(t => 
        t.messages.filter(m => m.unread).map(m => String(m.id))
      )

      if (allMessageIds.length > 0) {
        await messagesApi.markAsRead({ messageIds: allMessageIds })
      }

      // Update local state
      setThreads(prev => prev.map(t => 
        selectedThreadIds.has(t.id)
          ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, unread: false })) }
          : t
      ))

      toast.success(`${selectedThreadIds.size} thread(s) marked as read`)
      setSelectedThreadIds(new Set())
      setBulkSelectMode(false)
    } catch (error) {
      console.error('Failed to bulk mark as read:', error)
      toast.error('Failed to mark threads as read')
    }
  }

  const handleBulkArchive = async () => {
    if (selectedThreadIds.size === 0) {
      toast.error('No threads selected')
      return
    }

    const previousThreads = [...threads]
    setThreads(prev => prev.map(t => 
      selectedThreadIds.has(t.id)
        ? { ...t, messages: t.messages.map(m => ({ ...m, archived: true })) }
        : t
    ))

    try {
      const allMessageIds = threads
        .filter(t => selectedThreadIds.has(t.id))
        .flatMap(t => t.messages.map(m => String(m.id)))
      await Promise.all(allMessageIds.map(id => messagesApi.archiveMessage(id, true)))
      toast.success(`${selectedThreadIds.size} thread(s) archived`)
    } catch (error) {
      setThreads(previousThreads)
      toast.error('Failed to archive threads')
    }
    setSelectedThreadIds(new Set())
    setBulkSelectMode(false)
  }

  const handleBulkDelete = async () => {
    if (selectedThreadIds.size === 0) {
      toast.error('No threads selected')
      return
    }

    const previousThreads = [...threads]
    setThreads(prev => prev.map(t => 
      selectedThreadIds.has(t.id)
        ? { ...t, messages: t.messages.map(m => ({ ...m, trashed: true })) }
        : t
    ))

    try {
      const allMessageIds = threads
        .filter(t => selectedThreadIds.has(t.id))
        .flatMap(t => t.messages.map(m => String(m.id)))
      await Promise.all(allMessageIds.map(id => messagesApi.deleteMessage(id)))
      toast.success(`${selectedThreadIds.size} thread(s) moved to trash`)
    } catch (error) {
      setThreads(previousThreads)
      toast.error('Failed to delete threads')
    }
    setSelectedThreadIds(new Set())
    setBulkSelectMode(false)
  }

  const handleSendCompose = async () => {
    if (!composeTo || !composeBody) {
      toast.error('Please fill in recipient and message')
      return
    }

    try {
      const messageBody = composeType === 'email' && autoAppendSignature 
        ? composeBody + signature 
        : composeBody

      // Call API based on message type - wait for response to get real IDs
      let apiResponse: ApiSendResponse | null = null
      if (composeType === 'email') {
        apiResponse = await messagesApi.sendEmail({
          to: composeTo,
          subject: composeSubject,
          body: messageBody,
          leadId: composeLeadId || undefined
        })
      } else if (composeType === 'sms') {
        apiResponse = await messagesApi.sendSMS({
          to: composeTo,
          body: messageBody,
          leadId: composeLeadId || undefined
        })
      } else if (composeType === 'call') {
        apiResponse = await messagesApi.makeCall({
          to: composeTo,
          notes: messageBody,
          leadId: composeLeadId || undefined
        })
      }

      toast.success('Message sent successfully')
      
      // Close modal and reset form
      setShowComposeModal(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      setComposeLeadId('')

      // Reload messages from backend to show the new conversation
      // This ensures we have the real message with proper ID and persistence
      setTimeout(async () => {
        await refetchMessages()
        
        // If we got a threadId from the response, try to select that thread
        if (apiResponse?.data?.threadId || apiResponse?.threadId) {
          const threadId = apiResponse.data?.threadId || apiResponse.threadId
          const newThread = threads.find(t => t.id === threadId)
          if (newThread) {
            setSelectedThread(newThread)
            setTimeout(scrollToBottom, 100)
          }
        }
      }, 500) // Short delay to allow backend to fully process
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message, please try again')
    }
  }

  return (
    <div className="space-y-6">
      {/* Mock Mode Warning */}
      <MockModeBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communication Hub</h1>
          <p className="text-muted-foreground mt-2">
            Unified inbox for all your communications
          </p>
        </div>
        <div className="flex gap-2">
          {bulkSelectMode && selectedThreadIds.size > 0 && (
            <>
              <Button 
                variant="outline" 
                onClick={handleBulkMarkRead}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark {selectedThreadIds.size} as Read
              </Button>
              <Button 
                variant="outline" 
                onClick={handleBulkArchive}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive {selectedThreadIds.size}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedThreadIds.size}
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            title="Mark all messages as read"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
          <Button onClick={() => setShowComposeModal(true)}>
            <Send className="mr-2 h-4 w-4" />
            Compose New
          </Button>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex gap-2 border-b pb-3">
        <Link to="/communication">
          <Button variant="default" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Inbox
          </Button>
        </Link>
        <Link to="/communication/templates">
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Email Templates
          </Button>
        </Link>
        <Link to="/communication/calls">
          <Button variant="outline" size="sm">
            <Phone className="mr-2 h-4 w-4" />
            Call Center
          </Button>
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} showChart={false} />
      ) : (
        <>
      <div className="hidden">Wrapper for loading state</div>

      {/* 3-Column Layout - Fixed height with internal scrolling */}
      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 240px)' }}>
        {/* Column 1: Channels (2 cols) */}
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <CardContent className="p-4 flex flex-col h-full">
            <h3 className="font-semibold mb-4">Channels</h3>
            <div className="space-y-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100% - 40px)' }}>
              <Button
                variant={selectedChannel === 'all' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => { setSelectedChannel('all'); setSelectedFolder('inbox') }}
              >
                <Mail className="mr-2 h-4 w-4" />
                All Messages
                {totalUnread > 0 && (
                  <Badge variant="secondary" className="ml-auto">{totalUnread}</Badge>
                )}
              </Button>
              <Button
                variant={selectedChannel === 'email' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedChannel('email')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
                {emailUnread > 0 && (
                  <Badge variant="secondary" className="ml-auto">{emailUnread}</Badge>
                )}
              </Button>
              <Button
                variant={selectedChannel === 'sms' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedChannel('sms')}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                SMS
                {smsUnread > 0 && (
                  <Badge variant="secondary" className="ml-auto">{smsUnread}</Badge>
                )}
              </Button>
              <Button
                variant={selectedChannel === 'call' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedChannel('call')}
              >
                <Phone className="mr-2 h-4 w-4" />
                Calls
                {callUnread > 0 && (
                  <Badge variant="secondary" className="ml-auto">{callUnread}</Badge>
                )}
              </Button>
              <div className="my-4 border-t" />
              <Button variant={selectedFolder === 'unread' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setSelectedFolder('unread')}>
                <Mail className="mr-2 h-4 w-4" />
                Unread
                {totalUnread > 0 && (
                  <Badge variant="secondary" className="ml-auto">{totalUnread}</Badge>
                )}
              </Button>
              <Button variant={selectedFolder === 'starred' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setSelectedFolder('starred')}>
                <Star className="mr-2 h-4 w-4" />
                Starred
              </Button>
              <Button variant={selectedFolder === 'snoozed' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setSelectedFolder('snoozed')}>
                <Clock className="mr-2 h-4 w-4" />
                Snoozed
              </Button>
              <Button variant={selectedFolder === 'archived' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setSelectedFolder('archived')}>
                <Archive className="mr-2 h-4 w-4" />
                Archived
              </Button>
              <Button variant={selectedFolder === 'trash' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setSelectedFolder('trash')}>
                <Trash2 className="mr-2 h-4 w-4" />
                Trash
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Threads (4 cols) */}
        <Card className="col-span-4 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex flex-col h-full">
            {/* Search Header */}
            <div className="p-4 border-b space-y-2 flex-shrink-0">
              <div className="flex gap-2 items-center">
                <Button
                  size="sm"
                  variant={bulkSelectMode ? 'default' : 'outline'}
                  onClick={handleToggleBulkSelect}
                  title="Toggle bulk selection mode"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={filters.onlyUnread || filters.onlyStarred || filters.hasAttachment || filters.sender ? 'bg-primary/10' : ''}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Active Filters Display */}
              {(filters.onlyUnread || filters.onlyStarred || filters.hasAttachment || filters.sender) && (
                <div className="flex gap-2 flex-wrap">
                  {filters.onlyUnread && (
                    <Badge variant="secondary" className="text-xs">
                      Unread only
                      <button onClick={() => setFilters({ ...filters, onlyUnread: false })} className="ml-1">×</button>
                    </Badge>
                  )}
                  {filters.onlyStarred && (
                    <Badge variant="secondary" className="text-xs">
                      Starred only
                      <button onClick={() => setFilters({ ...filters, onlyStarred: false })} className="ml-1">×</button>
                    </Badge>
                  )}
                  {filters.hasAttachment && (
                    <Badge variant="secondary" className="text-xs">
                      Has attachment
                      <button onClick={() => setFilters({ ...filters, hasAttachment: false })} className="ml-1">×</button>
                    </Badge>
                  )}
                  {filters.sender && (
                    <Badge variant="secondary" className="text-xs">
                      Sender: {filters.sender}
                      <button onClick={() => setFilters({ ...filters, sender: '' })} className="ml-1">×</button>
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
              ) : filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Your inbox is empty. Start a conversation by composing a new message, or wait for incoming messages from your leads.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowComposeModal(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Compose Message
                    </Button>
                    <Button variant="outline" onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  <div className="mt-6 text-xs text-muted-foreground">
                    <p>💡 Tip: Configure your Twilio settings to receive SMS messages</p>
                  </div>
                </div>
              ) : (
                filteredThreads.map((thread: Thread) => {
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
                      onClick={() => bulkSelectMode ? handleToggleThreadSelect(thread.id) : handleSelectThread(thread)}
                  >
                    <div className="flex items-start gap-3">
                      {bulkSelectMode && (
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedThreadIds.has(thread.id)}
                            onChange={() => handleToggleThreadSelect(thread.id)}
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
                          {/* Direction indicator: show "Incoming" badge when last message is inbound (#80/#82) */}
                          {thread.messages[thread.messages.length - 1]?.direction === 'INBOUND' && (
                            <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-300 bg-green-50">
                              <ArrowDownLeft className="h-3 w-3" />
                              Incoming
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="ml-2 flex flex-col gap-1">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleStarThread(thread.id) }} title="Star (starred threads sort to top)">
                          <Star className={`h-4 w-4 ${thread.messages.some(m => m.starred) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); snoozeThread(thread.id, 60) }} title="Snooze">
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  )
                })
              )}
              {/* Load More / Pagination */}
              {filteredThreads.length >= INBOX_PAGE_SIZE && (
                <div className="p-3 text-center border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInboxPage(p => p + 1)}
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
                    onClick={() => setInboxPage(1)}
                  >
                    Back to first page
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Conversation (6 cols) */}
        <Card className="col-span-6 flex flex-col overflow-hidden">
          {selectedThread ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="font-semibold">{selectedThread.contact}</h3>
                  {selectedThread.subject && (
                    <p className="text-sm text-muted-foreground">{selectedThread.subject}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => selectedThread && toggleStarThread(selectedThread.id)} title="Star">
                    <Star className={`h-4 w-4 ${selectedThread?.messages.some(m => m.starred) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => selectedThread && archiveThread(selectedThread.id)} title="Archive thread">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => selectedThread && trashThread(selectedThread.id)} title="Move to trash">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="relative">
                    <Button size="sm" variant="ghost" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {showMoreMenu && (
                      <Card className="absolute top-full right-0 mt-2 w-48 z-10 shadow-lg">
                        <CardContent className="p-2">
                          <div className="space-y-1">
                            {selectedThread && selectedThread.unread > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  handleMarkRead()
                                  setShowMoreMenu(false)
                                }}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Mark as Read
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  handleMarkUnread()
                                  setShowMoreMenu(false)
                                }}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Mark as Unread
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                handleForward()
                                setShowMoreMenu(false)
                              }}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Forward
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                handlePrint()
                                setShowMoreMenu(false)
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Print
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                selectedThread && snoozeThread(selectedThread.id, 60)
                                setShowMoreMenu(false)
                              }}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Snooze 1 hour
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages - Scrollable area */}
              <CardContent className="overflow-y-auto p-4 space-y-4 flex-1 pr-2">
                {selectedThread.messages.map((message: Message, index: number) => {
                  // Check direction field first, fallback to from address check
                  const isFromMe = message.direction === 'OUTBOUND' || message.from.includes('you@')
                  const Icon = getChannelIcon(message.type)

                  return (
                    <div key={message.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-4`}>
                      <div className={`max-w-[70%] ${isFromMe ? 'order-2' : 'order-1'}`}>
                        {/* Message Header */}
                        <div className={`flex items-center gap-2 mb-1 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                          {!isFromMe && <Icon className={`h-4 w-4 ${getChannelColor(message.type)}`} />}
                          <span className="text-xs text-muted-foreground">
                            {isFromMe ? 'You' : message.contact}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                        </div>

                        {/* Message Bubble - iMessage style */}
                        <div className={`rounded-2xl px-4 py-2 ${
                          isFromMe 
                            ? 'bg-blue-500 text-white rounded-br-md' 
                            : 'bg-gray-200 text-gray-900 rounded-bl-md'
                        }`}>
                          {message.subject && index === 0 && (
                            <p className="font-semibold mb-2">{message.subject}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                          
                          {/* Email Tracking (only for sent emails) */}
                          {isFromMe && message.type === 'email' && (
                            <div className="mt-3 pt-3 border-t border-primary-foreground/20 flex gap-2 flex-wrap">
                              {message.emailOpened && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Eye className="h-3 w-3" />
                                  Opened
                                </Badge>
                              )}
                              {message.emailClicked && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <MousePointerClick className="h-3 w-3" />
                                  Clicked
                                </Badge>
                              )}
                              {message.status && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  {message.status === 'read' ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : message.status === 'delivered' ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Clock className="h-3 w-3" />
                                  )}
                                  {message.status}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className={`mt-3 pt-3 border-t ${isFromMe ? 'border-primary-foreground/20' : 'border-border'} space-y-2`}>
                              {message.attachments.map(attachment => (
                                <div key={attachment.id}>
                                  {attachment.type === 'image' && attachment.url ? (
                                    <div className="space-y-2">
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.name}
                                        className="rounded max-w-full h-auto cursor-pointer hover:opacity-90 transition"
                                        onClick={() => window.open(attachment.url, '_blank')}
                                      />
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="truncate">{attachment.name}</span>
                                        <span className="text-muted-foreground ml-2">{attachment.size}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`flex items-center gap-2 p-2 rounded ${isFromMe ? 'bg-primary-foreground/10' : 'bg-background'}`}>
                                      <Paperclip className="h-4 w-4" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{attachment.name}</p>
                                        <p className="text-xs opacity-70">{attachment.size}</p>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => toast.success('Downloading ' + attachment.name)}
                                      >
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* Invisible div to scroll to (bottom of messages) */}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Reply Box - Fixed at bottom */}
              <div className="p-4 border-t flex-shrink-0">
                <div className="space-y-3">
                  {/* Before/After Comparison Panel */}
                  {showBeforeAfter && (
                    <div className="border-t bg-gradient-to-b from-green-50 to-white p-4 space-y-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-green-600" />
                            AI Enhanced Version
                          </h4>
                          <select
                            value={enhanceTone}
                            onChange={(e) => {
                              setEnhanceTone(e.target.value)
                              handleEnhance()
                            }}
                            className="px-3 py-1 text-sm border rounded-lg"
                          >
                            <option value="professional">Professional</option>
                            <option value="friendly">Friendly</option>
                            <option value="casual">Casual</option>
                            <option value="formal">Formal</option>
                            <option value="enthusiastic">Enthusiastic</option>
                            <option value="concise">Concise</option>
                          </select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEnhance}
                            disabled={enhancingMessage}
                            className="gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Regenerate
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEnhance}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Your Draft
                          </label>
                          <div className="bg-gray-100 border rounded-lg p-3 text-sm min-h-[100px] whitespace-pre-wrap">
                            {replyText}
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-green-600 mb-1 block">
                            ✨ Enhanced Version
                          </label>
                          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-sm min-h-[100px] whitespace-pre-wrap">
                            {enhancedMessage}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEnhance}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={applyEnhanced}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Use Enhanced Version
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* AI Composer - Inline */}
                  {showAIComposer && selectedThread ? (
                    <AIComposer
                      leadId={selectedThread.lead?.id?.toString() || selectedThread.id.toString()}
                      conversationId={selectedThread.id.toString()}
                      messageType={selectedChannel === 'sms' ? 'sms' : selectedChannel === 'call' ? 'call' : 'email'}
                      onMessageGenerated={handleMessageGenerated}
                      onClose={() => setShowAIComposer(false)}
                    />
                  ) : null}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={replyText.length > 10 ? "outline" : "default"}
                      onClick={handleGenerateClick}
                      disabled={!selectedThread}
                      title={!selectedThread ? "Select a conversation first" : replyText.length > 10 ? "This will replace your current text" : "Generate AI message from scratch"}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI Message
                    </Button>
                    <Button
                      size="sm"
                      variant={replyText.length > 10 ? "default" : "outline"}
                      onClick={handleEnhance}
                      disabled={!selectedThread || replyText.length < 10}
                      title={replyText.length < 10 ? "Type your message first (10+ characters)" : "Enhance your message with AI"}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enhance with AI
                    </Button>
                    <div className="relative">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowTemplates(!showTemplates)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Templates
                      </Button>
                      {showTemplates && (
                        <Card className="absolute bottom-full left-0 mb-2 w-64 z-10 shadow-lg">
                          <CardContent className="p-2">
                            <div className="space-y-1">
                              {templates.map(template => (
                                <Button
                                  key={template.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-left"
                                  onClick={() => insertTemplate(template.content)}
                                >
                                  {template.name}
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    <div className="relative">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        title="Quick replies - instant send"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Quick Reply
                      </Button>
                      {showQuickReplies && (
                        <Card className="absolute bottom-full left-0 mb-2 w-56 z-10 shadow-lg">
                          <CardContent className="p-2">
                            <div className="space-y-1">
                              {quickReplies.map(reply => (
                                <Button
                                  key={reply.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-left"
                                  onClick={() => insertQuickReply(reply.text)}
                                >
                                  {reply.text}
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setShowAttachmentModal(true)}>
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <div className="relative">
                      <Button size="sm" variant="ghost" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                        <Smile className="h-4 w-4" />
                      </Button>
                      {showEmojiPicker && (
                        <Card className="absolute bottom-full left-0 mb-2 w-64 z-10 shadow-lg">
                          <CardContent className="p-3">
                            <div className="grid grid-cols-8 gap-2">
                              {['😊', '👍', '❤️', '🎉', '😂', '🤔', '👏', '🔥', '✅', '⭐', '💯', '🚀', '💪', '🙏', '😎', '🎯'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => insertEmoji(emoji)}
                                  className="text-2xl hover:bg-accent rounded p-1 transition"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    {selectedThread?.type === 'email' && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setEditingSignature(signature)
                          setShowSignatureEditor(true)
                        }}
                        title="Edit email signature"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedThread?.type === 'email' && emailSubject && (
                      <Input
                        placeholder="Subject"
                        value={emailSubject}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailSubject(e.target.value)}
                        className="flex-1 mb-1 text-sm"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyText(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendReply()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button onClick={handleSendReply}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Advanced Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="filter-dialog-title" onKeyDown={(e) => { if (e.key === 'Escape') setShowFilters(false) }} onClick={(e) => { if (e.target === e.currentTarget) setShowFilters(false) }}>
          <Card className="w-full max-w-md mx-4" tabIndex={-1}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 id="filter-dialog-title" className="text-lg font-semibold">Filter Conversations</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFilters(false)}
                  >
                    ×
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="onlyUnread"
                      checked={filters.onlyUnread}
                      onChange={(e) => setFilters({ ...filters, onlyUnread: e.target.checked })}
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
                      onChange={(e) => setFilters({ ...filters, onlyStarred: e.target.checked })}
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
                      onChange={(e) => setFilters({ ...filters, hasAttachment: e.target.checked })}
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
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        placeholder="From"
                      />
                      <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        placeholder="To"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sender/Recipient</label>
                    <Input
                      value={filters.sender}
                      onChange={(e) => setFilters({ ...filters, sender: e.target.value })}
                      placeholder="Filter by name..."
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilters({ dateFrom: '', dateTo: '', onlyUnread: false, onlyStarred: false, hasAttachment: false, sender: '' })
                      toast.success('Filters cleared')
                    }}
                  >
                    Clear All
                  </Button>
                  <Button onClick={() => {
                    setShowFilters(false)
                    toast.success('Filters applied')
                  }}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signature Editor Modal */}
      {showSignatureEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="signature-dialog-title" onKeyDown={(e) => { if (e.key === 'Escape') setShowSignatureEditor(false) }} onClick={(e) => { if (e.target === e.currentTarget) setShowSignatureEditor(false) }}>
          <Card className="w-full max-w-2xl mx-4" tabIndex={-1}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 id="signature-dialog-title" className="text-lg font-semibold">Email Signature Editor</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSignatureEditor(false)}
                  >
                    ×
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Signature</label>
                  <textarea
                    value={editingSignature}
                    onChange={(e) => setEditingSignature(e.target.value)}
                    rows={6}
                    className="w-full p-3 border rounded-md resize-none font-mono text-sm"
                    placeholder="Enter your email signature..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Use line breaks to format your signature
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoAppend"
                    checked={autoAppendSignature}
                    onChange={(e) => setAutoAppendSignature(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="autoAppend" className="text-sm cursor-pointer">
                    Automatically append signature to email replies
                  </label>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Preview</h4>
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{editingSignature}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSignatureEditor(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveSignature}>
                    Save Signature
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="compose-dialog-title" onKeyDown={(e) => { if (e.key === 'Escape') setShowComposeModal(false) }} onClick={(e) => { if (e.target === e.currentTarget) setShowComposeModal(false) }}>
          <Card className="w-full max-w-2xl mx-4" tabIndex={-1}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 id="compose-dialog-title" className="text-lg font-semibold">Compose New Message</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowComposeModal(false)}
                  >
                    ×
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={composeType === 'email' ? 'default' : 'outline'}
                      onClick={() => setComposeType('email')}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant={composeType === 'sms' ? 'default' : 'outline'}
                      onClick={() => setComposeType('sms')}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      SMS
                    </Button>
                    <Button
                      size="sm"
                      variant={composeType === 'call' ? 'default' : 'outline'}
                      onClick={() => setComposeType('call')}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Call Note
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Lead (Optional)</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={composeLeadId}
                    onChange={(e) => {
                      const leadId = e.target.value
                      setComposeLeadId(leadId)
                      if (leadId) {
                        const lead = leads.find(l => String(l.id) === leadId)
                        if (lead) {
                          if (composeType === 'email') {
                            setComposeTo(lead.email)
                          } else if (composeType === 'sms') {
                            setComposeTo(lead.phone)
                          }
                        }
                      }
                    }}
                  >
                    <option value="">-- Select a lead or enter manually below --</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName} ({composeType === 'email' ? lead.email : lead.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {composeType === 'email' ? 'To (Email)' : composeType === 'sms' ? 'To (Phone)' : 'Contact'}
                  </label>
                  <Input
                    placeholder={composeType === 'email' ? 'recipient@example.com' : composeType === 'sms' ? '+1 (555) 123-4567' : 'Contact name'}
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {composeLeadId ? 'Auto-filled from selected lead. You can edit if needed.' : 'Or enter recipient manually'}
                  </p>
                </div>

                {composeType === 'email' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      placeholder="Enter subject..."
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={8}
                    className="w-full p-3 border rounded-md resize-none"
                    placeholder={composeType === 'call' ? 'Enter call notes...' : 'Enter your message...'}
                  />
                  {composeType === 'sms' && (
                    <p className="text-xs text-muted-foreground">
                      Character count: {composeBody.length} / 160
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowComposeModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSendCompose}>
                    <Send className="mr-2 h-4 w-4" />
                    Send {composeType === 'email' ? 'Email' : composeType === 'sms' ? 'SMS' : 'Note'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attachment Upload Modal */}
      {showAttachmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="attachment-dialog-title" onKeyDown={(e) => { if (e.key === 'Escape') setShowAttachmentModal(false) }} onClick={(e) => { if (e.target === e.currentTarget) setShowAttachmentModal(false) }}>
          <Card className="w-full max-w-md mx-4" tabIndex={-1}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 id="attachment-dialog-title" className="text-lg font-semibold">Add Attachment</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAttachmentModal(false)}
                  >
                    ×
                  </Button>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Paperclip className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const files = Array.from(e.target.files)

                        // Client-side file size validation (#98)
                        const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per file
                        const MAX_TOTAL_SIZE = 25 * 1024 * 1024 // 25 MB total
                        const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.com', '.js', '.vbs', '.ps1', '.msi', '.dll']

                        let totalSize = 0
                        for (const file of files) {
                          const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
                          if (BLOCKED_EXTENSIONS.includes(ext)) {
                            toast.error(`Blocked file type: ${ext}. Executable files are not allowed.`)
                            e.target.value = ''
                            return
                          }
                          if (file.size > MAX_FILE_SIZE) {
                            toast.error(`File "${file.name}" exceeds 10 MB limit.`)
                            e.target.value = ''
                            return
                          }
                          totalSize += file.size
                        }
                        if (totalSize > MAX_TOTAL_SIZE) {
                          toast.error('Total file size exceeds 25 MB limit.')
                          e.target.value = ''
                          return
                        }

                        setPendingAttachments(prev => [...prev, ...files])
                        const fileNames = files.map(f => f.name).join(', ')
                        // Upload each file to the server
                        try {
                          for (const file of files) {
                            await messagesApi.uploadAttachment(file)
                          }
                          toast.success(`Uploaded: ${fileNames}`)
                        } catch (error) {
                          console.error('Failed to upload attachments:', error)
                          toast.error('Failed to upload one or more files')
                        }
                        setShowAttachmentModal(false)
                      }
                    }}
                  />
                  <label htmlFor="file-upload">
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                      Browse Files
                    </Button>
                  </label>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF</p>
                  <p>Maximum file size: 25 MB</p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAttachmentModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this conversation to trash? This action can be undone by restoring from the trash folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTrashThread}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmTrashThread} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace Draft Warning Modal */}
      <AlertDialog open={showReplaceWarning} onOpenChange={setShowReplaceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Replace Your Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have a draft message. Generating will replace your current text. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowReplaceWarning(false)}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate}>
              Generate Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CommunicationInbox
