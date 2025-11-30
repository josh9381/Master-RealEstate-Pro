import { Building2, Crown, Users, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'

/**
 * Header component that displays organization info, subscription tier, and trial status
 * Shows different information based on subscription level and team size
 */
export function OrganizationHeader() {
  const { user, getSubscriptionTier, isTrialActive } = useAuthStore()
  
  if (!user?.organization) {
    return null
  }
  
  const { name, logo, memberCount, trialEndsAt } = user.organization
  const tier = getSubscriptionTier()
  const isTrial = isTrialActive()
  
  const tierColors = {
    FREE: 'bg-gray-100 text-gray-800',
    STARTER: 'bg-blue-100 text-blue-800',
    PROFESSIONAL: 'bg-purple-100 text-purple-800',
    ENTERPRISE: 'bg-amber-100 text-amber-800',
  }
  
  const tierIcons = {
    FREE: null,
    STARTER: null,
    PROFESSIONAL: <Crown className="w-4 h-4" />,
    ENTERPRISE: <Crown className="w-4 h-4" />,
  }
  
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Organization Info */}
        <div className="flex items-center gap-4">
          {logo ? (
            <img 
              src={logo} 
              alt={name} 
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{memberCount || 1} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
          </div>
        </div>
        
        {/* Right: Subscription & Trial Info */}
        <div className="flex items-center gap-3">
          {/* Trial Badge */}
          {isTrial && trialEndsAt && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                Trial ends {format(new Date(trialEndsAt), 'MMM dd, yyyy')}
              </span>
            </div>
          )}
          
          {/* Subscription Tier Badge */}
          {tier && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium ${tierColors[tier]}`}>
              {tierIcons[tier]}
              <span className="text-sm">{tier}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Trial Warning (if ending soon) */}
      {isTrial && trialEndsAt && (
        (() => {
          const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (daysLeft <= 7) {
            return (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-900">
                  <strong>⚠️ Your trial ends in {daysLeft} days.</strong>{' '}
                  <a href="/admin/subscription" className="underline font-medium hover:text-orange-700">
                    Upgrade now
                  </a>{' '}
                  to continue using all features.
                </p>
              </div>
            )
          }
          return null
        })()
      )}
    </div>
  )
}
