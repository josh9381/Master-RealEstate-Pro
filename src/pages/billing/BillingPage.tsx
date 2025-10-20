import { CreditCard, Download, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

const BillingPage = () => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Professional Plan</h3>
              <p className="text-muted-foreground mb-4">
                Billed monthly • Next billing date: Feb 1, 2024
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-semibold ml-1">$99/month</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Users:</span>
                  <span className="font-semibold ml-1">5 of 10</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Storage:</span>
                  <span className="font-semibold ml-1">2.4 GB of 50 GB</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">Change Plan</Button>
              <Button variant="destructive">Cancel Subscription</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage This Month */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>Track your usage against plan limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Email Sends</span>
                <span className="text-sm text-muted-foreground">4,567 / 10,000</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '45.67%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">SMS Sends</span>
                <span className="text-sm text-muted-foreground">1,234 / 5,000</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '24.68%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">API Calls</span>
                <span className="text-sm text-muted-foreground">12,456 / 100,000</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '12.456%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-muted-foreground">2.4 GB / 50 GB</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '4.8%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment information</CardDescription>
            </div>
            <Button variant="outline">Add Payment Method</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 p-4 border rounded-lg">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Visa ending in 4242</p>
              <p className="text-sm text-muted-foreground">Expires 12/2025</p>
            </div>
            <Badge variant="success">Default</Badge>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm">
                Edit
              </Button>
              <Button variant="ghost" size="sm">
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>View and download past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell>{invoice.period}</TableCell>
                  <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="success">{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Upgrade or downgrade your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: 'Starter',
                price: 29,
                users: 3,
                emails: 5000,
                sms: 1000,
                features: ['Basic Analytics', 'Email Support', '10 GB Storage'],
              },
              {
                name: 'Professional',
                price: 99,
                users: 10,
                emails: 10000,
                sms: 5000,
                features: ['Advanced Analytics', 'Priority Support', '50 GB Storage', 'AI Features'],
                current: true,
              },
              {
                name: 'Enterprise',
                price: 299,
                users: 999,
                emails: 999999,
                sms: 999999,
                features: ['Custom Analytics', '24/7 Support', 'Unlimited Storage', 'All Features', 'SLA'],
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`p-6 border rounded-lg ${
                  plan.current ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-4">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="text-sm">• {plan.users} users</li>
                  <li className="text-sm">• {plan.emails.toLocaleString()} emails/mo</li>
                  <li className="text-sm">• {plan.sms.toLocaleString()} SMS/mo</li>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-sm">
                      • {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.current ? 'secondary' : 'default'}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage;
