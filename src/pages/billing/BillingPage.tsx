import { useQuery, useMutation } from '@tanstack/react-query';
import { CreditCard, Crown, TrendingUp, AlertTriangle, Download, CheckCircle2, Receipt, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { billingApi } from '@/lib/api';
import { calcRate } from '@/lib/metricsCalculator';
import { PLANS } from '@/lib/planConfig';

// ---------- Types ----------
interface UsageEntry {
  current: number
  limit: number | 'unlimited' | null
}

interface SubscriptionData {
  subscription: {
    tier: string
    name?: string
    price?: number
    billingPeriod?: string
    subscriptionId?: string | null
    isInTrial?: boolean
    trialEndsAt?: string | null
    trialDaysRemaining?: number | null
    features?: Record<string, unknown>
  }
  usage: {
    users: UsageEntry
    leads: UsageEntry
    campaigns: UsageEntry
    workflows: UsageEntry
    emailsPerMonth?: UsageEntry
    smsPerMonth?: UsageEntry
  }
}

interface SubStatusResponse {
  success: boolean
  data: {
    plan: string
    status: string
    currentPeriodEnd: string | null
    trialEndsAt: string | null
    stripeConfigured: boolean
  }
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'plans', label: 'Plans', icon: Crown },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'payment', label: 'Payment', icon: Wallet },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ---------- Plans data (from shared config) ----------
const plans = PLANS;

const BillingPage = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getSubscriptionTier, isTrialActive } = useAuthStore();
  const activeTab = (searchParams.get('tab') || 'overview') as TabId;

  const setActiveTab = (tab: TabId) => setSearchParams({ tab });

  // ---------- Queries ----------
  const { data: subscriptionData, isLoading } = useQuery<SubscriptionData>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/current');
      return response.data?.data || response.data;
    },
  });

  const { data: subStatusRes } = useQuery<SubStatusResponse>({
    queryKey: ['billing-subscription'],
    queryFn: () => billingApi.getSubscription(),
  });

  const { data: invoicesRes } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => billingApi.getInvoices(),
  });

  const { data: paymentRes } = useQuery({
    queryKey: ['billing-payment-methods'],
    queryFn: () => billingApi.getPaymentMethods(),
    enabled: activeTab === 'payment',
  });

  // ---------- Mutations ----------
  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => billingApi.createCheckoutSession(planId),
    onSuccess: (data) => {
      if (data?.data?.url) window.location.href = data.data.url;
      else if (data?.data?.action === 'updated') toast.success(data.data.message || 'Plan updated');
      else toast.info('Checkout created');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to start checkout');
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => billingApi.getBillingPortal(),
    onSuccess: (data) => {
      if (data?.data?.url) window.location.href = data.data.url;
      else toast.info('Billing portal opened');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to open billing portal');
    },
  });

  // ---------- Helpers ----------
  const tier = getSubscriptionTier();
  const isTrial = isTrialActive();
  const subStatus = subStatusRes?.data;
  const currentPlanId = subStatus?.plan || tier || 'STARTER';
  const invoices = invoicesRes?.data || [];
  const paymentMethods = paymentRes?.data || [];

  const normalizeLimit = (limit: number | 'unlimited' | null | undefined): number | null => {
    if (limit === 'unlimited' || limit === null || limit === undefined) return null;
    return typeof limit === 'number' ? limit : null;
  };

  const usagePct = (current: number, limit: number | 'unlimited' | null | undefined) => {
    const num = normalizeLimit(limit);
    if (!num) return 0;
    return calcRate(current, num);
  };

  // ---------- Render helpers ----------
  const UsageBar = ({ label, entry }: { label: string; entry?: UsageEntry }) => {
    if (!entry) return null;
    const pct = usagePct(entry.current, entry.limit);
    const numLimit = normalizeLimit(entry.limit);
    return (
      <div className="p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-sm font-medium">
            {(entry.current || 0).toLocaleString()} / {numLimit ? numLimit.toLocaleString() : 'Unlimited'}
          </span>
        </div>
        {numLimit && (
          <>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            {pct >= 75 && (
              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Approaching limit
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Billing & Subscription"
        subtitle="Manage your plan, usage, and payment information"
        icon={<CreditCard className="h-6 w-6" />}
      />

      {/* Stripe Not Configured Banner */}
      {subStatus && !subStatus.stripeConfigured && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-900">Billing Not Available</p>
              <p className="text-sm text-amber-800">Payment processing is not yet configured. Please contact your administrator to enable billing.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial Banner */}
      {isTrial && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full"><Crown className="w-6 h-6 text-blue-600" /></div>
              <div>
                <h3 className="font-semibold text-lg">Trial Period Active</h3>
                <p className="text-sm text-muted-foreground">
                  Your trial ends on {subscriptionData?.subscription?.trialEndsAt || 'N/A'}. Upgrade to continue.
                </p>
              </div>
            </div>
            <Button onClick={() => setActiveTab('plans')}>Choose Plan</Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ==================== TAB: OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Plan Summary */}
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Current Subscription</CardTitle>
                  <CardDescription>Your active plan and billing cycle</CardDescription>
                </div>
                <Badge className="text-sm px-3 py-1">{subStatus?.status || 'Active'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ) : subscriptionData ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-3xl font-bold flex items-center gap-3">
                        {subscriptionData.subscription?.name || currentPlanId}
                        {['PROFESSIONAL', 'ELITE', 'TEAM', 'ENTERPRISE'].includes(tier || '') && (
                          <Crown className="w-7 h-7 text-amber-500" />
                        )}
                      </h3>
                      <p className="text-lg font-semibold text-primary mt-1">
                        ${subscriptionData.subscription?.price || 0}
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      </p>
                      {subStatus?.currentPeriodEnd && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Next billing: {new Date(subStatus.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setActiveTab('plans')}>Change Plan</Button>
                      {subStatus?.stripeConfigured && (
                        <Button variant="ghost" onClick={() => portalMutation.mutate()}>
                          Manage Billing
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                    {[
                      { label: 'Active Users', value: subscriptionData.usage?.users?.current || 0 },
                      { label: 'Total Leads', value: subscriptionData.usage?.leads?.current || 0 },
                      { label: 'Campaigns', value: subscriptionData.usage?.campaigns?.current || 0 },
                      { label: 'Workflows', value: subscriptionData.usage?.workflows?.current || 0 },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No subscription data available</p>
              )}
            </CardContent>
          </Card>

          {/* Usage This Month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Usage This Month</CardTitle>
              <CardDescription>Track your usage against plan limits</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionData ? (
                <div className="space-y-4">
                  <UsageBar label="Users" entry={subscriptionData.usage?.users} />
                  <UsageBar label="Leads" entry={subscriptionData.usage?.leads} />
                  <UsageBar label="Email Sends" entry={subscriptionData.usage?.emailsPerMonth} />
                  <UsageBar label="SMS Sends" entry={subscriptionData.usage?.smsPerMonth} />
                </div>
              ) : (
                <p className="text-muted-foreground">No usage data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB: PLANS ==================== */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const isEnterprise = plan.id === 'ENTERPRISE';
              return (
                <Card key={plan.id} className={`p-6 ${isCurrent ? 'ring-2 ring-primary' : ''}`}>
                  {isCurrent && <Badge className="mb-4">Current Plan</Badge>}
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    {isEnterprise ? (
                      <span className="text-2xl font-bold">Contact Us</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || isEnterprise || checkoutMutation.isPending}
                    onClick={() => !isCurrent && !isEnterprise && checkoutMutation.mutate(plan.id)}
                  >
                    {isCurrent ? 'Current' : isEnterprise ? 'Contact Sales' : 'Select Plan'}
                  </Button>
                </Card>
              );
            })}
          </div>

          {subStatus?.stripeConfigured && (
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">Manage your existing subscription</p>
                  <p className="text-sm text-muted-foreground">Update payment method, cancel, or view billing details in Stripe portal</p>
                </div>
                <Button variant="outline" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
                  {portalMutation.isPending ? 'Opening...' : 'Open Billing Portal'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ==================== TAB: INVOICES ==================== */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Invoice History</CardTitle>
            <CardDescription>View and download your past invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground py-4">No invoices yet.</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice: { id: string; description?: string; createdAt?: string; created?: string; amount?: number; amountDue?: number; status?: string; pdfUrl?: string }) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invoice.description || invoice.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.createdAt || invoice.created || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">${((invoice.amount || invoice.amountDue || 0) / 100).toFixed(2)}</span>
                      <Badge variant="secondary">{invoice.status || 'paid'}</Badge>
                      {invoice.pdfUrl && (
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB: PAYMENT METHODS ==================== */}
      {activeTab === 'payment' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Payment Methods</CardTitle>
                <CardDescription>Manage your payment information</CardDescription>
              </div>
              {subStatus?.stripeConfigured && (
                <Button variant="outline" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
                  Manage via Stripe
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No payment methods on file</p>
                {subStatus?.stripeConfigured ? (
                  <Button onClick={() => portalMutation.mutate()}>Add Payment Method</Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Configure Stripe to manage payment methods</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((pm: { id: string; brand?: string; last4?: string; expMonth?: number; expYear?: number }) => (
                  <div key={pm.id} className="flex items-center space-x-4 p-4 bg-slate-50 border rounded-lg">
                    <div className="p-3 bg-white rounded-lg border">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{pm.brand || 'Card'} ending in {pm.last4 || '****'}</p>
                      <p className="text-sm text-muted-foreground">Expires {pm.expMonth}/{pm.expYear}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BillingPage;
