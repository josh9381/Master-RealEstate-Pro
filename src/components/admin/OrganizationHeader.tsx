import { Building2, Crown, Users, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
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
  
  const tierColors: Record<string, string> = {
    STARTER: 'bg-primary/10 text-primary',
    PROFESSIONAL: 'bg-primary/10 text-primary',
    ELITE: 'bg-primary/20 text-primary',
    TEAM: 'bg-success/10 text-success',
    ENTERPRISE: 'bg-warning/10 text-warning',
  }
  
  const tierIcons: Record<string, React.ReactNode | null> = {
    STARTER: null,
    PROFESSIONAL: <Crown className="w-4 h-4" />,
    ELITE: <Crown className="w-4 h-4" />,
    TEAM: <Crown className="w-4 h-4" />,
    ENTERPRISE: <Crown className="w-4 h-4" />,
  }
  
  return (
    <div className="bg-card border-b border-border px-6 py-4">
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
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}
          
          <div>
            <h2 className="text-lg font-semibold leading-tight text-foreground">{name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{memberCount || 1} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
          </div>
        </div>
        
        {/* Right: Subscription & Trial Info */}
        <div className="flex items-center gap-3">
          {/* Trial Badge */}
          {isTrial && trialEndsAt && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-warning/20 rounded-lg">
              <Calendar className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-warning">
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
              <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">
                  <strong>⚠️ Your trial ends in {daysLeft} days.</strong>{' '}
                  <Link to="/admin/subscription" className="underline font-medium hover:text-warning/80">
                    Upgrade now
                  </Link>{' '}
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
