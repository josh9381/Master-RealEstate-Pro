import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Calendar, DollarSign, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useAuthStore } from '@/store/authStore';
import { billingApi } from '@/lib/api';
import { APP_NAME } from '@/lib/appConfig';

interface InvoiceData {
  id: string;
  stripeInvoiceId?: string;
  amount: number;
  currency?: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  paidAt?: string;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; amount: number; period?: string }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  amountPaid?: number;
  number?: string;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number | undefined, currency = 'usd'): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
}

function statusColor(status: string): string {
  const s = status?.toLowerCase();
  if (s === 'paid') return 'bg-green-100 text-green-800';
  if (s === 'open' || s === 'draft') return 'bg-orange-100 text-orange-800';
  if (s === 'void' || s === 'uncollectible') return 'bg-red-100 text-red-800';
  return 'bg-muted text-foreground';
}

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const organizationName = user?.organization?.name || APP_NAME;

  const { data: invoiceRes, isLoading, isError } = useQuery({
    queryKey: ['billing-invoice', id],
    queryFn: () => billingApi.getInvoiceById(id!),
    enabled: !!id,
  });

  const invoice: InvoiceData | null = invoiceRes?.data || null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/billing?tab=invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Invoice Not Found</h2>
          <p className="text-muted-foreground mb-4">This invoice could not be loaded. It may not exist or billing is not configured.</p>
          <Button variant="outline" onClick={() => navigate('/billing?tab=invoices')}>
            Back to Invoices
          </Button>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status?.toLowerCase() === 'paid';
  const displayNumber = invoice.number || invoice.stripeInvoiceId || invoice.id;
  const total = invoice.total ?? invoice.amount ?? 0;
  const subtotal = invoice.subtotal ?? total;
  const tax = invoice.tax ?? 0;
  const amountPaid = invoice.amountPaid ?? (isPaid ? total : 0);
  const currency = invoice.currency || 'usd';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/billing?tab=invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice {displayNumber}</h1>
            <p className="text-muted-foreground mt-1">Issued on {formatDate(invoice.invoiceDate)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {invoice.pdfUrl && (
            <Button onClick={() => window.open(invoice.pdfUrl, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
          {invoice.hostedInvoiceUrl && (
            <Button variant="outline" onClick={() => window.open(invoice.hostedInvoiceUrl, '_blank')}>
              <FileText className="h-4 w-4 mr-2" />
              View on Stripe
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Status */}
      <Card className={isPaid ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isPaid ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-orange-600" />
              )}
              <div>
                <h3 className={`text-2xl font-bold ${isPaid ? 'text-green-900' : 'text-orange-900'}`}>
                  {invoice.status}
                </h3>
                {isPaid && invoice.paidAt && (
                  <p className="text-green-800 mt-1">Payment received on {formatDate(invoice.paidAt)}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className={statusColor(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Number</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayNumber}</div>
            <p className="text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(total, currency)}</div>
            <p className="text-xs text-muted-foreground">{tax > 0 ? 'Including tax' : 'No tax'}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(invoice.dueDate)}</div>
            <p className="text-xs text-muted-foreground">Billing period</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {isPaid ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-orange-600" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>{invoice.status}</div>
            <p className="text-xs text-muted-foreground">{isPaid ? 'Fully paid' : 'Payment pending'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Document */}
      <Card>
        <CardContent className="pt-6">
          <div className="border-b pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold">INVOICE</h2>
                <p className="text-muted-foreground mt-2">Invoice #{displayNumber}</p>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold">{organizationName}</h3>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">INVOICE DATE</h4>
                <p className="font-semibold">{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">DUE DATE</h4>
                <p className="font-semibold">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          {invoice.lineItems && invoice.lineItems.length > 0 ? (
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
                  {invoice.lineItems.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-4">
                        <p className="font-medium">{item.description}</p>
                        {item.period && <p className="text-sm text-muted-foreground">{item.period}</p>}
                      </td>
                      <td className="py-4 text-center">{item.quantity}</td>
                      <td className="py-4 text-right">{formatCurrency(item.unitPrice, currency)}</td>
                      <td className="py-4 text-right font-medium">{formatCurrency(item.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-t border-b py-4 mb-6">
              <div className="flex justify-between py-3">
                <span className="font-medium">Subscription</span>
                <span className="font-medium">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(tax, currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-lg">{formatCurrency(total, currency)}</span>
              </div>
              {isPaid && (
                <div className="flex justify-between border-t pt-3 bg-green-50 -mx-4 px-4 py-2 rounded">
                  <span className="font-bold text-green-900">Amount Paid</span>
                  <span className="font-bold text-green-900">{formatCurrency(amountPaid, currency)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Contact support for billing questions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you have questions about this invoice, visit the{' '}
            <a href="/help" className="text-blue-600 hover:underline">Help Center</a>{' '}
            or open a support ticket.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetail;
