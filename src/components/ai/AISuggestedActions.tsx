import { Sparkles, Mail, Phone, Calendar, TrendingUp, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { aiApi } from '@/lib/api'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'

interface Suggestion {
  id: string
  icon: typeof Mail
  action: string
  reason: string
  confidence: number
  priority: 'high' | 'medium' | 'low'
  onClick: () => void
}

interface AISuggestedActionsProps {
  className?: string
  leadId?: string
  onComposeEmail?: () => void
  onScheduleCall?: () => void
  onBookDemo?: () => void
}

const iconMap: Record<string, typeof Mail> = {
  mail: Mail,
  email: Mail,
  phone: Phone,
  call: Phone,
  calendar: Calendar,
  demo: Calendar,
  meeting: Calendar,
  trending: TrendingUp,
  campaign: TrendingUp,
  nurture: TrendingUp,
}

function resolveIcon(action: string): typeof Mail {
  const lower = action.toLowerCase()
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lower.includes(key)) return icon
  }
  return Sparkles
}

function formatActionName(action: string): string {
  // Convert kebab-case or snake_case API identifiers to readable text
  // e.g. "qualify-lead" → "Qualify Lead", "schedule-followup" → "Schedule Follow-up"
  return action
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Followup/i, 'Follow-up')
    .replace(/Followups/i, 'Follow-ups')
}

function resolvePriority(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 70) return 'high'
  if (confidence >= 50) return 'medium'
  return 'low'
}

const fallbackSuggestions: Suggestion[] = [
  {
    id: '1',
    icon: Mail,
    action: 'Send follow-up email',
    reason: 'Recommended next step',
    confidence: 70,
    priority: 'high',
    onClick: () => { /* wired dynamically */ },
  },
  {
    id: '2',
    icon: Phone,
    action: 'Schedule a call',
    reason: 'Personal outreach increases engagement',
    confidence: 75,
    priority: 'high',
    onClick: () => { /* wired dynamically */ },
  },
  {
    id: '3',
    icon: Calendar,
    action: 'Book demo meeting',
    reason: 'Demos help move leads forward',
    confidence: 60,
    priority: 'medium',
    onClick: () => { /* wired dynamically */ },
  },
  {
    id: '4',
    icon: TrendingUp,
    action: 'Add to nurture campaign',
    reason: 'Keep lead engaged over time',
    confidence: 55,
    priority: 'low',
    onClick: () => { /* wired dynamically */ },
  },
]

export function AISuggestedActions({ className, leadId, onComposeEmail, onScheduleCall, onBookDemo }: AISuggestedActionsProps) {
  const [dismissedActions, setDismissedActions] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>(fallbackSuggestions)
  const [isLoading, setIsLoading] = useState(false)

  const wireClickHandler = useCallback((action: string): (() => void) => {
    const lower = action.toLowerCase()
    if ((lower.includes('email') || lower.includes('mail')) && onComposeEmail) return onComposeEmail
    if ((lower.includes('call') || lower.includes('phone')) && onScheduleCall) return onScheduleCall
    if ((lower.includes('demo') || lower.includes('meeting') || lower.includes('calendar')) && onBookDemo) return onBookDemo
    return () => {}
  }, [onComposeEmail, onScheduleCall, onBookDemo])

  // Wire fallback suggestions to callback props
  useEffect(() => {
    setSuggestions(prev => prev.map(s => ({
      ...s,
      onClick: wireClickHandler(s.action),
    })))
  }, [wireClickHandler])

  useEffect(() => {
    if (!leadId) return
    const fetchSuggestions = async () => {
      setIsLoading(true)
      try {
        const result = await aiApi.suggestActions({ leadId })
        const items = result.success ? (result.data?.suggestions || result.data) : (result.suggestions || result)
        if (Array.isArray(items) && items.length > 0) {
          setSuggestions(items.map((item: any, idx: number) => ({
            id: item.id || String(idx + 1),
            icon: resolveIcon(item.action || item.title || ''),
            action: formatActionName(item.action || item.title || 'Suggested action'),
            reason: item.reason || item.description || 'AI-recommended action',
            confidence: item.confidence ?? item.score ?? 50,
            priority: item.priority || resolvePriority(item.confidence ?? 50),
            onClick: wireClickHandler(item.action || item.title || ''),
          })))
        }
      } catch (error) {
        const aiMsg = getAIUnavailableMessage(error)
        if (aiMsg) {
          console.info('AI suggestions unavailable (API key not configured) — using defaults')
        } else {
          console.error('Failed to fetch AI suggestions:', error)
        }
        // Keep fallback suggestions
      } finally {
        setIsLoading(false)
      }
    }
    fetchSuggestions()
  }, [leadId, wireClickHandler])

  const activeSuggestions = suggestions.filter(s => !dismissedActions.includes(s.id))

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedActions([...dismissedActions, id])
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-blue-500'
      default: return 'border-l-gray-500'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-700 bg-green-100'
    if (confidence >= 50) return 'text-yellow-700 bg-yellow-100'
    return 'text-orange-700 bg-orange-100'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Sparkles className="mr-2 h-5 w-5 text-purple-600 animate-pulse" />
            Loading AI Recommendations...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (activeSuggestions.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-base">
            <Sparkles className="mr-2 h-5 w-5 text-purple-600" />
            AI Recommendations
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {activeSuggestions.length} suggestions
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activeSuggestions.slice(0, 3).map((suggestion) => (
            <div
              key={suggestion.id}
              className={cn(
                "group relative w-full rounded-lg border-l-4 bg-muted/30 p-3 transition-all hover:bg-muted/60 hover:shadow-md cursor-pointer",
                getPriorityColor(suggestion.priority)
              )}
              onClick={suggestion.onClick}
            >
              {/* Dismiss Button */}
              <button
                onClick={(e) => handleDismiss(suggestion.id, e)}
                className="absolute right-2 top-2 rounded-full p-1 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>

              <div className="flex items-start space-x-3 pr-6">
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                  <suggestion.icon className="h-4 w-4 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{suggestion.action}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {suggestion.reason}
                  </p>

                  {/* Confidence Bar */}
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-all",
                          suggestion.confidence >= 70 && "bg-green-500",
                          suggestion.confidence >= 50 && suggestion.confidence < 70 && "bg-yellow-500",
                          suggestion.confidence < 50 && "bg-orange-500"
                        )}
                        style={{ width: `${suggestion.confidence}%` }}
                      />
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getConfidenceColor(suggestion.confidence))}
                    >
                      {suggestion.confidence}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {activeSuggestions.length > 3 && (
            <Button variant="ghost" size="sm" className="w-full">
              Show {activeSuggestions.length - 3} more suggestions
            </Button>
          )}
        </div>

        {dismissedActions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissedActions([])}
            className="mt-2 w-full text-xs"
          >
            Show dismissed ({dismissedActions.length})
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
