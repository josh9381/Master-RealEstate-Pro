import { useState } from 'react'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Send, 
  Search,
  Filter,
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
  Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'

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
        hasAttachment: false,
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
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'sms' | 'call'>('all')
  const [selectedThread, setSelectedThread] = useState<Thread | null>(mockThreads[0])
  const [replyText, setReplyText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  const filteredThreads = mockThreads.filter((thread: Thread) => {
    const matchesChannel = selectedChannel === 'all' || thread.type === selectedChannel
    const matchesSearch = thread.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesChannel && matchesSearch
  })

  const totalUnread = mockThreads.reduce((acc: number, thread: Thread) => acc + thread.unread, 0)
  const emailUnread = mockThreads.filter((t: Thread) => t.type === 'email').reduce((acc: number, t: Thread) => acc + t.unread, 0)
  const smsUnread = mockThreads.filter((t: Thread) => t.type === 'sms').reduce((acc: number, t: Thread) => acc + t.unread, 0)
  const callUnread = mockThreads.filter((t: Thread) => t.type === 'call').reduce((acc: number, t: Thread) => acc + t.unread, 0)

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

  const handleSendReply = () => {
    if (!replyText.trim()) return
    toast.success('Reply sent successfully')
    setReplyText('')
  }

  const handleAICompose = () => {
    toast.success('AI composing response...')
    // Simulate AI composing
    setTimeout(() => {
      setReplyText('Hi ' + selectedThread?.contact + ',\n\nThank you for your message. I\'d be happy to help with that. Let me know if you have any other questions!\n\nBest regards')
    }, 500)
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
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Compose New
        </Button>
      </div>

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
                onClick={() => setSelectedChannel('all')}
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
              <Button variant="ghost" className="w-full justify-start">
                <Star className="mr-2 h-4 w-4" />
                Starred
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Archive className="mr-2 h-4 w-4" />
                Archived
              </Button>
              <Button variant="ghost" className="w-full justify-start">
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
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
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
                    onClick={() => setSelectedThread(thread)}
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
                        {thread.unread > 0 && (
                          <Badge variant="default" className="mt-2 text-xs">
                            {thread.unread} new
                          </Badge>
                        )}
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
                  <Button size="sm" variant="ghost">
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
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
                    <Button size="sm" variant="ghost">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Smile className="h-4 w-4" />
                    </Button>
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
    </div>
  )
}

export default CommunicationInbox
