import { CreditCard, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { billingApi } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface SubscriptionResponse {
  success: boolean
  data: {
    plan: string
    status: string
    currentPeriodEnd: string | null
    trialEndsAt: string | null
    stripeConfigured: boolean
  }
}

export default function BillingSubscriptionPage() {
  const { toast } = useToast()

  // Fetch current subscription status
  const { data: subscriptionRes, isLoading } = useQuery<SubscriptionResponse>({
    queryKey: ['billing-subscription'],
    queryFn: () => billingApi.getSubscription(),
  })

  const subscription = subscriptionRes?.data
  const currentPlanId = subscription?.plan || 'FREE'

  // Fetch invoices
  const { data: invoicesRes } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => billingApi.getInvoices(),
  })

  const invoices = invoicesRes?.data || []

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => billingApi.createCheckoutSession(planId),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.info(data.message || 'Checkout session created')
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to start checkout'
      if (message.includes('not configured')) {
        toast.warning('Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.')
      } else {
        toast.error(message)
      }
    },
  })

  // Portal mutation
  const portalMutation = useMutation({
    mutationFn: () => billingApi.getBillingPortal(),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.info(data.message || 'Billing portal opened')
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to open billing portal'
      if (message.includes('not configured')) {
        toast.warning('Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing management.')
      } else {
        toast.error(message)
      }
    },
  })

  const handleUpgrade = (planId: string) => {
    checkoutMutation.mutate(planId)
  }

  const handleManageSubscription = () => {
    portalMutation.mutate()
  }

  const plans = [
    {
      id: 'STARTER',
      name: 'Starter',
      price: 29,
      interval: 'month',
      description: 'Perfect for individuals',
      features: [
        '1,000 leads',
        'Basic analytics',
        'Email support',
        '5GB storage',
      ],
    },
    {
      id: 'PROFESSIONAL',
      name: 'Professional',
      price: 99,
      interval: 'month',
      description: 'Best for small teams',
      features: [
        'Unlimited leads',
        'Advanced analytics',
        'Team collaboration',
        'Priority support',
        '100GB storage',
      ],
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: 299,
      interval: 'month',
      description: 'For large teams',
      features: [
        'Everything in Professional',
        'Custom integrations',
        'Dedicated support',
        'Unlimited storage',
        'SLA guarantee',
      ],
    },
  ]

  const currentPlanData = plans.find(p => p.id === currentPlanId) || {
    name: currentPlanId === 'FREE' ? 'Free' : currentPlanId,
    price: 0,
    interval: 'month',
    limits: { users: 2, storage: '1GB', campaigns: '5' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details</p>
      </div>

      {/* Stripe Not Configured Banner */}
      {subscription && !subscription.stripeConfigured && (
        <Card className="p-4 border-amber-300 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-900">Stripe Not Configured</p>
              <p className="text-sm text-amber-800">
                Set the STRIPE_SECRET_KEY environment variable to enable payment processing, plan upgrades, and billing management.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Current Plan */}
      <Card className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading subscription...</span>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{currentPlanData.name} Plan</h2>
                <p className="text-muted-foreground">Your current subscription</p>
              </div>
              <Badge>{subscription?.status || 'ACTIVE'}</Badge>
            </div>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-bold">${currentPlanData.price}</span>
              <span className="text-muted-foreground">/ {currentPlanData.interval}</span>
            </div>

            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground mb-4">
                Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}

            <div className="flex gap-3">
              <Button onClick={handleManageSubscription} disabled={portalMutation.isPending}>
                {portalMutation.isPending ? 'Opening...' : 'Manage Subscription'}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            return (
              <Card key={plan.id} className={`p-6 ${isCurrent ? 'ring-2 ring-primary' : ''}`}>
                {isCurrent && (
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
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || checkoutMutation.isPending}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrent ? 'Current Plan' : checkoutMutation.isPending ? 'Processing...' : 'Upgrade'}
                </Button>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Billing History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Billing History</h2>

        {invoices.length === 0 ? (
          <p className="text-muted-foreground py-4">No invoices yet.</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice: any) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{invoice.description || invoice.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt || invoice.created).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    ${((invoice.amount || invoice.amountDue || 0) / 100).toFixed(2)}
                  </span>
                  <Badge variant="secondary">{invoice.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
