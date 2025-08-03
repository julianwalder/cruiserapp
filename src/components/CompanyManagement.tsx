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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Modal } from './ui/Modal';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  AlertCircle,
  Users,
  User,
  Link,
  Unlink,
  RefreshCw,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Company, UserCompanyRelationship } from "@/types/uuid-types";

interface Company {
  id: string;
  name: string;
  vat_code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  status: string;
  created_at: string;
  user_company_relationships?: Array<{
    user_id: string;
    relationship_type: string;
    is_primary: boolean;
    users: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      status: string;
    };
  }>;
}

interface CompanyManagementProps {
  className?: string;
}

export default function CompanyManagement({ className }: CompanyManagementProps) {
  const [companies, setCompanies] = useState<ExtendedCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [status, setStatus] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    vat_code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Romania',
    status: 'Active'
  });

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (status && status !== 'all') {
        params.append('status', status);
      }

      const response = await fetch(`/api/companies?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Filter companies by search term
  const filteredCompanies = companies.filter(company => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchLower) ||
      company.vat_code?.toLowerCase().includes(searchLower) ||
      company.email?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { variant: 'default' as const, label: 'Active' },
      'inactive': { variant: 'secondary' as const, label: 'Inactive' },
      'suspended': { variant: 'destructive' as const, label: 'Suspended' },
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || {
      variant: 'outline' as const,
      label: status
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleRefresh = () => {
    fetchCompanies();
  };

  const handleViewCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  const handleCreateCompany = async () => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCompany),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create company');
      }

      // Reset form and close modal
      setNewCompany({
        name: '',
        vat_code: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'Romania',
        status: 'Active'
      });
      setIsCreateModalOpen(false);
      
      // Refresh companies list
      fetchCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    }
  };

  const getRelationshipTypeBadge = (type: string) => {
    const typeConfig = {
      'employee': { variant: 'default' as const, label: 'Employee' },
      'contractor': { variant: 'secondary' as const, label: 'Contractor' },
      'student': { variant: 'outline' as const, label: 'Student' },
      'client': { variant: 'outline' as const, label: 'Client' },
    };

    const config = typeConfig[type.toLowerCase() as keyof typeof typeConfig] || {
      variant: 'outline' as const,
      label: type
    };

    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span>Company Management</span>
              <Badge variant="outline">{filteredCompanies.length}</Badge>
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
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
              
              <Modal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Company"
              >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        value={newCompany.name}
                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat_code">VAT Code</Label>
                      <Input
                        id="vat_code"
                        value={newCompany.vat_code}
                        onChange={(e) => setNewCompany({ ...newCompany, vat_code: e.target.value })}
                        placeholder="Enter VAT code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newCompany.email}
                        onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newCompany.phone}
                        onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={newCompany.address}
                        onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                        placeholder="Enter address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={newCompany.city}
                          onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                          placeholder="Enter city"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={newCompany.country}
                          onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={newCompany.status} onValueChange={(value) => setNewCompany({ ...newCompany, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCompany} disabled={!newCompany.name}>
                        Create Company
                      </Button>
                    </div>
                  </div>
              </Modal>
            </div>
          </CardTitle>
          <CardDescription>
            Manage companies and their relationships with users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={fetchCompanies} disabled={loading} className="w-full">
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

          {/* Companies Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading companies...</span>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {companies.length === 0 ? 'No companies found' : 'No companies match your filters'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>VAT Code</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        {company.name}
                      </TableCell>
                      <TableCell>
                        {company.vat_code || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          {company.email && (
                            <p className="text-sm">{company.email}</p>
                          )}
                          {company.phone && (
                            <p className="text-sm text-muted-foreground">{company.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(company.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {company.user_company_relationships?.length || 0}
                          </Badge>
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
                            <DropdownMenuItem onClick={() => handleViewCompany(company)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
        </CardContent>
      </Card>

      {/* Company Details Modal */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={`Company Details - ${selectedCompany?.name}`}
      >
          <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">
          
          {selectedCompany && (
            <div className="space-y-8">
              {/* Company Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Company Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Company Name</Label>
                    <p className="text-base font-medium text-card-foreground">{selectedCompany.name}</p>
                  </div>
                  {selectedCompany.vat_code && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">VAT Code</Label>
                      <p className="text-base text-card-foreground">{selectedCompany.vat_code}</p>
                    </div>
                  )}
                  {selectedCompany.email && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-base text-card-foreground">{selectedCompany.email}</p>
                    </div>
                  )}
                  {selectedCompany.phone && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-base text-card-foreground">{selectedCompany.phone}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedCompany.status)}</div>
                  </div>
                  {selectedCompany.address && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                      <p className="text-base text-card-foreground">{selectedCompany.address}</p>
                      {selectedCompany.city && (
                        <p className="text-base text-card-foreground">{selectedCompany.city}</p>
                      )}
                      <p className="text-base text-card-foreground">{selectedCompany.country}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Associated Users */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Associated Users
                </h3>
                {selectedCompany.user_company_relationships && selectedCompany.user_company_relationships.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCompany.user_company_relationships.map((relationship, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-background">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">
                                {relationship.users.firstName} {relationship.users.lastName}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {relationship.users.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getRelationshipTypeBadge(relationship.relationship_type)}
                            {relationship.is_primary && (
                              <Badge variant="default" className="text-xs">
                                Primary
                              </Badge>
                            )}
                            <Badge variant={relationship.users.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                              {relationship.users.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No users associated with this company
                  </div>
                )}
              </div>
            </div>
          )}
            </div>
      </Modal>
    </div>
  );
} 