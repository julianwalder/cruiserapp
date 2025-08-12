'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/Modal';
import { 
  CalendarIcon, 
  Download, 
  Eye, 
  RefreshCw, 
  AlertCircle,
  FileText,
  Search,
  MoreVertical,
  User as UserIcon,
  Package,
  Database,
  Building2,
  Link,
  Unlink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  DollarSign,
  CreditCard,
  Clock,
  ExternalLink,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
// Define the UnifiedInvoice interface inline since the service is not used
interface UnifiedInvoice {
  id: string;
  smartbill_id: string;
  series: string;
  number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  vat_amount: number;
  currency: string;
  import_date?: string;
  created_at: string;
  xml_content?: string;
  original_xml_content?: string;
  payment_method?: string;
  payment_link?: string;
  payment_status?: string;
  payment_date?: string;
  payment_reference?: string;
  user_id?: string;
  package_id?: string;
  invoice_type: 'fiscal' | 'proforma';
  is_ppl?: boolean;
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    vat_code?: string;
    user_id?: string;
    company_id?: string;
  };
  items?: Array<{
    line_id: string;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_amount: number;
    vat_rate: number;
    total?: number;
  }>;
  package?: {
    name: string;
    hours: number;
    price_per_hour: number;
    validity_days: number;
  };
}

interface EnhancedUserBillingProps {
  className?: string;
  userId?: string;
  onRefresh?: () => void;
}

type SortField = 'smartbill_id' | 'issue_date' | 'client.name' | 'status' | 'total_hours' | 'total_amount' | 'invoice_type';
type SortDirection = 'asc' | 'desc';

// Use the unified invoice type
type Invoice = UnifiedInvoice;

export default function EnhancedUserBilling({ className, userId, onRefresh }: EnhancedUserBillingProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState('all');
  const [summary, setSummary] = useState<{
    totalInvoices: number;
    totalAmount: number;
    totalHours: number;
    currency: string;
    fiscalCount: number;
    proformaCount: number;
  } | null>(null);

  const fetchInvoices = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      }
      if (status && status !== 'all') {
        params.append('status', status);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (activeTab !== 'all') {
        params.append('type', activeTab);
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/users/${userId}/all-invoices?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [userId, activeTab]);

  // Filter invoices by search term (client-side filtering for better UX)
  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (invoice.smartbill_id || '').toLowerCase().includes(searchLower) ||
      invoice.client.name.toLowerCase().includes(searchLower) ||
      invoice.client.email?.toLowerCase().includes(searchLower) ||
      invoice.items?.some((item: any) => item.name.toLowerCase().includes(searchLower))
    );
  });

  // Sort invoices
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'smartbill_id':
        aValue = a.smartbill_id;
        bValue = b.smartbill_id;
        break;
      case 'issue_date':
        aValue = new Date(a.issue_date);
        bValue = new Date(b.issue_date);
        break;
      case 'client.name':
        aValue = a.client.name;
        bValue = b.client.name;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'total_hours':
        aValue = calculateTotalHours(a);
        bValue = calculateTotalHours(b);
        break;
      case 'total_amount':
        aValue = a.total_amount;
        bValue = b.total_amount;
        break;
      case 'invoice_type':
        aValue = a.invoice_type;
        bValue = b.invoice_type;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string, invoiceType: string, paymentStatus?: string) => {
    const actualStatus = invoiceType === 'proforma' ? (paymentStatus || status) : status;
    
    const statusConfig = {
      'imported': { variant: 'default' as const, label: 'Imported' },
      'draft': { variant: 'secondary' as const, label: 'Draft' },
      'sent': { variant: 'default' as const, label: 'Sent' },
      'paid': { variant: 'default' as const, label: 'Paid' },
      'pending': { variant: 'secondary' as const, label: 'Pending' },
      'overdue': { variant: 'destructive' as const, label: 'Overdue' },
      'cancelled': { variant: 'secondary' as const, label: 'Cancelled' },
      'failed': { variant: 'destructive' as const, label: 'Failed' },
    };

    const config = statusConfig[actualStatus.toLowerCase() as keyof typeof statusConfig] || {
      variant: 'outline' as const,
      label: actualStatus
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const calculateTotalHours = (invoice: Invoice): number => {
    if (invoice.invoice_type === 'proforma' && invoice.package) {
      return invoice.package.hours;
    } else if (invoice.invoice_type === 'fiscal' && invoice.items) {
      return invoice.items?.reduce((total: number, item: any) => {
        if (item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H') {
          return total + item.quantity;
        }
        return total;
      }, 0);
    }
    return 0;
  };

  // Utility function to format hours as HH:MM
  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    fetchInvoices();
    onRefresh?.();
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };

  const exportToCSV = () => {
    const headers = [
      'Invoice Number',
      'Type',
      'Series',
      'Date',
      'Due Date',
      'Status',
      'Total',
      'Currency',
      'VAT Total',
      'Client Name',
      'Client Email',
      'Client Address',
      'Hours',
      'Payment Status',
      'Payment Date'
    ];

    const csvContent = [
      headers.join(','),
      ...sortedInvoices.map(invoice => [
        invoice.smartbill_id,
        invoice.invoice_type,
        invoice.series,
        invoice.issue_date,
        invoice.due_date,
        invoice.status,
        invoice.total_amount,
        invoice.currency,
        invoice.vat_amount,
        `"${invoice.client.name}"`,
        invoice.client.email || '',
        `"${invoice.client.address || ''}"`,
        calculateTotalHours(invoice),
        invoice.payment_status || '',
        invoice.payment_date || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!userId) {
    return (
      <div className={cn('space-y-6', className)}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No user ID provided. Please select a user to view their invoices.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>My Invoices</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={sortedInvoices.length === 0}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Invoice Type Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                All Invoices
                {summary && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.totalInvoices}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="fiscal" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Fiscal Invoices
                {summary && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.fiscalCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="proforma" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Proforma Invoices
                {summary && (
                  <Badge variant="secondary" className="ml-1">
                    {summary.proformaCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="imported">Imported</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={fetchInvoices} disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert className="mb-4 border-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Invoices Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading invoices...</span>
            </div>
          ) : sortedInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {invoices.length === 0 ? 'No invoices found for this user' : 'No invoices match your filters'}
            </div>
          ) : (
            <div>
              <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-[120px] cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('smartbill_id')}
                    >
                      <div className="flex items-center gap-1">
                        Invoice #
                        {getSortIcon('smartbill_id')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[80px] cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('invoice_type')}
                    >
                      <div className="flex items-center gap-1">
                        Type
                        {getSortIcon('invoice_type')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('issue_date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {getSortIcon('issue_date')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[250px] cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('client.name')}
                    >
                      <div className="flex items-center gap-1">
                        Client
                        {getSortIcon('client.name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[80px] text-right cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('total_hours')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Hours
                        {getSortIcon('total_hours')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[120px] text-right cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('total_amount')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total
                        {getSortIcon('total_amount')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px] text-center">Links</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate block" title={invoice.smartbill_id}>{invoice.smartbill_id}</span>
                          <Eye className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.invoice_type === 'proforma' ? 'default' : 'secondary'}>
                          {invoice.invoice_type === 'proforma' ? (
                            <CreditCard className="h-3 w-3 mr-1" />
                          ) : (
                            <Database className="h-3 w-3 mr-1" />
                          )}
                          {invoice.invoice_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                      <TableCell>
                        <div className="max-w-[230px]">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate" title={invoice.client.name}>{invoice.client.name}</p>
                            {invoice.is_ppl && (
                              <Badge variant="default" className="text-xs bg-blue-600">
                                <Package className="h-3 w-3 mr-1" />
                                PPL
                              </Badge>
                            )}
                          </div>

                          {invoice.client.email && (
                            <p className="text-sm text-muted-foreground truncate" title={invoice.client.email}>{invoice.client.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status, invoice.invoice_type, invoice.payment_status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const totalHours = calculateTotalHours(invoice);
                          return totalHours > 0 ? formatHours(totalHours) : '-';
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.total_amount, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {invoice.payment_link && (
                            <Badge 
                              variant="default" 
                              className="text-xs cursor-pointer hover:bg-primary/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(invoice.payment_link, '_blank');
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Payment Link
                            </Badge>
                          )}
                          {invoice.client.user_id ? (
                            <Badge variant="default" className="text-xs">
                              <UserIcon className="h-3 w-3 mr-1" />
                              User
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Unlink className="h-3 w-3 mr-1" />
                              No User
                            </Badge>
                          )}
                          {invoice.client.company_id ? (
                            <Badge variant="default" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              Company
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Unlink className="h-3 w-3 mr-1" />
                              No Company
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(invoice);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {invoice.payment_link && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                window.open(invoice.payment_link, '_blank');
                              }}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Payment Link
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </div>
          )}

          {/* Summary */}
          {sortedInvoices.length > 0 && summary && (
            <div className="mt-4 p-4 bg-muted/50 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Showing {sortedInvoices.length} of {summary.totalInvoices} invoices
                </span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">
                    Total Hours: {formatHours(summary.totalHours)}
                  </span>
                  <span className="text-sm font-medium">
                    Total Amount: {formatCurrency(summary.totalAmount, summary.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Fiscal: {summary.fiscalCount} | Proforma: {summary.proformaCount}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Modal */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Invoice Details"
      >
        {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Invoice Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Invoice Number:</span>
                      <span className="text-sm font-medium">{selectedInvoice.smartbill_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Type:</span>
                      <Badge variant={selectedInvoice.invoice_type === 'proforma' ? 'default' : 'secondary'}>
                        {selectedInvoice.invoice_type}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Issue Date:</span>
                      <span className="text-sm">{formatDate(selectedInvoice.issue_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Due Date:</span>
                      <span className="text-sm">{formatDate(selectedInvoice.due_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Status:</span>
                      <span className="text-sm">{selectedInvoice.status}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Amount:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedInvoice.total_amount || 0, selectedInvoice.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">VAT Amount:</span>
                      <span className="text-sm">{formatCurrency(selectedInvoice.vat_amount || 0, selectedInvoice.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Currency:</span>
                      <span className="text-sm">{selectedInvoice.currency}</span>
                    </div>
                    {selectedInvoice.payment_status && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Payment Status:</span>
                        <span className="text-sm">{selectedInvoice.payment_status}</span>
                      </div>
                    )}
                    {selectedInvoice.payment_date && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Payment Date:</span>
                        <span className="text-sm">{formatDate(selectedInvoice.payment_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Client Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Name:</span>
                      <span className="text-sm font-medium">{selectedInvoice.client.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Email:</span>
                      <span className="text-sm">{selectedInvoice.client.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                      <span className="text-sm">{selectedInvoice.client.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Address:</span>
                      <span className="text-sm">{selectedInvoice.client.address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">City:</span>
                      <span className="text-sm">{selectedInvoice.client.city || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Country:</span>
                      <span className="text-sm">{selectedInvoice.client.country || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package Information (for proforma invoices) */}
              {selectedInvoice.invoice_type === 'proforma' && selectedInvoice.package && (
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Package Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Package Name:</span>
                        <span className="text-sm font-medium">{selectedInvoice.package.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Hours:</span>
                        <span className="text-sm">{selectedInvoice.package.hours}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Price per Hour:</span>
                        <span className="text-sm">{formatCurrency(selectedInvoice.package.price_per_hour || 0, selectedInvoice.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Validity Days:</span>
                        <span className="text-sm">{selectedInvoice.package.validity_days}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Invoice Items
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.quantity || 0}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price || 0, selectedInvoice.currency)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.total_amount || 0, selectedInvoice.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Payment Link */}
              {selectedInvoice.payment_link && (
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Payment Link
                  </h3>
                  <Button 
                    onClick={() => window.open(selectedInvoice.payment_link, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Payment Link
                  </Button>
                </div>
              )}
            </div>
          )}
      </Modal>
    </div>
  );
}
