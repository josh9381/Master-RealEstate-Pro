import { logger } from '@/lib/logger'
import { useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { setUserItem } from '@/lib/userStorage'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Mail,
  MessageSquare,
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
import { useInboxState } from '@/hooks/useInboxState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { messagesApi, leadsApi, aiApi, messageTemplatesApi } from '@/lib/api'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'
import { useSocketEvent } from '@/hooks/useSocket'
import {
  ContactList,
  ConversationView,
  ComposeModal,
  FilterModal,
  SignatureEditorModal,
  AttachmentModal,
  FALLBACK_TEMPLATES,
  FALLBACK_QUICK_REPLIES,
  INBOX_PAGE_SIZE,
} from './inbox'
import type { Contact, InboxLead, Message } from './inbox'

const CommunicationInbox = () => {
  // M1: All UI state extracted into useInboxState hook
  const state = useInboxState()
  const {
    folderFilter, setFolderFilter,
    contacts, setContacts,
    selectedContact, setSelectedContact,
    searchQuery, setSearchQuery,
    inboxPage, setInboxPage,
    showFilters, setShowFilters,
    filters, setFilters,
    hasActiveFilters,
    replyChannel, setReplyChannel,
    replyText, setReplyText,
    emailSubject, setEmailSubject,
    showTemplates, setShowTemplates,
    showQuickReplies, setShowQuickReplies,
    showEmojiPicker, setShowEmojiPicker,
    showMoreMenu, setShowMoreMenu,
    showComposeModal, setShowComposeModal,
    composeType, setComposeType,
    composeTo, setComposeTo,
    composeSubject, setComposeSubject,
    composeBody, setComposeBody,
    composeLeadId, setComposeLeadId,
    resetCompose,
    showAIComposer, setShowAIComposer,
    setShowEnhanceMode,
    enhancedMessage, setEnhancedMessage,
    showBeforeAfter, setShowBeforeAfter,
    showReplaceWarning, setShowReplaceWarning,
    enhanceTone, setEnhanceTone,
    enhancingMessage, setEnhancingMessage,
    showAttachmentModal, setShowAttachmentModal,
    pendingAttachments, setPendingAttachments,
    showForwardDialog, setShowForwardDialog,
    forwardEmail, setForwardEmail,
    bulkSelectMode, setBulkSelectMode,
    selectedContactIds, setSelectedContactIds,
    showDeleteConfirm, setShowDeleteConfirm,
    contactToDelete, setContactToDelete,
    showSignatureEditor, setShowSignatureEditor,
    signature, setSignature,
    editingSignature, setEditingSignature,
    autoAppendSignature, setAutoAppendSignature,
    timersRef,
    selectedContactIdRef,
  } = state
  const userId = useAuthStore(s => s.user?.id)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ─── Data Fetching ────────────────────────────────────────────
  const { data: contactsData, isLoading: loading, isFetching, refetch: refetchMessages } = useQuery({
    queryKey: ['communication-contacts', searchQuery, inboxPage, folderFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: inboxPage, limit: INBOX_PAGE_SIZE }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (folderFilter === 'archived' || folderFilter === 'trash') {
        params.folder = folderFilter
      }
      // M7: Push starred/snoozed filtering to backend
      if (folderFilter === 'starred') params.starred = 'true'
      if (folderFilter === 'snoozed') params.snoozed = 'true'
      const response = await messagesApi.getMessages(params)
      const contactsList = response?.data?.contacts || []
      return Array.isArray(contactsList) ? contactsList as Contact[] : []
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
      return response?.data?.templates || response?.templates || []
    },
    staleTime: 120_000,
  })

  const { data: quickRepliesData } = useQuery({
    queryKey: ['message-templates-quick-replies'],
    queryFn: async () => {
      const response = await messageTemplatesApi.getTemplates({ isQuickReply: 'true' })
      return response?.data?.templates || response?.templates || []
    },
    staleTime: 120_000,
  })

  // Seed default templates on first load
  useEffect(() => {
    if (templatesData && templatesData.length === 0 && quickRepliesData && quickRepliesData.length === 0) {
      messageTemplatesApi.seedDefaults().then((result) => {
        if (result?.data?.seeded || result?.seeded) {
          queryClient.invalidateQueries({ queryKey: ['message-templates'] })
          queryClient.invalidateQueries({ queryKey: ['message-templates-quick-replies'] })
        }
      }).catch(() => { /* silently ignore seed errors */ })
    }
  }, [templatesData, quickRepliesData, queryClient])

  // Sync query data to local contacts state
  useEffect(() => {
    if (contactsData) {
      setContacts(contactsData)
      const currentId = selectedContactIdRef.current
      if (currentId !== null) {
        const updated = contactsData.find((c: Contact) => c.id === currentId)
        if (updated) setSelectedContact(updated)
      } else if (contactsData.length > 0) {
        setSelectedContact(contactsData[0])
      }
    }
  }, [contactsData])

  // Set default reply channel when contact changes
  useEffect(() => {
    if (selectedContact) {
      const replyChannels = selectedContact.channels.filter(c => c === 'email' || c === 'sms') as string[]
      if (replyChannels.length > 0) {
        if (replyChannels.includes(selectedContact.lastChannel)) {
          setReplyChannel(selectedContact.lastChannel as 'email' | 'sms')
        } else {
          setReplyChannel(replyChannels[0] as 'email' | 'sms')
        }
      }
    }
  }, [selectedContact?.id])

  // ─── Real-time WebSocket: refetch on incoming messages ────────
  const handleIncomingMessage = useCallback(() => {
    refetchMessages()
  }, [refetchMessages])
  useSocketEvent('message:incoming', handleIncomingMessage)

  // ─── Draft Autosave ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedContact) return
    const key = `draft_${selectedContact.id}`
    if (replyText) {
      const timer = setTimeout(() => {
        try { localStorage.setItem(key, replyText) } catch { /* storage full */ }
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      localStorage.removeItem(key)
    }
  }, [replyText, selectedContact])

  // Restore draft when contact changes
  useEffect(() => {
    if (!selectedContact) return
    const draft = localStorage.getItem(`draft_${selectedContact.id}`)
    if (draft) setReplyText(draft)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact?.id])

  const templates = (templatesData && templatesData.length > 0) ? templatesData : FALLBACK_TEMPLATES
  const quickReplies = (quickRepliesData && quickRepliesData.length > 0) ? quickRepliesData : FALLBACK_QUICK_REPLIES

  // ─── Filtered Contacts ─────────────────────────────────────────
  const filteredContacts = contacts.filter((contact: Contact) => {
    const allMessages = Object.values(contact.threads).flatMap(t => t.messages)

    if (folderFilter === 'unread' && contact.totalUnread === 0) return false
    if (folderFilter === 'starred' && !allMessages.some(m => m.starred)) return false
    if (folderFilter === 'snoozed' && !allMessages.some(m => m.snoozed && m.snoozed > Date.now())) return false
    if (folderFilter === 'archived' || folderFilter === 'trash') return true

    // Exclude snoozed contacts from inbox if still snoozed
    if (folderFilter === 'inbox' && allMessages.some(m => m.snoozed && m.snoozed > Date.now())) return false

    const matchesSearch = !searchQuery ||
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filters.onlyUnread && contact.totalUnread === 0) return false
    if (filters.onlyStarred && !allMessages.some(m => m.starred)) return false
    if (filters.hasAttachment && !allMessages.some(m => m.hasAttachment)) return false
    if (filters.sender && !contact.name.toLowerCase().includes(filters.sender.toLowerCase())) return false
    if (filters.dateFrom) {
      const contactDate = new Date(contact.lastMessageAt)
      const fromDate = new Date(filters.dateFrom + 'T00:00:00')
      if (contactDate < fromDate) return false
    }
    if (filters.dateTo) {
      const contactDate = new Date(contact.lastMessageAt)
      const toDate = new Date(filters.dateTo + 'T23:59:59')
      if (contactDate > toDate) return false
    }

    return matchesSearch
  }).sort((a, b) => {
    const aStarred = Object.values(a.threads).flatMap(t => t.messages).some(m => m.starred)
    const bStarred = Object.values(b.threads).flatMap(t => t.messages).some(m => m.starred)
    if (aStarred && !bStarred) return -1
    if (!aStarred && bStarred) return 1
    return 0
  })

  // Helper: get all message IDs for a contact
  const getAllMessageIds = (contact: Contact): string[] => {
    return Object.values(contact.threads)
      .flatMap(t => t.messages)
      .map(m => String(m.id))
      .filter(id => id && id !== 'undefined' && id !== 'null')
  }

  // ─── Contact Actions ───────────────────────────────────────────
  const handleSelectContact = async (contact: Contact, autoMarkRead = true) => {
    setSelectedContact(contact)
    setReplyText('')
    setEmailSubject('')
    setShowAIComposer(false)
    setShowBeforeAfter(false)
    if (autoMarkRead && contact.totalUnread > 0) {
      try {
        const unreadIds = Object.values(contact.threads)
          .flatMap(t => t.messages)
          .filter(m => m.unread && m.id)
          .map(m => String(m.id))
          .filter(id => id && id !== 'undefined' && id !== 'null')

        setContacts(prev => prev.map(c =>
          c.id === contact.id
            ? {
              ...c,
              totalUnread: 0,
              threads: Object.fromEntries(
                Object.entries(c.threads).map(([ch, t]) => [ch, {
                  ...t,
                  unread: 0,
                  messages: t.messages.map(m => ({ ...m, unread: false }))
                }])
              )
            }
            : c
        ))

        if (unreadIds.length > 0) {
          await messagesApi.markAsRead({ messageIds: unreadIds })
        }
      } catch (error: unknown) {
        logger.error('Error marking contact as read:', error)
        setContacts(prev => prev.map(c => c.id === contact.id ? contact : c))
        const axiosError = error as { response?: { data?: { error?: string } }; message?: string }
        toast.error(`Failed to mark as read: ${axiosError.response?.data?.error || axiosError.message || 'Unknown error'}`)
      }
    }
  }

  const handleMarkUnread = async () => {
    if (!selectedContact) return
    try {
      const inboundIds = Object.values(selectedContact.threads)
        .flatMap(t => t.messages)
        .filter(m => m.direction === 'INBOUND')
        .map(m => String(m.id))
      if (inboundIds.length > 0) {
        await messagesApi.markAsUnread({ messageIds: inboundIds })
      }
      setContacts(prev => prev.map(c =>
        c.id === selectedContact.id
          ? {
            ...c,
            totalUnread: inboundIds.length,
            threads: Object.fromEntries(
              Object.entries(c.threads).map(([ch, t]) => [ch, {
                ...t,
                unread: t.messages.filter(m => m.direction === 'INBOUND').length,
                messages: t.messages.map(m => ({ ...m, unread: m.direction === 'INBOUND' }))
              }])
            )
          }
          : c
      ))
      toast.success('Marked as unread')
    } catch (error) {
      logger.error('Failed to mark as unread:', error)
      toast.error('Failed to mark as unread')
    }
  }

  const handleMarkRead = async () => {
    if (!selectedContact) return
    try {
      const unreadIds = Object.values(selectedContact.threads)
        .flatMap(t => t.messages)
        .filter(m => m.unread)
        .map(m => String(m.id))
      if (unreadIds.length > 0) {
        await messagesApi.markAsRead({ messageIds: unreadIds })
      }
      setContacts(prev => prev.map(c =>
        c.id === selectedContact.id
          ? {
            ...c,
            totalUnread: 0,
            threads: Object.fromEntries(
              Object.entries(c.threads).map(([ch, t]) => [ch, {
                ...t,
                unread: 0,
                messages: t.messages.map(m => ({ ...m, unread: false }))
              }])
            )
          }
          : c
      ))
      toast.success('Marked as read')
    } catch (error) {
      logger.error('Failed to mark as read:', error)
      toast.error('Failed to mark as read')
    }
  }

  const toggleStarContact = async (contactId: string | number) => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return
    const allMsgs = Object.values(contact.threads).flatMap(t => t.messages)
    const isStarred = allMsgs.some(m => m.starred)
    const previousContacts = [...contacts]
    setContacts(prev => prev.map(c =>
      c.id === contactId
        ? {
          ...c,
          threads: Object.fromEntries(
            Object.entries(c.threads).map(([ch, t]) => [ch, {
              ...t,
              messages: t.messages.map(m => ({ ...m, starred: !isStarred }))
            }])
          )
        }
        : c
    ))
    try {
      await messagesApi.batchStar(allMsgs.map(m => String(m.id)), !isStarred)
      toast.success(isStarred ? 'Removed star' : 'Starred')
    } catch {
      setContacts(previousContacts)
      toast.error('Failed to update star status')
    }
  }

  const archiveContact = async (contactId: string | number) => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return
    const previousContacts = [...contacts]
    const allMsgIds = getAllMessageIds(contact)
    setContacts(prev => prev.map(c =>
      c.id === contactId
        ? {
          ...c,
          threads: Object.fromEntries(
            Object.entries(c.threads).map(([ch, t]) => [ch, {
              ...t,
              messages: t.messages.map(m => ({ ...m, archived: true }))
            }])
          )
        }
        : c
    ))
    setSelectedContact(null)
    try {
      await messagesApi.batchArchive(allMsgIds, true)
      toast.success('Conversation archived')
    } catch {
      setContacts(previousContacts)
      toast.error('Failed to archive conversation')
    }
  }

  const trashContact = (contactId: string | number) => {
    setContactToDelete(contactId)
    setShowDeleteConfirm(true)
  }

  const confirmTrashContact = async () => {
    if (contactToDelete !== null) {
      const contact = contacts.find(c => c.id === contactToDelete)
      if (contact) {
        const previousContacts = [...contacts]
        const allMsgIds = getAllMessageIds(contact)
        setContacts(prev => prev.map(c =>
          c.id === contactToDelete
            ? {
              ...c,
              threads: Object.fromEntries(
                Object.entries(c.threads).map(([ch, t]) => [ch, {
                  ...t,
                  messages: t.messages.map(m => ({ ...m, trashed: true }))
                }])
              )
            }
            : c
        ))
        setSelectedContact(null)
        try {
          await messagesApi.batchDelete(allMsgIds)
          toast.success('Moved to trash')
        } catch {
          setContacts(previousContacts)
          toast.error('Failed to move to trash')
        }
      }
    }
    setShowDeleteConfirm(false)
    setContactToDelete(null)
  }

  const snoozeContact = async (contactId: string | number, minutes = 60) => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return
    const snoozeUntil = Date.now() + minutes * 60 * 1000
    const previousContacts = [...contacts]
    setContacts(prev => prev.map(c =>
      c.id === contactId
        ? {
          ...c,
          threads: Object.fromEntries(
            Object.entries(c.threads).map(([ch, t]) => [ch, {
              ...t,
              messages: t.messages.map(m => ({ ...m, snoozed: snoozeUntil }))
            }])
          )
        }
        : c
    ))
    try {
      const snoozedUntilISO = new Date(snoozeUntil).toISOString()
      const allMsgs = Object.values(contact.threads).flatMap(t => t.messages)
      await Promise.all(allMsgs.map(m => messagesApi.snoozeMessage(String(m.id), snoozedUntilISO)))
      toast.success('Conversation snoozed')
    } catch (error) {
      logger.error('Failed to snooze:', error)
      setContacts(previousContacts)
      toast.error('Failed to snooze conversation')
    }
  }

  // ─── Reply / Compose Actions ──────────────────────────────────
  const insertTemplate = (templateContent: string) => {
    const personalizedContent = templateContent
      .replace(/\{\{contact\}\}/g, selectedContact?.name || 'there')
      .replace(/\{contact\}/g, selectedContact?.name || 'there')
    setReplyText(personalizedContent)
    setShowTemplates(false)
    toast.success('Template inserted')
  }

  const insertQuickReply = async (text: string) => {
    if (!selectedContact) return
    setReplyText(text)
    setShowQuickReplies(false)
    await handleSendReply(text)
  }

  const insertEmoji = (emoji: string) => {
    setReplyText(replyText + emoji)
    setShowEmojiPicker(false)
  }

  const handleSendReply = async (textOverride?: string) => {
    const text = textOverride ?? replyText
    if (!text.trim() || !selectedContact) return
    try {
      const messageBody = autoAppendSignature && replyChannel === 'email' 
        ? text + signature 
        : text

      // Determine reply-to address from the active channel thread
      let replyTo = ''
      const channelThread = selectedContact.threads[replyChannel]
      if (channelThread?.messages.length) {
        const lastInbound = [...channelThread.messages].reverse().find(m => m.direction === 'INBOUND')
        replyTo = lastInbound?.from || channelThread.messages[0].to
      } else if (replyChannel === 'email' && selectedContact.lead?.email) {
        replyTo = selectedContact.lead.email
      } else if (replyChannel === 'sms' && selectedContact.lead?.phone) {
        replyTo = selectedContact.lead.phone
      } else {
        const anyThread = Object.values(selectedContact.threads)[0]
        const lastMsg = anyThread?.messages[anyThread.messages.length - 1]
        replyTo = lastMsg?.direction === 'INBOUND' ? lastMsg.from : lastMsg?.to || ''
      }

      if (!replyTo) {
        toast.error('No reply address found for this contact')
        return
      }

      if (replyChannel === 'email') {
        let attachmentData: Array<{ filename: string; content: string; contentType: string }> | undefined
        if (pendingAttachments.length > 0) {
          attachmentData = await Promise.all(
            pendingAttachments.map(async (file) => {
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve((reader.result as string).split(',')[1])
                reader.readAsDataURL(file)
              })
              return { filename: file.name, content: base64, contentType: file.type }
            })
          )
        }
        const emailThread = selectedContact.threads.email
        const subject = emailSubject || emailThread?.messages.find(m => m.subject)?.subject
        await messagesApi.sendEmail({ to: replyTo, subject, body: messageBody, leadId: selectedContact.leadId || undefined, attachments: attachmentData })
      } else if (replyChannel === 'sms') {
        await messagesApi.sendSMS({ to: replyTo, body: messageBody, leadId: selectedContact.leadId || undefined })
      }

      const newMessage: Message = {
        id: Date.now(), type: replyChannel, direction: 'OUTBOUND',
        from: 'you@company.com', to: replyTo, contact: selectedContact.name,
        subject: replyChannel === 'email' ? emailSubject : undefined, body: messageBody,
        timestamp: new Date().toISOString(), date: new Date().toLocaleString(),
        unread: false, starred: false, status: 'sent'
      }

      setContacts(prev => prev.map(c => {
        if (c.id !== selectedContact.id) return c
        const updatedThreads = { ...c.threads }
        const ch = replyChannel
        if (updatedThreads[ch]) {
          updatedThreads[ch] = {
            ...updatedThreads[ch],
            messages: [...updatedThreads[ch].messages, newMessage],
            lastMessage: newMessage.body.substring(0, 100),
            lastMessageAt: newMessage.timestamp,
          }
        } else {
          updatedThreads[ch] = {
            messages: [newMessage], unread: 0,
            lastMessage: newMessage.body.substring(0, 100),
            lastMessageAt: newMessage.timestamp,
          }
        }
        return {
          ...c, threads: updatedThreads,
          lastMessage: newMessage.body.substring(0, 100),
          lastMessageAt: newMessage.timestamp,
          lastChannel: ch,
          channels: [...new Set([...c.channels, ch])],
        }
      }))

      toast.success('Reply sent successfully')
      setReplyText('')
      setEmailSubject('')
      setPendingAttachments([])
      const t2 = setTimeout(async () => { await refetchMessages() }, 500)
      timersRef.current.push(t2)
    } catch (error) {
      logger.error('Failed to send reply:', error)
      toast.error('Failed to send reply, please try again')
    }
  }

  const handleForward = async () => {
    setShowMoreMenu(false)
    if (!selectedContact) { toast.error('No message selected to forward'); return }
    setForwardEmail('')
    setShowForwardDialog(true)
  }

  const handleForwardConfirm = async () => {
    if (!forwardEmail.trim() || !selectedContact) return
    setShowForwardDialog(false)
    try {
      const allMsgs = Object.values(selectedContact.threads).flatMap(t => t.messages)
      const lastMsg = allMsgs[allMsgs.length - 1]
      // Sanitize forwarded body to strip any HTML/script content
      const rawBody = lastMsg?.body || selectedContact.lastMessage
      const sanitizedBody = rawBody.replace(/<[^>]*>/g, '').trim()
      await messagesApi.sendEmail({
        to: forwardEmail.trim(),
        subject: `Fwd: ${lastMsg?.subject || selectedContact.name}`,
        body: `---------- Forwarded message ----------\nFrom: ${selectedContact.name}\n\n${sanitizedBody}`,
      })
      toast.success(`Forwarded to ${forwardEmail.trim()}`)
      setForwardEmail('')
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
      if (composeType === 'email') {
        // Upload attachments first (#33)
        let attachmentData: Array<{ filename: string; content: string; contentType: string }> | undefined
        if (pendingAttachments.length > 0) {
          attachmentData = await Promise.all(
            pendingAttachments.map(async (file) => {
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve((reader.result as string).split(',')[1])
                reader.readAsDataURL(file)
              })
              return { filename: file.name, content: base64, contentType: file.type }
            })
          )
        }
        await messagesApi.sendEmail({ to: composeTo, subject: composeSubject, body: messageBody, leadId: composeLeadId || undefined, attachments: attachmentData })
      } else if (composeType === 'sms') {
        await messagesApi.sendSMS({ to: composeTo, body: messageBody, leadId: composeLeadId || undefined })
      } else if (composeType === 'call') {
        await messagesApi.makeCall({ to: composeTo, notes: messageBody, leadId: composeLeadId || undefined })
      }
      toast.success('Message sent successfully')
      setShowComposeModal(false)
      resetCompose(); setPendingAttachments([])
      const t1 = setTimeout(async () => {
        await refetchMessages()
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
    setSelectedContactIds(new Set())
  }

  const handleToggleContactSelect = (contactId: string | number) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(contactId)) newSet.delete(contactId)
      else newSet.add(contactId)
      return newSet
    })
  }

  const handleBulkMarkRead = async () => {
    if (selectedContactIds.size === 0) { toast.error('No contacts selected'); return }
    try {
      const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id))
      const allMessageIds = selectedContacts.flatMap(c =>
        Object.values(c.threads).flatMap(t => t.messages.filter(m => m.unread).map(m => String(m.id)))
      )
      if (allMessageIds.length > 0) await messagesApi.markAsRead({ messageIds: allMessageIds })
      setContacts(prev => prev.map(c =>
        selectedContactIds.has(c.id)
          ? {
            ...c,
            totalUnread: 0,
            threads: Object.fromEntries(
              Object.entries(c.threads).map(([ch, t]) => [ch, {
                ...t,
                unread: 0,
                messages: t.messages.map(m => ({ ...m, unread: false }))
              }])
            )
          }
          : c
      ))
      toast.success(`${selectedContactIds.size} contact(s) marked as read`)
      setSelectedContactIds(new Set()); setBulkSelectMode(false)
    } catch (error) {
      logger.error('Failed to bulk mark as read:', error)
      toast.error('Failed to mark contacts as read')
    }
  }

  const handleBulkArchive = async () => {
    if (selectedContactIds.size === 0) { toast.error('No contacts selected'); return }
    const previousContacts = [...contacts]
    setContacts(prev => prev.map(c =>
      selectedContactIds.has(c.id)
        ? {
          ...c,
          threads: Object.fromEntries(
            Object.entries(c.threads).map(([ch, t]) => [ch, {
              ...t,
              messages: t.messages.map(m => ({ ...m, archived: true }))
            }])
          )
        }
        : c
    ))
    try {
      const allMessageIds = contacts
        .filter(c => selectedContactIds.has(c.id))
        .flatMap(c => getAllMessageIds(c))
      await messagesApi.batchArchive(allMessageIds, true)
      toast.success(`${selectedContactIds.size} contact(s) archived`)
    } catch {
      setContacts(previousContacts)
      toast.error('Failed to archive contacts')
    }
    setSelectedContactIds(new Set()); setBulkSelectMode(false)
  }

  const handleBulkDelete = async () => {
    if (selectedContactIds.size === 0) { toast.error('No contacts selected'); return }
    const previousContacts = [...contacts]
    setContacts(prev => prev.map(c =>
      selectedContactIds.has(c.id)
        ? {
          ...c,
          threads: Object.fromEntries(
            Object.entries(c.threads).map(([ch, t]) => [ch, {
              ...t,
              messages: t.messages.map(m => ({ ...m, trashed: true }))
            }])
          )
        }
        : c
    ))
    try {
      const allMessageIds = contacts
        .filter(c => selectedContactIds.has(c.id))
        .flatMap(c => getAllMessageIds(c))
      await messagesApi.batchDelete(allMessageIds)
      toast.success(`${selectedContactIds.size} contact(s) moved to trash`)
    } catch {
      setContacts(previousContacts)
      toast.error('Failed to delete contacts')
    }
    setSelectedContactIds(new Set()); setBulkSelectMode(false)
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
          {bulkSelectMode && selectedContactIds.size > 0 && (
            <>
              <Button variant="outline" onClick={handleBulkMarkRead}>
                <Check className="mr-2 h-4 w-4" />Mark {selectedContactIds.size} as Read
              </Button>
              <Button variant="outline" onClick={handleBulkArchive}>
                <Archive className="mr-2 h-4 w-4" />Archive {selectedContactIds.size}
              </Button>
              <Button variant="outline" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />Delete {selectedContactIds.size}
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
        <Link to="/communication/sms-templates"><Button variant="outline" size="sm"><MessageSquare className="mr-2 h-4 w-4" />SMS Templates</Button></Link>
        <Link to="/communication/calls"><Button variant="outline" size="sm"><Phone className="mr-2 h-4 w-4" />Cold Call Hub</Button></Link>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} showChart={false} />
      ) : (
        <>
          <div className="hidden">Wrapper for loading state</div>
          <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 240px)' }}>
            <ContactList
              contacts={filteredContacts}
              selectedContact={selectedContact}
              searchQuery={searchQuery}
              folderFilter={folderFilter}
              filters={filters}
              bulkSelectMode={bulkSelectMode}
              selectedContactIds={selectedContactIds}
              loading={loading}
              isFetching={isFetching}
              inboxPage={inboxPage}
              onSearchChange={setSearchQuery}
              onSelectContact={handleSelectContact}
              onFolderChange={setFolderFilter}
              onToggleBulkSelect={handleToggleBulkSelect}
              onToggleContactSelect={handleToggleContactSelect}
              onToggleStar={toggleStarContact}
              onSnooze={snoozeContact}
              onShowFilters={() => setShowFilters(!showFilters)}
              onSetFilter={setFilters}
              onSetPage={setInboxPage}
              onCompose={() => setShowComposeModal(true)}
              onRefresh={() => refetchMessages()}
              hasActiveFilters={hasActiveFilters}
            />
            <ConversationView
              selectedContact={selectedContact}
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
              replyChannel={replyChannel}
              templates={templates}
              quickReplies={quickReplies}
              onReplyTextChange={setReplyText}
              onEmailSubjectChange={setEmailSubject}
              onReplyChannelChange={setReplyChannel}
              onSendReply={handleSendReply}
              onToggleStar={toggleStarContact}
              onArchive={archiveContact}
              onTrash={trashContact}
              onSnooze={snoozeContact}
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
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this conversation to trash? This action can be undone by restoring from the trash folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteConfirm(false); setContactToDelete(null) }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTrashContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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

      {/* Forward Dialog */}
      <AlertDialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forward Message</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the email address to forward this conversation to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <input
              type="email"
              value={forwardEmail}
              onChange={(e) => setForwardEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleForwardConfirm() }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowForwardDialog(false); setForwardEmail('') }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForwardConfirm} disabled={!forwardEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forwardEmail.trim())}>Forward</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CommunicationInbox
