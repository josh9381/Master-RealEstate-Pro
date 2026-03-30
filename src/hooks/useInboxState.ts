import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getUserItem } from '@/lib/userStorage'
import type { Contact, InboxFilters } from '@/pages/communication/inbox'

export type FolderFilter = 'inbox' | 'unread' | 'starred' | 'snoozed' | 'drafts' | 'scheduled' | 'archived' | 'trash'

/** Groups the ~31 useState hooks from CommunicationInbox into logical clusters. */
export function useInboxState() {
  const userId = useAuthStore(s => s.user?.id)

  // ── Core inbox ────────────────────────────────────────────────
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('inbox')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inboxPage, setInboxPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<InboxFilters>({
    dateFrom: '',
    dateTo: '',
    onlyUnread: false,
    onlyStarred: false,
    hasAttachment: false,
    sender: ''
  })

  const hasActiveFilters = filters.onlyUnread || filters.onlyStarred || filters.hasAttachment || !!filters.sender

  // ── Reply state ───────────────────────────────────────────────
  const [replyChannel, setReplyChannel] = useState<'email' | 'sms'>('email')
  const [replyText, setReplyText] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // ── Compose modal ─────────────────────────────────────────────
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [composeType, setComposeType] = useState<'email' | 'sms' | 'call'>('email')
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeLeadId, setComposeLeadId] = useState('')

  const resetCompose = () => {
    setComposeTo(''); setComposeSubject(''); setComposeBody(''); setComposeLeadId('')
    setComposeType('email')
  }

  // ── AI / Enhance ──────────────────────────────────────────────
  const [showAIComposer, setShowAIComposer] = useState(false)
  const [, setShowEnhanceMode] = useState(false)
  const [enhancedMessage, setEnhancedMessage] = useState('')
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [showReplaceWarning, setShowReplaceWarning] = useState(false)
  const [enhanceTone, setEnhanceTone] = useState('professional')
  const [enhancingMessage, setEnhancingMessage] = useState(false)

  // ── Attachments / Forward ─────────────────────────────────────
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([])
  const [showForwardDialog, setShowForwardDialog] = useState(false)
  const [forwardEmail, setForwardEmail] = useState('')

  // ── Bulk select ───────────────────────────────────────────────
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string | number>>(new Set())

  // ── Delete confirmation ───────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<string | number | null>(null)

  // ── Signature ─────────────────────────────────────────────────
  const [showSignatureEditor, setShowSignatureEditor] = useState(false)
  const [signature, setSignature] = useState(() => {
    return getUserItem(userId, 'emailSignature') || '\n\n---\nBest regards,\nYour Name\nCompany Name\nyour.email@company.com'
  })
  const [editingSignature, setEditingSignature] = useState(signature)
  const [autoAppendSignature, setAutoAppendSignature] = useState(() => {
    return getUserItem(userId, 'autoAppendSignature') === 'true'
  })

  // ── Timers cleanup ────────────────────────────────────────────
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => { timersRef.current.forEach(clearTimeout) }, [])

  // Track selectedContact id in a ref to avoid stale closures
  const selectedContactIdRef = useRef<string | number | null>(null)
  useEffect(() => {
    selectedContactIdRef.current = selectedContact?.id ?? null
  }, [selectedContact])

  return {
    // Core inbox
    folderFilter, setFolderFilter,
    contacts, setContacts,
    selectedContact, setSelectedContact,
    searchQuery, setSearchQuery,
    inboxPage, setInboxPage,
    showFilters, setShowFilters,
    filters, setFilters,
    hasActiveFilters,

    // Reply
    replyChannel, setReplyChannel,
    replyText, setReplyText,
    emailSubject, setEmailSubject,
    showTemplates, setShowTemplates,
    showQuickReplies, setShowQuickReplies,
    showEmojiPicker, setShowEmojiPicker,
    showMoreMenu, setShowMoreMenu,

    // Compose
    showComposeModal, setShowComposeModal,
    composeType, setComposeType,
    composeTo, setComposeTo,
    composeSubject, setComposeSubject,
    composeBody, setComposeBody,
    composeLeadId, setComposeLeadId,
    resetCompose,

    // AI / Enhance
    showAIComposer, setShowAIComposer,
    setShowEnhanceMode,
    enhancedMessage, setEnhancedMessage,
    showBeforeAfter, setShowBeforeAfter,
    showReplaceWarning, setShowReplaceWarning,
    enhanceTone, setEnhanceTone,
    enhancingMessage, setEnhancingMessage,

    // Attachments / Forward
    showAttachmentModal, setShowAttachmentModal,
    pendingAttachments, setPendingAttachments,
    showForwardDialog, setShowForwardDialog,
    forwardEmail, setForwardEmail,

    // Bulk
    bulkSelectMode, setBulkSelectMode,
    selectedContactIds, setSelectedContactIds,

    // Delete
    showDeleteConfirm, setShowDeleteConfirm,
    contactToDelete, setContactToDelete,

    // Signature
    showSignatureEditor, setShowSignatureEditor,
    signature, setSignature,
    editingSignature, setEditingSignature,
    autoAppendSignature, setAutoAppendSignature,

    // Refs
    timersRef,
    selectedContactIdRef,
  }
}
