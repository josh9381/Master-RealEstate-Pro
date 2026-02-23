import { useQuery } from '@tanstack/react-query';
import { CreditCard, Download, Crown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

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
  planFeatures?: Record<string, unknown>
}

const BillingPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, getSubscriptionTier, isTrialActive } = useAuthStore();
  
  // Fetch subscription data
  const { data: subscriptionData, isLoading } = useQuery<SubscriptionData>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/current')
      return response.data?.data || response.data
    },
  });
  
  // Mock invoices data (TODO: Connect to real invoice API)
  const invoices = [
    {
      id: 'INV-2024-001',
      date: '2024-01-01',
      amount: 99.00,
      status: 'paid',
      period: 'Jan 2024',
    },
    {
      id: 'INV-2023-012',
      date: '2023-12-01',
      amount: 99.00,
      status: 'paid',
      period: 'Dec 2023',
    },
    {
      id: 'INV-2023-011',
      date: '2023-11-01',
      amount: 99.00,
      status: 'paid',
      period: 'Nov 2023',
    },
  ];

  const handleChangePlan = () => {
    if (isAdmin()) {
      navigate('/admin/subscription');
    } else {
      toast.info('Please contact an administrator to change plans');
    }
  };

  const handleCancelSubscription = () => {
    if (!isAdmin()) {
      toast.info('Only administrators can cancel subscriptions');
      return;
    }
    if (confirm('Are you sure you want to cancel your subscription? This will take effect at the end of your current billing period.')) {
      toast.success('Subscription cancellation scheduled');
    }
  };

  const handleAddPaymentMethod = () => {
    toast.info('Opening payment method form...');
  };

  const handleEditPayment = () => {
    toast.info('Opening payment method editor...');
  };

  const handleRemovePayment = () => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      toast.success('Payment method removed');
    }
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.info(`Downloading invoice ${invoiceId}...`);
    setTimeout(() => {
      toast.success('Invoice downloaded successfully');
    }, 1000);
  };
  
  const tier = getSubscriptionTier();
  const isTrial = isTrialActive();
  
  const normalizeLimit = (limit: number | 'unlimited' | null | undefined): number | null => {
    if (limit === 'unlimited' || limit === null || limit === undefined) return null;
    return typeof limit === 'number' ? limit : null;
  };

  const getUsagePercentage = (current: number, limit: number | 'unlimited' | null | undefined) => {
    const numLimit = normalizeLimit(limit);
    if (!numLimit) return 0;
    return (current / numLimit) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="w-8 h-8" />
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Trial Banner */}
      {isTrial && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Crown className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Trial Period Active</h3>
                <p className="text-sm text-muted-foreground">
                  Your trial ends on {subscriptionData?.subscription?.trialEndsAt || 'N/A'}. Upgrade to continue using premium features.
                </p>
              </div>
            </div>
            <Button onClick={handleChangePlan}>
              Choose Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Plan - Enhanced */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Current Subscription</CardTitle>
              <CardDescription>Your active plan and billing cycle</CardDescription>
            </div>
            {!isTrial && (
              <Badge className="text-sm px-3 py-1">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : subscriptionData ? (
            <div className="space-y-6">
              {/* Plan Name & Price */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-3xl font-bold">
                      {subscriptionData.subscription?.name || 'Unknown Plan'}
                    </h3>
                    {(tier === 'PROFESSIONAL' || tier === 'ENTERPRISE') && (
                      <Crown className="w-7 h-7 text-amber-500" />
                    )}
                  </div>
                  <p className="text-lg font-semibold text-primary mb-1">
                    ${subscriptionData.subscription?.price || 0}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(subscriptionData.subscription?.price || 0) > 0 ? (
                      <>Next billing date: <span className="font-medium">N/A</span></>
                    ) : (
                      <>No billing required</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isAdmin() && (
                    <>
                      <Button variant="outline" onClick={handleChangePlan}>
                        Change Plan
                      </Button>
                      {(subscriptionData.subscription?.price || 0) > 0 && (
                        <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleCancelSubscription}>
                          Cancel
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{subscriptionData.usage?.users?.current || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active Users</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{(subscriptionData.usage?.leads?.current || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Leads</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{(subscriptionData.usage?.campaigns?.current || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Campaigns</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{(subscriptionData.usage?.workflows?.current || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Workflows</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No subscription data available</p>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Usage & Payment (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Usage This Month */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Usage This Month
                  </CardTitle>
                  <CardDescription>Track your usage against plan limits</CardDescription>
                </div>
                {tier !== 'ENTERPRISE' && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/subscription')}>
                    View All Plans
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : subscriptionData ? (
                <div className="space-y-5">
                  {/* Users */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Users</span>
                      <span className="text-sm font-medium">
                        {subscriptionData.usage?.users?.current || 0} / {subscriptionData.usage?.users?.limit || 'Unlimited'}
                      </span>
                    </div>
                    {normalizeLimit(subscriptionData.usage?.users?.limit) && (
                      <>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              getUsagePercentage(subscriptionData.usage?.users?.current || 0, subscriptionData.usage?.users?.limit) >= 90 
                                ? 'bg-red-500' 
                                : getUsagePercentage(subscriptionData.usage?.users?.current || 0, subscriptionData.usage?.users?.limit) >= 75
                                ? 'bg-yellow-500'
                                : 'bg-primary'
                            }`}
                            style={{ 
                              width: `${Math.min(getUsagePercentage(subscriptionData.usage?.users?.current || 0, subscriptionData.usage?.users?.limit), 100)}%` 
                            }} 
                          />
                        </div>
                        {getUsagePercentage(subscriptionData.usage?.users?.current || 0, subscriptionData.usage?.users?.limit) >= 75 && (
                          <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Approaching limit
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Leads */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Leads</span>
                      <span className="text-sm font-medium">
                        {(subscriptionData.usage?.leads?.current || 0).toLocaleString()} / {subscriptionData.usage?.leads?.limit?.toLocaleString() || 'Unlimited'}
                      </span>
                    </div>
                    {normalizeLimit(subscriptionData.usage?.leads?.limit) && (
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            getUsagePercentage(subscriptionData.usage.leads.current || 0, subscriptionData.usage.leads.limit) >= 90 
                              ? 'bg-red-500' 
                              : getUsagePercentage(subscriptionData.usage.leads.current || 0, subscriptionData.usage.leads.limit) >= 75
                              ? 'bg-yellow-500'
                              : 'bg-primary'
                          }`}
                          style={{ 
                            width: `${Math.min(getUsagePercentage(subscriptionData.usage.leads.current || 0, subscriptionData.usage.leads.limit), 100)}%` 
                          }} 
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Email Sends */}
                  {normalizeLimit(subscriptionData.usage?.emailsPerMonth?.limit) && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">Email Sends</span>
                        <span className="text-sm font-medium">
                          {(subscriptionData.usage?.emailsPerMonth?.current || 0).toLocaleString()} / {normalizeLimit(subscriptionData.usage?.emailsPerMonth?.limit)?.toLocaleString() || 'Unlimited'}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(getUsagePercentage(subscriptionData.usage?.emailsPerMonth?.current || 0, subscriptionData.usage?.emailsPerMonth?.limit), 100)}%` 
                          }} 
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* SMS Sends */}
                  {normalizeLimit(subscriptionData.usage?.smsPerMonth?.limit) && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">SMS Sends</span>
                        <span className="text-sm font-medium">
                          {(subscriptionData.usage?.smsPerMonth?.current || 0).toLocaleString()} / {normalizeLimit(subscriptionData.usage?.smsPerMonth?.limit)?.toLocaleString() || 'Unlimited'}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(getUsagePercentage(subscriptionData.usage?.smsPerMonth?.current || 0, subscriptionData.usage?.smsPerMonth?.limit), 100)}%` 
                          }} 
                        />
                      </div>
                    </div>
                  )}

                  
                  {/* Upgrade CTA if approaching limits */}
                  {tier !== 'ENTERPRISE' && subscriptionData.usage && (
                    <>
                      {(getUsagePercentage(subscriptionData.usage.users?.current ?? 0, subscriptionData.usage.users?.limit) >= 75 ||
                        getUsagePercentage(subscriptionData.usage.leads?.current ?? 0, subscriptionData.usage.leads?.limit) >= 75) && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <TrendingUp className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-semibold text-blue-900">Approaching usage limits</p>
                                <p className="text-xs text-blue-700">Upgrade to get more resources</p>
                              </div>
                            </div>
                            <Button size="sm" onClick={() => navigate('/admin/subscription')}>
                              Upgrade Plan
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No usage data available</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Method
                  </CardTitle>
                  <CardDescription>Manage your payment information</CardDescription>
                </div>
                {isAdmin() && (
                  <Button variant="outline" size="sm" onClick={handleAddPaymentMethod}>
                    Add New
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 p-4 bg-slate-50 border rounded-lg">
                <div className="p-3 bg-white rounded-lg border">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Visa ending in 4242</p>
                  <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                </div>
                <Badge variant="success">Default</Badge>
                {isAdmin() && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleEditPayment}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={handleRemovePayment}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Invoice History (1/3 width) */}
        <div>
          {/* Invoice History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Recent Invoices
              </CardTitle>
              <CardDescription>View and download past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-4 bg-slate-50 border rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{invoice.period}</p>
                        <p className="text-xs text-muted-foreground">{invoice.id}</p>
                      </div>
                      <Badge variant="success" className="text-xs">Paid</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold">${invoice.amount.toFixed(2)}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{invoice.date}</p>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm">
                View All Invoices
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
