import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, Star, CheckCircle } from 'lucide-react'
import { formatRate } from '@/lib/metricsCalculator'

interface Variation {
  id: number
  tone: string
  message: {
    subject?: string
    body: string
  }
  predictedResponseRate: number
  reasoning: string
}

interface VariationsPanelProps {
  variations: Variation[]
  onSelect: (variation: Variation) => void
  selectedId?: number
}

export const VariationsPanel: React.FC<VariationsPanelProps> = ({
  variations,
  onSelect,
  selectedId
}) => {
  const best = variations[0] // Already sorted by highest predicted rate
  
  // Get response rate color
  const getRateColor = (rate: number): string => {
    if (rate >= 70) return 'text-green-600'
    if (rate >= 50) return 'text-yellow-600'
    return 'text-orange-600'
  }

  // Get rate badge variant
  const getRateBadge = (rate: number): string => {
    if (rate >= 70) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (rate >= 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  }

  // Capitalize tone name
  const formatTone = (tone: string): string => {
    return tone.charAt(0).toUpperCase() + tone.slice(1)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          3 Tone Variations
        </h4>
        <Badge variant="secondary" className="text-xs">
          AI Powered
        </Badge>
      </div>

      {/* Variations List */}
      <div className="space-y-3">
        {variations.map((variation) => {
          const isBest = variation.id === best.id
          const isSelected = variation.id === selectedId
          
          return (
            <Card 
              key={variation.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? 'border-blue-500 border-2 shadow-lg' 
                  : isBest 
                  ? 'border-green-500 border-2' 
                  : 'border-border'
              }`}
              onClick={() => onSelect(variation)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(variation); } }}
              role="button"
              tabIndex={0}
              aria-label={`${formatTone(variation.tone)} variation — ${formatRate(variation.predictedResponseRate)}% predicted response rate${isBest ? ' (best)' : ''}${isSelected ? ' (selected)' : ''}`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header: Tone + Rate */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {formatTone(variation.tone)}
                    </Badge>
                    {isBest && (
                      <Badge className="gap-1 bg-green-600 text-white">
                        <Star className="h-3 w-3 fill-current" />
                        Best
                      </Badge>
                    )}
                    {isSelected && (
                      <Badge className="gap-1 bg-blue-600 text-white">
                        <CheckCircle className="h-3 w-3" />
                        Selected
                      </Badge>
                    )}
                  </div>
                  
                  {/* Response Rate Prediction */}
                  <div className="flex items-center gap-1">
                    <TrendingUp className={`h-4 w-4 ${getRateColor(variation.predictedResponseRate)}`} />
                    <span className={`text-sm font-bold ${getRateColor(variation.predictedResponseRate)}`}>
                      {formatRate(variation.predictedResponseRate)}%
                    </span>
                  </div>
                </div>
                
                {/* Subject Line (for emails) */}
                {variation.message.subject && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Subject
                    </span>
                    <p className="text-sm font-semibold text-foreground line-clamp-1">
                      {variation.message.subject}
                    </p>
                  </div>
                )}
                
                {/* Message Preview */}
                <div className="bg-muted dark:bg-background rounded-lg p-3">
                  <p className="text-sm text-foreground dark:text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {variation.message.body}
                  </p>
                </div>
                
                {/* AI Reasoning */}
                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 rounded-lg p-2">
                  <span className="text-xs">💡</span>
                  <p className="text-xs text-muted-foreground flex-1">
                    <strong>Why {formatRate(variation.predictedResponseRate)}%:</strong> {variation.reasoning}
                  </p>
                </div>
                
                {/* Predicted Rate Badge */}
                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getRateBadge(variation.predictedResponseRate)}`}>
                    {variation.predictedResponseRate >= 70 
                      ? '🔥 High Response Rate' 
                      : variation.predictedResponseRate >= 50 
                      ? '✅ Good Response Rate' 
                      : '⚠️ Lower Response Rate'}
                  </span>
                  
                  <Button 
                    size="sm" 
                    variant={isSelected ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(variation)
                    }}
                    className="h-8"
                  >
                    {isSelected ? 'Selected' : 'Use This'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Footer Help Text */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
        💡 Tip: Predictions based on lead engagement history, message quality, and timing factors
      </div>
    </div>
  )
}
