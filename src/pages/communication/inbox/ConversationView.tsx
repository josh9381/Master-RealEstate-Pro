import { useRef, useEffect } from 'react'
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
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { AIComposer } from '@/components/ai/AIComposer'
import { ModalErrorBoundary } from '@/components/ModalErrorBoundary'
import type { Thread, Message } from './types'

interface ConversationViewProps {
  selectedThread: Thread | null
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
  selectedChannel: 'all' | 'email' | 'sms' | 'call'
  templates: Array<{ id: string; name: string; content: string }>
  quickReplies: Array<{ id: string; name: string; content: string }>
  onReplyTextChange: (text: string) => void
  onEmailSubjectChange: (subject: string) => void
  onSendReply: () => void
  onToggleStar: (threadId: number) => void
  onArchive: (threadId: number) => void
  onTrash: (threadId: number) => void
  onSnooze: (threadId: number, minutes: number) => void
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

export const ConversationView = ({
  selectedThread,
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
  selectedChannel,
  templates,
  quickReplies,
  onReplyTextChange,
  onEmailSubjectChange,
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
  onInsertTemplate,
  onInsertQuickReply,
  onInsertEmoji,
  onGenerateClick,
  onEnhance,
  onApplyEnhanced,
  onCancelEnhance,
  onEnhanceToneChange,
  onMessageGenerated,
}: ConversationViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedThread) {
      const t = setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      return () => clearTimeout(t)
    }
  }, [selectedThread?.id, selectedThread?.messages?.length])

  if (!selectedThread) {
    return (
      <Card className="col-span-6 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Select a conversation to view messages</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-6 flex flex-col overflow-hidden">
      {/* Conversation Header */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-semibold">{selectedThread.contact}</h3>
          {selectedThread.subject && (
            <p className="text-sm text-muted-foreground">{selectedThread.subject}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => onToggleStar(selectedThread.id)} title="Star">
            <Star className={`h-4 w-4 ${selectedThread.messages.some(m => m.starred) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onArchive(selectedThread.id)} title="Archive thread">
            <Archive className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onTrash(selectedThread.id)} title="Move to trash">
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
                    {selectedThread.unread > 0 ? (
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onMarkRead(); onShowMoreMenu(false) }}>
                        <Mail className="mr-2 h-4 w-4" />
                        Mark as Read
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onMarkUnread(); onShowMoreMenu(false) }}>
                        <Mail className="mr-2 h-4 w-4" />
                        Mark as Unread
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onForward(); onShowMoreMenu(false) }}>
                      <Send className="mr-2 h-4 w-4" />
                      Forward
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onPrint(); onShowMoreMenu(false) }}>
                      <FileText className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onSnooze(selectedThread.id, 60); onShowMoreMenu(false) }}>
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
          const isFromMe = message.direction === 'OUTBOUND' || message.from.includes('you@')
          const Icon = getChannelIcon(message.type)

          return (
            <div key={message.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={`max-w-[70%] ${isFromMe ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-center gap-2 mb-1 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                  {!isFromMe && <Icon className={`h-4 w-4 ${getChannelColor(message.type)}`} />}
                  <span className="text-xs text-muted-foreground">
                    {isFromMe ? 'You' : message.contact}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                </div>

                <div className={`rounded-2xl px-4 py-2 ${
                  isFromMe 
                    ? 'bg-blue-500 text-white rounded-br-md' 
                    : 'bg-gray-200 text-gray-900 rounded-bl-md'
                }`}>
                  {message.subject && index === 0 && (
                    <p className="font-semibold mb-2">{message.subject}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                  
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
                                onClick={() => {/* download */}}
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
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
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
                  <label className="text-xs font-medium text-green-600 mb-1 block">✨ Enhanced Version</label>
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
          {showAIComposer && selectedThread ? (
            <ModalErrorBoundary name="AI Composer" onClose={() => onShowAIComposer(false)}>
              <AIComposer
                leadId={selectedThread.lead?.id?.toString() || selectedThread.id.toString()}
                conversationId={selectedThread.id.toString()}
                messageType={selectedChannel === 'sms' ? 'sms' : selectedChannel === 'call' ? 'call' : 'email'}
                onMessageGenerated={onMessageGenerated}
                onClose={() => onShowAIComposer(false)}
              />
            </ModalErrorBoundary>
          ) : null}
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={replyText.length > 10 ? "outline" : "default"}
              onClick={onGenerateClick}
              disabled={!selectedThread}
              title={replyText.length > 10 ? "This will replace your current text" : "Generate AI message from scratch"}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Message
            </Button>
            <Button
              size="sm"
              variant={replyText.length > 10 ? "default" : "outline"}
              onClick={onEnhance}
              disabled={!selectedThread || replyText.length < 10}
              title={replyText.length < 10 ? "Type your message first (10+ characters)" : "Enhance your message with AI"}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Enhance with AI
            </Button>
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => onShowTemplates(!showTemplates)}>
                <FileText className="mr-2 h-4 w-4" />
                Templates
              </Button>
              {showTemplates && (
                <Card className="absolute bottom-full left-0 mb-2 w-64 z-10 shadow-lg">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {templates.map((template) => (
                        <Button key={template.id} variant="ghost" size="sm" className="w-full justify-start text-left" onClick={() => onInsertTemplate(template.content)}>
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => onShowQuickReplies(!showQuickReplies)} title="Quick replies - instant send">
                <Send className="mr-2 h-4 w-4" />
                Quick Reply
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
              <Button size="sm" variant="ghost" onClick={() => onShowEmojiPicker(!showEmojiPicker)}>
                <Smile className="h-4 w-4" />
              </Button>
              {showEmojiPicker && (
                <Card className="absolute bottom-full left-0 mb-2 w-64 z-10 shadow-lg">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-8 gap-2">
                      {['😊', '👍', '❤️', '🎉', '😂', '🤔', '👏', '🔥', '✅', '⭐', '💯', '🚀', '💪', '🙏', '😎', '🎯'].map(emoji => (
                        <button key={emoji} onClick={() => onInsertEmoji(emoji)} className="text-2xl hover:bg-accent rounded p-1 transition">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {selectedThread?.type === 'email' && (
              <Button size="sm" variant="ghost" onClick={onShowSignatureEditor} title="Edit email signature">
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {selectedThread?.type === 'email' && emailSubject && (
              <Input
                placeholder="Subject"
                value={emailSubject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEmailSubjectChange(e.target.value)}
                className="flex-1 mb-1 text-sm"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onReplyTextChange(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onSendReply()
                }
              }}
              className="flex-1"
            />
            <Button onClick={onSendReply}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
