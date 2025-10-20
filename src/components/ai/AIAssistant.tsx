import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Lightbulb, TrendingUp, Mail, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Suggestion {
  id: string
  icon: typeof Lightbulb
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
      content: "Hi! I'm your AI assistant. I can help you compose emails, analyze leads, create campaigns, and answer questions. What can I help you with?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const suggestions: Suggestion[] = [
    {
      id: '1',
      icon: Mail,
      title: 'High-value lead detected',
      description: 'John Doe (Score: 92) - Send personalized email?',
      action: () => handleSuggestionClick('compose-email'),
    },
    {
      id: '2',
      icon: TrendingUp,
      title: 'Campaign optimization',
      description: 'Your email campaigns perform 23% better at 10 AM',
      action: () => handleSuggestionClick('optimize-time'),
    },
    {
      id: '3',
      icon: MessageSquare,
      title: 'Follow-up reminder',
      description: '5 leads need follow-up today',
      action: () => handleSuggestionClick('show-followups'),
    },
  ]

  useEffect(() => {
    if (isOpen && onSuggestionRead) {
      onSuggestionRead()
    }
  }, [isOpen, onSuggestionRead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSuggestionClick = (action: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `I clicked: ${action}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    
    // Simulate AI response
    setIsTyping(true)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getResponseForAction(action),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 1000)
  }

  const getResponseForAction = (action: string): string => {
    const responses: Record<string, string> = {
      'compose-email': "I'll help you compose a personalized email for John Doe. Opening the email composer now...",
      'optimize-time': "Based on your data, I recommend scheduling your next campaign for 10:00 AM on Tuesday. Would you like me to help you create it?",
      'show-followups': "Here are your 5 follow-ups due today. I can help you prioritize them or compose messages.",
    }
    return responses[action] || "I'm here to help! What would you like to do?"
  }

  const handleSendMessage = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    
    // Simulate AI response
    setIsTyping(true)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(input),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 1200)
  }

  const getAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('email') || lowerQuery.includes('compose')) {
      return "I can help you compose a personalized email! Would you like me to:\n\n1. Generate an email for a specific lead\n2. Create a campaign email template\n3. Suggest email subject lines\n\nWhich would you prefer?"
    }
    
    if (lowerQuery.includes('lead') || lowerQuery.includes('score')) {
      return "I can help with lead management! Here's what I can do:\n\n• Analyze lead quality and scores\n• Identify high-priority leads\n• Suggest next best actions\n• Show lead trends\n\nWhat would you like to know?"
    }
    
    if (lowerQuery.includes('campaign')) {
      return "Let me help with your campaigns! I can:\n\n• Create campaign templates\n• Optimize send times\n• Suggest target audiences\n• Analyze campaign performance\n\nWhat do you need?"
    }
    
    return "I understand you're asking about: " + query + "\n\nI can help you with leads, campaigns, emails, analytics, and more. Could you be more specific about what you'd like to do?"
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
                <p className="text-sm whitespace-pre-line">{message.content}</p>
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

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Try: "Help me compose an email" or "Show my best leads"
          </p>
        </div>
      </div>
    </>
  )
}
