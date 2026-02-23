import { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { UpgradePrompt } from './UpgradePrompt'
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
}

interface FeatureGateProps {
  children: ReactNode
  resource: 'users' | 'leads' | 'campaigns' | 'workflows' | 'emailsPerMonth' | 'smsPerMonth'
  action?: 'create' | 'view'
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

/**
 * Feature Gate Component
 * Checks if user can perform action based on subscription limits
 * Shows upgrade prompt if limit is reached
 */
export function FeatureGate({ 
  children, 
  resource, 
  action = 'create',
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { getSubscriptionTier } = useAuthStore()
  
  const { data: subscriptionData } = useQuery<SubscriptionData>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/current')
      return response.data?.data || response.data
    },
  })
  
  if (!subscriptionData?.usage) {
    return <>{children}</>
  }
  
  const usage = subscriptionData.usage[resource]
  const tier = getSubscriptionTier()
  
  // If no usage data or no limit (unlimited), always allow
  if (!usage || usage.limit === null || usage.limit === 'unlimited') {
    return <>{children}</>
  }
  
  // For create actions, check if at or over limit
  if (action === 'create') {
    const isAtLimit = usage.current >= usage.limit
    
    if (isAtLimit) {
      if (fallback) {
        return <>{fallback}</>
      }
      
      if (showUpgradePrompt) {
        return (
          <UpgradePrompt
            resource={resource}
            current={usage.current}
            limit={usage.limit}
            currentTier={tier}
          />
        )
      }
      
      return null
    }
  }
  
  return <>{children}</>
}

interface UsageBadgeProps {
  resource: 'users' | 'leads' | 'campaigns' | 'workflows'
}

/**
 * Usage Badge Component
 * Shows current usage vs limit for a resource
 */
export function UsageBadge({ resource }: UsageBadgeProps) {
  const { data: subscriptionData } = useQuery<SubscriptionData>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/current')
      return response.data?.data || response.data
    },
  })
  
  if (!subscriptionData?.usage) return null
  
  const usage = subscriptionData.usage[resource]
  if (!usage) return null
  
  if (usage.limit === null || usage.limit === 'unlimited') {
    return (
      <span className="text-xs text-gray-500">
        {usage.current.toLocaleString()} / Unlimited
      </span>
    )
  }
  
  const percentage = (usage.current / (usage.limit as number)) * 100
  const isNearLimit = percentage >= 75
  const isAtLimit = percentage >= 100
  
  return (
    <span className={`text-xs font-medium ${
      isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-gray-600'
    }`}>
      {usage.current.toLocaleString()} / {usage.limit.toLocaleString()}
      {isNearLimit && !isAtLimit && ' ⚠️'}
      {isAtLimit && ' 🚫'}
    </span>
  )
}
