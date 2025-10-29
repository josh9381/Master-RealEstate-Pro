import { useState, useEffect } from 'react'
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
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'
import { messagesApi } from '@/lib/api'

interface Message {
  id: number
  threadId: number
  type: 'email' | 'sms' | 'call'
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
}

const mockThreads: Thread[] = [
  {
    id: 1,
    contact: 'John Smith',
    lastMessage: 'Thanks for reaching out! I would love to schedule...',
    timestamp: '10 min ago',
    unread: 2,
    type: 'email',
    subject: 'Re: Product Demo Request',
    messages: [
      {
        id: 1,
        threadId: 1,
        type: 'email',
        from: 'you@company.com',
        to: 'john@techcorp.com',
        contact: 'John Smith',
        subject: 'Product Demo Request',
        body: 'Hi John,\n\nI wanted to reach out to see if you\'d be interested in scheduling a product demo. We have some exciting new features that I think would be perfect for your team.\n\nLet me know what times work best for you!\n\nBest regards',
        timestamp: '2 hours ago',
        date: 'Oct 20, 2025 8:30 AM',
        unread: false,
        starred: false,
        status: 'read',
        emailOpened: true,
        emailClicked: true
      },
      {
        id: 2,
        threadId: 1,
        type: 'email',
        from: 'john@techcorp.com',
        to: 'you@company.com',
        contact: 'John Smith',
        subject: 'Re: Product Demo Request',
        body: 'Thanks for reaching out! I would love to schedule a demo for next week. Tuesday or Wednesday afternoon would work best for me.\n\nLooking forward to seeing what you have!\n\nJohn',
        timestamp: '10 min ago',
        date: 'Oct 20, 2025 10:20 AM',
        unread: true,
        starred: false,
      },
    ]
  },
  {
    id: 2,
    contact: 'Sarah Johnson',
    lastMessage: 'Yes, I am interested in learning more about pricing',
    timestamp: '25 min ago',
    unread: 1,
    type: 'sms',
    messages: [
      {
        id: 3,
        threadId: 2,
        type: 'sms',
        from: 'you@company.com',
        to: '+1 (555) 123-4567',
        contact: 'Sarah Johnson',
        body: 'Hi Sarah! I wanted to follow up on our conversation about pricing options. Do you have time for a quick call this week?',
        timestamp: '1 hour ago',
        date: 'Oct 20, 2025 9:30 AM',
        unread: false,
        starred: false,
        status: 'delivered'
      },
      {
        id: 4,
        threadId: 2,
        type: 'sms',
        from: '+1 (555) 123-4567',
        to: 'you@company.com',
        contact: 'Sarah Johnson',
        body: 'Yes, I am interested in learning more about pricing. Thursday at 2pm works for me.',
        timestamp: '25 min ago',
        date: 'Oct 20, 2025 10:05 AM',
        unread: true,
        starred: false,
      },
    ]
  },
  {
    id: 3,
    contact: 'Mike Wilson',
    lastMessage: 'Does your platform integrate with Salesforce?',
    timestamp: '1 hour ago',
    unread: 0,
    type: 'email',
    subject: 'Question about Integration',
    messages: [
      {
        id: 5,
        threadId: 3,
        type: 'email',
        from: 'mike@startup.com',
        to: 'you@company.com',
        contact: 'Mike Wilson',
        subject: 'Question about Integration',
        body: 'Does your platform integrate with Salesforce? We currently use it for all our CRM needs and would need seamless integration.',
        timestamp: '1 hour ago',
        date: 'Oct 20, 2025 9:30 AM',
        unread: false,
        starred: true,
        hasAttachment: true,
        attachments: [
          { id: 1, name: 'integration-requirements.pdf', size: '245 KB', type: 'pdf' },
          { id: 2, name: 'system-diagram.png', size: '1.2 MB', type: 'image', url: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=System+Diagram' }
        ]
      },
    ]
  },
  {
    id: 4,
    contact: 'Emily Davis',
    lastMessage: 'Voicemail: Hi, this is Emily from Big Company...',
    timestamp: '2 hours ago',
    unread: 1,
    type: 'call',
    messages: [
      {
        id: 6,
        threadId: 4,
        type: 'call',
        from: '+1 (555) 987-6543',
        to: 'you@company.com',
        contact: 'Emily Davis',
        body: 'Voicemail: "Hi, this is Emily from Big Company. I wanted to discuss potential partnership opportunities. Please give me a call back when you get a chance. Thanks!"',
        timestamp: '2 hours ago',
        date: 'Oct 20, 2025 8:30 AM',
        unread: true,
        starred: false,
      },
    ]
  },
]

const CommunicationInbox = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'sms' | 'call'>('all')
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'unread' | 'starred' | 'snoozed' | 'archived' | 'trash'>('inbox')
  const [threads, setThreads] = useState<Thread[]>(mockThreads)
  const [selectedThread, setSelectedThread] = useState<Thread | null>(mockThreads[0])
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
  const [composeType, setComposeType] = useState<'email' | 'sms' | 'call'>('email')
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await messagesApi.getMessages()
      
      // Transform API response to thread format if needed
      if (response && Array.isArray(response)) {
        setThreads(response)
        if (response.length > 0) {
          setSelectedThread(response[0])
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
      toast.error('Failed to load messages, using sample data')
      // Keep using mock data on error
      setThreads(mockThreads)
      setSelectedThread(mockThreads[0])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadMessages(true)
  }

  const templates = [
    { id: 1, name: 'Schedule a call', content: 'Hi {contact},\n\nI\'d like to schedule a call to discuss this further. What times work best for you this week?\n\nBest regards' },
    { id: 2, name: 'Request more info', content: 'Hi {contact},\n\nThank you for your message. Could you provide some additional information about [specific topic]?\n\nLooking forward to your response.' },
    { id: 3, name: 'Send pricing', content: 'Hi {contact},\n\nThank you for your interest! I\'ve attached our pricing information. Please let me know if you have any questions.\n\nBest regards' },
    { id: 4, name: 'Follow-up reminder', content: 'Hi {contact},\n\nI wanted to follow up on our previous conversation. Do you have any updates or questions I can help with?\n\nBest regards' },
    { id: 5, name: 'Thank you', content: 'Hi {contact},\n\nThank you so much for your time today. I really appreciated our conversation. Please don\'t hesitate to reach out if you need anything.\n\nBest regards' },
  ]

  const insertTemplate = (templateContent: string) => {
    const personalizedContent = templateContent.replace('{contact}', selectedThread?.contact || 'there')
    setReplyText(personalizedContent)
    setShowTemplates(false)
    toast.success('Template inserted')
  }

  const insertEmoji = (emoji: string) => {
    setReplyText(replyText + emoji)
    setShowEmojiPicker(false)
  }

  const handleMarkUnread = () => {
    if (!selectedThread) return
    setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, unread: Math.max(1, t.unread) } : t))
    toast.success('Marked as unread')
    setShowMoreMenu(false)
  }

  const handleMarkRead = () => {
    if (!selectedThread) return
    setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, unread: 0 } : t))
    toast.success('Marked as read')
    setShowMoreMenu(false)
  }

  const handleSelectThread = (thread: Thread) => {
    setSelectedThread(thread)
    // Auto-mark as read when opening a thread
    if (thread.unread > 0) {
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: 0 } : t))
    }
  }

  const handleForward = () => {
    toast.success('Forward feature coming soon')
    setShowMoreMenu(false)
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

    return matchesChannel && matchesSearch
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

      // Call API based on message type
      if (selectedThread.type === 'email') {
        await messagesApi.sendEmail({
          to: selectedThread.messages[0].to,
          subject: selectedThread.subject,
          body: messageBody,
          threadId: selectedThread.id
        })
      } else if (selectedThread.type === 'sms') {
        await messagesApi.sendSMS({
          to: selectedThread.messages[0].to,
          body: messageBody,
          threadId: selectedThread.id
        })
      }

      const newMessage: Message = {
        id: Date.now(),
        threadId: selectedThread.id,
        type: selectedThread.type,
        from: 'you@company.com',
        to: selectedThread.type === 'email' ? selectedThread.messages[0].to : selectedThread.messages[0].to,
        contact: selectedThread.contact,
        subject: selectedThread.subject,
        body: messageBody,
        timestamp: 'Just now',
        date: new Date().toLocaleString(),
        unread: false,
        starred: false,
        status: 'sent'
      }

      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, messages: [...t.messages, newMessage], lastMessage: newMessage.body, timestamp: 'Just now' } : t))
      toast.success('Reply sent successfully')
      setReplyText('')
      
      // Refresh messages to get updated data
      await loadMessages(true)
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

  const toggleStarThread = (threadId: number) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, starred: !m.starred })) } : t))
    toast.success('Toggled star')
  }

  const archiveThread = (threadId: number) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, archived: true })) } : t))
    toast.success('Thread archived')
  }

  const trashThread = (threadId: number) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, trashed: true })) } : t))
    toast.success('Moved to trash')
  }

  const snoozeThread = (threadId: number, minutes = 60) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, snoozed: snoozeUntil })) } : t))
    toast.success('Thread snoozed')
  }

  const handleAICompose = () => {
    toast.success('AI composing response...')
    // Simulate AI composing
    setTimeout(() => {
      setReplyText('Hi ' + selectedThread?.contact + ',\n\nThank you for your message. I\'d be happy to help with that. Let me know if you have any other questions!\n\nBest regards')
    }, 500)
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

      // Call API based on message type
      if (composeType === 'email') {
        await messagesApi.sendEmail({
          to: composeTo,
          subject: composeSubject,
          body: messageBody
        })
      } else if (composeType === 'sms') {
        await messagesApi.sendSMS({
          to: composeTo,
          body: messageBody
        })
      } else if (composeType === 'call') {
        await messagesApi.makeCall({
          to: composeTo,
          notes: messageBody
        })
      }

      // Create new thread with the composed message
      const newThreadId = Math.max(...threads.map(t => t.id)) + 1
      const newMessageId = Date.now()

      const newMessage: Message = {
        id: newMessageId,
        threadId: newThreadId,
        type: composeType,
        from: 'you@company.com',
        to: composeTo,
        contact: composeTo.split('@')[0] || composeTo,
        subject: composeType === 'email' ? composeSubject : undefined,
        body: messageBody,
        timestamp: 'Just now',
        date: new Date().toLocaleString(),
        unread: false,
        starred: false,
        status: 'sent'
      }

      const newThread: Thread = {
        id: newThreadId,
        contact: composeTo.split('@')[0] || composeTo,
        lastMessage: composeBody,
        timestamp: 'Just now',
        unread: 0,
        type: composeType,
        messages: [newMessage],
        subject: composeType === 'email' ? composeSubject : undefined
      }

      setThreads(prev => [newThread, ...prev])
      setSelectedThread(newThread)
      setShowComposeModal(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      toast.success('Message sent successfully')

      // Refresh messages to get updated data
      await loadMessages(true)
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message, please try again')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communication Hub</h1>
          <p className="text-muted-foreground mt-2">
            Unified inbox for all your communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowComposeModal(true)}>
            <Send className="mr-2 h-4 w-4" />
            Compose New
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        </Card>
      ) : (
        <>
      <div className="hidden">Wrapper for loading state</div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        {/* Column 1: Channels (2 cols) */}
        <Card className="col-span-2 flex flex-col">
          <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="font-semibold mb-4">Channels</h3>
            <div className="space-y-1 flex-1 overflow-y-auto">
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
        <Card className="col-span-4 flex flex-col">
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            {/* Search Header */}
            <div className="p-4 border-b space-y-2">
              <div className="flex gap-2">
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

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.map((thread: Thread) => {
                const Icon = getChannelIcon(thread.type)
                const isSelected = selectedThread?.id === thread.id

                return (
                  <div
                    key={thread.id}
                    className={`p-4 border-b cursor-pointer transition-colors hover:bg-accent ${
                      isSelected ? 'bg-accent' : ''
                    } ${thread.unread > 0 ? 'bg-blue-50/50' : ''}`}
                    onClick={() => handleSelectThread(thread)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${getChannelColor(thread.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">{thread.contact}</p>
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
                        </div>
                      </div>
                      <div className="ml-2 flex flex-col gap-1">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleStarThread(thread.id) }}>
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); snoozeThread(thread.id, 60) }}>
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Conversation (6 cols) */}
        <Card className="col-span-6 flex flex-col">
          {selectedThread ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedThread.contact}</h3>
                  {selectedThread.subject && (
                    <p className="text-sm text-muted-foreground">{selectedThread.subject}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => selectedThread && toggleStarThread(selectedThread.id)}>
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => selectedThread && archiveThread(selectedThread.id)}>
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => selectedThread && trashThread(selectedThread.id)}>
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
                                onClick={handleMarkRead}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Mark as Read
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={handleMarkUnread}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Mark as Unread
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={handleForward}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Forward
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={handlePrint}
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

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedThread.messages.map((message: Message, index: number) => {
                  const isFromMe = message.from.includes('you@')
                  const Icon = getChannelIcon(message.type)

                  return (
                    <div key={message.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
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

                        {/* Message Bubble */}
                        <div className={`rounded-lg p-3 ${
                          isFromMe 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
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
              </CardContent>

              {/* Reply Box */}
              <div className="p-4 border-t">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAICompose}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Compose
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filter Conversations</h3>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Email Signature Editor</h3>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Compose New Message</h3>
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
                  <label className="text-sm font-medium">
                    {composeType === 'email' ? 'To (Email)' : composeType === 'sms' ? 'To (Phone)' : 'Contact'}
                  </label>
                  <Input
                    placeholder={composeType === 'email' ? 'recipient@example.com' : composeType === 'sms' ? '+1 (555) 123-4567' : 'Contact name'}
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                  />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Add Attachment</h3>
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
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const fileNames = Array.from(e.target.files).map(f => f.name).join(', ')
                        toast.success(`Selected: ${fileNames}`)
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
    </div>
  )
}

export default CommunicationInbox
