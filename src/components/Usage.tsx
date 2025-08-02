'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  MoreVertical,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import PilotOverview from './PilotOverview';
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

export default function Usage() {
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
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [viewMode, setViewMode] = useState<'personal' | 'company'>('company');

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
        console.log('🔍 User data from /api/auth/me:', userData);
        setCurrentUserEmail(userData.email);
        
        // Extract all user roles
        let roles: string[] = [];
        if (userData.roles && Array.isArray(userData.roles)) {
          roles = userData.roles;
        } else if (userData.userRoles && Array.isArray(userData.userRoles)) {
          roles = userData.userRoles.map((ur: any) => ur.roles?.name).filter(Boolean);
        }
        
        console.log('🔍 Extracted user roles:', roles);
        setCurrentUserRoles(roles);
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
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      setClients(data.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchClientHours();
  }, []);

  // Helper functions for role-based display
  const isPilotOrStudent = () => {
    // Only PILOT and STUDENT should have the simplified view
    // BASE_MANAGER, ADMIN, SUPER_ADMIN should have full admin functionality
    const hasAdminRole = currentUserRoles.some(role => 
      role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'BASE_MANAGER' || role === 'INSTRUCTOR'
    );
    const isPilotStudent = !hasAdminRole && currentUserRoles.some(role => role === 'PILOT' || role === 'STUDENT');
    console.log('🔍 Role check:', { currentUserRoles, hasAdminRole, isPilotStudent });
    return isPilotStudent;
  };

  const isAdminOrManager = () => {
    return currentUserRoles.some(role => 
      role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'BASE_MANAGER' || role === 'INSTRUCTOR'
    );
  };

  // Filter clients by search term and status
  const filteredClients = clients.filter(client => {
    // For personal mode (admin/manager users), only show current user's data
    if (isAdminOrManager() && viewMode === 'personal') {
      return currentUserEmail && client.client.email === currentUserEmail;
    }
    
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

  const handleExportReport = (clientData: ClientHoursData) => {
    // Create CSV content for the client report
    const headers = [
      'Client Name',
      'Email',
      'Total Bought Hours',
      'Total Used Hours',
      'Total Remaining Hours',
      'Status',
      'Package Count',
      'Recent Flights Count'
    ];

    const csvContent = [
      headers.join(','),
      [
        clientData.client.name,
        clientData.client.email,
        formatHours(clientData.totalBoughtHours),
        formatHours(clientData.totalUsedHours),
        formatHours(clientData.totalRemainingHours),
        clientData.totalRemainingHours <= 0 ? 'Overdrawn' : 
        clientData.totalRemainingHours <= 1 ? 'Low Hours' : 'In Progress',
        clientData.packages.length,
        clientData.recentFlights.length
      ].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-report-${clientData.client.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully!', {
      description: `Usage report for ${clientData.client.name} has been downloaded.`,
      duration: 3000,
    });
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
              </div>
              <div className="flex items-center gap-4">
                {/* View Mode Toggle for Admin/Manager with Pilot role */}
                {isAdminOrManager() && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <h3 className="text-sm font-medium text-card-foreground">
                        {viewMode === 'personal' ? 'Personal Usage' : 'Company Usage'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {viewMode === 'personal' 
                          ? 'Your personal hour packages and usage' 
                          : 'Manage all clients\' hour packages and usage'
                        }
                      </p>
                    </div>
                    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'personal' | 'company')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                        <TabsTrigger value="company" className="text-xs">Company</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}
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
          </CardHeader>
          <CardContent>
            {/* Filters - Hidden for Pilot/Student view and Personal mode */}
            {!isPilotOrStudent() && viewMode === 'company' && (
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
            )}

            {/* Error Message */}
            {error && (
              <Alert className="mb-4 border-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Stats - Hidden for Pilot/Student view and Personal mode */}
            {filteredClients.length > 0 && !isPilotOrStudent() && viewMode === 'company' && (
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
                <span className="ml-2">Loading usage data...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {clients.length === 0 ? (
                  <div className="space-y-4">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-medium">No Usage Data</h3>
                    <p className="text-sm">
                      No usage data found. This could be because:
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
            ) : (isPilotOrStudent() || viewMode === 'company') && (
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
                        className={cn(
                          (!isPilotOrStudent() && viewMode === 'company') && "cursor-pointer hover:bg-muted/50 transition-colors"
                        )}
                        onClick={(!isPilotOrStudent() && viewMode === 'company') ? () => handleViewDetails(clientData) : undefined}
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
                          <div className="flex items-center gap-2">
                            {getStatusBadge(clientData.totalRemainingHours)}
                            {clientData.packages.length > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    FIFO
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Multiple packages - FIFO method applied</p>
                                  <p className="text-xs text-muted-foreground">Oldest packages consumed first</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
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
                              {(!isPilotOrStudent() && viewMode === 'company') && (
                                <>
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
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleExportReport(clientData)}>
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Export Report
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

            {/* Personal View for Admin/Manager with Pilot role */}
            {isAdminOrManager() && viewMode === 'personal' && (
              <div className="space-y-6">
                {/* Personal usage table - show only current user's data */}
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.length > 0 ? (
                        filteredClients.map((clientData) => (
                          <TableRow key={clientData.client.id}>
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
                              <div className="flex items-center gap-2">
                                {getStatusBadge(clientData.totalRemainingHours)}
                                {clientData.packages.length > 1 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        FIFO
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Multiple packages - FIFO method applied</p>
                                      <p className="text-xs text-muted-foreground">Oldest packages consumed first</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {clientData.totalBoughtHours > 0 ? formatHours(clientData.totalBoughtHours) : '0:00'}
                            </TableCell>
                            <TableCell className="text-right">
                              {clientData.totalUsedHours > 0 ? formatHours(clientData.totalUsedHours) : '0:00'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={cn(
                                clientData.totalRemainingHours <= 0 ? 'text-destructive' : 
                                clientData.totalRemainingHours <= 5 ? 'text-orange-600' : 'text-green-600'
                              )}>
                                {clientData.totalRemainingHours > 0 ? formatHours(clientData.totalRemainingHours) : '0:00'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-full">
                                    <Progress 
                                      value={clientData.totalBoughtHours > 0 ? (clientData.totalUsedHours / clientData.totalBoughtHours) * 100 : 0} 
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
                                  <p>{clientData.totalBoughtHours > 0 ? Math.round((clientData.totalUsedHours / clientData.totalBoughtHours) * 100) : 0}% used</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatHours(clientData.totalUsedHours)} of {formatHours(clientData.totalBoughtHours)} hours
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="space-y-4">
                              <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                              <h3 className="text-lg font-medium">No Personal Usage Data</h3>
                              <p className="text-sm text-muted-foreground">
                                You don't have any hour packages yet.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Detailed view for personal data */}
                {filteredClients.length > 0 && (
                  <div className="mt-8 space-y-6">
                    {filteredClients.map((clientData) => (
                      <div key={clientData.client.id} className="space-y-6">
                        {/* PPL Course */}
                        {clientData.pplCourse && (
                          <div className="bg-background rounded-lg p-6 border">
                            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
                              <Package className="h-4 w-4 mr-2" />
                              PPL Course 45 Hours ({clientData.pplCourse.tranches.length} tranches)
                            </h4>
                            
                            {/* PPL Course Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="rounded-lg p-4 border">
                                <h5 className="text-lg font-semibold text-card-foreground mb-2">Total Allocated</h5>
                                <div className="text-2xl font-bold">{formatHours(clientData.pplCourse.summary.totalHoursAllocated)}</div>
                                <p className="text-xs text-muted-foreground">Course hours</p>
                              </div>
                              
                              <div className="rounded-lg p-4 border">
                                <h5 className="text-lg font-semibold text-card-foreground mb-2">Used</h5>
                                <div className="text-2xl font-bold">{formatHours(clientData.pplCourse.summary.totalHoursUsed)}</div>
                                <p className="text-xs text-muted-foreground">Flown hours</p>
                              </div>
                              
                              <div className="rounded-lg p-4 border">
                                <h5 className="text-lg font-semibold text-card-foreground mb-2">Remaining</h5>
                                <div className={cn(
                                  "text-2xl font-bold",
                                  clientData.pplCourse.summary.totalHoursRemaining <= 0 ? 'text-destructive' : 
                                  clientData.pplCourse.summary.totalHoursRemaining <= 5 ? 'text-orange-600' : 'text-green-600'
                                )}>
                                  {formatHours(clientData.pplCourse.summary.totalHoursRemaining)}
                                </div>
                                <p className="text-xs text-muted-foreground">Available hours</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hour Packages */}
                        <div className="bg-background rounded-lg p-6 border">
                          <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
                            <Package className="h-4 w-4 mr-2" />
                            Hour Packages ({clientData.packages.length}) - FIFO Method
                          </h4>
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              <strong>FIFO Method:</strong> Hours are consumed from the oldest packages first. 
                              This ensures fair usage tracking and proper package expiration management.
                            </p>
                          </div>
                          {clientData.packages.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No hour packages found</p>
                          ) : (
                            <div className="space-y-4">
                              {clientData.packages
                                .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                                .map((pkg, index) => (
                                  <div key={pkg.id} className={cn(
                                    "border-2 rounded-lg p-4",
                                    pkg.remainingHours <= 0 && "opacity-60",
                                    pkg.remainingHours <= 0 ? "border-gray-800" :
                                    pkg.remainingHours <= pkg.totalHours * 0.25 ? "border-orange-500" :
                                    "border-green-500"
                                  )}>
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="font-medium text-lg">{formatHours(pkg.totalHours)} Package</p>
                                          {index === 0 && pkg.usedHours > 0 && (
                                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                              <Clock className="h-3 w-3 mr-1" />
                                              First Used
                                            </Badge>
                                          )}
                                          {pkg.remainingHours <= 0 && (
                                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                              Consumed
                                            </Badge>
                                          )}
                                        </div>
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
                                        pkg.status === 'low hours' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                                        pkg.status === 'overdrawn' ? 'bg-destructive text-white' :
                                        'bg-gray-500 hover:bg-gray-600 text-white'
                                      }>
                                        {pkg.status}
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="text-center">
                                          <p className="font-medium text-green-600 dark:text-green-400">Used</p>
                                          <p className="text-lg font-bold">{formatHours(pkg.usedHours)}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="font-medium text-blue-600 dark:text-blue-400">Remaining</p>
                                          <p className="text-lg font-bold">{formatHours(pkg.remainingHours)}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="font-medium text-gray-600 dark:text-gray-400">Total</p>
                                          <p className="text-lg font-bold">{formatHours(pkg.totalHours)}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>Usage Progress</span>
                                          <span>{Math.round((pkg.usedHours / pkg.totalHours) * 100)}%</span>
                                        </div>
                                        <Progress 
                                          value={(pkg.usedHours / pkg.totalHours) * 100}
                                          className={cn(
                                            pkg.remainingHours <= 0 ? 'bg-green-500' :
                                            pkg.remainingHours <= pkg.totalHours * 0.25 ? 'bg-orange-500' :
                                            'bg-green-500'
                                          )}
                                        />
                                      </div>
                                      
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
                        <div className="bg-background rounded-lg p-6 border">
                          <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Recent Flights ({clientData.recentFlights.length})
                          </h4>
                          {clientData.recentFlights.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No recent flights found</p>
                          ) : (
                            <div className="space-y-3">
                              {clientData.recentFlights.slice(0, 10).map((flight) => (
                                <div key={flight.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                                    <p className="text-sm font-medium">{formatHours(flight.totalHours)}</p>
                                    <p className="text-xs text-muted-foreground">hours</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4">
              {(!isPilotOrStudent() && viewMode === 'company') && (
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
              )}
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

        {/* Individual Cards for Pilot/Student View */}
        {isPilotOrStudent() && filteredClients.length > 0 && (
          <div className="mt-8 space-y-6">
            {filteredClients.map((clientData) => (
              <div key={clientData.client.id} className="space-y-6">
                {/* PPL Course */}
                {clientData.pplCourse && (
                  <div className="bg-background rounded-lg p-6 border">
                    <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      PPL Course 45 Hours ({clientData.pplCourse.tranches.length} tranches)
                    </h4>
                    
                                         {/* PPL Course Summary */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                       <div className="rounded-lg p-4 border">
                         <h5 className="text-lg font-semibold text-card-foreground mb-2">Total Allocated</h5>
                         <div className="text-2xl font-bold">{formatHours(clientData.pplCourse.summary.totalHoursAllocated)}</div>
                         <p className="text-xs text-muted-foreground">Course hours</p>
                       </div>
                       
                       <div className="rounded-lg p-4 border">
                         <h5 className="text-lg font-semibold text-card-foreground mb-2">Used</h5>
                         <div className="text-2xl font-bold">{formatHours(clientData.pplCourse.summary.totalHoursUsed)}</div>
                         <p className="text-xs text-muted-foreground">Flown hours</p>
                       </div>
                       
                       <div className="rounded-lg p-4 border">
                         <h5 className="text-lg font-semibold text-card-foreground mb-2">Remaining</h5>
                         <div className={cn(
                           "text-2xl font-bold",
                           clientData.pplCourse.summary.totalHoursRemaining <= 0 ? 'text-destructive' : 
                           clientData.pplCourse.summary.totalHoursRemaining <= 5 ? 'text-orange-600' : 'text-green-600'
                         )}>
                           {formatHours(clientData.pplCourse.summary.totalHoursRemaining)}
                         </div>
                         <p className="text-xs text-muted-foreground">Available hours</p>
                       </div>
                     </div>
                  </div>
                )}

                {/* Hour Packages */}
                <div className="bg-background rounded-lg p-6 border">
                  <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    Hour Packages ({clientData.packages.length}) - FIFO Method
                  </h4>
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>FIFO Method:</strong> Hours are consumed from the oldest packages first. 
                      This ensures fair usage tracking and proper package expiration management.
                    </p>
                  </div>
                  {clientData.packages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hour packages found</p>
                  ) : (
                    <div className="space-y-4">
                      {clientData.packages
                        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                        .map((pkg, index) => (
                                                 <div key={pkg.id} className={cn(
                           "border-2 rounded-lg p-4",
                           pkg.remainingHours <= 0 && "opacity-60",
                           pkg.remainingHours <= 0 ? "border-gray-800" :
                           pkg.remainingHours <= pkg.totalHours * 0.25 ? "border-orange-500" :
                           "border-green-500"
                         )}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-lg">{formatHours(pkg.totalHours)} Package</p>
                                {index === 0 && pkg.usedHours > 0 && (
                                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    First Used
                                  </Badge>
                                )}
                                {pkg.remainingHours <= 0 && (
                                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                    Consumed
                                  </Badge>
                                )}
                              </div>
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
                              pkg.status === 'low hours' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                              pkg.status === 'overdrawn' ? 'bg-destructive text-white' :
                              'bg-gray-500 hover:bg-gray-600 text-white'
                            }>
                              {pkg.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center">
                                <p className="font-medium text-green-600 dark:text-green-400">Used</p>
                                <p className="text-lg font-bold">{formatHours(pkg.usedHours)}</p>
                              </div>
                              <div className="text-center">
                                <p className="font-medium text-blue-600 dark:text-blue-400">Remaining</p>
                                <p className="text-lg font-bold">{formatHours(pkg.remainingHours)}</p>
                              </div>
                              <div className="text-center">
                                <p className="font-medium text-gray-600 dark:text-gray-400">Total</p>
                                <p className="text-lg font-bold">{formatHours(pkg.totalHours)}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Usage Progress</span>
                                <span>{Math.round((pkg.usedHours / pkg.totalHours) * 100)}%</span>
                              </div>
                              <Progress 
                                value={(pkg.usedHours / pkg.totalHours) * 100}
                                className={cn(
                                  pkg.remainingHours <= 0 ? 'bg-green-500' :
                                  pkg.remainingHours <= pkg.totalHours * 0.25 ? 'bg-orange-500' :
                                  'bg-green-500'
                                )}
                              />
                            </div>
                            
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
                <div className="bg-background rounded-lg p-6 border">
                  <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Recent Flights ({clientData.recentFlights.length})
                  </h4>
                  {clientData.recentFlights.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No recent flights found</p>
                  ) : (
                    <div className="space-y-3">
                      {clientData.recentFlights.slice(0, 10).map((flight) => (
                                                 <div key={flight.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                      {clientData.recentFlights.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing last 10 flights of {clientData.recentFlights.length} total
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Client Details Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="!max-w-[90vw] max-h-[90vh] flex flex-col" showCloseButton={false}>
            <div className="flex-shrink-0 pb-2 flex justify-between">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <User className="h-5 w-5" />
                Usage Details - {selectedClient?.client.name}
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
                    Comprehensive view of usage, packages, and billing information for {selectedClient?.client.email}
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
                      Hour Packages ({selectedClient.packages.length}) - FIFO Method
                    </h3>
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>FIFO Method:</strong> Hours are consumed from the oldest packages first. 
                        This ensures fair usage tracking and proper package expiration management.
                      </p>
                    </div>
                    {selectedClient.packages.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No hour packages found</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedClient.packages
                          .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                          .map((pkg, index) => (
                          <div key={pkg.id} className={cn(
                            "border-2 rounded-lg p-4 bg-background",
                            pkg.remainingHours <= 0 && "opacity-60",
                            pkg.remainingHours <= 0 ? "border-gray-800" :
                            pkg.remainingHours <= pkg.totalHours * 0.25 ? "border-orange-500" :
                            "border-green-500"
                          )}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-lg">{formatHours(pkg.totalHours)} Package</p>
                                  {index === 0 && pkg.usedHours > 0 && (
                                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      <Clock className="h-3 w-3 mr-1" />
                                      First Used
                                    </Badge>
                                  )}
                                  {pkg.remainingHours <= 0 && (
                                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                      Consumed
                                    </Badge>
                                  )}
                                </div>
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
                                pkg.status === 'low hours' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                                pkg.status === 'overdrawn' ? 'bg-destructive text-white' :
                                'bg-gray-500 hover:bg-gray-600 text-white'
                              }>
                                {pkg.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                  <p className="font-medium text-green-600 dark:text-green-400">Used</p>
                                  <p className="text-lg font-bold">{formatHours(pkg.usedHours)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-medium text-blue-600 dark:text-blue-400">Remaining</p>
                                  <p className="text-lg font-bold">{formatHours(pkg.remainingHours)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-medium text-gray-600 dark:text-gray-400">Total</p>
                                  <p className="text-lg font-bold">{formatHours(pkg.totalHours)}</p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Usage Progress</span>
                                  <span>{Math.round((pkg.usedHours / pkg.totalHours) * 100)}%</span>
                                </div>
                                <Progress 
                                  value={(pkg.usedHours / pkg.totalHours) * 100}
                                  className={cn(
                                    pkg.remainingHours <= 0 ? 'bg-green-500' :
                                    pkg.remainingHours <= pkg.totalHours * 0.25 ? 'bg-orange-500' :
                                    'bg-green-500'
                                  )}
                                />
                              </div>
                              
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