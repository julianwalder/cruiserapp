'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  User, 
  Package, 
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Eye,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Building2,
  MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Utility function to format hours as HH:MM
const formatHours = (hours: number): string => {
  const isNegative = hours < 0;
  const absHours = Math.abs(hours);
  const wholeHours = Math.floor(absHours);
  const minutes = Math.round((absHours - wholeHours) * 60);
  const formatted = `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
};

interface Client {
  id: string;
  email: string;
  name: string;
  vatCode?: string;
  company?: {
    id: string;
    name: string;
    vatCode?: string;
    email?: string;
  } | null;
}

interface HourPackage {
  id: string;
  clientId: string;
  invoiceId: string;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  purchaseDate: string;
  expiryDate?: string;
  status: 'in progress' | 'expired' | 'overdrawn' | 'low hours';
  price: number;
  currency: string;
}

interface FlightLog {
  id: string;
  pilotId: string;
  totalHours: number;
  date: string;
  flightType: string;
  role?: string;
  instructorId?: string;
}

interface PPLCourseTranche {
  id: string;
  invoiceId: string;
  trancheNumber: number;
  totalTranches: number;
  hoursAllocated: number;
  totalCourseHours: number;
  amount: number;
  currency: string;
  description: string;
  purchaseDate: string;
  status: 'active' | 'completed' | 'expired';
  usedHours: number;
  remainingHours: number;
}

interface PPLCourseSummary {
  totalTranches: number;
  completedTranches: number;
  totalHoursAllocated: number;
  totalHoursUsed: number;
  totalHoursRemaining: number;
  progress: number;
  isCompleted: boolean;
}

interface PPLCourseData {
  tranches: PPLCourseTranche[];
  summary: PPLCourseSummary;
}

interface ClientHoursData {
  client: Client;
  packages: HourPackage[];
  pplCourse?: PPLCourseData;
  totalBoughtHours: number;
  totalUsedHours: number;
  totalRemainingHours: number;
  recentFlights: FlightLog[];
}

export default function ClientHours() {
  const [clients, setClients] = useState<ClientHoursData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<ClientHoursData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderPackage, setOrderPackage] = useState<{ hours: number; price: number } | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

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
        setCurrentUserEmail(userData.email);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchClientHours = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/client-hours', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch client hours data');
      }

      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load client hours data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchClientHours();
  }, []);

  // Filter clients by search term and status
  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.client.company?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'low hours' && client.totalRemainingHours > 0 && client.totalRemainingHours <= 1) ||
      (statusFilter === 'in progress' && client.totalRemainingHours > 1) ||
      (statusFilter === 'overdrawn' && client.totalRemainingHours <= 0);

    const matchesClientType = clientTypeFilter === 'all' ||
      (clientTypeFilter === 'company' && client.client.company) ||
      (clientTypeFilter === 'individual' && !client.client.company);

    return matchesSearch && matchesStatus && matchesClientType;
  });

  // Pagination logic
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Update pagination when filtered clients change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: filteredClients.length,
      pages: Math.ceil(filteredClients.length / prev.limit)
    }));
  }, [filteredClients.length]);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchTerm, statusFilter, clientTypeFilter]);

  const handleViewDetails = (client: ClientHoursData) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleOrderHours = (client: ClientHoursData) => {
    // Check if user can order for this client
    const canOrderForClient = client.client.email === 's.avadanei@yahoo.com' || 
                             client.client.email === currentUserEmail;
    
    if (!canOrderForClient) {
      toast.error('You can only order hours for yourself');
      return;
    }
    
    setSelectedClient(client);
    setIsOrderModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedClient(null);
    setOrderPackage(null);
  };

  const handlePackageSelection = (hours: number, price: number) => {
    setOrderPackage({ hours, price });
  };

  const handleConfirmOrder = async () => {
    if (!orderPackage || !selectedClient) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/client-hours/order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient.client.id,
          hours: orderPackage.hours,
          price: orderPackage.price,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to place order');
      }

      toast.success('Hour package ordered successfully!');
      handleCloseOrderModal();
      fetchClientHours(); // Refresh data
    } catch (err) {
      toast.error('Failed to place order');
    }
  };

  const getStatusBadge = (remainingHours: number) => {
    if (remainingHours <= 0) {
      return <Badge variant="destructive">Overdrawn</Badge>;
    } else if (remainingHours <= 1) {
      return <Badge variant="destructive">Low Hours</Badge>;
    } else if (remainingHours <= 5) {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Low Hours</Badge>;
    } else {
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">In Progress</Badge>;
    }
  };

  const getProgressColor = (remainingHours: number, totalHours: number) => {
    if (remainingHours <= 0) return 'bg-destructive';
    const percentage = (remainingHours / totalHours) * 100;
    if (percentage <= 25) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const availablePackages = [
    { hours: 10, price: 1500, popular: false },
    { hours: 20, price: 2800, popular: true },
    { hours: 30, price: 4000, popular: false },
    { hours: 50, price: 6000, popular: false },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>Client Hours Management</span>
                <Badge variant="outline">{filteredClients.length}</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={fetchClientHours}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Monitor client hour packages, usage, and remaining hours. Hours are calculated directly from flight logs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="search">Search Clients</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, VAT code, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    <SelectItem value="in progress">In Progress</SelectItem>
                    <SelectItem value="low hours">Low Hours (≤1h)</SelectItem>
                    <SelectItem value="overdrawn">Overdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientType">Client Type Filter</Label>
                <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="company">Companies</SelectItem>
                    <SelectItem value="individual">Individuals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="flex gap-2">
                  <Button variant="outline" className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Alert className="mb-4 border-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Stats */}
            {filteredClients.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Bought</p>
                        <p className="text-2xl font-bold">{formatHours(filteredClients.reduce((sum, client) => sum + client.totalBoughtHours, 0))}</p>
                      </div>
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Used</p>
                        <p className="text-2xl font-bold">{formatHours(filteredClients.reduce((sum, client) => sum + client.totalUsedHours, 0))}</p>
                      </div>
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Remaining</p>
                        <p className="text-2xl font-bold">{formatHours(filteredClients.reduce((sum, client) => sum + client.totalRemainingHours, 0))}</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Clients Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading client hours data...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {clients.length === 0 ? (
                  <div className="space-y-4">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-medium">No Client Hours Data</h3>
                    <p className="text-sm">
                      No client hours data found. This could be because:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>• No paid invoices with flight hours have been imported</li>
                      <li>• No flight logs have been recorded for clients</li>
                      <li>• The data is still being processed</li>
                    </ul>
                    <p className="text-sm mt-4">
                      Make sure you have imported invoices with flight hour items and recorded flight logs for clients. Hours are calculated directly from all flight log records.
                    </p>
                  </div>
                ) : 'No clients match your current filters'}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Bought Hours</TableHead>
                      <TableHead className="text-right">Used Hours</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-center">Progress</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((clientData) => (
                      <TableRow 
                        key={clientData.client.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleViewDetails(clientData)}
                      >
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{clientData.client.name}</p>
                              {clientData.client.company && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      Company Billing
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Billed by: {clientData.client.company.name}</p>
                                    <p className="text-muted-foreground text-xs">Company billing</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{clientData.client.email}</p>

                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(clientData.totalRemainingHours)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatHours(clientData.totalBoughtHours)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatHours(clientData.totalUsedHours)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={cn(
                            clientData.totalRemainingHours <= 0 ? 'text-destructive' : 
                            clientData.totalRemainingHours <= 5 ? 'text-orange-600' : 'text-green-600'
                          )}>
                            {formatHours(clientData.totalRemainingHours)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full">
                                <Progress 
                                  value={(clientData.totalUsedHours / clientData.totalBoughtHours) * 100} 
                                  className={cn(
                                    "h-2",
                                    clientData.totalRemainingHours <= 0 ? 'bg-destructive' :
                                    clientData.totalRemainingHours <= clientData.totalBoughtHours * 0.25 ? 'bg-orange-500' :
                                    'bg-green-500'
                                  )}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{Math.round((clientData.totalUsedHours / clientData.totalBoughtHours) * 100)}% used</p>
                              <p className="text-xs text-muted-foreground">
                                {formatHours(clientData.totalUsedHours)} of {formatHours(clientData.totalBoughtHours)} hours
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(clientData)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {clientData.totalRemainingHours <= 1 && (
                                <DropdownMenuItem onClick={() => handleOrderHours(clientData)}>
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Order Hours
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4">
              <div className="text-sm text-muted-foreground">
                {pagination.total > 0 ? (
                  <>
                    Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> clients
                  </>
                ) : (
                  'No clients found'
                )}
              </div>
              {pagination.pages > 1 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select 
                      value={pagination.limit.toString()} 
                      onValueChange={(value) => {
                        setPagination(prev => ({ 
                          ...prev, 
                          limit: parseInt(value), 
                          page: 1 // Reset to first page when changing limit
                        }));
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">per page</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1 || loading}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="h-8 px-3"
                      >
                        {loading ? 'Loading...' : 'Previous'}
                      </Button>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Page</span>
                        <span className="text-sm font-medium">{pagination.page}</span>
                        <span className="text-sm text-muted-foreground">of</span>
                        <span className="text-sm font-medium">{pagination.pages}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === pagination.pages || loading}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="h-8 px-3"
                      >
                        {loading ? 'Loading...' : 'Next'}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Go to:</span>
                      <Input
                        type="number"
                        min={1}
                        max={pagination.pages}
                        value={pagination.page}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= pagination.pages) {
                            setPagination(prev => ({ ...prev, page }));
                          }
                        }}
                        className="w-16 h-8 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client Details Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="!max-w-[90vw] max-h-[90vh] flex flex-col" showCloseButton={false}>
            <div className="flex-shrink-0 pb-2 flex justify-between">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Hours Details - {selectedClient?.client.name}
              </DialogTitle>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">
              {selectedClient && (
                <div className="space-y-8">
                  <div className="text-sm text-muted-foreground mb-4">
                    Comprehensive view of hour packages, usage, and billing information for {selectedClient?.client.email}
                    {selectedClient?.client.company && (
                      <span className="block mt-1 text-blue-600">
                        💼 Company billing: {selectedClient.client.company.name}
                      </span>
                    )}
                  </div>

                  {/* Client Information Header */}
                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Client Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Personal Details</h4>
                        <div className="space-y-1 text-sm">
                                                    <p><span className="font-medium">Name:</span> {selectedClient.client.name}</p>
                          <p><span className="font-medium">Email:</span> {selectedClient.client.email}</p>
                          {selectedClient.client.vatCode && (
                            <p><span className="font-medium">{selectedClient.client.vatCode.length === 13 ? 'CNP:' : 'VAT Code:'}</span> {selectedClient.client.vatCode}</p>
                          )}
                        </div>
                      </div>
                      {selectedClient.client.company && (
                        <div>
                          <h4 className="font-medium mb-2">Billing Company</h4>
                                                      <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Company:</span> {selectedClient.client.company.name}</p>
                              {selectedClient.client.company.vatCode && (
                                <p><span className="font-medium">Company {selectedClient.client.company.vatCode.length === 13 ? 'CNP:' : 'VAT:'}</span> {selectedClient.client.company.vatCode}</p>
                              )}
                              {selectedClient.client.company.email && (
                              <p><span className="font-medium">Company Email:</span> {selectedClient.client.company.email}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-card-foreground mb-2 flex items-center">
                        <Package className="h-4 w-4 mr-2" />
                        Total Bought
                      </h4>
                      <div className="text-2xl font-bold">{formatHours(selectedClient.totalBoughtHours)}</div>
                      <p className="text-xs text-muted-foreground">All time packages</p>
                    </div>

                    <div className="bg-muted rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-card-foreground mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Total Used
                      </h4>
                      <div className="text-2xl font-bold">{formatHours(selectedClient.totalUsedHours)}</div>
                      <p className="text-xs text-muted-foreground">Flown hours</p>
                    </div>

                    <div className="bg-muted rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-card-foreground mb-2 flex items-center">
                        <TrendingDown className="h-4 w-4 mr-2" />
                        Remaining
                      </h4>
                      <div className={cn(
                        "text-2xl font-bold",
                        selectedClient.totalRemainingHours <= 0 ? 'text-destructive' : 
                        selectedClient.totalRemainingHours <= 5 ? 'text-orange-600' : 'text-green-600'
                      )}>
                        {formatHours(selectedClient.totalRemainingHours)}
                      </div>
                      <p className="text-xs text-muted-foreground">Available hours</p>
                    </div>
                  </div>

                  {/* PPL Course */}
                  {selectedClient.pplCourse && (
                    <div className="bg-muted rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        PPL Course 45 Hours ({selectedClient.pplCourse.tranches.length} tranches)
                      </h3>
                      
                      {/* PPL Course Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-background rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-card-foreground mb-2">Total Allocated</h4>
                          <div className="text-2xl font-bold">{formatHours(selectedClient.pplCourse.summary.totalHoursAllocated)}</div>
                          <p className="text-xs text-muted-foreground">Course hours</p>
                        </div>
                        
                        <div className="bg-background rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-card-foreground mb-2">Used</h4>
                          <div className="text-2xl font-bold">{formatHours(selectedClient.pplCourse.summary.totalHoursUsed)}</div>
                          <p className="text-xs text-muted-foreground">Flown hours</p>
                        </div>
                        
                        <div className="bg-background rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-card-foreground mb-2">Remaining</h4>
                          <div className={cn(
                            "text-2xl font-bold",
                            selectedClient.pplCourse.summary.totalHoursRemaining <= 0 ? 'text-destructive' : 
                            selectedClient.pplCourse.summary.totalHoursRemaining <= 5 ? 'text-orange-600' : 'text-green-600'
                          )}>
                            {formatHours(selectedClient.pplCourse.summary.totalHoursRemaining)}
                          </div>
                          <p className="text-xs text-muted-foreground">Available hours</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Course Progress</span>
                          <span>{Math.round(selectedClient.pplCourse.summary.progress)}%</span>
                        </div>
                        <Progress 
                          value={selectedClient.pplCourse.summary.progress}
                          className={cn(
                            selectedClient.pplCourse.summary.isCompleted ? 'bg-green-500' :
                            selectedClient.pplCourse.summary.progress >= 80 ? 'bg-orange-500' :
                            'bg-blue-500'
                          )}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{selectedClient.pplCourse.summary.completedTranches} of {selectedClient.pplCourse.summary.totalTranches} tranches completed</span>
                          <span>{selectedClient.pplCourse.summary.isCompleted ? 'Course Completed' : 'In Progress'}</span>
                        </div>
                      </div>

                      {/* PPL Course Tranches */}
                      <div className="space-y-4">
                        {selectedClient.pplCourse.tranches.map((tranche) => (
                          <div key={tranche.id} className="border rounded-lg p-4 bg-background">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-medium text-lg">
                                  Tranche {tranche.trancheNumber} of {tranche.totalTranches}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Purchased: {formatDate(tranche.purchaseDate)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Invoice: {tranche.invoiceId} • Price: {formatCurrency(tranche.amount, tranche.currency)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {tranche.description}
                                </p>
                              </div>
                              <Badge className={
                                tranche.status === 'completed' ? 'bg-green-500 hover:bg-green-600 text-white' :
                                tranche.status === 'active' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                                'bg-orange-500 hover:bg-orange-600 text-white'
                              }>
                                {tranche.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span>Allocated: {formatHours(tranche.hoursAllocated)}</span>
                                <span>Used: {formatHours(tranche.usedHours)}</span>
                                <span>Remaining: {formatHours(tranche.remainingHours)}</span>
                              </div>
                              <Progress 
                                value={(tranche.usedHours / tranche.hoursAllocated) * 100}
                                className={cn(
                                  tranche.remainingHours <= 0 ? 'bg-green-500' :
                                  tranche.remainingHours <= tranche.hoursAllocated * 0.25 ? 'bg-orange-500' :
                                  'bg-blue-500'
                                )}
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Rate: {formatCurrency(tranche.amount / tranche.hoursAllocated, tranche.currency)}/hour</span>
                                <span>{Math.round((tranche.remainingHours / tranche.hoursAllocated) * 100)}% remaining</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hour Packages */}
                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Hour Packages ({selectedClient.packages.length})
                    </h3>
                    {selectedClient.packages.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No hour packages found</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedClient.packages.map((pkg) => (
                          <div key={pkg.id} className="border rounded-lg p-4 bg-background">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-medium text-lg">{formatHours(pkg.totalHours)} Package</p>
                                <p className="text-sm text-muted-foreground">
                                  Purchased: {formatDate(pkg.purchaseDate)}
                                  {pkg.expiryDate && ` • Expires: ${formatDate(pkg.expiryDate)}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Invoice: {pkg.invoiceId} • Price: {formatCurrency(pkg.price, pkg.currency)}
                                </p>
                              </div>
                              <Badge className={
                                pkg.status === 'in progress' ? 'bg-green-500 hover:bg-green-600 text-white' :
                                pkg.status === 'low hours' ? 'bg-destructive text-white' :
                                pkg.status === 'overdrawn' ? 'bg-destructive text-white' :
                                'bg-orange-500 hover:bg-orange-600 text-white'
                              }>
                                {pkg.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span>Used: {formatHours(pkg.usedHours)}</span>
                                <span>Remaining: {formatHours(pkg.remainingHours)}</span>
                              </div>
                              <Progress 
                                value={(pkg.usedHours / pkg.totalHours) * 100}
                                className={cn(
                                  pkg.remainingHours <= 0 ? 'bg-destructive' :
                                  pkg.remainingHours <= pkg.totalHours * 0.25 ? 'bg-orange-500' :
                                  'bg-green-500'
                                )}
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Rate: {formatCurrency(pkg.price / pkg.totalHours, pkg.currency)}/hour</span>
                                <span>{Math.round((pkg.remainingHours / pkg.totalHours) * 100)}% remaining</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Flights */}
                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Recent Flights ({selectedClient.recentFlights.length})
                    </h3>
                    {selectedClient.recentFlights.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No recent flights found</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedClient.recentFlights.slice(0, 10).map((flight) => (
                          <div key={flight.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{formatDate(flight.date)}</p>
                                {flight.role && (
                                  <Badge variant="outline" className="text-xs">
                                    {flight.role}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {flight.flightType}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">{formatHours(flight.totalHours)}</span>
                              <p className="text-xs text-muted-foreground">hours</p>
                            </div>
                          </div>
                        ))}
                        {selectedClient.recentFlights.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center">
                            Showing 10 of {selectedClient.recentFlights.length} flights
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Order Hours Modal */}
        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Order Hour Package</DialogTitle>
              <DialogDescription>
                Select a new hour package for {selectedClient?.client.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {availablePackages.map((pkg) => (
                  <div
                    key={pkg.hours}
                    className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-colors",
                      orderPackage?.hours === pkg.hours 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-primary/50"
                    )}
                    onClick={() => handlePackageSelection(pkg.hours, pkg.price)}
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold">{formatHours(pkg.hours)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(pkg.price, 'RON')}
                      </div>
                      {pkg.popular && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseOrderModal}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmOrder}
                disabled={!orderPackage}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Place Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
} 