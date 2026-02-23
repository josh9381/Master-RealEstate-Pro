import { useQuery } from '@tanstack/react-query'
import { Crown, Users, Mail, Target, Workflow, TrendingUp, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
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
  
  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/current')
      return response.data?.data || response.data
    },
    refetchInterval: 60000, // Refresh every minute
  })
  
  const tier = getSubscriptionTier()
  const isTrial = isTrialActive()
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    )
  }
  
  if (!data?.usage) return null
  
  const tierConfig = {
    FREE: { color: 'gray', icon: null },
    STARTER: { color: 'blue', icon: null },
    PROFESSIONAL: { color: 'purple', icon: <Crown className="w-4 h-4" /> },
    ENTERPRISE: { color: 'amber', icon: <Crown className="w-4 h-4" /> },
  }
  
  const config = tierConfig[tier || 'FREE']
  
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
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`p-6 bg-${config.color}-50 border-b border-${config.color}-100`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <h3 className="text-lg font-semibold text-gray-900">
              {tier || 'FREE'} Plan
            </h3>
          </div>
          
          {isTrial && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-md">
              Trial Active
            </span>
          )}
        </div>
        
        {data.subscription?.price && data.subscription.price > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            ${data.subscription.price}/month
          </p>
        )}
      </div>
      
      {/* Usage Meters */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Resource Usage</h4>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            View Details
          </button>
        </div>
        
        {usageItems.map((item) => {
          const Icon = item.icon
          const percentage = item.limit ? getUsagePercentage(item.current, item.limit) : 0
          const isNearLimit = percentage >= 75
          
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.current.toLocaleString()}
                  {item.limit && ` / ${item.limit.toLocaleString()}`}
                  {!item.limit && ' / Unlimited'}
                </span>
              </div>
              
              {item.limit && (
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${getUsageColor(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
              
              {isNearLimit && item.limit && (
                <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
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
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Need more resources?</span>
            </div>
            <a 
              href="/admin/subscription"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Upgrade Plan
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
