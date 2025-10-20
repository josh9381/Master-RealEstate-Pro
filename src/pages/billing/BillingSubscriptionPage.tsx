import { CreditCard, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function BillingSubscriptionPage() {
  const currentPlan = {
    name: 'Professional',
    price: 99,
    interval: 'month',
    features: [
      'Unlimited leads',
      'Advanced analytics',
      'Team collaboration',
      'Priority support',
      'Custom integrations',
      'API access'
    ],
    limits: {
      users: 10,
      storage: '100GB',
      campaigns: 'Unlimited'
    }
  }

  const plans = [
    {
      name: 'Starter',
      price: 29,
      interval: 'month',
      description: 'Perfect for individuals',
      features: [
        '1,000 leads',
        'Basic analytics',
        'Email support',
        '5GB storage'
      ],
      current: false
    },
    {
      name: 'Professional',
      price: 99,
      interval: 'month',
      description: 'Best for small teams',
      features: [
        'Unlimited leads',
        'Advanced analytics',
        'Team collaboration',
        'Priority support',
        '100GB storage'
      ],
      current: true
    },
    {
      name: 'Enterprise',
      price: 299,
      interval: 'month',
      description: 'For large organizations',
      features: [
        'Everything in Professional',
        'Custom integrations',
        'Dedicated support',
        'Unlimited storage',
        'SLA guarantee'
      ],
      current: false
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details</p>
      </div>

      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{currentPlan.name} Plan</h2>
            <p className="text-muted-foreground">Your current subscription</p>
          </div>
          <Badge>Active</Badge>
        </div>

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-4xl font-bold">${currentPlan.price}</span>
          <span className="text-muted-foreground">/ {currentPlan.interval}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div>
            <div className="text-2xl font-bold">{currentPlan.limits.users}</div>
            <div className="text-sm text-muted-foreground">Team Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{currentPlan.limits.storage}</div>
            <div className="text-sm text-muted-foreground">Storage</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{currentPlan.limits.campaigns}</div>
            <div className="text-sm text-muted-foreground">Campaigns</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button>Upgrade Plan</Button>
          <Button variant="outline">Manage Subscription</Button>
        </div>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className={`p-6 ${plan.current ? 'ring-2 ring-primary' : ''}`}>
              {plan.current && (
                <Badge className="mb-4">Current Plan</Badge>
              )}
              
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
              
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/ {plan.interval}</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full" 
                variant={plan.current ? 'outline' : 'default'}
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Billing History</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Professional Plan - March 2024</div>
                <div className="text-sm text-muted-foreground">Paid on Mar 1, 2024</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">$99.00</span>
              <Button variant="outline" size="sm">Download</Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Professional Plan - February 2024</div>
                <div className="text-sm text-muted-foreground">Paid on Feb 1, 2024</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">$99.00</span>
              <Button variant="outline" size="sm">Download</Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Professional Plan - January 2024</div>
                <div className="text-sm text-muted-foreground">Paid on Jan 1, 2024</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">$99.00</span>
              <Button variant="outline" size="sm">Download</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
