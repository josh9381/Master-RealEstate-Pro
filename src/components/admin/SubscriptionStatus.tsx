import { useQuery } from '@tanstack/react-query'
import { Crown, Users, Mail, Target, Workflow, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Link } from 'react-router-dom'
import api from '@/lib/api'

interface UsageEntry {
  current: number
  limit: number | 'unlimited' | null
  remaining?: number | 'unlimited'
  percentage?: number
  isAtLimit?: boolean
}

interface SubscriptionData {
  subscription: {
    tier: string
    name?: string
    price?: number
  }
  usage: {
    users: UsageEntry
    leads: UsageEntry
    campaigns: UsageEntry
    workflows: UsageEntry
    emailsPerMonth?: UsageEntry
    smsPerMonth?: UsageEntry
  }
  planFeatures?: Record<string, unknown>
  trialEndsAt?: string
}

/**
 * Subscription Status Widget
 * Displays current subscription tier and usage metrics
 * Shows warnings when approaching limits
 */
export function SubscriptionStatus() {
  const { getSubscriptionTier, isTrialActive } = useAuthStore()
  
  const { data, isLoading, isError, error, refetch } = useQuery<SubscriptionData>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/current')
      return response.data?.data || response.data
    },
    refetchInterval: 60000, // Refresh every minute
  })
  
  const tier = getSubscriptionTier()
  const isTrial = isTrialActive()

  if (isError) {
    return <ErrorBanner message={error?.message || 'Failed to load subscription status'} retry={refetch} />
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    )
  }
  
  if (!data?.usage) return null
  
  const tierConfig: Record<string, { headerBg: string; headerBorder: string; icon: React.ReactNode | null }> = {
    STARTER: { headerBg: 'bg-primary/10', headerBorder: 'border-primary/20', icon: null },
    PROFESSIONAL: { headerBg: 'bg-primary/5', headerBorder: 'border-primary/20', icon: <Crown className="w-4 h-4" /> },
    ELITE: { headerBg: 'bg-primary/10', headerBorder: 'border-primary/30', icon: <Crown className="w-4 h-4" /> },
    TEAM: { headerBg: 'bg-success/10', headerBorder: 'border-success/20', icon: <Crown className="w-4 h-4" /> },
    ENTERPRISE: { headerBg: 'bg-warning/10', headerBorder: 'border-warning/20', icon: <Crown className="w-4 h-4" /> },
  }
  
  const config = tierConfig[tier || 'STARTER'] || tierConfig.STARTER
  
  const normalizeLimit = (limit: number | 'unlimited' | null | undefined): number | null => {
    if (limit === 'unlimited' || limit === null || limit === undefined) return null
    return limit
  }
  
  const usageItems = [
    { 
      label: 'Users', 
      icon: Users, 
      current: data.usage.users?.current ?? 0, 
      limit: normalizeLimit(data.usage.users?.limit) 
    },
    { 
      label: 'Leads', 
      icon: Mail, 
      current: data.usage.leads?.current ?? 0, 
      limit: normalizeLimit(data.usage.leads?.limit) 
    },
    { 
      label: 'Campaigns', 
      icon: Target, 
      current: data.usage.campaigns?.current ?? 0, 
      limit: normalizeLimit(data.usage.campaigns?.limit) 
    },
    { 
      label: 'Workflows', 
      icon: Workflow, 
      current: data.usage.workflows?.current ?? 0, 
      limit: normalizeLimit(data.usage.workflows?.limit) 
    },
  ]
  
  const getUsagePercentage = (current: number, limit: number | null) => {
    if (!limit) return 0
    return (current / limit) * 100
  }
  
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive'
    if (percentage >= 75) return 'bg-warning'
    return 'bg-success'
  }
  
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className={`p-6 ${config.headerBg} border-b ${config.headerBorder}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <h3 className="text-lg font-semibold text-foreground">
              {tier || 'STARTER'} Plan
            </h3>
          </div>
          
          {isTrial && (
            <span className="px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-md">
              Trial Active
            </span>
          )}
        </div>
        
        {data.subscription?.price && data.subscription.price > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            ${data.subscription.price}/month
          </p>
        )}
      </div>
      
      {/* Usage Meters */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-foreground">Resource Usage</h4>
          <Button variant="link" size="sm" className="text-xs h-auto p-0">
            View Details
          </Button>
        </div>
        
        {usageItems.map((item) => {
          const Icon = item.icon
          const percentage = item.limit ? getUsagePercentage(item.current, item.limit) : 0
          const isNearLimit = percentage >= 75
          
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {item.current.toLocaleString()}
                  {item.limit && ` / ${item.limit.toLocaleString()}`}
                  {!item.limit && ' / Unlimited'}
                </span>
              </div>
              
              {item.limit && (
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${getUsageColor(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
              
              {isNearLimit && item.limit && (
                <div className="flex items-center gap-1 mt-1 text-xs text-warning">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Approaching limit</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Upgrade CTA */}
      {tier !== 'ENTERPRISE' && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Need more resources?</span>
            </div>
            <Link to="/admin/subscription">
              <Button size="sm">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
