import { AlertTriangle, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface UpgradePromptProps {
  resource: string
  current: number
  limit: number
  currentTier: string | null
  variant?: 'banner' | 'modal' | 'inline'
  onClose?: () => void
}

const resourceLabels: Record<string, string> = {
  users: 'team members',
  leads: 'leads',
  campaigns: 'campaigns',
  workflows: 'workflows',
  emailsPerMonth: 'emails this month',
  smsPerMonth: 'SMS messages this month',
}

/**
 * Upgrade Prompt Component
 * Shows when user hits subscription limits
 * Provides clear CTA to upgrade plan
 */
export function UpgradePrompt({ 
  resource, 
  current, 
  limit, 
  currentTier,
  variant = 'inline',
  onClose 
}: UpgradePromptProps) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)
  
  const resourceLabel = resourceLabels[resource] || resource
  
  if (dismissed) return null
  
  const handleDismiss = () => {
    setDismissed(true)
    onClose?.()
  }
  
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-orange-900 mb-1">
              {currentTier} Plan Limit Reached
            </h4>
            <p className="text-sm text-orange-800 mb-3">
              You've reached your limit of {limit.toLocaleString()} {resourceLabel}. 
              Upgrade your plan to add more.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={() => navigate('/admin/subscription')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
            </div>
          </div>
          {onClose && (
            <button
              onClick={handleDismiss}
              className="text-orange-400 hover:text-orange-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }
  
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Limit Reached
              </h3>
              
              <p className="text-gray-600 mb-6">
                You've reached your {currentTier} plan limit of{' '}
                <strong>{limit.toLocaleString()} {resourceLabel}</strong>.
                <br />
                Upgrade to add more and unlock additional features.
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDismiss}
                >
                  Not Now
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate('/admin/subscription')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Inline variant (default)
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-orange-900 mb-1">
              Upgrade Required
            </h4>
            <p className="text-sm text-orange-800 mb-3">
              You've reached your limit of {limit.toLocaleString()} {resourceLabel} on the {currentTier} plan.
            </p>
            <Button 
              size="sm"
              onClick={() => navigate('/admin/subscription')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              View Plans
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
