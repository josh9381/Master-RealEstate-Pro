import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { getUserItem, setUserItem } from '@/lib/userStorage'
import { calcProgress } from '@/lib/metricsCalculator'
import {
  Users,
  Megaphone,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  X,
  Upload,
  Sparkles,
} from 'lucide-react'

const STORAGE_KEY = 'onboarding_wizard_dismissed'

interface GettingStartedProps {
  totalLeads: number
  totalCampaigns: number
  hasCampaignResults: boolean
}

interface Step {
  id: number
  title: string
  description: string
  icon: React.ElementType
  actionLabel: string
  actionPath: string
  secondaryLabel?: string
  secondaryPath?: string
  isComplete: boolean
}

export function GettingStarted({ totalLeads, totalCampaigns, hasCampaignResults }: GettingStartedProps) {
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.user?.id)
  const [dismissed, setDismissed] = useState(() => {
    return getUserItem(userId, STORAGE_KEY) === 'true'
  })

  // Don't show if dismissed or if user has completed all steps
  const allComplete = totalLeads > 0 && totalCampaigns > 0 && hasCampaignResults
  if (dismissed || allComplete) return null

  const steps: Step[] = [
    {
      id: 1,
      title: 'Add your first leads',
      description: 'Import your contacts from a CSV file or add them manually to get started.',
      icon: Users,
      actionLabel: 'Add a Lead',
      actionPath: '/leads/create',
      secondaryLabel: 'Import CSV',
      secondaryPath: '/leads/import',
      isComplete: totalLeads > 0,
    },
    {
      id: 2,
      title: 'Create your first campaign',
      description: 'Send an email or SMS campaign to your leads to start engaging them.',
      icon: Megaphone,
      actionLabel: 'Create Campaign',
      actionPath: '/campaigns/create',
      isComplete: totalCampaigns > 0,
    },
    {
      id: 3,
      title: 'Review your results',
      description: 'Check analytics to see how your campaigns are performing and optimize your strategy.',
      icon: BarChart3,
      actionLabel: 'View Analytics',
      actionPath: '/analytics',
      isComplete: hasCampaignResults,
    },
  ]

  const completedCount = steps.filter((s) => s.isComplete).length
  const progressPercent = calcProgress(completedCount, steps.length)

  const handleDismiss = () => {
    setUserItem(userId, STORAGE_KEY, 'true')
    setDismissed(true)
  }

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="absolute top-4 right-4 z-10"
        title="Dismiss getting started guide"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </Button>

      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Getting Started</h2>
            <p className="text-sm text-muted-foreground">
              Complete these {steps.length} steps to set up your business
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completedCount}/{steps.length}</div>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps */}
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`relative p-4 rounded-xl border transition-all duration-200 ${
                step.isComplete
                  ? 'bg-success/10 border-success/20'
                  : 'bg-card border-border hover:border-primary/40 hover:shadow-md'
              }`}
            >
              {/* Step number badge */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    step.isComplete
                      ? 'bg-success text-success-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {step.isComplete ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                {step.isComplete && (
                  <Badge variant="success" className="text-xs">Done</Badge>
                )}
              </div>

              {/* Icon and content */}
              <div className="mb-3">
                <step.icon className={`h-5 w-5 mb-2 ${step.isComplete ? 'text-success' : 'text-primary'}`} />
                <h3 className="font-semibold text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Actions */}
              {!step.isComplete && (
                <div className="flex flex-wrap gap-2 mt-auto">
                  <Button
                    size="sm"
                    onClick={() => navigate(step.actionPath)}
                    className="text-xs"
                  >
                    {step.actionLabel}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                  {step.secondaryLabel && step.secondaryPath && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(step.secondaryPath!)}
                      className="text-xs"
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      {step.secondaryLabel}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dismiss text */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Already familiar with the platform?{' '}
          <Button variant="link" size="sm" onClick={handleDismiss} className="h-auto p-0 text-xs">
            Skip this guide
          </Button>
        </p>
      </CardContent>
    </Card>
  )
}

export default GettingStarted
