import { CreditCard, Building2, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  billingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

const PaymentMethods = () => {
  const { toast } = useToast();

  // Fetch payment methods from API
  const { data: paymentMethodsRes, isLoading } = useQuery({
    queryKey: ['billing-payment-methods'],
    queryFn: () => billingApi.getPaymentMethods(),
  });

  const paymentMethods: PaymentMethod[] = paymentMethodsRes?.data || [];
  const stripeMessage = paymentMethodsRes?.message;

  const getCardIcon = (_brand: string) => '💳';

  const defaultMethod = paymentMethods.find((m) => m.isDefault);

  const handleAddPaymentMethod = () => {
    toast.info('Stripe payment method setup requires STRIPE_SECRET_KEY to be configured.');
  };

  if (isLoading) {
    return <LoadingSkeleton rows={3} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground mt-2">
            Manage your payment methods and billing information
          </p>
        </div>
        <Button onClick={handleAddPaymentMethod}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Stripe Not Configured Notice */}
      {stripeMessage && stripeMessage.includes('not configured') && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Stripe Not Configured</h4>
                <p className="text-sm text-amber-800 mt-1">
                  Payment methods require Stripe integration. Set the STRIPE_SECRET_KEY environment variable to enable payment processing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payment methods yet</h3>
              <p className="text-muted-foreground mb-4">
                Add a payment method to manage your subscription billing.
              </p>
              <Button onClick={handleAddPaymentMethod}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentMethods.length}</div>
                <p className="text-xs text-muted-foreground">Active payment methods</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Default Method</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {defaultMethod ? (
                    <>{getCardIcon(defaultMethod.brand)} •••• {defaultMethod.last4}</>
                  ) : (
                    'None'
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {defaultMethod?.brand || 'No default set'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billing Address</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {defaultMethod?.billingAddress?.city || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {defaultMethod?.billingAddress
                    ? `${defaultMethod.billingAddress.state}, ${defaultMethod.billingAddress.country}`
                    : 'No address on file'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Saved Payment Methods */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Saved Payment Methods</h2>
            {paymentMethods.map((method) => (
              <Card key={method.id} className={method.isDefault ? 'border-blue-500' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="text-4xl">{getCardIcon(method.brand)}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">
                            {method.brand} •••• {method.last4}
                          </h3>
                          {method.isDefault && <Badge variant="secondary">Default</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                        </p>
                        {method.billingAddress && (
                          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            <p className="font-medium">{method.billingAddress.name}</p>
                            <p>{method.billingAddress.address}</p>
                            <p>
                              {method.billingAddress.city}, {method.billingAddress.state}{' '}
                              {method.billingAddress.zip}
                            </p>
                            <p>{method.billingAddress.country}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!method.isDefault && (
                        <Button variant="outline" size="sm">
                          Set as Default
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Secure Payment Processing</h4>
              <p className="text-sm text-blue-800 mt-1">
                All payment information is encrypted and securely stored. We use industry-standard
                PCI DSS compliance to protect your financial data. Your card details are never
                stored on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethods;
