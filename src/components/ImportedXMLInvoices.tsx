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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CalendarIcon, 
  Download, 
  Eye, 
  RefreshCw, 
  AlertCircle,
  FileText,
  Search,
  MoreVertical,
  X,
  User,
  Package,
  Database,
  Building2,
  Link,
  Unlink
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ImportedInvoice } from '@/lib/invoice-import-service';

interface ImportedXMLInvoicesProps {
  className?: string;
  onRefresh?: () => void;
}

export default function ImportedXMLInvoices({ className, onRefresh }: ImportedXMLInvoicesProps) {
  const [invoices, setInvoices] = useState<ImportedInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<ImportedInvoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInvoices = async () => {
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

      const response = await fetch(`/api/smartbill/import-xml?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter invoices by search term
  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.smartbill_id.toLowerCase().includes(searchLower) ||
      invoice.client.name.toLowerCase().includes(searchLower) ||

      invoice.client.email?.toLowerCase().includes(searchLower) ||
      invoice.items.some(item => item.name.toLowerCase().includes(searchLower))
    );
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'imported': { variant: 'default' as const, label: 'Imported' },
      'draft': { variant: 'secondary' as const, label: 'Draft' },
      'sent': { variant: 'default' as const, label: 'Sent' },
      'paid': { variant: 'default' as const, label: 'Paid' },
      'overdue': { variant: 'destructive' as const, label: 'Overdue' },
      'cancelled': { variant: 'secondary' as const, label: 'Cancelled' },
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || {
      variant: 'outline' as const,
      label: status
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

  const calculateTotalHours = (invoice: ImportedInvoice): number => {
    return invoice.items.reduce((total, item) => {
      // Check if the item is a flight hour item (has quantity in hours)
      if (item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H') {
        return total + item.quantity;
      }
      return total;
    }, 0);
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

  const handleViewInvoice = (invoice: ImportedInvoice) => {
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
      'Linked User',
      'Linked Company',
      'Import Date'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredInvoices.map(invoice => [
        invoice.smartbill_id,
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
        invoice.client.user_id ? 'Yes' : 'No',
        invoice.client.company_id ? 'Yes' : 'No',
        invoice.import_date
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imported-invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Imported XML Invoices</span>
              <Badge variant="outline">{filteredInvoices.length}</Badge>
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
                disabled={filteredInvoices.length === 0}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            View and manage your imported XML invoices with company-user relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {invoices.length === 0 ? 'No imported invoices yet' : 'No invoices match your filters'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Invoice #</TableHead>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[250px]">Client</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px] text-right">Hours</TableHead>
                    <TableHead className="w-[120px] text-right">Total</TableHead>
                    <TableHead className="w-[150px] text-center">Links</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <span className="truncate block" title={invoice.smartbill_id}>{invoice.smartbill_id}</span>
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
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
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
                          {invoice.client.user_id ? (
                            <Badge variant="default" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
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
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
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
          )}

          {/* Summary */}
          {filteredInvoices.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredInvoices.length} of {invoices.length} imported invoices
                </span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">
                    Total Hours: {(() => {
                          const totalHours = filteredInvoices.reduce((sum, invoice) => sum + calculateTotalHours(invoice), 0);
    return totalHours > 0 ? formatHours(totalHours) : '00:00';
                    })()}
                  </span>
                  <span className="text-sm font-medium">
                    Total: {formatCurrency(
                      filteredInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0),
                      filteredInvoices[0]?.currency || 'RON'
                    )}
                  </span>
                  <span className="text-sm font-medium">
                    Linked Users: {filteredInvoices.filter(invoice => invoice.client.user_id).length}
                  </span>
                  <span className="text-sm font-medium">
                    Linked Companies: {filteredInvoices.filter(invoice => invoice.client.company_id).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="!max-w-[90vw] max-h-[90vh] flex flex-col" showCloseButton={false}>
          <div className="flex-shrink-0 pb-2 flex justify-between">
            <DialogTitle className="text-2xl">Invoice Details - {selectedInvoice?.smartbill_id}</DialogTitle>
            <Button variant="outline" onClick={handleCloseModal}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">
          
          {selectedInvoice && (
            <div key={selectedInvoice.id} className="space-y-8">
              {/* Invoice Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Invoice Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
                    <p className="text-base font-medium text-card-foreground">{selectedInvoice.smartbill_id}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Series</Label>
                    <p className="text-base text-card-foreground">{selectedInvoice.series}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                    <p className="text-base text-card-foreground">{formatDate(selectedInvoice.issue_date)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <p className="text-base text-card-foreground">{formatDate(selectedInvoice.due_date)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                    <p className="text-base font-medium text-green-600">
                      {formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">VAT Amount</Label>
                    <p className="text-base text-card-foreground">{formatCurrency(selectedInvoice.vat_amount, selectedInvoice.currency)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Total Hours</Label>
                    <p className="text-base font-medium text-card-foreground">{formatHours(calculateTotalHours(selectedInvoice))}</p>
                  </div>
                  {selectedInvoice.is_ppl && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">PPL Course</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-600">
                          <Package className="h-3 w-3 mr-1" />
                          PPL Course
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {selectedInvoice.ppl_hours_paid} hours paid of 45 total
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Client Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <p className="text-base font-medium text-card-foreground">{selectedInvoice.client.name}</p>
                  </div>

                  {selectedInvoice.client.vat_code && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {selectedInvoice.client.vat_code.length === 13 ? 'CNP' : 'VAT Code'}
                      </Label>
                      <p className="text-base text-card-foreground">{selectedInvoice.client.vat_code}</p>
                    </div>
                  )}
                  {selectedInvoice.client.email && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-base text-card-foreground">{selectedInvoice.client.email}</p>
                    </div>
                  )}
                  {selectedInvoice.client.phone && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-base text-card-foreground">{selectedInvoice.client.phone}</p>
                    </div>
                  )}
                  {selectedInvoice.client.address && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                      <p className="text-base text-card-foreground">{selectedInvoice.client.address}</p>
                      {selectedInvoice.client.city && (
                        <p className="text-base text-card-foreground">{selectedInvoice.client.city}</p>
                      )}
                      {selectedInvoice.client.country && (
                        <p className="text-base text-card-foreground">{selectedInvoice.client.country}</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* User-Company Relationship Status */}
                <div className="mt-6 p-4 bg-background rounded-lg border">
                  <h4 className="text-lg font-semibold text-card-foreground mb-3 flex items-center">
                    <Link className="h-4 w-4 mr-2" />
                    User-Company Relationship
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">User Link</Label>
                      <div className="flex items-center gap-2">
                        {selectedInvoice.client.user_id ? (
                          <>
                            <Badge variant="default">
                              <User className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                            <span className="text-sm text-muted-foreground">User ID: {selectedInvoice.client.user_id}</span>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline">
                              <Unlink className="h-3 w-3 mr-1" />
                              Not Linked
                            </Badge>
                            <span className="text-sm text-muted-foreground">No user found with email: {selectedInvoice.client.email || 'No email provided'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Company Link</Label>
                      <div className="flex items-center gap-2">
                        {selectedInvoice.client.company_id ? (
                          <>
                            <Badge variant="default">
                              <Building2 className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                            <span className="text-sm text-muted-foreground">Company ID: {selectedInvoice.client.company_id}</span>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline">
                              <Unlink className="h-3 w-3 mr-1" />
                              Not Linked
                            </Badge>
                            <span className="text-sm text-muted-foreground">No company found for this client</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Invoice Items
                </h3>
                <div className="space-y-4">
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-background">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Item Name</Label>
                          <p className="text-base font-medium text-card-foreground">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                          <p className="text-base text-card-foreground">{item.quantity} {item.unit}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Unit Price</Label>
                          <p className="text-base text-card-foreground">{formatCurrency(item.unit_price, selectedInvoice.currency)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Total</Label>
                          <p className="text-base font-medium text-card-foreground">{formatCurrency(item.total_amount, selectedInvoice.currency)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">VAT Rate</Label>
                          <p className="text-base text-card-foreground">{item.vat_rate}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Import Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Import Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Import Date</Label>
                    <p className="text-base text-card-foreground">{formatDate(selectedInvoice.import_date)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Invoice ID</Label>
                    <p className="text-base font-mono text-card-foreground">{selectedInvoice.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 