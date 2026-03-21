import { useState, useRef, useEffect } from 'react'
import DOMPurify from 'dompurify'
import {
  Mail,
  MessageSquare,
  Phone,
  Send,
  Star,
  Archive,
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
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { AIComposer } from '@/components/ai/AIComposer'
import { ModalErrorBoundary } from '@/components/ModalErrorBoundary'
import type { Contact, Message } from './types'
import { formatRelativeTime } from './types'

type ChannelTab = 'all' | 'email' | 'sms' | 'call'

interface ConversationViewProps {
  selectedContact: Contact | null
  replyText: string
  emailSubject: string
  showMoreMenu: boolean
  showTemplates: boolean
  showQuickReplies: boolean
  showEmojiPicker: boolean
  showAIComposer: boolean
  showBeforeAfter: boolean
  enhancedMessage: string
  enhanceTone: string
  enhancingMessage: boolean
  replyChannel: 'email' | 'sms'
  templates: Array<{ id: string; name: string; content: string }>
  quickReplies: Array<{ id: string; name: string; content: string }>
  onReplyTextChange: (text: string) => void
  onEmailSubjectChange: (subject: string) => void
  onReplyChannelChange: (channel: 'email' | 'sms') => void
  onSendReply: () => void
  onToggleStar: (contactId: string | number) => void
  onArchive: (contactId: string | number) => void
  onTrash: (contactId: string | number) => void
  onSnooze: (contactId: string | number, minutes: number) => void
  onMarkRead: () => void
  onMarkUnread: () => void
  onForward: () => void
  onPrint: () => void
  onShowMoreMenu: (show: boolean) => void
  onShowTemplates: (show: boolean) => void
  onShowQuickReplies: (show: boolean) => void
  onShowEmojiPicker: (show: boolean) => void
  onShowAIComposer: (show: boolean) => void
  onShowAttachmentModal: (show: boolean) => void
  onShowSignatureEditor: () => void
  onInsertTemplate: (content: string) => void
  onInsertQuickReply: (text: string) => void
  onInsertEmoji: (emoji: string) => void
  onGenerateClick: () => void
  onEnhance: () => void
  onApplyEnhanced: () => void
  onCancelEnhance: () => void
  onEnhanceToneChange: (tone: string) => void
  onMessageGenerated: (message: string, subject?: string) => void
}

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

const getChannelBubbleColor = (type: string) => {
  switch (type) {
    case 'email': return 'bg-blue-500 text-white rounded-br-md'
    case 'sms': return 'bg-green-500 text-white rounded-br-md'
    case 'call': return 'bg-purple-500 text-white rounded-br-md'
    default: return 'bg-blue-500 text-white rounded-br-md'
  }
}

export const ConversationView = ({
  selectedContact,
  replyText,
  emailSubject,
  showMoreMenu,
  showTemplates,
  showQuickReplies,
  showEmojiPicker,
  showAIComposer,
  showBeforeAfter,
  enhancedMessage,
  enhanceTone,
  enhancingMessage,
  replyChannel,
  templates: _templates,
  quickReplies,
  onReplyTextChange,
  onEmailSubjectChange,
  onReplyChannelChange,
  onSendReply,
  onToggleStar,
  onArchive,
  onTrash,
  onSnooze,
  onMarkRead,
  onMarkUnread,
  onForward,
  onPrint,
  onShowMoreMenu,
  onShowTemplates,
  onShowQuickReplies,
  onShowEmojiPicker,
  onShowAIComposer,
  onShowAttachmentModal,
  onShowSignatureEditor,
  onInsertTemplate: _onInsertTemplate,
  onInsertQuickReply,
  onInsertEmoji,
  onGenerateClick,
  onEnhance,
  onApplyEnhanced,
  onCancelEnhance,
  onEnhanceToneChange,
  onMessageGenerated,
}: ConversationViewProps) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ChannelTab>('all')
  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Reset tab when contact changes
  useEffect(() => {
    setActiveTab('all')
  }, [selectedContact?.id])

  useEffect(() => {
    if (selectedContact) {
      const t = setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact])

  if (!selectedContact) {
    return (
      <Card className="col-span-8 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">Select a contact</p>
            <p className="text-sm">Choose a contact from the list to view their messages</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Gather messages based on active tab
  const getMessages = (): Message[] => {
    if (activeTab === 'all') {
      return Object.values(selectedContact.threads)
        .flatMap(t => t.messages)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }
    return selectedContact.threads[activeTab]?.messages || []
  }

  const messages = getMessages()
  const allMessages = Object.values(selectedContact.threads).flatMap(t => t.messages)
  const hasStarred = allMessages.some(m => m.starred)

  // Channel tab counts
  const channelCounts: Record<string, { total: number; unread: number }> = {}
  for (const [ch, thread] of Object.entries(selectedContact.threads)) {
    channelCounts[ch] = { total: thread.messages.length, unread: thread.unread }
  }

  // Available channels for reply (email & sms only, not call)
  const availableReplyChannels = selectedContact.channels.filter(c => c === 'email' || c === 'sms') as ('email' | 'sms')[]

  return (
    <Card className="col-span-8 flex flex-col overflow-hidden">
      {/* Contact Header */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
            {selectedContact.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold">{selectedContact.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {selectedContact.lead?.email && <span>{selectedContact.lead.email}</span>}
              {selectedContact.lead?.email && selectedContact.lead?.phone && <span>•</span>}
              {selectedContact.lead?.phone && <span>{selectedContact.lead.phone}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onToggleStar(selectedContact.id)} title="Star" aria-label="Star conversation">
            <Star className={`h-4 w-4 ${hasStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onArchive(selectedContact.id)} title="Archive" aria-label="Archive conversation">
            <Archive className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onTrash(selectedContact.id)} title="Move to trash" aria-label="Move to trash">
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Button size="sm" variant="ghost" onClick={() => onShowMoreMenu(!showMoreMenu)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showMoreMenu && (
              <Card className="absolute top-full right-0 mt-2 w-48 z-10 shadow-lg">
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {selectedContact.totalUnread > 0 ? (
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onMarkRead(); onShowMoreMenu(false) }}>
                        <Mail className="mr-2 h-4 w-4" /> Mark as Read
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onMarkUnread(); onShowMoreMenu(false) }}>
                        <Mail className="mr-2 h-4 w-4" /> Mark as Unread
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onForward(); onShowMoreMenu(false) }}>
                      <Send className="mr-2 h-4 w-4" /> Forward
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onPrint(); onShowMoreMenu(false) }}>
                      <FileText className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onSnooze(selectedContact.id, 60); onShowMoreMenu(false) }}>
                      <Clock className="mr-2 h-4 w-4" /> Snooze 1 hour
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="px-4 pt-2 border-b flex-shrink-0">
        <div className="flex gap-1" role="tablist" aria-label="Message channels">
          <Button
            size="sm"
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            className="h-8 text-xs gap-1"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          >
            All
            <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">
              {allMessages.length}
            </Badge>
          </Button>
          {selectedContact.channels.includes('email') && (
            <Button
              size="sm"
              variant={activeTab === 'email' ? 'default' : 'ghost'}
              className="h-8 text-xs gap-1"
              role="tab"
              aria-selected={activeTab === 'email'}
              onClick={() => setActiveTab('email')}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
              {channelCounts.email && (
                <Badge variant={channelCounts.email.unread > 0 ? 'default' : 'secondary'} className="text-[10px] h-4 px-1 ml-0.5">
                  {channelCounts.email.total}
                </Badge>
              )}
            </Button>
          )}
          {selectedContact.channels.includes('sms') && (
            <Button
              size="sm"
              variant={activeTab === 'sms' ? 'default' : 'ghost'}
              className="h-8 text-xs gap-1"
              role="tab"
              aria-selected={activeTab === 'sms'}
              onClick={() => setActiveTab('sms')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              SMS
              {channelCounts.sms && (
                <Badge variant={channelCounts.sms.unread > 0 ? 'default' : 'secondary'} className="text-[10px] h-4 px-1 ml-0.5">
                  {channelCounts.sms.total}
                </Badge>
              )}
            </Button>
          )}
          {selectedContact.channels.includes('call') && (
            <Button
              size="sm"
              variant={activeTab === 'call' ? 'default' : 'ghost'}
              className="h-8 text-xs gap-1"
              role="tab"
              aria-selected={activeTab === 'call'}
              onClick={() => setActiveTab('call')}
            >
              <Phone className="h-3.5 w-3.5" />
              Calls
              {channelCounts.call && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">
                  {channelCounts.call.total}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Messages - Scrollable area */}
      <CardContent className="overflow-y-auto p-4 space-y-4 flex-1 pr-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <div>
              <MessageSquare className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No {activeTab === 'all' ? '' : activeTab} messages with this contact</p>
            </div>
          </div>
        ) : (
          messages.map((message: Message) => {
            const isFromMe = message.direction === 'OUTBOUND' || message.from.includes('you@')
            const Icon = getChannelIcon(message.type)
            const showChannelBadge = activeTab === 'all'

            return (
              <div key={message.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-4`} role="article" aria-label={`${isFromMe ? 'Sent' : 'Received'} ${message.type} message${message.subject ? ': ' + message.subject : ''}`}>
                <div className={`max-w-[70%] ${isFromMe ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                    {!isFromMe && <Icon className={`h-4 w-4 ${getChannelColor(message.type)}`} />}
                    <span className="text-xs text-muted-foreground">
                      {isFromMe ? 'You' : message.contact}
                    </span>
                    {showChannelBadge && (
                      <Badge variant="outline" className={`text-[10px] h-4 px-1 gap-0.5 ${
                        message.type === 'sms' ? 'border-green-300 text-green-700 bg-green-50' :
                        message.type === 'call' ? 'border-purple-300 text-purple-700 bg-purple-50' :
                        'border-blue-300 text-blue-700 bg-blue-50'
                      }`}>
                        {message.type === 'sms' ? 'SMS' : message.type === 'call' ? 'Call' : 'Email'}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(message.timestamp)}</span>
                  </div>

                  <div className={`rounded-2xl px-4 py-2 ${
                    isFromMe
                      ? getChannelBubbleColor(message.type)
                      : 'bg-gray-200 text-gray-900 rounded-bl-md'
                  }`}>
                    {message.subject && (
                      <p className="font-semibold mb-2">{message.subject}</p>
                    )}
                    {message.type === 'email' && message.body.includes('<') ? (
                      <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body) }} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                    )}

                    {isFromMe && (message.type === 'email' || message.type === 'sms') && (
                      <div className="mt-3 pt-3 border-t border-primary-foreground/20 flex gap-2 flex-wrap">
                        {message.type === 'email' && message.emailOpened && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Eye className="h-3 w-3" /> Opened
                          </Badge>
                        )}
                        {message.type === 'email' && message.emailClicked && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <MousePointerClick className="h-3 w-3" /> Clicked
                          </Badge>
                        )}
                        {message.status && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            {message.status === 'read' || message.status === 'delivered' ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : message.status === 'sent' ? (
                              <Check className="h-3 w-3" />
                            ) : message.status === 'failed' ? (
                              <X className="h-3 w-3 text-red-500" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {message.status}
                          </Badge>
                        )}
                      </div>
                    )}

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
                                  onClick={() => {
                                    if (attachment.url) {
                                      const link = document.createElement('a')
                                      link.href = attachment.url
                                      link.download = attachment.name || 'attachment'
                                      link.target = '_blank'
                                      link.rel = 'noopener noreferrer'
                                      document.body.appendChild(link)
                                      link.click()
                                      document.body.removeChild(link)
                                    }
                                  }}
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
          })
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Reply Box */}
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
                      onEnhanceToneChange(e.target.value)
                      onEnhance()
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
                  <Button size="sm" variant="ghost" onClick={onEnhance} disabled={enhancingMessage} className="gap-1">
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </Button>
                </div>
                <Button size="sm" variant="ghost" onClick={onCancelEnhance}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Draft</label>
                  <div className="bg-gray-100 border rounded-lg p-3 text-sm min-h-[100px] whitespace-pre-wrap">{replyText}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-green-600 mb-1 block">Enhanced Version</label>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-sm min-h-[100px] whitespace-pre-wrap">{enhancedMessage}</div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={onCancelEnhance}>Cancel</Button>
                <Button size="sm" onClick={onApplyEnhanced} className="bg-green-600 hover:bg-green-700">Use Enhanced Version</Button>
              </div>
            </div>
          )}

          {/* AI Composer - Inline */}
          {showAIComposer && selectedContact ? (
            <ModalErrorBoundary name="AI Composer" onClose={() => onShowAIComposer(false)}>
              <AIComposer
                leadId={selectedContact.lead?.id?.toString() || selectedContact.id.toString()}
                conversationId={selectedContact.id.toString()}
                messageType={replyChannel}
                onMessageGenerated={onMessageGenerated}
                onClose={() => onShowAIComposer(false)}
              />
            </ModalErrorBoundary>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={replyText.length > 10 ? "outline" : "default"}
              onClick={onGenerateClick}
              disabled={!selectedContact}
              title={replyText.length > 10 ? "This will replace your current text" : "Generate AI message from scratch"}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Generate AI Message
            </Button>
            <Button
              size="sm"
              variant={replyText.length > 10 ? "default" : "outline"}
              onClick={onEnhance}
              disabled={!selectedContact || replyText.length < 10}
              title={replyText.length < 10 ? "Type your message first (10+ characters)" : "Enhance your message with AI"}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Enhance with AI
            </Button>
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => onShowTemplates(!showTemplates)}>
                <FileText className="mr-2 h-4 w-4" /> Templates
              </Button>
              {showTemplates && (
                <Card className="absolute bottom-full left-0 mb-2 w-56 z-10 shadow-lg">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left gap-2"
                        onClick={() => { onShowTemplates(false); navigate('/communication/templates') }}
                      >
                        <Mail className="h-4 w-4 text-blue-500" />
                        Email Templates
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left gap-2"
                        onClick={() => { onShowTemplates(false); navigate('/communication/sms-templates') }}
                      >
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        SMS Templates
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => onShowQuickReplies(!showQuickReplies)} title="Quick replies - instant send">
                <Send className="mr-2 h-4 w-4" /> Quick Reply
              </Button>
              {showQuickReplies && (
                <Card className="absolute bottom-full left-0 mb-2 w-56 z-10 shadow-lg">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {quickReplies.map((reply) => (
                        <Button key={reply.id} variant="ghost" size="sm" className="w-full justify-start text-left" onClick={() => onInsertQuickReply(reply.content)}>
                          {reply.content}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => onShowAttachmentModal(true)}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button size="sm" variant="ghost" onClick={() => onShowEmojiPicker(!showEmojiPicker)} aria-label="Toggle emoji picker" aria-expanded={showEmojiPicker}>
                <Smile className="h-4 w-4" />
              </Button>
              {showEmojiPicker && (
                <Card className="absolute bottom-full left-0 mb-2 w-64 z-10 shadow-lg" role="dialog" aria-label="Emoji picker">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-8 gap-2" role="grid">
                      {['😊', '👍', '❤️', '🎉', '😂', '🤔', '👏', '🔥', '✅', '⭐', '💯', '🚀', '💪', '🙏', '😎', '🎯'].map(emoji => (
                        <button key={emoji} onClick={() => onInsertEmoji(emoji)} className="text-2xl hover:bg-accent rounded p-1 transition focus:outline-none focus:ring-2 focus:ring-primary" aria-label={`Insert ${emoji}`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {replyChannel === 'email' && (
              <Button size="sm" variant="ghost" onClick={onShowSignatureEditor} title="Edit email signature">
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Email subject field */}
          {replyChannel === 'email' && emailSubject && (
            <Input
              placeholder="Subject"
              value={emailSubject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEmailSubjectChange(e.target.value)}
              className="text-sm"
            />
          )}

          {/* Reply input with channel selector */}
          {activeTab === 'call' && availableReplyChannels.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">Call-only contact. Use &quot;Compose New&quot; to send a message.</p>
          ) : (
            <div className="flex gap-2">
              <textarea
                placeholder={
                  replyChannel === 'sms' ? 'Reply via SMS...' :
                  replyChannel === 'email' ? 'Reply via email...' :
                  'Type your reply...'
                }
                value={replyText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onReplyTextChange(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSendReply()
                  }
                }}
                rows={2}
                className="flex-1 px-3 py-2 border rounded-md resize-none text-sm"
                maxLength={replyChannel === 'sms' ? 1600 : undefined}
              />

              {/* Channel selector + send button */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Button
                    onClick={onSendReply}
                    className={`${replyChannel === 'sms' ? 'bg-green-600 hover:bg-green-700' : ''} pr-8`}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {replyChannel === 'sms' ? 'SMS' : 'Email'}
                  </Button>
                  {availableReplyChannels.length > 1 && (
                    <button
                      className="absolute right-0 top-0 bottom-0 px-1.5 border-l border-white/30 hover:bg-black/10 rounded-r-md transition"
                      onClick={() => setShowChannelPicker(!showChannelPicker)}
                      title="Switch reply channel"
                    >
                      <ChevronDown className="h-3 w-3 text-white" />
                    </button>
                  )}
                  {showChannelPicker && (
                    <Card className="absolute bottom-full right-0 mb-2 w-36 z-10 shadow-lg">
                      <CardContent className="p-1">
                        {availableReplyChannels.map(ch => (
                          <Button
                            key={ch}
                            variant={replyChannel === ch ? 'default' : 'ghost'}
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => { onReplyChannelChange(ch); setShowChannelPicker(false) }}
                          >
                            {ch === 'email' ? <Mail className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                            Reply via {ch === 'email' ? 'Email' : 'SMS'}
                          </Button>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
                {replyChannel === 'sms' && replyText.length > 0 && (
                  <span className="text-[10px] text-muted-foreground text-center whitespace-nowrap">
                    {replyText.length}/{Math.ceil(replyText.length / 160)} seg
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
