import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, Check, TrendingUp, Users, Mail, Target, Workflow, MessageSquare, Phone, X, AlertTriangle, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/useToast'
import api from '@/lib/api'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface PlanFeatures {
  maxUsers: number | null
  maxLeads: number | null
  maxCampaigns: number | null
  maxWorkflows: number | null
  emailsPerMonth: number | null
  smsPerMonth: number | null
  features: string[]
}

interface Plan {
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  name: string
  description: string
  price: number
  billingPeriod: string
  features: PlanFeatures
  isCurrent: boolean
  isUpgrade: boolean
  isDowngrade: boolean
}

interface PlansResponse {
  plans: Plan[]
  currentTier: string
}

/**
 * Subscription Management Page
 * Shows current plan, available plans, and allows plan changes
 * ADMIN-only access
 */
export default function SubscriptionPage() {
  const { isAdmin, user } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [changingTo, setChangingTo] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  
  // Fetch available plans
  const { data: plansData, isLoading, error } = useQuery<PlansResponse>({
    queryKey: ['available-plans'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/plans')
      return response.data
    },
    retry: 2,
  })
  
  // Show error if API fails
  if (error) {
    console.error('Failed to load subscription plans:', error)
  }
  
  // Fallback plans if API fails
  const fallbackPlans: Plan[] = [
    {
      tier: 'FREE',
      name: 'Free',
      description: 'Perfect for getting started',
      price: 0,
      billingPeriod: 'month',
      features: {
        maxUsers: 1,
        maxLeads: 100,
        maxCampaigns: null,
        maxWorkflows: null,
        emailsPerMonth: 1000,
        smsPerMonth: 100,
        features: ['Basic features', 'Email support', '1 GB storage'],
      },
      isCurrent: user?.organization?.subscriptionTier === 'FREE',
      isUpgrade: false,
      isDowngrade: false,
    },
    {
      tier: 'STARTER',
      name: 'Starter',
      description: 'For growing teams',
      price: 49,
      billingPeriod: 'month',
      features: {
        maxUsers: 5,
        maxLeads: 1000,
        maxCampaigns: 10,
        maxWorkflows: 5,
        emailsPerMonth: 10000,
        smsPerMonth: 1000,
        features: ['All Free features', 'Priority support', '10 GB storage', 'Advanced analytics'],
      },
      isCurrent: user?.organization?.subscriptionTier === 'STARTER',
      isUpgrade: user?.organization?.subscriptionTier === 'FREE',
      isDowngrade: false,
    },
    {
      tier: 'PROFESSIONAL',
      name: 'Professional',
      description: 'For established businesses',
      price: 149,
      billingPeriod: 'month',
      features: {
        maxUsers: 10,
        maxLeads: null,
        maxCampaigns: null,
        maxWorkflows: 20,
        emailsPerMonth: null,
        smsPerMonth: null,
        features: ['All Starter features', '24/7 support', '100 GB storage', 'Custom branding', 'API access'],
      },
      isCurrent: user?.organization?.subscriptionTier === 'PROFESSIONAL',
      isUpgrade: ['FREE', 'STARTER'].includes(user?.organization?.subscriptionTier || ''),
      isDowngrade: false,
    },
    {
      tier: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'For large organizations',
      price: 499,
      billingPeriod: 'month',
      features: {
        maxUsers: null,
        maxLeads: null,
        maxCampaigns: null,
        maxWorkflows: null,
        emailsPerMonth: null,
        smsPerMonth: null,
        features: ['All Professional features', 'Dedicated support', 'Unlimited storage', 'SLA', 'Custom integrations'],
      },
      isCurrent: user?.organization?.subscriptionTier === 'ENTERPRISE',
      isUpgrade: ['FREE', 'STARTER', 'PROFESSIONAL'].includes(user?.organization?.subscriptionTier || ''),
      isDowngrade: false,
    },
  ]
  
  const plans = plansData?.plans || fallbackPlans
  
  // Plan change mutation
  const changePlanMutation = useMutation({
    mutationFn: async (newTier: string) => {
      const response = await api.post('/subscriptions/change-plan', { newTier })
      return response.data
    },
    onSuccess: () => {
      toast.success('Subscription plan updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['available-plans'] })
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setChangingTo(null)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Failed to change plan')
      setChangingTo(null)
    },
  })
  
  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Crown className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600">Only administrators can manage subscriptions.</p>
        </div>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="space-y-2 mt-6">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  const tierConfig = {
    FREE: { color: 'gray', gradient: 'from-gray-50 to-gray-100' },
    STARTER: { color: 'blue', gradient: 'from-blue-50 to-blue-100' },
    PROFESSIONAL: { color: 'purple', gradient: 'from-purple-50 to-purple-100' },
    ENTERPRISE: { color: 'amber', gradient: 'from-amber-50 to-amber-100' },
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-600 mt-2">
          Choose the plan that fits your organization's needs
        </p>
      </div>
      
      {/* Trial Countdown Banner */}
      {user?.organization?.trialEndsAt && (
        (() => {
          const trialEnd = new Date(user.organization.trialEndsAt)
          const now = new Date()
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const isExpiringSoon = daysLeft <= 7
          
          if (daysLeft > 0) {
            return (
              <Card className={`border-2 ${isExpiringSoon ? 'border-orange-300 bg-orange-50' : 'border-blue-300 bg-blue-50'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${isExpiringSoon ? 'bg-orange-100' : 'bg-blue-100'}`}>
                      <Calendar className={`w-6 h-6 ${isExpiringSoon ? 'text-orange-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-1 ${isExpiringSoon ? 'text-orange-900' : 'text-blue-900'}`}>
                        {isExpiringSoon ? '⚠️ Trial Ending Soon' : '🎉 Trial Active'}
                      </h3>
                      <p className={`text-sm mb-3 ${isExpiringSoon ? 'text-orange-800' : 'text-blue-800'}`}>
                        Your PROFESSIONAL trial {isExpiringSoon ? 'ends' : 'expires'} in{' '}
                        <strong>{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</strong>{' '}
                        ({formatDistanceToNow(trialEnd, { addSuffix: true })})
                      </p>
                      {isExpiringSoon && (
                        <p className="text-sm text-orange-700 mb-3">
                          After your trial ends, you'll be moved to the FREE plan unless you upgrade.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => {
                            const professionalPlan = plansData?.plans.find(p => p.tier === 'PROFESSIONAL')
                            if (professionalPlan && !professionalPlan.isCurrent) {
                              setSelectedPlan(professionalPlan)
                              setShowConfirmModal(true)
                            }
                          }}
                        >
                          Upgrade Now
                        </Button>
                        <Button size="sm" variant="outline">
                          Learn More
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }
          return null
        })()
      )}
      
      {/* Current Plan Badge */}
      {user?.organization && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-600">Current Plan</p>
                  <p className="text-xl font-bold text-gray-900">
                    {user.organization.subscriptionTier}
                  </p>
                </div>
              </div>
              
              {user.organization.trialEndsAt && (
                <Badge variant="warning">
                  Trial Active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Plan Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const config = tierConfig[plan.tier]
          const isChanging = changingTo === plan.tier
          
          return (
            <Card 
              key={plan.tier}
              className={`relative overflow-hidden ${
                plan.isCurrent ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
            >
              {/* Current Badge */}
              {plan.isCurrent && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold">
                  CURRENT
                </div>
              )}
              
              {/* Upgrade/Downgrade Badge */}
              {!plan.isCurrent && plan.isUpgrade && (
                <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  UPGRADE
                </div>
              )}
              
              {/* Header */}
              <CardHeader className={`bg-gradient-to-br ${config.gradient} border-b`}>
                <CardTitle className="flex items-center gap-2">
                  {(plan.tier === 'PROFESSIONAL' || plan.tier === 'ENTERPRISE') && (
                    <Crown className="w-5 h-5 text-amber-600" />
                  )}
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600">/{plan.billingPeriod}</span>
                  </div>
                  
                  {/* Show savings for upgrades */}
                  {plan.isUpgrade && plan.price > 0 && (
                    <p className="text-xs text-green-700 mt-2 font-medium">
                      ✨ Unlock more features and higher limits
                    </p>
                  )}
                </div>
              </CardHeader>
              
              {/* Features List */}
              <CardContent className="pt-6 space-y-4">
                {/* Limits */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>
                      {plan.features.maxUsers === null 
                        ? 'Unlimited users' 
                        : `Up to ${plan.features.maxUsers} users`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>
                      {plan.features.maxLeads === null 
                        ? 'Unlimited leads' 
                        : `Up to ${plan.features.maxLeads?.toLocaleString() ?? 0} leads`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span>
                      {plan.features.maxCampaigns === null 
                        ? 'Unlimited campaigns' 
                        : `Up to ${plan.features.maxCampaigns} campaigns`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-gray-500" />
                    <span>
                      {plan.features.maxWorkflows === null 
                        ? 'Unlimited workflows' 
                        : `Up to ${plan.features.maxWorkflows} workflows`}
                    </span>
                  </div>
                  
                  {plan.features.emailsPerMonth && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <span>{plan.features.emailsPerMonth.toLocaleString()} emails/month</span>
                    </div>
                  )}
                  
                  {plan.features.smsPerMonth && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{plan.features.smsPerMonth.toLocaleString()} SMS/month</span>
                    </div>
                  )}
                </div>
                
                {/* Feature Checkmarks */}
                <div className="border-t pt-4 space-y-2">
                  {(plan.features.features || []).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                
                {/* Action Button */}
                <div className="pt-4">
                  {plan.isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.isUpgrade ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedPlan(plan)
                        setShowConfirmModal(true)
                      }}
                      disabled={isChanging}
                    >
                      {isChanging ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Changing...
                        </div>
                      ) : (
                        <>
                          {plan.isUpgrade && <TrendingUp className="w-4 h-4 mr-2" />}
                          {plan.isUpgrade ? 'Upgrade' : plan.isDowngrade ? 'Downgrade' : 'Select Plan'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {/* FAQ / Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Can I change plans anytime?</h4>
            <p className="text-sm text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">What happens when I hit a limit?</h4>
            <p className="text-sm text-gray-600">
              You'll receive warnings as you approach your limits. Once reached, you'll need to upgrade 
              to continue adding more resources.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Is there a free trial?</h4>
            <p className="text-sm text-gray-600">
              New organizations get a 14-day trial of the PROFESSIONAL plan to test all features.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Confirmation Modal */}
      {showConfirmModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Confirm Plan Change
                </CardTitle>
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setSelectedPlan(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Change Summary */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Current Plan</p>
                    <p className="text-lg font-semibold text-gray-900">{user?.organization?.subscriptionTier}</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div>
                    <p className="text-sm text-gray-600">New Plan</p>
                    <p className="text-lg font-semibold text-blue-900">{selectedPlan.name}</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-blue-200">
                  <p className="text-sm text-gray-700">
                    <strong>Price:</strong> ${selectedPlan.price}/{selectedPlan.billingPeriod}
                  </p>
                </div>
              </div>
              
              {/* Warnings for Downgrades */}
              {selectedPlan.isDowngrade && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-900 mb-1">Important: Downgrade Notice</h4>
                      <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                        <li>Some features may become unavailable</li>
                        <li>Your data will be preserved but access may be limited</li>
                        <li>You may need to reduce users, leads, or campaigns to fit the new limits</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Feature Comparison */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">What You Get:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>{selectedPlan.features?.maxUsers === null ? 'Unlimited users' : `Up to ${selectedPlan.features?.maxUsers || 0} users`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>{selectedPlan.features?.maxLeads === null ? 'Unlimited leads' : `Up to ${(selectedPlan.features?.maxLeads || 0).toLocaleString()} leads`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>{selectedPlan.features?.maxCampaigns === null ? 'Unlimited campaigns' : `Up to ${selectedPlan.features?.maxCampaigns || 0} campaigns`}</span>
                  </div>
                  {selectedPlan.features?.emailsPerMonth && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>{selectedPlan.features.emailsPerMonth.toLocaleString()} emails/month</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowConfirmModal(false)
                    setSelectedPlan(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setChangingTo(selectedPlan.tier)
                    changePlanMutation.mutate(selectedPlan.tier)
                    setShowConfirmModal(false)
                  }}
                  disabled={changingTo !== null}
                >
                  {changingTo === selectedPlan.tier ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <>Confirm Change</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
