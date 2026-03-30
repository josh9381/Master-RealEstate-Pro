import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BarChart3, Users, Megaphone, ArrowRight } from 'lucide-react'

interface AnalyticsEmptyStateProps {
  /** What kind of data is missing — determines the message and CTAs */
  variant: 'general' | 'leads' | 'campaigns' | 'conversions' | 'usage'
  /** Optional custom title */
  title?: string
  /** Optional custom description */
  description?: string
}

const messages = {
  general: {
    title: 'No analytics data yet',
    description: 'Add leads and send campaigns to see your analytics here. Your data will populate automatically as you use the platform.',
    icon: BarChart3,
    actions: [
      { label: 'Add a Lead', path: '/leads/create', variant: 'default' as const },
      { label: 'Create Campaign', path: '/campaigns/create', variant: 'outline' as const },
    ],
  },
  leads: {
    title: 'No lead data yet',
    description: 'Import your contacts or add leads manually to start tracking lead analytics and conversion performance.',
    icon: Users,
    actions: [
      { label: 'Add Your First Lead', path: '/leads/create', variant: 'default' as const },
      { label: 'Import Contacts', path: '/leads/import', variant: 'outline' as const },
    ],
  },
  campaigns: {
    title: 'No campaign data yet',
    description: 'Create and send your first campaign to start tracking send rates, open rates, click rates, and conversions.',
    icon: Megaphone,
    actions: [
      { label: 'Create a Campaign', path: '/campaigns/create', variant: 'default' as const },
    ],
  },
  conversions: {
    title: 'No conversion data yet',
    description: 'Conversion analytics will appear once you have leads moving through your pipeline. Add leads and update their statuses to track conversions.',
    icon: BarChart3,
    actions: [
      { label: 'View Leads', path: '/leads', variant: 'default' as const },
      { label: 'Add a Lead', path: '/leads/create', variant: 'outline' as const },
    ],
  },
  usage: {
    title: 'No usage data yet',
    description: 'Usage analytics will populate as you and your team use the platform. Activity is tracked automatically.',
    icon: BarChart3,
    actions: [
      { label: 'Go to Dashboard', path: '/', variant: 'default' as const },
    ],
  },
}

export function AnalyticsEmptyState({ variant, title, description }: AnalyticsEmptyStateProps) {
  const navigate = useNavigate()
  const config = messages[variant]
  const Icon = config.icon

  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="p-4 bg-primary/10 rounded-full mb-5">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{title || config.title}</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {description || config.description}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {config.actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                onClick={() => navigate(action.path)}
              >
                {action.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AnalyticsEmptyState
