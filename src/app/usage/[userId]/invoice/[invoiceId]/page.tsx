'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Receipt, Calendar, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface InvoiceItem {
  line_id: number;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  vat_rate: number;
}

interface InvoiceClient {
  name: string;
  email: string;
  phone?: string;
  vat_code?: string;
  address?: string;
  city?: string;
  country?: string;
  user_id?: string;
}

interface InvoiceDetail {
  id: string;
  smartbill_id: string;
  series_name?: string;
  number?: number;
  issue_date: string;
  due_date?: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_url?: string;
  invoice_clients: InvoiceClient[];
  invoice_items: InvoiceItem[];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const invoiceId = params?.invoiceId as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoiceDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/invoices/${invoiceId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch invoice details');
        }

        const result = await response.json();
        setInvoice(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoiceDetail();
    }
  }, [invoiceId, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'imported':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const client = invoice.invoice_clients[0];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/usage/${userId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ledger
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Invoice Details
          </h1>
          <p className="text-muted-foreground">{invoice.smartbill_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoice Information</CardTitle>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>
              {invoice.series_name && invoice.number
                ? `${invoice.series_name} #${invoice.number}`
                : invoice.smartbill_id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Issue Date</span>
                </div>
                <p className="text-lg font-medium">{formatDate(invoice.issue_date)}</p>
              </div>

              {invoice.due_date && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Due Date</span>
                  </div>
                  <p className="text-lg font-medium">{formatDate(invoice.due_date)}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Amount</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(invoice.total_amount, invoice.currency)}
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-4">Invoice Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.invoice_items.map((item) => (
                    <TableRow key={item.line_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">{item.vat_rate}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total_amount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {invoice.payment_url && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => window.open(invoice.payment_url, '_blank')}
                  className="w-full"
                >
                  View Payment Page
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{client.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{client.email}</p>
            </div>
            {client.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{client.phone}</p>
              </div>
            )}
            {client.vat_code && (
              <div>
                <p className="text-sm text-muted-foreground">VAT Code</p>
                <p className="font-medium">{client.vat_code}</p>
              </div>
            )}
            {client.address && (
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">
                  {client.address}
                  {client.city && `, ${client.city}`}
                  {client.country && `, ${client.country}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
