import { Sparkles, Mail, Phone, Calendar, TrendingUp, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useState } from 'react'

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
}

export function AISuggestedActions({ className }: AISuggestedActionsProps) {
  const [dismissedActions, setDismissedActions] = useState<string[]>([])

  const suggestions: Suggestion[] = [
    {
      id: '1',
      icon: Mail,
      action: 'Send follow-up email',
      reason: '68% likely to respond',
      confidence: 68,
      priority: 'high',
      onClick: () => console.log('Open email composer'),
    },
    {
      id: '2',
      icon: Phone,
      action: 'Schedule a call',
      reason: 'Best time: 2:00 PM today',
      confidence: 82,
      priority: 'high',
      onClick: () => console.log('Schedule call'),
    },
    {
      id: '3',
      icon: Calendar,
      action: 'Book demo meeting',
      reason: 'Similar leads convert 45% after demo',
      confidence: 45,
      priority: 'medium',
      onClick: () => console.log('Book meeting'),
    },
    {
      id: '4',
      icon: TrendingUp,
      action: 'Add to nurture campaign',
      reason: 'Not ready to buy yet',
      confidence: 72,
      priority: 'low',
      onClick: () => console.log('Add to campaign'),
    },
  ]

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
