import { Download, FileText, Calendar, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const InvoiceDetail = () => {
  const invoice = {
    id: 'INV-2024-001',
    number: 'INV-2024-001',
    date: 'December 1, 2024',
    dueDate: 'December 31, 2024',
    status: 'Paid',
    paidDate: 'December 1, 2024',
    subtotal: 99.0,
    tax: 8.91,
    total: 107.91,
    amountPaid: 107.91,
    billingPeriod: 'December 1 - December 31, 2024',
    paymentMethod: 'Visa •••• 4242',
    customer: {
      name: 'Acme Corporation',
      email: 'billing@acme.com',
      address: '123 Business St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'United States',
    },
    lineItems: [
      {
        description: 'Professional Plan',
        quantity: 1,
        unitPrice: 99.0,
        amount: 99.0,
        period: 'Dec 1 - Dec 31, 2024',
      },
    ],
    notes: 'Thank you for your business!',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice {invoice.number}</h1>
          <p className="text-muted-foreground mt-2">Issued on {invoice.date}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Status */}
      <Card className={invoice.status === 'Paid' ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {invoice.status === 'Paid' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-orange-600" />
              )}
              <div>
                <h3 className={`text-2xl font-bold ${invoice.status === 'Paid' ? 'text-green-900' : 'text-orange-900'}`}>
                  {invoice.status}
                </h3>
                {invoice.status === 'Paid' && (
                  <p className="text-green-800 mt-1">Payment received on {invoice.paidDate}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className={invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
              {invoice.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Number</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoice.number}</div>
            <p className="text-xs text-muted-foreground">{invoice.date}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${invoice.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Including tax</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoice.dueDate}</div>
            <p className="text-xs text-muted-foreground">Billing period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Paid</div>
            <p className="text-xs text-muted-foreground">{invoice.paymentMethod}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Document */}
      <Card>
        <CardContent className="pt-6">
          {/* Header */}
          <div className="border-b pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold">INVOICE</h2>
                <p className="text-muted-foreground mt-2">Invoice #{invoice.number}</p>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold">Your Company Name</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  456 Company Ave<br />
                  Suite 100<br />
                  San Francisco, CA 94105<br />
                  United States
                </p>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">BILL TO</h4>
              <p className="font-semibold">{invoice.customer.name}</p>
              <p className="text-sm text-muted-foreground">
                {invoice.customer.address}<br />
                {invoice.customer.city}, {invoice.customer.state} {invoice.customer.zip}<br />
                {invoice.customer.country}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{invoice.customer.email}</p>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">INVOICE DATE</h4>
                <p className="font-semibold">{invoice.date}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">DUE DATE</h4>
                <p className="font-semibold">{invoice.dueDate}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">BILLING PERIOD</h4>
                <p className="font-semibold">{invoice.billingPeriod}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t border-b py-4 mb-6">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold text-center">Qty</th>
                  <th className="pb-3 font-semibold text-right">Unit Price</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{item.period}</p>
                      </div>
                    </td>
                    <td className="py-4 text-center">{item.quantity}</td>
                    <td className="py-4 text-right">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-4 text-right font-medium">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (9%)</span>
                <span className="font-medium">${invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-lg">${invoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 bg-green-50 -mx-4 px-4 py-2 rounded">
                <span className="font-bold text-green-900">Amount Paid</span>
                <span className="font-bold text-green-900">${invoice.amountPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t pt-6">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">NOTES</h4>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Transaction details for this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                date: 'Dec 1, 2024, 10:23 AM',
                type: 'Payment Received',
                amount: 107.91,
                method: 'Visa •••• 4242',
                status: 'Succeeded',
              },
            ].map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{payment.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.date} • {payment.method}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">${payment.amount.toFixed(2)}</p>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Related Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Related Invoices</CardTitle>
          <CardDescription>Other invoices from this billing period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { number: 'INV-2024-002', date: 'Nov 1, 2024', amount: 99.0, status: 'Paid' },
              { number: 'INV-2024-003', date: 'Oct 1, 2024', amount: 99.0, status: 'Paid' },
              { number: 'INV-2024-004', date: 'Sep 1, 2024', amount: 99.0, status: 'Paid' },
            ].map((inv, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{inv.number}</p>
                    <p className="text-sm text-muted-foreground">{inv.date}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">${inv.amount.toFixed(2)}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {inv.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Contact support for billing questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm">
                If you have any questions about this invoice, please contact our billing team at{' '}
                <a href="mailto:billing@company.com" className="text-blue-600 hover:underline">
                  billing@company.com
                </a>{' '}
                or call us at{' '}
                <a href="tel:+15551234567" className="text-blue-600 hover:underline">
                  +1 (555) 123-4567
                </a>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetail;
