import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, TrendingUp, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { sendChatMessage, getChatHistory } from '@/services/aiService'
import { useToast } from '@/hooks/useToast'
import { MessagePreview } from './MessagePreview'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens?: number | null
  cost?: number | null
}

interface Suggestion {
  id: string
  icon: typeof TrendingUp
  title: string
  description: string
  action: () => void
}

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
  onSuggestionRead?: () => void
}

export function AIAssistant({ isOpen, onClose, onSuggestionRead }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI assistant powered by GPT-4. I can help you with leads, campaigns, emails, and more. What can I help you with today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [selectedTone, setSelectedTone] = useState<string>('FRIENDLY')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [messagePreview, setMessagePreview] = useState<{
    type: 'email' | 'sms' | 'script'
    content: {
      subject?: string
      body?: string
      message?: string
      content?: string
      tone: string
      leadName: string
      purpose: string
      length?: number
      maxLength?: number
    }
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const hasLoadedHistory = useRef(false)

  const loadChatHistory = async () => {
    if (hasLoadedHistory.current || isLoadingHistory) return
    
    try {
      hasLoadedHistory.current = true
      setIsLoadingHistory(true)
      const response = await getChatHistory(20)
      if (response.success && response.data.messages.length > 0) {
        const formattedMessages = response.data.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.createdAt),
        }))
        setMessages(formattedMessages)
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
      hasLoadedHistory.current = false // Allow retry on error
      // Keep default welcome message if history fails
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Load chat history on open (only once)
  useEffect(() => {
    if (isOpen) {
      loadChatHistory()
    }
    if (isOpen && onSuggestionRead) {
      onSuggestionRead()
    }
  }, [isOpen])

  const suggestions: Suggestion[] = [
    {
      id: '1',
      icon: TrendingUp,
      title: 'Lead Statistics',
      description: 'How many leads do I have?',
      action: () => handleQuickQuestion('How many leads do I have?'),
    },
    {
      id: '2',
      icon: Sparkles,
      title: 'Hot Leads',
      description: 'Show me my best leads (score above 80)',
      action: () => handleQuickQuestion('Show me my hot leads with score above 80'),
    },
    {
      id: '3',
      icon: MessageSquare,
      title: 'Recent Activity',
      description: 'What are my recent activities?',
      action: () => handleQuickQuestion('Show me my recent activities'),
    },
  ]

  const quickActions = [
    { label: '📊 Lead Stats', question: 'Give me a summary of my leads' },
    { label: '🔥 Hot Leads', question: 'Show me my hot leads above 80' },
    { label: '⚠️ At Risk', question: 'Which leads are at risk?' },
    { label: '📅 Recent Activity', question: 'Show me my recent activities' },
    { label: '✉️ Draft Email', question: 'Help me write a follow-up email' },
  ]

  useEffect(() => {
    // Only auto-scroll if user is near the bottom (within 100px)
    const messagesContainer = messagesEndRef.current?.parentElement
    if (messagesContainer) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages])

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    // Trigger send after a brief moment to show the question in input
    setTimeout(() => handleSendMessage(), 100)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return

    const userInput = input
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Add typing indicator with function hint
    const typingIndicatorId = 'typing-indicator'
    const typingMessage: Message = {
      id: typingIndicatorId,
      role: 'assistant',
      content: '⏳ Thinking...',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, typingMessage])
    
    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      // Call real AI API with tone
      const response = await sendChatMessage(userInput, conversationHistory, selectedTone)
      
      // Remove typing indicator
      setMessages((prev) => prev.filter(m => m.id !== typingIndicatorId))
      
      if (response.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          tokens: response.data.tokens,
          cost: response.data.cost,
        }

        // Check if function was used and handle special cases
        if ((response.data as any).functionUsed) {
          const functionName = (response.data as any).functionUsed
          
          // Parse the response to extract structured data
          try {
            const parsedResponse = JSON.parse(response.data.message)
            
            // Handle lead creation
            if (functionName === 'create_lead' && parsedResponse.success) {
              const lead = parsedResponse.lead
              assistantMessage.content = `✅ ${parsedResponse.message}\n\n` +
                `**Lead Details:**\n` +
                `• ID: ${lead.id}\n` +
                `• Email: ${lead.email || 'Not provided'}\n` +
                `• Phone: ${lead.phone || 'Not provided'}\n` +
                `• Status: ${lead.status}\n` +
                `• Score: ${lead.score}/100`
            }
            
            // Handle lead update
            else if (functionName === 'update_lead' && parsedResponse.success) {
              assistantMessage.content = `✅ ${parsedResponse.message}`
            }
            
            // Handle lead deletion
            else if (functionName === 'delete_lead' && parsedResponse.success) {
              assistantMessage.content = `✅ ${parsedResponse.message}`
            }
            
            // Handle note addition
            else if (functionName === 'add_note_to_lead' && parsedResponse.success) {
              assistantMessage.content = `✅ ${parsedResponse.message}`
            }
            
            // Handle tag addition
            else if (functionName === 'add_tag_to_lead' && parsedResponse.success) {
              assistantMessage.content = `✅ ${parsedResponse.message}`
            }
            
            // Handle activity creation
            else if (functionName === 'create_activity' && parsedResponse.success) {
              assistantMessage.content = `✅ ${parsedResponse.message}`
            }
            
            // Handle email sending
            else if (functionName === 'send_email' && parsedResponse.success) {
              assistantMessage.content = `✉️ ${parsedResponse.message}\n\n` +
                (parsedResponse.note ? `ℹ️ ${parsedResponse.note}` : '')
            }
            
            // Handle SMS sending
            else if (functionName === 'send_sms' && parsedResponse.success) {
              assistantMessage.content = `📱 ${parsedResponse.message}\n\n` +
                (parsedResponse.note ? `ℹ️ ${parsedResponse.note}` : '')
            }
            
            // Handle appointment scheduling
            else if (functionName === 'schedule_appointment' && parsedResponse.success) {
              const appt = parsedResponse.appointment
              assistantMessage.content = `📅 ${parsedResponse.message}\n\n` +
                (appt.location ? `📍 Location: ${appt.location}` : '')
            }
            
            // Handle email composition
            if (functionName === 'compose_email' && parsedResponse.success) {
              setMessagePreview({
                type: 'email',
                content: {
                  subject: parsedResponse.email.subject,
                  body: parsedResponse.email.body,
                  tone: parsedResponse.email.tone,
                  leadName: parsedResponse.email.leadName,
                  purpose: parsedResponse.email.purpose,
                }
              })
              assistantMessage.content = `✉️ I've drafted an email for ${parsedResponse.email.leadName}. Click below to review and use it!`
            }
            
            // Handle SMS composition
            else if (functionName === 'compose_sms' && parsedResponse.success) {
              setMessagePreview({
                type: 'sms',
                content: {
                  message: parsedResponse.sms.message,
                  tone: parsedResponse.sms.tone,
                  leadName: parsedResponse.sms.leadName,
                  purpose: parsedResponse.sms.purpose,
                  length: parsedResponse.sms.length,
                  maxLength: parsedResponse.sms.maxLength,
                }
              })
              assistantMessage.content = `📱 I've drafted an SMS for ${parsedResponse.sms.leadName} (${parsedResponse.sms.length}/${parsedResponse.sms.maxLength} chars). Click below to review!`
            }
            
            // Handle script composition
            else if (functionName === 'compose_script' && parsedResponse.success) {
              setMessagePreview({
                type: 'script',
                content: {
                  content: parsedResponse.script.content,
                  tone: parsedResponse.script.tone,
                  leadName: parsedResponse.script.leadName,
                  purpose: parsedResponse.script.purpose,
                }
              })
              assistantMessage.content = `📞 I've created a call script for ${parsedResponse.script.leadName}. Click below to review!`
            }
            
            // Handle task creation
            else if (functionName === 'create_task' && parsedResponse.success) {
              assistantMessage.content = `✅ ${parsedResponse.message}`
            }
            
            // Handle lead search/count
            else if ((functionName === 'search_leads' || functionName === 'get_lead_count') && parsedResponse.count !== undefined) {
              if (parsedResponse.leads && parsedResponse.leads.length > 0) {
                const leadsList = parsedResponse.leads.map((l: any) => 
                  `• **${l.name}** - ${l.status} (Score: ${l.score}/100)`
                ).join('\n')
                assistantMessage.content = `🔍 Found ${parsedResponse.count} lead${parsedResponse.count !== 1 ? 's' : ''}:\n\n${leadsList}`
              } else {
                assistantMessage.content = `📊 ${parsedResponse.description || `You have ${parsedResponse.count} lead${parsedResponse.count !== 1 ? 's' : ''}`}`
              }
            }
            
            // Handle at-risk leads
            else if (functionName === 'identify_at_risk_leads' && parsedResponse.success) {
              if (parsedResponse.count > 0) {
                const riskList = parsedResponse.atRiskLeads.map((l: any) => 
                  `• **${l.name}** - ${l.daysSinceContact} days since contact (Risk: ${Math.round(l.churnRisk)}%)`
                ).join('\n')
                assistantMessage.content = `⚠️ Found ${parsedResponse.count} at-risk lead${parsedResponse.count !== 1 ? 's' : ''}:\n\n${riskList}\n\n💡 I recommend reaching out to these leads soon!`
              } else {
                assistantMessage.content = `✅ Great news! No leads are currently at risk.`
              }
            }

            // Handle prediction
            else if (functionName === 'predict_conversion' && parsedResponse.success) {
              const pred = parsedResponse.prediction
              const emoji = pred.probability >= 70 ? '🔥' : pred.probability >= 40 ? '📈' : '📊'
              assistantMessage.content = `${emoji} **Conversion Prediction**\n\n` +
                `Probability: **${pred.probability}%** (${pred.confidence} confidence)\n\n` +
                `**Key Factors:**\n` +
                `• Score: ${pred.factors.score}/100\n` +
                `• Activity Level: ${pred.factors.activityLevel}\n` +
                `• Days in Funnel: ${pred.factors.timeInFunnel}\n` +
                `• Last Activity: ${pred.factors.lastActivityDays} days ago\n\n` +
                `💡 ${pred.reasoning}`
            }

            // Handle next action suggestion
            else if (functionName === 'get_next_action' && parsedResponse.success) {
              const action = parsedResponse.recommendation
              const priorityEmoji = action.priority === 'urgent' ? '🚨' : action.priority === 'high' ? '⚡' : action.priority === 'medium' ? '📌' : '📍'
              const actionEmoji = action.action === 'call' ? '📞' : action.action === 'email' ? '✉️' : action.action === 'text' ? '📱' : action.action === 'schedule_appointment' ? '📅' : '🌱'
              assistantMessage.content = `${priorityEmoji} **Recommended Next Action**\n\n` +
                `${actionEmoji} **${action.action.replace(/_/g, ' ').toUpperCase()}**\n` +
                `Priority: ${action.priority.toUpperCase()}\n\n` +
                `📋 ${action.reasoning}\n\n` +
                `⏰ Timing: ${action.timing}\n` +
                `💼 Impact: ${action.impact}`
            }

            // Handle engagement analysis
            else if (functionName === 'analyze_engagement' && parsedResponse.success) {
              const eng = parsedResponse.engagement
              const trendEmoji = eng.trend === 'increasing' ? '📈' : eng.trend === 'declining' ? '📉' : '➡️'
              assistantMessage.content = `${trendEmoji} **Engagement Analysis**\n\n` +
                `Engagement Score: **${eng.score}/100**\n` +
                `Trend: ${eng.trend}\n\n` +
                `**Optimal Contact Times:**\n` +
                eng.optimalTimes.map((t: any) => 
                  `• ${t.dayOfWeek} at ${t.hourOfDay}:00 (${Math.round(t.confidence)}% confidence)`
                ).join('\n')
            }

            // Handle status update
            else if (functionName === 'update_lead_status' && parsedResponse.success) {
              assistantMessage.content = `✅ ${parsedResponse.message}`
            }

            // Handle recent activities
            else if (functionName === 'get_recent_activities' && parsedResponse.activities) {
              const activitiesList = parsedResponse.activities.map((a: any) => 
                `• **${a.type}** - ${a.description} (${new Date(a.createdAt).toLocaleDateString()})`
              ).join('\n')
              assistantMessage.content = `📋 **Recent Activities** (${parsedResponse.count} total):\n\n${activitiesList}`
            }

            // Handle lead details
            else if (functionName === 'get_lead_details' && parsedResponse.lead) {
              const lead = parsedResponse.lead
              assistantMessage.content = `👤 **Lead Details**\n\n` +
                `Name: **${lead.firstName} ${lead.lastName}**\n` +
                `Status: ${lead.status}\n` +
                `Score: ${lead.score}/100\n` +
                `Email: ${lead.email || 'Not provided'}\n` +
                `Phone: ${lead.phone || 'Not provided'}\n` +
                `Source: ${lead.source || 'Unknown'}`
            }
            
          } catch (e) {
            // If parsing fails, keep original message
            console.error('Failed to parse function response:', e)
          }
        }

        setMessages((prev) => [...prev, assistantMessage])
      } else {
        throw new Error('Failed to get AI response')
      }
    } catch (err: unknown) {
      console.error('AI chat error:', err)
      
      // Remove typing indicator
      setMessages((prev) => prev.filter(m => m.id !== 'typing-indicator'))
      
      const errorResponse = err as { response?: { data?: { message?: string } } }
      
      // Show error message in chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorResponse.response?.data?.message || 
                 "I'm having trouble connecting right now. This might be because OpenAI API is not configured yet. You can still use other features of the platform!",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      
      // Show toast notification
      toast.error(
        'AI Unavailable',
        'OpenAI API key not configured. Contact admin to enable AI features.'
      )
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-background shadow-2xl transition-all duration-300 sm:w-[400px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="border-b bg-muted/30 p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">SUGGESTED ACTIONS</p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={suggestion.action}
                  className="w-full rounded-lg border bg-background p-3 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <suggestion.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="text-sm whitespace-pre-line" style={{ lineHeight: '1.6' }}>
                  {/* Simple markdown-style rendering */}
                  {message.content.split('\n').map((line, i) => {
                    // Bold text **text**
                    const boldProcessed = line.split(/\*\*(.+?)\*\*/).map((part, j) => 
                      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )
                    return <span key={i}>{boldProcessed}{i < message.content.split('\n').length - 1 && <br />}</span>
                  })}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-muted px-4 py-3">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Preview (if available) */}
        {messagePreview && (
          <div className="px-4 pb-2">
            <MessagePreview
              type={messagePreview.type}
              content={messagePreview.content}
              onApply={() => {
                toast.success('Message Ready', 'Message copied and ready to use in campaigns!')
                setMessagePreview(null)
              }}
              onEdit={() => {
                toast.info('Edit in Campaign', 'You can edit this message when creating a campaign.')
              }}
              onCopy={() => {
                const textToCopy = messagePreview.type === 'email' 
                  ? `Subject: ${messagePreview.content.subject}\n\n${messagePreview.content.body}`
                  : messagePreview.content.message || messagePreview.content.content || ''
                
                navigator.clipboard.writeText(textToCopy)
                toast.success('Copied!', 'Message copied to clipboard')
              }}
            />
          </div>
        )}

        {/* Tone Selector */}
        <div className="px-4 py-2 border-t bg-muted/30">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">AI PERSONALITY</label>
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            className="text-sm border border-input rounded-md px-2 py-1 w-full bg-background"
          >
            <option value="PROFESSIONAL">🎯 Professional - Formal & Business-like</option>
            <option value="FRIENDLY">😊 Friendly - Warm & Conversational</option>
            <option value="DIRECT">⚡ Direct - Brief & To-the-Point</option>
            <option value="COACHING">🎓 Coaching - Educational & Mentoring</option>
            <option value="CASUAL">💬 Casual - Relaxed & Informal</option>
          </select>
        </div>

        {/* Quick Actions */}
        {messages.length <= 3 && (
          <div className="px-4 py-2 border-t bg-muted/20">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">QUICK ACTIONS</label>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(action.question)}
                  className="px-3 py-1.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors border border-purple-200 dark:border-purple-800"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button onClick={handleSendMessage} size="icon" disabled={isTyping || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            💡 Powered by GPT-4 with real-time CRM data access
          </p>
        </div>
      </div>
    </>
  )
}
