import { CreditCard, Building2, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const PaymentMethods = () => {
  const paymentMethods = [
    {
      id: 1,
      type: 'card',
      brand: 'Visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true,
      billingAddress: {
        name: 'John Doe',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
      },
    },
    {
      id: 2,
      type: 'card',
      brand: 'Mastercard',
      last4: '5555',
      expiryMonth: 8,
      expiryYear: 2026,
      isDefault: false,
      billingAddress: {
        name: 'John Doe',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'US',
      },
    },
  ];

  const getCardIcon = (brand: string) => {
    const icons: { [key: string]: string } = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
    };
    return icons[brand.toLowerCase()] || '💳';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground mt-2">
            Manage your payment methods and billing information
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

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
              {getCardIcon(paymentMethods.find((m) => m.isDefault)?.brand || '')} ••••{' '}
              {paymentMethods.find((m) => m.isDefault)?.last4}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentMethods.find((m) => m.isDefault)?.brand}
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
              {paymentMethods.find((m) => m.isDefault)?.billingAddress.city}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentMethods.find((m) => m.isDefault)?.billingAddress.state},{' '}
              {paymentMethods.find((m) => m.isDefault)?.billingAddress.country}
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
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p className="font-medium">{method.billingAddress.name}</p>
                      <p>{method.billingAddress.address}</p>
                      <p>
                        {method.billingAddress.city}, {method.billingAddress.state}{' '}
                        {method.billingAddress.zip}
                      </p>
                      <p>{method.billingAddress.country}</p>
                    </div>
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

      {/* Add New Payment Method Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Payment Method</CardTitle>
          <CardDescription>Enter your payment details</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Month</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>01</option>
                  <option>02</option>
                  <option>03</option>
                  <option>04</option>
                  <option>05</option>
                  <option>06</option>
                  <option>07</option>
                  <option>08</option>
                  <option>09</option>
                  <option>10</option>
                  <option>11</option>
                  <option>12</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Year</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>2024</option>
                  <option>2025</option>
                  <option>2026</option>
                  <option>2027</option>
                  <option>2028</option>
                  <option>2029</option>
                  <option>2030</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CVV</label>
                <input
                  type="text"
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-4">Billing Address</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address Line 1</label>
                  <input
                    type="text"
                    placeholder="123 Main St"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address Line 2</label>
                  <input
                    type="text"
                    placeholder="Apt 4B"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <input
                      type="text"
                      placeholder="San Francisco"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <input
                      type="text"
                      placeholder="CA"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ZIP Code</label>
                    <input
                      type="text"
                      placeholder="94102"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="setDefault" className="rounded" />
              <label htmlFor="setDefault" className="text-sm">
                Set as default payment method
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline">Cancel</Button>
              <Button>Add Payment Method</Button>
            </div>
          </form>
        </CardContent>
      </Card>

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

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Your recent payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                date: 'Dec 1, 2024',
                amount: '$99.00',
                method: 'Visa ••••4242',
                status: 'Succeeded',
              },
              {
                date: 'Nov 1, 2024',
                amount: '$99.00',
                method: 'Visa ••••4242',
                status: 'Succeeded',
              },
              {
                date: 'Oct 1, 2024',
                amount: '$99.00',
                method: 'Visa ••••4242',
                status: 'Succeeded',
              },
              {
                date: 'Sep 1, 2024',
                amount: '$99.00',
                method: 'Mastercard ••••5555',
                status: 'Succeeded',
              },
            ].map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{payment.date}</p>
                    <p className="text-xs text-muted-foreground">{payment.method}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">{payment.amount}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethods;
