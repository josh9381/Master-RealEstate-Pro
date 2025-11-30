import { TrendingUp, DollarSign, CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const UpgradeWizard = () => {
  const currentPlan = {
    name: 'Professional',
    price: 99,
    billing: 'monthly',
    features: [
      '100 active users',
      '500K API calls/month',
      '50GB storage',
      '100K emails/month',
      'Email support',
      'Basic analytics',
    ],
  };

  const recommendedPlan = {
    name: 'Enterprise',
    price: 299,
    billing: 'monthly',
    features: [
      'Unlimited users',
      '5M API calls/month',
      '500GB storage',
      '1M emails/month',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
      'Dedicated account manager',
    ],
    savings: 'Save $396/year with annual billing',
  };

  const allPlans = [
    {
      name: 'Starter',
      price: 29,
      priceAnnual: 290,
      billing: 'per month',
      description: 'Perfect for small teams getting started',
      features: [
        '10 users',
        '50K API calls/month',
        '5GB storage',
        '10K emails/month',
        'Email support',
        'Basic analytics',
      ],
      popular: false,
    },
    {
      name: 'Professional',
      price: 99,
      priceAnnual: 990,
      billing: 'per month',
      description: 'Great for growing businesses',
      features: [
        '100 users',
        '500K API calls/month',
        '50GB storage',
        '100K emails/month',
        'Priority email support',
        'Advanced analytics',
        'Custom reports',
      ],
      popular: true,
      current: true,
    },
    {
      name: 'Enterprise',
      price: 299,
      priceAnnual: 2990,
      billing: 'per month',
      description: 'For large teams with advanced needs',
      features: [
        'Unlimited users',
        '5M API calls/month',
        '500GB storage',
        '1M emails/month',
        '24/7 phone support',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      popular: false,
    },
  ];

  const addons = [
    {
      name: 'Additional Users',
      price: 5,
      unit: 'per user/month',
      description: 'Add more team members to your account',
    },
    {
      name: 'Extra Storage',
      price: 10,
      unit: 'per 50GB/month',
      description: 'Increase your storage capacity',
    },
    {
      name: 'Additional API Calls',
      price: 25,
      unit: 'per 100K/month',
      description: 'Expand your API usage limits',
    },
    {
      name: 'Email Credits',
      price: 15,
      unit: 'per 50K/month',
      description: 'Send more emails to your contacts',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upgrade Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Choose the plan that best fits your business needs
        </p>
      </div>

      {/* Current Plan Overview */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-blue-900">Current Plan: {currentPlan.name}</h3>
                <Badge>Active</Badge>
              </div>
              <p className="text-blue-800 mt-1">
                ${currentPlan.price}/{currentPlan.billing}
              </p>
            </div>
            <Button variant="outline">View Details</Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Recommendation */}
      <Card className="border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recommended Upgrade</CardTitle>
              <CardDescription>{recommendedPlan.savings}</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <TrendingUp className="h-3 w-3 mr-1" />
              Best Value
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold">{recommendedPlan.name}</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ${recommendedPlan.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{recommendedPlan.billing}
                </span>
              </p>
              <div className="mt-4 space-y-2">
                {recommendedPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              Upgrade Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Available Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Compare Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {allPlans.map((plan) => (
            <Card
              key={plan.name}
              className={`${plan.popular ? 'border-blue-500 border-2' : ''} ${
                plan.current ? 'border-green-500 border-2' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.popular && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Popular
                    </Badge>
                  )}
                  {plan.current && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Current
                    </Badge>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/{plan.billing}</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${plan.priceAnnual}/year (billed annually)
                  </p>
                </div>
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                {plan.current ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button className="w-full">
                    {plan.price < currentPlan.price ? 'Downgrade' : 'Upgrade'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Add-ons</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {addons.map((addon) => (
            <Card key={addon.name}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{addon.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{addon.description}</p>
                    <p className="text-lg font-bold mt-2">
                      ${addon.price}
                      <span className="text-sm font-normal text-muted-foreground"> {addon.unit}</span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing Frequency Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Frequency</CardTitle>
          <CardDescription>Save up to 20% with annual billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button variant="outline" className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Monthly Billing
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700">
              <Calendar className="h-4 w-4 mr-2" />
              Annual Billing (Save 20%)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Upgrade Summary</CardTitle>
          <CardDescription>Review your selection before proceeding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-semibold">Enterprise Plan</h4>
                <p className="text-sm text-muted-foreground">Monthly billing</p>
              </div>
              <span className="text-lg font-bold">$299.00/mo</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold">$299.00/mo</span>
            </div>
            <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Upgrade takes effect immediately</p>
                <p className="mt-1">
                  You'll be charged a prorated amount for the remainder of this billing cycle. Your
                  new plan will start on January 1, 2025.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Your card will be charged immediately</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-semibold">Visa •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/2025</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Change
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" size="lg">
          Cancel
        </Button>
        <Button size="lg" className="bg-green-600 hover:bg-green-700">
          <DollarSign className="h-4 w-4 mr-2" />
          Confirm Upgrade
        </Button>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">When does my upgrade take effect?</h4>
              <p className="text-sm text-muted-foreground">
                Your upgrade is applied immediately upon confirmation. You'll have access to all new
                features right away.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">How is the prorated charge calculated?</h4>
              <p className="text-sm text-muted-foreground">
                We calculate the difference between your current and new plan for the remaining days
                in your billing cycle. You only pay for what you use.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Can I downgrade later?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can change your plan at any time. Downgrades take effect at the end of your
                current billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">What happens to my data if I downgrade?</h4>
              <p className="text-sm text-muted-foreground">
                Your data is never deleted. If you exceed the limits of a lower plan, you'll need to
                upgrade again or some features may be restricted.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpgradeWizard;
