import { logger } from '@/lib/logger'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getUserItem, setUserItem } from '@/lib/userStorage'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Mail,
  FileText,
  Phone,
  Send,
  Check,
  CheckCheck,
  Archive,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { messagesApi, leadsApi, aiApi, messageTemplatesApi } from '@/lib/api'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'
import type { ApiSendResponse } from '@/types'
import {
  ChannelSidebar,
  ThreadList,
  ConversationView,
  ComposeModal,
  FilterModal,
  SignatureEditorModal,
  AttachmentModal,
  FALLBACK_TEMPLATES,
  FALLBACK_QUICK_REPLIES,
  INBOX_PAGE_SIZE,
} from './inbox'
import type { Thread, InboxLead, InboxFilters, Message } from './inbox'

const CommunicationInbox = () => {
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'sms' | 'call'>('all')
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'unread' | 'starred' | 'snoozed' | 'archived' | 'trash'>('inbox')
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [replyText, setReplyText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSignatureEditor, setShowSignatureEditor] = useState(false)
  const userId = useAuthStore(s => s.user?.id)
  const [signature, setSignature] = useState(() => {
    return getUserItem(userId, 'emailSignature') || '\n\n---\nBest regards,\nYour Name\nCompany Name\nyour.email@company.com'
  })
  const [editingSignature, setEditingSignature] = useState(signature)
  const [autoAppendSignature, setAutoAppendSignature] = useState(() => {
    return getUserItem(userId, 'autoAppendSignature') === 'true'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<InboxFilters>({
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
  const [, setPendingAttachments] = useState<File[]>([])
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<number>>(new Set())
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [threadToDelete, setThreadToDelete] = useState<number | null>(null)
  const [inboxPage, setInboxPage] = useState(1)
  const [showAIComposer, setShowAIComposer] = useState(false)
  const [, setShowEnhanceMode] = useState(false)
  const [enhancedMessage, setEnhancedMessage] = useState('')
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [showReplaceWarning, setShowReplaceWarning] = useState(false)
  const [enhanceTone, setEnhanceTone] = useState('professional')
  const [enhancingMessage, setEnhancingMessage] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => { timersRef.current.forEach(clearTimeout) }, [])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ─── Data Fetching ────────────────────────────────────────────
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

  const { data: templatesData } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const response = await messageTemplatesApi.getTemplates({ isQuickReply: 'false' })
      return response?.templates || []
    },
    staleTime: 120_000,
  })

  const { data: quickRepliesData } = useQuery({
    queryKey: ['message-templates-quick-replies'],
    queryFn: async () => {
      const response = await messageTemplatesApi.getTemplates({ isQuickReply: 'true' })
      return response?.templates || []
    },
    staleTime: 120_000,
  })

  // Seed default templates on first load
  useEffect(() => {
    if (templatesData && templatesData.length === 0 && quickRepliesData && quickRepliesData.length === 0) {
      messageTemplatesApi.seedDefaults().then((result) => {
        if (result?.seeded) {
          queryClient.invalidateQueries({ queryKey: ['message-templates'] })
          queryClient.invalidateQueries({ queryKey: ['message-templates-quick-replies'] })
        }
      }).catch(() => { /* silently ignore seed errors */ })
    }
  }, [templatesData, quickRepliesData, queryClient])

  // Track selectedThread id in a ref to avoid stale closures
  const selectedThreadIdRef = useRef<number | null>(null)
  useEffect(() => {
    selectedThreadIdRef.current = selectedThread?.id ?? null
  }, [selectedThread])

  // Sync query data to local threads state
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

  const templates = (templatesData && templatesData.length > 0) ? templatesData : FALLBACK_TEMPLATES
  const quickReplies = (quickRepliesData && quickRepliesData.length > 0) ? quickRepliesData : FALLBACK_QUICK_REPLIES

  // ─── Filtered Threads ─────────────────────────────────────────
  const filteredThreads = threads.filter((thread: Thread) => {
    if (selectedFolder === 'unread' && thread.unread === 0) return false
    if (selectedFolder === 'starred' && !thread.messages.some(m => m.starred)) return false
    if (selectedFolder === 'snoozed' && !thread.messages.some(m => m.snoozed)) return false
    if (selectedFolder === 'archived' && !thread.messages.some(m => m.archived)) return false
    if (selectedFolder === 'trash' && !thread.messages.some(m => m.trashed)) return false

    const matchesChannel = selectedChannel === 'all' || thread.type === selectedChannel
    const matchesSearch = thread.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    
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
    const aStarred = a.messages.some(m => m.starred)
    const bStarred = b.messages.some(m => m.starred)
    if (aStarred && !bStarred) return -1
    if (!aStarred && bStarred) return 1
    return 0
  })

  const hasActiveFilters = filters.onlyUnread || filters.onlyStarred || filters.hasAttachment || !!filters.sender

  // ─── Thread Actions ───────────────────────────────────────────
  const handleSelectThread = async (thread: Thread, autoMarkRead = true) => {
    setSelectedThread(thread)
    if (autoMarkRead && thread.unread > 0) {
      try {
        const unreadMessageIds = thread.messages
          .filter(m => m.unread && m.id)
          .map(m => String(m.id))
          .filter(id => id && id !== 'undefined' && id !== 'null')
        
        setThreads(prev => prev.map(t => 
          t.id === thread.id 
            ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, unread: false })) } 
            : t
        ))
        
        if (unreadMessageIds.length > 0) {
          await messagesApi.markAsRead({ messageIds: unreadMessageIds })
        }
      } catch (error: unknown) {
        logger.error('Error marking thread as read:', error)
        setThreads(prev => prev.map(t => 
          t.id === thread.id 
            ? { ...t, unread: thread.unread, messages: thread.messages } 
            : t
        ))
        const axiosError = error as { response?: { data?: { error?: string } }; message?: string }
        toast.error(`Failed to mark as read: ${axiosError.response?.data?.error || axiosError.message || 'Unknown error'}`)
      }
    }
  }

  const handleMarkUnread = async () => {
    if (!selectedThread) return
    try {
      const inboundMessageIds = selectedThread.messages
        .filter(m => m.direction === 'INBOUND')
        .map(m => String(m.id))
      if (inboundMessageIds.length > 0) {
        await messagesApi.markAsUnread({ messageIds: inboundMessageIds })
      }
      setThreads(prev => prev.map(t => 
        t.id === selectedThread.id 
          ? { ...t, unread: inboundMessageIds.length, messages: t.messages.map(m => ({ ...m, unread: m.direction === 'INBOUND' })) } 
          : t
      ))
      setSelectedThread(prev => prev ? {
        ...prev,
        unread: inboundMessageIds.length,
        messages: prev.messages.map(m => ({ ...m, unread: m.direction === 'INBOUND' }))
      } : null)
      toast.success('Marked as unread')
    } catch (error) {
      logger.error('Failed to mark as unread:', error)
      toast.error('Failed to mark as unread')
    }
  }

  const handleMarkRead = async () => {
    if (!selectedThread) return
    try {
      const unreadMessageIds = selectedThread.messages.filter(m => m.unread).map(m => String(m.id))
      if (unreadMessageIds.length > 0) {
        await messagesApi.markAsRead({ messageIds: unreadMessageIds })
      }
      setThreads(prev => prev.map(t => 
        t.id === selectedThread.id 
          ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, unread: false })) } 
          : t
      ))
      setSelectedThread(prev => prev ? {
        ...prev, unread: 0, messages: prev.messages.map(m => ({ ...m, unread: false }))
      } : null)
      toast.success('Marked as read')
    } catch (error) {
      logger.error('Failed to mark as read:', error)
      toast.error('Failed to mark as read')
    }
  }

  const toggleStarThread = async (threadId: number) => {
    const thread = threads.find(t => t.id === threadId)
    if (!thread) return
    const isStarred = thread.messages.some(m => m.starred)
    const previousThreads = [...threads]
    setThreads(prev => prev.map(t => 
      t.id === threadId 
        ? { ...t, messages: t.messages.map(m => ({ ...m, starred: !isStarred })) } 
        : t
    ))
    try {
      await Promise.all(thread.messages.map(m => messagesApi.starMessage(String(m.id), !isStarred)))
      toast.success(isStarred ? 'Removed star' : 'Starred')
    } catch {
      setThreads(previousThreads)
      toast.error('Failed to update star status')
    }
  }

  const archiveThread = async (threadId: number) => {
    const thread = threads.find(t => t.id === threadId)
    const previousThreads = [...threads]
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, archived: true })) } : t))
    setSelectedThread(null)
    if (thread) {
      try {
        await Promise.all(thread.messages.map(m => messagesApi.archiveMessage(String(m.id), true)))
        toast.success('Thread archived')
      } catch {
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
      if (thread) {
        try {
          await Promise.all(thread.messages.map(m => messagesApi.deleteMessage(String(m.id))))
          toast.success('Moved to trash')
        } catch {
          setThreads(previousThreads)
          toast.error('Failed to move to trash')
        }
      }
    }
    setShowDeleteConfirm(false)
    setThreadToDelete(null)
  }

  const snoozeThread = async (threadId: number, minutes = 60) => {
    const thread = threads.find(t => t.id === threadId)
    const snoozeUntil = Date.now() + minutes * 60 * 1000
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, snoozed: snoozeUntil })) } : t))
    toast.success('Thread snoozed')
    if (thread) {
      try {
        const snoozedUntilISO = new Date(snoozeUntil).toISOString()
        await Promise.all(thread.messages.map(m => messagesApi.snoozeMessage(String(m.id), snoozedUntilISO)))
      } catch (error) {
        logger.error('Failed to snooze message:', error)
      }
    }
  }

  // ─── Reply / Compose Actions ──────────────────────────────────
  const insertTemplate = (templateContent: string) => {
    const personalizedContent = templateContent
      .replace(/\{\{contact\}\}/g, selectedThread?.contact || 'there')
      .replace(/\{contact\}/g, selectedThread?.contact || 'there')
    setReplyText(personalizedContent)
    setShowTemplates(false)
    toast.success('Template inserted')
  }

  const insertQuickReply = async (text: string) => {
    if (!selectedThread) return
    setReplyText(text)
    setShowQuickReplies(false)
    const t = setTimeout(() => { handleSendReply() }, 100)
    timersRef.current.push(t)
  }

  const insertEmoji = (emoji: string) => {
    setReplyText(replyText + emoji)
    setShowEmojiPicker(false)
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread) return
    try {
      const messageBody = autoAppendSignature && selectedThread.type === 'email' 
        ? replyText + signature 
        : replyText
      const firstMsg = selectedThread.messages[0]
      const replyTo = firstMsg.direction === 'INBOUND' ? firstMsg.from : firstMsg.to

      if (selectedThread.type === 'email') {
        await messagesApi.sendEmail({ to: replyTo, subject: selectedThread.subject, body: messageBody, threadId: selectedThread.id })
      } else if (selectedThread.type === 'sms') {
        await messagesApi.sendSMS({ to: replyTo, body: messageBody, threadId: selectedThread.id })
      }

      const newMessage: Message = {
        id: Date.now(), threadId: selectedThread.id, type: selectedThread.type,
        from: 'you@company.com', to: replyTo, contact: selectedThread.contact,
        subject: selectedThread.subject, body: messageBody, timestamp: 'Just now',
        date: new Date().toLocaleString(), unread: false, starred: false, status: 'sent'
      }
      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, messages: [...t.messages, newMessage], lastMessage: newMessage.body, timestamp: 'Just now' } : t))
      toast.success('Reply sent successfully')
      setReplyText('')
      const t2 = setTimeout(async () => { await refetchMessages() }, 500)
      timersRef.current.push(t2)
    } catch (error) {
      logger.error('Failed to send reply:', error)
      toast.error('Failed to send reply, please try again')
    }
  }

  const handleForward = async () => {
    setShowMoreMenu(false)
    if (!selectedThread) { toast.error('No message selected to forward'); return }
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
    } catch (error) {
      logger.error('Failed to forward message:', error)
      toast.error('Failed to forward message')
    }
  }

  const handlePrint = () => { window.print(); setShowMoreMenu(false) }

  const handleSendCompose = async () => {
    if (!composeTo || !composeBody) { toast.error('Please fill in recipient and message'); return }
    try {
      const messageBody = composeType === 'email' && autoAppendSignature ? composeBody + signature : composeBody
      let apiResponse: ApiSendResponse | null = null
      if (composeType === 'email') {
        apiResponse = await messagesApi.sendEmail({ to: composeTo, subject: composeSubject, body: messageBody, leadId: composeLeadId || undefined })
      } else if (composeType === 'sms') {
        apiResponse = await messagesApi.sendSMS({ to: composeTo, body: messageBody, leadId: composeLeadId || undefined })
      } else if (composeType === 'call') {
        apiResponse = await messagesApi.makeCall({ to: composeTo, notes: messageBody, leadId: composeLeadId || undefined })
      }
      toast.success('Message sent successfully')
      setShowComposeModal(false)
      setComposeTo(''); setComposeSubject(''); setComposeBody(''); setComposeLeadId('')
      const t1 = setTimeout(async () => {
        await refetchMessages()
        if (apiResponse?.data?.threadId || apiResponse?.threadId) {
          const threadId = apiResponse.data?.threadId || apiResponse.threadId
          const newThread = threads.find(t => t.id === threadId)
          if (newThread) setSelectedThread(newThread)
        }
      }, 500)
      timersRef.current.push(t1)
    } catch (error) {
      logger.error('Failed to send message:', error)
      toast.error('Failed to send message, please try again')
    }
  }

  const handleComposeLeadChange = (leadId: string) => {
    setComposeLeadId(leadId)
    if (leadId) {
      const lead = leads.find(l => String(l.id) === leadId)
      if (lead) {
        if (composeType === 'email') setComposeTo(lead.email)
        else if (composeType === 'sms') setComposeTo(lead.phone)
      }
    }
  }

  // ─── AI / Enhance Actions ────────────────────────────────────
  const handleMessageGenerated = (message: string, subject?: string) => {
    setReplyText(message)
    if (subject) setEmailSubject(subject)
    setShowAIComposer(false)
    toast.success('AI-generated message has been added to your reply box')
  }

  const handleEnhance = async () => {
    if (!replyText || replyText.length < 10) { toast.error('Type a message first (at least 10 characters)'); return }
    setEnhancingMessage(true); setShowEnhanceMode(true)
    try {
      const result = await aiApi.enhanceMessage({ message: replyText, tone: enhanceTone })
      setEnhancedMessage(result.data.enhanced)
      setShowBeforeAfter(true)
    } catch (error) {
      logger.error('Enhance error:', error)
      toast.error(getAIUnavailableMessage(error) || 'Failed to enhance message')
      setShowEnhanceMode(false)
    } finally {
      setEnhancingMessage(false)
    }
  }

  const applyEnhanced = () => {
    setReplyText(enhancedMessage); setShowBeforeAfter(false); setShowEnhanceMode(false)
    toast.success('Enhanced message applied!')
  }

  const cancelEnhance = () => {
    setShowBeforeAfter(false); setShowEnhanceMode(false); setEnhancedMessage('')
  }

  const handleGenerateClick = () => {
    if (replyText.length > 10) setShowReplaceWarning(true)
    else setShowAIComposer(true)
  }

  // ─── Signature ────────────────────────────────────────────────
  const saveSignature = () => {
    setSignature(editingSignature)
    setUserItem(userId, 'emailSignature', editingSignature)
    setUserItem(userId, 'autoAppendSignature', String(autoAppendSignature))
    setShowSignatureEditor(false)
    toast.success('Signature saved')
  }

  // ─── Bulk Actions ─────────────────────────────────────────────
  const handleMarkAllAsRead = async () => {
    try {
      const result = await messagesApi.markAllAsRead()
      toast.success(result.message || 'All messages marked as read')
      await refetchMessages()
    } catch (error) {
      logger.error('Failed to mark all as read:', error)
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
      if (newSet.has(threadId)) newSet.delete(threadId)
      else newSet.add(threadId)
      return newSet
    })
  }

  const handleBulkMarkRead = async () => {
    if (selectedThreadIds.size === 0) { toast.error('No threads selected'); return }
    try {
      const selectedThreadsList = threads.filter(t => selectedThreadIds.has(t.id))
      const allMessageIds = selectedThreadsList.flatMap(t => t.messages.filter(m => m.unread).map(m => String(m.id)))
      if (allMessageIds.length > 0) await messagesApi.markAsRead({ messageIds: allMessageIds })
      setThreads(prev => prev.map(t => selectedThreadIds.has(t.id) ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, unread: false })) } : t))
      toast.success(`${selectedThreadIds.size} thread(s) marked as read`)
      setSelectedThreadIds(new Set()); setBulkSelectMode(false)
    } catch (error) {
      logger.error('Failed to bulk mark as read:', error)
      toast.error('Failed to mark threads as read')
    }
  }

  const handleBulkArchive = async () => {
    if (selectedThreadIds.size === 0) { toast.error('No threads selected'); return }
    const previousThreads = [...threads]
    setThreads(prev => prev.map(t => selectedThreadIds.has(t.id) ? { ...t, messages: t.messages.map(m => ({ ...m, archived: true })) } : t))
    try {
      const allMessageIds = threads.filter(t => selectedThreadIds.has(t.id)).flatMap(t => t.messages.map(m => String(m.id)))
      await Promise.all(allMessageIds.map(id => messagesApi.archiveMessage(id, true)))
      toast.success(`${selectedThreadIds.size} thread(s) archived`)
    } catch {
      setThreads(previousThreads)
      toast.error('Failed to archive threads')
    }
    setSelectedThreadIds(new Set()); setBulkSelectMode(false)
  }

  const handleBulkDelete = async () => {
    if (selectedThreadIds.size === 0) { toast.error('No threads selected'); return }
    const previousThreads = [...threads]
    setThreads(prev => prev.map(t => selectedThreadIds.has(t.id) ? { ...t, messages: t.messages.map(m => ({ ...m, trashed: true })) } : t))
    try {
      const allMessageIds = threads.filter(t => selectedThreadIds.has(t.id)).flatMap(t => t.messages.map(m => String(m.id)))
      await Promise.all(allMessageIds.map(id => messagesApi.deleteMessage(id)))
      toast.success(`${selectedThreadIds.size} thread(s) moved to trash`)
    } catch {
      setThreads(previousThreads)
      toast.error('Failed to delete threads')
    }
    setSelectedThreadIds(new Set()); setBulkSelectMode(false)
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communication Hub</h1>
          <p className="text-muted-foreground mt-2">Unified inbox for all your communications</p>
        </div>
        <div className="flex gap-2">
          {bulkSelectMode && selectedThreadIds.size > 0 && (
            <>
              <Button variant="outline" onClick={handleBulkMarkRead}>
                <Check className="mr-2 h-4 w-4" />Mark {selectedThreadIds.size} as Read
              </Button>
              <Button variant="outline" onClick={handleBulkArchive}>
                <Archive className="mr-2 h-4 w-4" />Archive {selectedThreadIds.size}
              </Button>
              <Button variant="outline" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />Delete {selectedThreadIds.size}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => refetchMessages()} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button variant="outline" onClick={handleMarkAllAsRead} title="Mark all messages as read">
            <CheckCheck className="mr-2 h-4 w-4" />Mark All Read
          </Button>
          <Button onClick={() => setShowComposeModal(true)}>
            <Send className="mr-2 h-4 w-4" />Compose New
          </Button>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex gap-2 border-b pb-3">
        <Link to="/communication"><Button variant="default" size="sm"><Mail className="mr-2 h-4 w-4" />Inbox</Button></Link>
        <Link to="/communication/templates"><Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Email Templates</Button></Link>
        <Link to="/communication/calls"><Button variant="outline" size="sm"><Phone className="mr-2 h-4 w-4" />Cold Call Hub</Button></Link>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} showChart={false} />
      ) : (
        <>
          <div className="hidden">Wrapper for loading state</div>
          <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 240px)' }}>
            <ChannelSidebar
              selectedChannel={selectedChannel}
              selectedFolder={selectedFolder}
              threads={threads}
              onSelectChannel={setSelectedChannel}
              onSelectFolder={setSelectedFolder}
            />
            <ThreadList
              threads={filteredThreads}
              selectedThread={selectedThread}
              searchQuery={searchQuery}
              filters={filters}
              bulkSelectMode={bulkSelectMode}
              selectedThreadIds={selectedThreadIds}
              loading={loading}
              isFetching={isFetching}
              inboxPage={inboxPage}
              onSearchChange={setSearchQuery}
              onSelectThread={handleSelectThread}
              onToggleBulkSelect={handleToggleBulkSelect}
              onToggleThreadSelect={handleToggleThreadSelect}
              onToggleStar={toggleStarThread}
              onSnooze={snoozeThread}
              onShowFilters={() => setShowFilters(!showFilters)}
              onSetFilter={setFilters}
              onSetPage={setInboxPage}
              onCompose={() => setShowComposeModal(true)}
              onRefresh={() => refetchMessages()}
              hasActiveFilters={hasActiveFilters}
            />
            <ConversationView
              selectedThread={selectedThread}
              replyText={replyText}
              emailSubject={emailSubject}
              showMoreMenu={showMoreMenu}
              showTemplates={showTemplates}
              showQuickReplies={showQuickReplies}
              showEmojiPicker={showEmojiPicker}
              showAIComposer={showAIComposer}
              showBeforeAfter={showBeforeAfter}
              enhancedMessage={enhancedMessage}
              enhanceTone={enhanceTone}
              enhancingMessage={enhancingMessage}
              selectedChannel={selectedChannel}
              templates={templates}
              quickReplies={quickReplies}
              onReplyTextChange={setReplyText}
              onEmailSubjectChange={setEmailSubject}
              onSendReply={handleSendReply}
              onToggleStar={toggleStarThread}
              onArchive={archiveThread}
              onTrash={trashThread}
              onSnooze={snoozeThread}
              onMarkRead={handleMarkRead}
              onMarkUnread={handleMarkUnread}
              onForward={handleForward}
              onPrint={handlePrint}
              onShowMoreMenu={setShowMoreMenu}
              onShowTemplates={setShowTemplates}
              onShowQuickReplies={setShowQuickReplies}
              onShowEmojiPicker={setShowEmojiPicker}
              onShowAIComposer={setShowAIComposer}
              onShowAttachmentModal={setShowAttachmentModal}
              onShowSignatureEditor={() => { setEditingSignature(signature); setShowSignatureEditor(true) }}
              onInsertTemplate={insertTemplate}
              onInsertQuickReply={insertQuickReply}
              onInsertEmoji={insertEmoji}
              onGenerateClick={handleGenerateClick}
              onEnhance={handleEnhance}
              onApplyEnhanced={applyEnhanced}
              onCancelEnhance={cancelEnhance}
              onEnhanceToneChange={setEnhanceTone}
              onMessageGenerated={handleMessageGenerated}
            />
          </div>
        </>
      )}

      {/* Modals */}
      {showFilters && (
        <FilterModal
          filters={filters}
          onSetFilters={setFilters}
          onClose={() => setShowFilters(false)}
          onApply={() => { setShowFilters(false); toast.success('Filters applied') }}
          onClear={() => {
            setFilters({ dateFrom: '', dateTo: '', onlyUnread: false, onlyStarred: false, hasAttachment: false, sender: '' })
            toast.success('Filters cleared')
          }}
        />
      )}

      {showSignatureEditor && (
        <SignatureEditorModal
          editingSignature={editingSignature}
          autoAppendSignature={autoAppendSignature}
          onSignatureChange={setEditingSignature}
          onAutoAppendChange={setAutoAppendSignature}
          onSave={saveSignature}
          onClose={() => setShowSignatureEditor(false)}
        />
      )}

      {showComposeModal && (
        <ComposeModal
          composeType={composeType}
          composeTo={composeTo}
          composeSubject={composeSubject}
          composeBody={composeBody}
          composeLeadId={composeLeadId}
          leads={leads}
          onTypeChange={setComposeType}
          onToChange={setComposeTo}
          onSubjectChange={setComposeSubject}
          onBodyChange={setComposeBody}
          onLeadChange={handleComposeLeadChange}
          onSend={handleSendCompose}
          onClose={() => setShowComposeModal(false)}
        />
      )}

      {showAttachmentModal && (
        <AttachmentModal
          onClose={() => setShowAttachmentModal(false)}
          onFilesAdded={(files) => setPendingAttachments(prev => [...prev, ...files])}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this conversation to trash? This action can be undone by restoring from the trash folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteConfirm(false); setThreadToDelete(null) }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTrashThread} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace Draft Warning */}
      <AlertDialog open={showReplaceWarning} onOpenChange={setShowReplaceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Replace Your Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have a draft message. Generating will replace your current text. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowReplaceWarning(false)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowReplaceWarning(false); setShowAIComposer(true) }}>Generate Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CommunicationInbox
