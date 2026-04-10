import { logger } from '@/lib/logger'
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Sparkles, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle, Check, Trash2, Copy, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { sendChatMessage, getChatHistory, clearChatHistory } from '@/services/aiService'
import { useToast } from '@/hooks/useToast'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'
import { MessagePreview } from './MessagePreview'
import { aiApi } from '@/lib/api'
import { formatRate } from '@/lib/metricsCalculator'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens?: number | null
  cost?: number | null
  feedback?: string | null
}

interface PendingConfirmation {
  token: string
  functionName: string
  args: Record<string, unknown>
  originalMessage: string
  conversationHistory: Array<{ role: string; content: string }>
  tone: string
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

/**
 * Sanitize message content to strip HTML tags and prevent XSS.
 * React JSX auto-escapes, but this provides defense-in-depth for
 * any content that might bypass the rendering pipeline.
 */
function sanitizeMessageContent(content: string): string {
  // Create a temporary element and extract only text content
  // This handles nested tags, encoded entities, and edge cases
  // that regex-based stripping misses
  const doc = new DOMParser().parseFromString(content, 'text/html')
  return doc.body.textContent || ''
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
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
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
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const hasLoadedHistory = useRef(false)
  const [showMenu, setShowMenu] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const loadChatHistory = async () => {
    if (hasLoadedHistory.current || isLoadingHistory) return
    
    try {
      hasLoadedHistory.current = true
      setIsLoadingHistory(true)
      const response = await getChatHistory(20)
      if (response.success && response.data?.messages?.length > 0) {
        const formattedMessages = response.data.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.createdAt),
        }))
        setMessages(formattedMessages)
      }
    } catch (err) {
      logger.error('Failed to load chat history:', err)
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
      // Focus the input after opening with a small delay for transition
      setTimeout(() => inputRef.current?.focus(), 350)
    }
    if (isOpen && onSuggestionRead) {
      onSuggestionRead()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Escape key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showMenu) {
          setShowMenu(false)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, showMenu, onClose])

  const handleClearChat = useCallback(async () => {
    setShowMenu(false)
    try {
      await clearChatHistory()
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Chat history cleared. How can I help you?",
        timestamp: new Date(),
      }])
      hasLoadedHistory.current = false
      setMessagePreview(null)
      setPendingConfirmation(null)
      toast.success('Chat history cleared')
    } catch {
      toast.error('Failed to clear chat history')
    }
  }, [toast])

  const handleCopyMessage = useCallback((messageContent: string, messageId: string) => {
    navigator.clipboard.writeText(messageContent)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }, [])

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
    // Send directly with the question to avoid state timing race condition
    handleSendMessage(question)
  }

  const handleSendMessage = async (overrideInput?: string) => {
    const messageText = overrideInput || input
    if (!messageText.trim() || isTyping) return

    if (messageText.trim().length > 5000) {
      toast.error('Message too long', 'Maximum 5000 characters allowed')
      return
    }

    const userInput = messageText
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    
    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      // Call real AI API with tone
      const response = await sendChatMessage(userInput, conversationHistory, selectedTone)
      
      if (response.success) {
        // Check if this requires user confirmation (destructive function)
        if (response.data.requiresConfirmation && response.data.confirmationToken) {
          const confirmMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data.message,
            timestamp: new Date(),
            tokens: response.data.tokens,
            cost: response.data.cost,
          }
          setMessages((prev) => [...prev, confirmMsg])
          setPendingConfirmation({
            token: response.data.confirmationToken,
            functionName: response.data.pendingFunction?.name || '',
            args: response.data.pendingFunction?.arguments || {},
            originalMessage: userInput,
            conversationHistory,
            tone: selectedTone,
          })
          return
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          tokens: response.data.tokens,
          cost: response.data.cost,
        }

        // Check if function was used and handle special cases
        if ((response.data as any).functionUsed) { // eslint-disable-line @typescript-eslint/no-explicit-any
          const functionName = (response.data as any).functionUsed // eslint-disable-line @typescript-eslint/no-explicit-any
          
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
                const leadsList = parsedResponse.leads.map((l: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
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
                const riskList = parsedResponse.atRiskLeads.map((l: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
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
                `Probability: **${formatRate(pred.probability)}%** (${pred.confidence} confidence)\n\n` +
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
                eng.optimalTimes.map((t: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
                  `• ${t.dayOfWeek} at ${t.hourOfDay}:00 (${Math.round(t.confidence)}% confidence)`
                ).join('\n')
            }

            // Handle status update
            else if (functionName === 'update_lead_status' && parsedResponse.success) {
              assistantMessage.content = `✅ ${parsedResponse.message}`
            }

            // Handle recent activities
            else if (functionName === 'get_recent_activities' && parsedResponse.activities) {
              const activitiesList = parsedResponse.activities.map((a: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
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
            // If JSON parsing fails, use the raw AI response as the message content
            assistantMessage.content = response.data.message
            logger.error('Failed to parse function response:', e)
          }
        }

        setMessages((prev) => [...prev, assistantMessage])
      } else {
        throw new Error('Failed to get AI response')
      }
    } catch (err: unknown) {
      logger.error('AI chat error:', err)
      
      const errorResponse = err as { response?: { data?: { message?: string }; status?: number } }
      const status = errorResponse.response?.status
      
      const aiMsg = getAIUnavailableMessage(err)

      // Build context-aware error message
      let errorContent: string
      if (aiMsg) {
        errorContent = aiMsg
      } else if (status === 429) {
        errorContent = "You've reached your AI usage limit for this period. Upgrade your plan or wait for the limit to reset."
      } else if (status === 403) {
        errorContent = "You don't have permission to use this AI feature. Please contact your administrator."
      } else if (status === 400) {
        errorContent = errorResponse.response?.data?.message || "I couldn't process that request. Please try rephrasing your message."
      } else if (errorResponse.response?.data?.message) {
        errorContent = errorResponse.response.data.message
      } else {
        errorContent = "I'm having trouble connecting right now. Please try again in a moment."
      }

      // Show error message in chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      
      // Only show toast for server/config errors, not user-facing errors
      if (!status || status >= 500) {
        toast.error(
          'AI Unavailable',
          'The AI service is temporarily unavailable. Please try again later.'
        )
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleConfirm = async () => {
    if (!pendingConfirmation) return
    const { token, originalMessage, conversationHistory, tone } = pendingConfirmation
    setPendingConfirmation(null)
    setIsTyping(true)

    try {
      const response = await sendChatMessage(originalMessage, conversationHistory, tone, token)
      if (response.success) {
        const confirmMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          tokens: response.data.tokens,
          cost: response.data.cost,
        }
        setMessages((prev) => [...prev, confirmMsg])
      }
    } catch (err) {
      logger.error('Confirmation execution error:', err)
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Failed to execute the confirmed action. The confirmation may have expired — please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleCancelConfirmation = () => {
    setPendingConfirmation(null)
    setMessages((prev) => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '❌ Action cancelled. No changes were made.',
      timestamp: new Date(),
    }])
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-[55] flex h-full w-full flex-col bg-background shadow-2xl transition-all duration-300 sm:w-[420px] sm:rounded-l-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between border-b p-4 text-white overflow-hidden">
          {/* Gradient background with mesh pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -top-4 -left-4 h-20 w-20 rounded-full bg-blue-400/10 blur-xl" />
          
          <div className="relative flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-[15px] leading-tight">AI Assistant</h2>
              <p className="text-[11px] text-white/60 font-medium">Powered by GPT-4</p>
            </div>
          </div>
          <div className="relative flex items-center gap-1">
            {/* Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="relative rounded-xl p-1.5 hover:bg-white/15 transition-colors backdrop-blur-sm"
                aria-label="Chat options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border/60 bg-background shadow-xl py-1 z-10">
                  <button
                    onClick={handleClearChat}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Chat History
                  </button>
                </div>
              )}
            </div>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="relative rounded-xl p-1.5 hover:bg-white/15 transition-colors backdrop-blur-sm"
              aria-label="Close AI Assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="border-b bg-gradient-to-b from-muted/40 to-transparent p-4">
            <p className="mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Suggested Actions</p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={suggestion.action}
                  className="w-full rounded-xl border border-border/60 bg-background p-3 text-left transition-all hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md hover:shadow-purple-500/5 group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-colors">
                      <suggestion.icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
          {/* History Loading Skeleton */}
          {isLoadingHistory && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  {i % 2 !== 0 && <div className="h-7 w-7 rounded-lg bg-muted mr-2 shrink-0" />}
                  <div className={cn("rounded-2xl px-4 py-3", i % 2 === 0 ? "bg-purple-200/30 dark:bg-purple-800/20 w-[65%]" : "bg-muted/70 w-[75%]")}>
                    <div className="h-3 bg-muted-foreground/10 rounded w-full mb-2" />
                    <div className="h-3 bg-muted-foreground/10 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-indigo-500/15 mr-2 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  message.role === 'user'
                    ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-purple-500/20"
                    : "bg-muted/70 border border-border/40"
                )}
              >
                <p className="text-sm whitespace-pre-line" style={{ lineHeight: '1.6' }}>
                  {/* Simple markdown-style rendering with HTML sanitization */}
                  {sanitizeMessageContent(message.content).split('\n').map((line, i, arr) => {
                    // Bold text **text**
                    const boldProcessed = line.split(/\*\*(.+?)\*\*/).map((part, j) =>
                      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )
                    return <span key={i}>{boldProcessed}{i < arr.length - 1 && <br />}</span>
                  })}
                </p>
                <p className={cn("mt-1 text-[10px]", message.role === 'user' ? "text-white/50" : "text-muted-foreground/60")}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-1.5 -mb-0.5">
                    <button
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className={cn(
                        'p-0.5 rounded hover:bg-background/60 transition-colors',
                        copiedMessageId === message.id ? 'text-success' : 'text-muted-foreground/50 hover:text-foreground'
                      )}
                      title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
                    >
                      {copiedMessageId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        aiApi.submitChatFeedback(message.id, { feedback: 'positive' }).catch(() => {})
                        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, feedback: 'positive' } : m))
                      }}
                      className={cn(
                        'p-0.5 rounded hover:bg-background/60 transition-colors',
                        message.feedback === 'positive' ? 'text-success' : 'text-muted-foreground/50 hover:text-success'
                      )}
                      title="Helpful"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        aiApi.submitChatFeedback(message.id, { feedback: 'negative' }).catch(() => {})
                        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, feedback: 'negative' } : m))
                      }}
                      className={cn(
                        'p-0.5 rounded hover:bg-background/60 transition-colors',
                        message.feedback === 'negative' ? 'text-destructive' : 'text-muted-foreground/50 hover:text-destructive'
                      )}
                      title="Not helpful"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Destructive Action Confirmation Banner */}
          {pendingConfirmation && (
            <div className="mx-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <span className="text-sm font-medium text-warning">Confirm Action</span>
              </div>
              <p className="text-xs text-warning mb-3">
                The AI wants to execute <strong>{pendingConfirmation.functionName.replace(/_/g, ' ')}</strong>. This action may modify your data.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground text-xs"
                  disabled={isTyping}
                >
                  <Check className="h-3 w-3 mr-1" /> Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelConfirmation}
                  className="flex-1 text-xs"
                  disabled={isTyping}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-indigo-500/15 mr-2 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
              </div>
              <div className="rounded-2xl bg-muted/70 border border-border/40 px-4 py-3">
                <div className="flex space-x-1.5 items-center">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400/60" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400/60" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400/60" style={{ animationDelay: '300ms' }} />
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
        <div className="px-4 py-2.5 border-t bg-gradient-to-b from-muted/20 to-muted/40">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">AI Personality</label>
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            className="text-sm border border-border/60 rounded-xl px-3 py-1.5 w-full bg-background hover:border-purple-300 dark:hover:border-purple-700 transition-colors focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
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
          <div className="px-4 py-2.5 border-t bg-muted/10">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Quick Actions</label>
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(action.question)}
                  className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-800/30 dark:hover:to-indigo-800/30 transition-all border border-purple-200/60 dark:border-purple-800/50 hover:shadow-sm font-medium"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4 bg-background">
          <div className="flex items-center space-x-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-1 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/10 transition-all">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
              disabled={isTyping}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={isTyping || !input.trim()} 
              aria-label="Send message"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-purple-500/25 disabled:opacity-40 disabled:shadow-none hover:shadow-md hover:shadow-purple-500/30 transition-all disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2.5 text-[10px] text-muted-foreground/60 text-center font-medium tracking-wide">
            Powered by GPT-4 with real-time CRM data
          </p>
        </div>
      </div>
    </>
  )
}
