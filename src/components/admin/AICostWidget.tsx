import { useQuery } from '@tanstack/react-query'
import { Brain, TrendingUp, DollarSign, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { aiApi } from '@/lib/api'

interface UsageLimitsData {
  tier: string
  useOwnKey: boolean
  month: string
  usage: {
    aiMessages: number
    contentGenerations: number
    composeUses: number
    scoringRecalculations: number
    enhancements: number
    totalTokensUsed: number
    totalCost: number
  }
  limits: {
    maxMonthlyAIMessages: number | 'unlimited'
    maxTokensPerRequest: number
    maxContentGenerations: number | 'unlimited'
    maxComposeUses: number | 'unlimited'
    maxScoringRecalculations: number | 'unlimited'
    aiRateLimit: number
  }
}

/**
 * AI Cost Widget for Admin Panel
 * Shows AI spend this month, token usage, and breakdown by feature.
 */
export function AICostWidget() {
  const { data, isLoading } = useQuery<UsageLimitsData>({
    queryKey: ['admin', 'ai-cost'],
    queryFn: async () => {
      const response = await aiApi.getUsageLimits()
      return response.data
    },
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Cost This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { usage, tier, useOwnKey } = data
  const cost = usage.totalCost || 0
  const tokens = usage.totalTokensUsed || 0
  const totalCalls = usage.aiMessages + usage.contentGenerations + usage.composeUses + usage.enhancements

  // Breakdown items for the mini table
  const breakdown = [
    { label: 'Chat messages', value: usage.aiMessages, icon: Zap },
    { label: 'Content generations', value: usage.contentGenerations, icon: TrendingUp },
    { label: 'Compose uses', value: usage.composeUses, icon: Brain },
    { label: 'Enhancements', value: usage.enhancements, icon: Zap },
    { label: 'Recalibrations', value: usage.scoringRecalculations, icon: TrendingUp },
  ].filter(b => b.value > 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            AI Cost This Month
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">{tier}</Badge>
        </div>
        <CardDescription>
          {data.month} · {useOwnKey ? 'Using org API key' : 'Platform key'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big number */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">${cost.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">estimated</span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground text-xs">Total tokens</p>
            <p className="font-semibold">{tokens.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground text-xs">Total AI calls</p>
            <p className="font-semibold">{totalCalls.toLocaleString()}</p>
          </div>
        </div>

        {/* Breakdown */}
        {breakdown.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Breakdown</p>
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
