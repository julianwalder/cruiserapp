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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Modal } from './ui/Modal';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
  Unlink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ImportedInvoice } from '@/lib/invoice-import-service';

interface ImportedXMLInvoicesProps {
  className?: string;
  onRefresh?: () => void;
}

type SortField = 'smartbill_id' | 'issue_date' | 'client.name' | 'status' | 'total_amount' | 'total_hours';
type SortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ImportedInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Extract all user roles
        let roles: string[] = [];
        if (userData.roles && Array.isArray(userData.roles)) {
          roles = userData.roles;
        } else if (userData.userRoles && Array.isArray(userData.userRoles)) {
          roles = userData.userRoles.map((ur: any) => ur.roles?.name).filter(Boolean);
        }
        
        setCurrentUserRoles(roles);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

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
    fetchCurrentUser();
    fetchInvoices();
  }, []);

  // Helper function to check if user is superadmin
  const isSuperAdmin = () => {
    return currentUserRoles.includes('SUPER_ADMIN');
  };

  // Filter invoices by search term
  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.smartbill_id.toLowerCase().includes(searchLower) ||
      invoice.client.name.toLowerCase().includes(searchLower) ||
      invoice.client.email?.toLowerCase().includes(searchLower) ||
      // Search by user name (first name, last name, or full name)
      (invoice.client.user?.firstName?.toLowerCase().includes(searchLower) ||
       invoice.client.user?.lastName?.toLowerCase().includes(searchLower) ||
       `${invoice.client.user?.firstName || ''} ${invoice.client.user?.lastName || ''}`.toLowerCase().includes(searchLower)) ||
      // Search by company name
      invoice.client.company?.name?.toLowerCase().includes(searchLower) ||
      // Search by user email
      invoice.client.user?.email?.toLowerCase().includes(searchLower) ||
      // Search by company email
      invoice.client.company?.email?.toLowerCase().includes(searchLower) ||
      invoice.items.some(item => item.name.toLowerCase().includes(searchLower))
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
      case 'total_amount':
        aValue = a.total_amount;
        bValue = b.total_amount;
        break;
      case 'total_hours':
        aValue = calculateTotalHours(a);
        bValue = calculateTotalHours(b);
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
    setIsEditing(false);
    setEditingInvoice(null);
  };

  const handleEditInvoice = () => {
    if (selectedInvoice) {
      // Check if invoice has client data, if not create a placeholder
      let invoiceToEdit = JSON.parse(JSON.stringify(selectedInvoice));
      
      // If no client data exists, create a placeholder
      if (!invoiceToEdit.client) {
        invoiceToEdit.client = {
          name: '',
          email: '',
          phone: '',
          vat_code: '',
          address: '',
          city: '',
          country: '',
          user_id: null
        };
      }
      
      setEditingInvoice(invoiceToEdit);
      setIsEditing(true);
      fetchUsers(); // Fetch users for the dropdown
    }
  };

  const handleEditInvoiceFromDropdown = (invoice: ImportedInvoice) => {
    setSelectedInvoice(invoice);
    setEditingInvoice(JSON.parse(JSON.stringify(invoice))); // Deep copy
    setIsEditing(true);
    setIsModalOpen(true);
    fetchUsers(); // Fetch users for the dropdown
  };

  const handleSaveInvoice = async () => {
    if (!editingInvoice) return;

    setSaving(true);
    try {
      // Validate required fields before sending
      if (!editingInvoice.client?.name && !editingInvoice.client?.email) {
        toast.error('Client information is required', {
          description: 'Please enter a client name or email before saving.',
          duration: 5000,
        });
        setSaving(false);
        return;
      }

      const token = localStorage.getItem('token');
      

      
      const response = await fetch(`/api/smartbill/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingInvoice),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || 'Failed to update invoice');
      }

      const result = await response.json();

      // Update the local state
      setSelectedInvoice(editingInvoice);
      setInvoices(prev => prev.map(inv => 
        inv.id === editingInvoice.id ? editingInvoice : inv
      ));
      
      setIsEditing(false);
      setEditingInvoice(null);
      
      // Show success message
      toast.success('Invoice updated successfully!', {
        description: `Invoice ${editingInvoice.smartbill_id} has been updated.`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      // Show error message
      toast.error('Failed to update invoice', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingInvoice(null);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('token');
      // Fetch all users without pagination
      const response = await fetch('/api/users?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (!editingInvoice) return;
    
    setEditingInvoice(prev => {
      if (!prev) return prev;
      
      if (field.startsWith('client.')) {
        const clientField = field.replace('client.', '');
        return {
          ...prev,
          client: {
            ...prev.client,
            [clientField]: value
          }
        };
      } else if (field.startsWith('items.')) {
        const [itemIndex, itemField] = field.replace('items.', '').split('.');
        const index = parseInt(itemIndex);
        return {
          ...prev,
          items: prev.items.map((item, i) => 
            i === index ? { ...item, [itemField]: value } : item
          )
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
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
      ...sortedInvoices.map(invoice => [
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
              <Badge variant="outline">{sortedInvoices.length}</Badge>
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
                  placeholder="Search by invoice number, client name, user name, or company..."
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
          ) : sortedInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {invoices.length === 0 ? 'No imported invoices yet' : 'No invoices match your filters'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('smartbill_id')}
                    >
                      <div className="flex items-center gap-1">
                        Invoice #
                        {getSortIcon('smartbill_id')}
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
                      className="w-[350px] cursor-pointer hover:bg-muted/50 transition-colors"
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
                        Total lei
                        {getSortIcon('total_amount')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px] text-center">Links</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider>
                    {sortedInvoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      <TableCell className="font-medium">
                        <span className="truncate block" title={invoice.smartbill_id}>{invoice.smartbill_id}</span>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                      <TableCell>
                        <div className="max-w-[320px]">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate" title={invoice.client.user ? `${invoice.client.user.firstName} ${invoice.client.user.lastName}` : invoice.client.name}>
                              {invoice.client.user ? `${invoice.client.user.firstName} ${invoice.client.user.lastName}` : invoice.client.name}
                            </p>
                            {invoice.client.company && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs">
                                    <Building2 className="h-3 w-3 mr-1" />
                                    Billed as Company
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Billed by: {invoice.client.company.name}</p>
                                  <p className="text-muted-foreground text-xs">Company billing</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {invoice.is_ppl && (
                              <Badge variant="default" className="text-xs bg-blue-600">
                                <Package className="h-3 w-3 mr-1" />
                                PPL
                              </Badge>
                            )}
                          </div>

                          {invoice.client.user?.email && (
                            <p className="text-sm text-muted-foreground truncate" title={invoice.client.user.email}>{invoice.client.user.email}</p>
                          )}
                          {!invoice.client.user?.email && invoice.client.email && (
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
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                            {isSuperAdmin() && (
                              <DropdownMenuItem onClick={() => handleEditInvoiceFromDropdown(invoice)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Edit Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          {sortedInvoices.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Showing {sortedInvoices.length} of {invoices.length} imported invoices
                </span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">
                    Total Hours: {(() => {
                          const totalHours = sortedInvoices.reduce((sum, invoice) => sum + calculateTotalHours(invoice), 0);
    return totalHours > 0 ? formatHours(totalHours) : '00:00';
                    })()}
                  </span>
                  <span className="text-sm font-medium">
                    Total: {formatCurrency(
                      sortedInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0),
                      sortedInvoices[0]?.currency || 'RON'
                    )}
                  </span>
                  <span className="text-sm font-medium">
                    Linked Users: {new Set(sortedInvoices.filter(invoice => invoice.client.user_id).map(invoice => invoice.client.user_id)).size}
                  </span>
                  <span className="text-sm font-medium">
                    Linked Companies: {new Set(sortedInvoices.filter(invoice => invoice.client.company_id).map(invoice => invoice.client.company_id)).size}
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
        onClose={handleCloseModal}
        title={`Invoice Details - ${selectedInvoice?.smartbill_id}`}
        headerActions={
          isSuperAdmin() ? (
            isEditing ? (
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveInvoice}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={handleEditInvoice}>
                <FileText className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )
          ) : undefined
        }
      >
          
          {(selectedInvoice || editingInvoice) && (
            <div key={selectedInvoice?.id || editingInvoice?.id} className="space-y-8">
              {/* Invoice Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Invoice Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
                    {isEditing && editingInvoice ? (
                      <Input
                        value={editingInvoice.smartbill_id}
                        onChange={(e) => handleFieldChange('smartbill_id', e.target.value)}
                      />
                    ) : (
                      <p className="text-base font-medium text-card-foreground">{selectedInvoice?.smartbill_id}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Series</Label>
                    {isEditing && editingInvoice ? (
                      <Input
                        value={editingInvoice.series || ''}
                        onChange={(e) => handleFieldChange('series', e.target.value)}
                      />
                    ) : (
                      <p className="text-base text-card-foreground">{selectedInvoice?.series}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                    {isEditing && editingInvoice ? (
                      <Input
                        type="date"
                        value={editingInvoice.issue_date}
                        onChange={(e) => handleFieldChange('issue_date', e.target.value)}
                      />
                    ) : (
                      <p className="text-base text-card-foreground">{formatDate(selectedInvoice?.issue_date || '')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    {isEditing && editingInvoice ? (
                      <Input
                        type="date"
                        value={editingInvoice.due_date}
                        onChange={(e) => handleFieldChange('due_date', e.target.value)}
                      />
                    ) : (
                      <p className="text-base text-card-foreground">{formatDate(selectedInvoice?.due_date || '')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    {isEditing && editingInvoice ? (
                      <Select value={editingInvoice.status} onValueChange={(value) => handleFieldChange('status', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="imported">Imported</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">{getStatusBadge(selectedInvoice?.status || '')}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                    {isEditing && editingInvoice ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingInvoice.total_amount}
                        onChange={(e) => handleFieldChange('total_amount', parseFloat(e.target.value) || 0)}
                      />
                    ) : (
                    <p className="text-base font-medium text-green-600">
                        {formatCurrency(selectedInvoice?.total_amount || 0, selectedInvoice?.currency || 'RON')}
                    </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">VAT Amount</Label>
                    {isEditing && editingInvoice ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingInvoice.vat_amount}
                        onChange={(e) => handleFieldChange('vat_amount', parseFloat(e.target.value) || 0)}
                      />
                    ) : (
                      <p className="text-base text-card-foreground">{formatCurrency(selectedInvoice?.vat_amount || 0, selectedInvoice?.currency || 'RON')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Total Hours</Label>
                    <p className="text-base font-medium text-card-foreground">{formatHours(calculateTotalHours(selectedInvoice || editingInvoice || {} as ImportedInvoice))}</p>
                  </div>
                  {(selectedInvoice?.is_ppl || editingInvoice?.is_ppl) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">PPL Course</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-600">
                          <Package className="h-3 w-3 mr-1" />
                          PPL Course
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {(selectedInvoice?.ppl_hours_paid || editingInvoice?.ppl_hours_paid || 0)} hours paid of 45 total
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
                    {isEditing && editingInvoice ? (
                      <Input
                        value={editingInvoice.client.name}
                        onChange={(e) => handleFieldChange('client.name', e.target.value)}
                      />
                    ) : (
                      <p className="text-base font-medium text-card-foreground">{selectedInvoice?.client.name}</p>
                    )}
                  </div>

                  {/* User Link Selection - Only in Edit Mode */}
                  {isEditing && editingInvoice && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Link to User
                        {!editingInvoice.client?.name && !editingInvoice.client?.email && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            No Client Data
                          </Badge>
                        )}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            disabled={loadingUsers}
                          >
                            {editingInvoice.client.user_id && editingInvoice.client.user_id !== 'none'
                              ? users.find((user) => user.id === editingInvoice.client.user_id)?.firstName + ' ' + 
                                users.find((user) => user.id === editingInvoice.client.user_id)?.lastName + 
                                ' (' + users.find((user) => user.id === editingInvoice.client.user_id)?.email + ')'
                              : "Select a user to link..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search users..." />
                            <CommandList>
                              <CommandEmpty>No user found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    handleFieldChange('client.user_id', null);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      !editingInvoice.client.user_id || editingInvoice.client.user_id === 'none' ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  No user linked
                                </CommandItem>
                                {users.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.firstName || ''} ${user.lastName || ''} ${user.email || ''}`.toLowerCase()}
                                    onSelect={() => {
                                      handleFieldChange('client.user_id', user.id);
                                      handleFieldChange('client.email', user.email);
                                      handleFieldChange('client.name', `${user.firstName || ''} ${user.lastName || ''}`.trim());
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        editingInvoice.client.user_id === user.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {user.firstName || ''} {user.lastName || ''} ({user.email || ''})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {loadingUsers && (
                        <p className="text-xs text-muted-foreground">Loading users...</p>
                      )}
                    </div>
                  )}

                  {(selectedInvoice?.client.vat_code || editingInvoice?.client.vat_code) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {(selectedInvoice?.client.vat_code || editingInvoice?.client.vat_code)?.length === 13 ? 'CNP' : 'VAT Code'}
                      </Label>
                      {isEditing && editingInvoice ? (
                        <Input
                          value={editingInvoice.client.vat_code || ''}
                          onChange={(e) => handleFieldChange('client.vat_code', e.target.value)}
                        />
                      ) : (
                        <p className="text-base text-card-foreground">{selectedInvoice?.client.vat_code}</p>
                      )}
                    </div>
                  )}
                  {(selectedInvoice?.client.email || editingInvoice?.client.email) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      {isEditing && editingInvoice ? (
                        <Input
                          value={editingInvoice.client.email || ''}
                          onChange={(e) => handleFieldChange('client.email', e.target.value)}
                        />
                      ) : (
                        <p className="text-base text-card-foreground">{selectedInvoice?.client.email}</p>
                      )}
                    </div>
                  )}
                  {(selectedInvoice?.client.phone || editingInvoice?.client.phone) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      {isEditing && editingInvoice ? (
                        <Input
                          value={editingInvoice.client.phone || ''}
                          onChange={(e) => handleFieldChange('client.phone', e.target.value)}
                        />
                      ) : (
                        <p className="text-base text-card-foreground">{selectedInvoice?.client.phone}</p>
                      )}
                    </div>
                  )}
                  {(selectedInvoice?.client.address || editingInvoice?.client.address) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                      {isEditing && editingInvoice ? (
                        <Input
                          value={editingInvoice.client.address || ''}
                          onChange={(e) => handleFieldChange('client.address', e.target.value)}
                        />
                      ) : (
                        <p className="text-base text-card-foreground">{selectedInvoice?.client.address}</p>
                      )}
                      {(selectedInvoice?.client.city || editingInvoice?.client.city) && (
                        <p className="text-base text-card-foreground">{selectedInvoice?.client.city || editingInvoice?.client.city}</p>
                      )}
                      {(selectedInvoice?.client.country || editingInvoice?.client.country) && (
                        <p className="text-base text-card-foreground">{selectedInvoice?.client.country || editingInvoice?.client.country}</p>
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
                        {(selectedInvoice?.client.user_id || editingInvoice?.client.user_id) ? (
                          <>
                            <Badge variant="default">
                              <User className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                            <span className="text-sm text-muted-foreground">User ID: {selectedInvoice?.client.user_id || editingInvoice?.client.user_id}</span>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline">
                              <Unlink className="h-3 w-3 mr-1" />
                              Not Linked
                            </Badge>
                            <span className="text-sm text-muted-foreground">No user found with email: {(selectedInvoice?.client.email || editingInvoice?.client.email) || 'No email provided'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Company Link</Label>
                      <div className="flex items-center gap-2">
                        {(selectedInvoice?.client.company_id || editingInvoice?.client.company_id) ? (
                          <>
                            <Badge variant="default">
                              <Building2 className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                            <span className="text-sm text-muted-foreground">Company ID: {selectedInvoice?.client.company_id || editingInvoice?.client.company_id}</span>
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
                  {(selectedInvoice || editingInvoice)?.items?.map((item, index) => (
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
                          <p className="text-base text-card-foreground">{formatCurrency(item.unit_price, (selectedInvoice || editingInvoice)?.currency || 'RON')}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Total</Label>
                          <p className="text-base font-medium text-card-foreground">{formatCurrency(item.total_amount, (selectedInvoice || editingInvoice)?.currency || 'RON')}</p>
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
                    <p className="text-base text-card-foreground">{formatDate((selectedInvoice || editingInvoice)?.import_date || '')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Invoice ID</Label>
                    <p className="text-base font-mono text-card-foreground">{(selectedInvoice || editingInvoice)?.id}</p>
                  </div>
                </div>
              </div>


            </div>
          )}
      </Modal>
    </div>
  );
} 