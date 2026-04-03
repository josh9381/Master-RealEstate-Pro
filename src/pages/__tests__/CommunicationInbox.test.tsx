/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', name: 'Test', email: 'test@test.com', role: 'admin' }, isAdmin: () => true }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test', email: 'test@test.com', role: 'admin' } }) }
  ),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ socket: null, connected: false, on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
  useSocketEvent: vi.fn(),
}))

vi.mock('@/hooks/useInboxState', () => ({
  useInboxState: () => ({
    folderFilter: 'inbox',
    setFolderFilter: vi.fn(),
    contacts: [],
    setContacts: vi.fn(),
    selectedContact: null,
    setSelectedContact: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    replyText: '',
    setReplyText: vi.fn(),
    emailSubject: '',
    setEmailSubject: vi.fn(),
    showCompose: false,
    setShowCompose: vi.fn(),
    showFilters: false,
    setShowFilters: vi.fn(),
    showSignatureEditor: false,
    setShowSignatureEditor: vi.fn(),
    showAttachmentModal: false,
    setShowAttachmentModal: vi.fn(),
    composeType: 'email',
    setComposeType: vi.fn(),
    composeTo: '',
    setComposeTo: vi.fn(),
    composeSubject: '',
    setComposeSubject: vi.fn(),
    composeBody: '',
    setComposeBody: vi.fn(),
    composeLeadId: '',
    setComposeLeadId: vi.fn(),
    showMoreMenu: false,
    setShowMoreMenu: vi.fn(),
    showTemplates: false,
    setShowTemplates: vi.fn(),
    showQuickReplies: false,
    setShowQuickReplies: vi.fn(),
    showEmojiPicker: false,
    setShowEmojiPicker: vi.fn(),
    showAIComposer: false,
    setShowAIComposer: vi.fn(),
    showBeforeAfter: false,
    setShowBeforeAfter: vi.fn(),
    enhancedMessage: '',
    setEnhancedMessage: vi.fn(),
    enhanceTone: 'professional',
    setEnhanceTone: vi.fn(),
    enhancingMessage: false,
    setEnhancingMessage: vi.fn(),
    replyChannel: 'email',
    setReplyChannel: vi.fn(),
    bulkSelectMode: false,
    setBulkSelectMode: vi.fn(),
    selectedContactIds: new Set(),
    setSelectedContactIds: vi.fn(),
    editingSignature: '',
    setEditingSignature: vi.fn(),
    autoAppendSignature: false,
    setAutoAppendSignature: vi.fn(),
    filters: { dateFrom: '', dateTo: '', onlyUnread: false, onlyStarred: false, hasAttachment: false, sender: '' },
    setFilters: vi.fn(),
    inboxPage: 1,
    setInboxPage: vi.fn(),
    hasActiveFilters: false,
    showForwardDialog: false,
    setShowForwardDialog: vi.fn(),
    forwardEmail: '',
    setForwardEmail: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAIAvailability', () => ({
  getAIUnavailableMessage: () => 'AI unavailable',
}))

vi.mock('@/lib/api', () => ({
  messagesApi: {
    getMessages: vi.fn().mockResolvedValue({ data: { threads: [] } }),
    sendMessage: vi.fn().mockResolvedValue({ data: {} }),
    markAsRead: vi.fn().mockResolvedValue({ data: {} }),
  },
  leadsApi: {
    getLeads: vi.fn().mockResolvedValue({ data: [] }),
  },
  aiApi: {
    enhanceMessage: vi.fn().mockResolvedValue({ data: { enhanced: '' } }),
  },
  messageTemplatesApi: {
    getTemplates: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('@/lib/userStorage', () => ({
  setUserItem: vi.fn(),
  getUserItem: vi.fn(),
}))

vi.mock('@/components/ai/AIComposer', () => ({
  AIComposer: () => <div>AIComposer</div>,
}))

vi.mock('@/components/ModalErrorBoundary', () => ({
  ModalErrorBoundary: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/utils/smsSegments', () => ({
  calculateSMSSegments: () => ({ segments: 1, remaining: 160 }),
}))

vi.mock('dompurify', () => ({
  default: { sanitize: (x: string) => x },
}))

import CommunicationInbox from '@/pages/communication/CommunicationInbox'

describe('CommunicationInbox', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CommunicationInbox />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
