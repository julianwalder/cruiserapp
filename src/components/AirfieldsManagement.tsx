'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Modal } from './ui/Modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Trash2, MapPin, Plane, Phone, Globe, Eye, ChevronsUpDown, Check, MoreVertical, Edit, Plus, Radio, Compass, MessageSquare } from 'lucide-react';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AddAirfieldModal from './AddAirfieldModal';

// Airfield creation schema
const createAirfieldSchema = z.object({
  name: z.string().min(2, 'Airfield name must be at least 2 characters'),
  code: z.string().min(2, 'Airfield code must be at least 2 characters').max(4, 'Airfield code must be at most 4 characters'),
  type: z.enum(['AIRPORT', 'SMALL_AIRPORT', 'MEDIUM_AIRPORT', 'LARGE_AIRPORT', 'ULTRALIGHT_FIELD', 'HELIPORT', 'SEAPLANE_BASE', 'BALLOON_PORT', 'GLIDER_PORT', 'AIRSTRIP']),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().optional(),
  country: z.string().min(2, 'Country must be at least 2 characters'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  elevation: z.string().optional(),
  runwayLength: z.string().optional(),
  runwaySurface: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED']),
});

type CreateAirfieldForm = z.infer<typeof createAirfieldSchema>;

import { Airfield } from "@/types/uuid-types";

// Extended Airfield interface for this component
interface ExtendedAirfield extends Omit<Airfield, 'type' | 'isBase'> {
  type: string; // Allow any string type for OurAirports compatibility
  isBase?: boolean;
  source?: 'manual' | 'imported';
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Compact combobox for table header
const CompactCombobox = ({ 
  options, 
  value, 
  onValueChange, 
  placeholder, 
  className 
}: { 
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearchValue("");
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-8 justify-between text-xs px-2", className)}
          size="sm"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[120px] w-auto p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search..." 
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-8 text-xs"
          />
          <CommandList>
            <CommandEmpty className="text-xs">No options found.</CommandEmpty>
            <CommandGroup>
              {options
                .filter((option) => {
                  if (!searchValue) return true;
                  return option.label.toLowerCase().includes(searchValue.toLowerCase());
                })
                .map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue: string) => {
                      onValueChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                    }}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default function AirfieldsManagement() {
  const { formatDate } = useDateFormatUtils();
  const [airfields, setAirfields] = useState<ExtendedAirfield[]>([]);
  const [allAirfields, setAllAirfields] = useState<ExtendedAirfield[]>([]); // <-- NEW
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL_TYPES');
  const [statusFilter, setStatusFilter] = useState('ALL_STATUSES');
  const [countryFilter, setCountryFilter] = useState('ALL_COUNTRIES');
  const [provinceFilter, setProvinceFilter] = useState('ALL_PROVINCES');

  const [selectedAirfield, setSelectedAirfield] = useState<ExtendedAirfield | null>(null);
  const [showAirfieldDialog, setShowAirfieldDialog] = useState(false);
  const [additionalAirfieldData, setAdditionalAirfieldData] = useState<any>(null);
  const [loadingAdditionalData, setLoadingAdditionalData] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateAirfieldForm>({
    resolver: zodResolver(createAirfieldSchema),
    defaultValues: {
      type: 'AIRPORT',
      status: 'ACTIVE',
    },
  });

  // Helper function to handle token refresh
  const refreshTokenIfNeeded = async (): Promise<string | null> => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const userId = localStorage.getItem('userId');
    
    if (!token || !refreshToken || !userId) {
      console.log('🔍 Missing token, refresh token, or user ID');
      return null;
    }
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          userId
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        console.log('🔍 Token refreshed successfully');
        return data.accessToken;
      } else {
        // Only clear token if it's a 401 (unauthorized) error
        if (response.status === 401) {
          console.log('🔍 AirfieldsManagement - Token refresh failed with 401, clearing token');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userId');
          window.location.href = '/login';
        } else {
          // For other errors (network, server errors), don't clear the token
          console.log('🔍 AirfieldsManagement - Token refresh failed with status:', response.status, 'keeping token');
        }
        return null;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  const fetchAirfields = async () => {
    try {
      setLoading(true);
      let token = localStorage.getItem('token');
      
      // Fetch all airfields
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (typeFilter && typeFilter !== 'ALL_TYPES') params.append('type', typeFilter);
      if (statusFilter && statusFilter !== 'ALL_STATUSES') params.append('status', statusFilter);
      if (countryFilter && countryFilter !== 'ALL_COUNTRIES') params.append('country', countryFilter);
      if (provinceFilter && provinceFilter !== 'ALL_PROVINCES') params.append('state', provinceFilter);

      let airfieldsResponse = await fetch(`/api/airfields?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // If we get a 401, try to refresh the token
      if (airfieldsResponse.status === 401) {
        console.log('🔍 Token expired, attempting to refresh...');
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          // Retry the request with the new token
          airfieldsResponse = await fetch(`/api/airfields?${params}`, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
          console.log('🔍 Airfields API retry response status:', airfieldsResponse.status);
        } else {
          // Refresh failed, user will be redirected to login
          return;
        }
      }

      if (!airfieldsResponse.ok) {
        throw new Error('Failed to fetch airfields');
      }

      const airfieldsData = await airfieldsResponse.json();
      
      // Fetch imported airfields to determine source and base status
      let importedResponse = await fetch('/api/airfields/imported', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // If we get a 401 on imported airfields, try to refresh the token
      if (importedResponse.status === 401) {
        console.log('🔍 Token expired for imported airfields, attempting to refresh...');
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          // Retry the request with the new token
          importedResponse = await fetch('/api/airfields/imported', {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
          console.log('🔍 Imported airfields API retry response status:', importedResponse.status);
        } else {
          // Refresh failed, user will be redirected to login
          return;
        }
      }

      let importedData = { airfields: [] };
      if (importedResponse.ok) {
        importedData = await importedResponse.json();
      }

      // Create a set of imported airfield IDs for quick lookup
      const importedAirfieldIds = new Set(importedData.airfields.map((airfield: any) => airfield.id));

      // Mark airfields with their source and base status
      const airfieldsWithSource = airfieldsData.airfields.map((airfield: any) => ({
        ...airfield,
        source: importedAirfieldIds.has(airfield.id) ? 'imported' as const : 'manual' as const,
        isBase: importedAirfieldIds.has(airfield.id) ? 
          (importedData.airfields.find((imp: any) => imp.id === airfield.id) as any)?.isBase || false : false
      }));

      setAirfields(airfieldsWithSource);
      setPagination({
        ...pagination,
        total: airfieldsData.pagination?.total || airfieldsWithSource.length,
        pages: airfieldsData.pagination?.pages || Math.ceil((airfieldsData.pagination?.total || airfieldsWithSource.length) / pagination.limit)
      });

      // Fetch unique airfield types for the filter
      await fetchAvailableTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTypes = async () => {
    try {
      let token = localStorage.getItem('token');
      
      // Fetch all airfields to get unique types (with a high limit to get all types)
      let response = await fetch('/api/airfields?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // If we get a 401, try to refresh the token
      if (response.status === 401) {
        console.log('🔍 Token expired for available types, attempting to refresh...');
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          // Retry the request with the new token
          response = await fetch('/api/airfields?limit=1000', {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
          console.log('🔍 Available types API retry response status:', response.status);
        } else {
          // Refresh failed, user will be redirected to login
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        const types = [...new Set(data.airfields.map((airfield: any) => airfield.type as string))] as string[];
        setAvailableTypes(types.sort());
      }
    } catch (err) {
      console.error('Failed to fetch available types:', err);
    }
  };

  const fetchAvailableCountries = async () => {
    try {
      let token = localStorage.getItem('token');
      
      // Fetch all airfields to get unique countries (with a high limit to get all countries)
      let response = await fetch('/api/airfields?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // If we get a 401, try to refresh the token
      if (response.status === 401) {
        console.log('🔍 Token expired for available countries, attempting to refresh...');
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          // Retry the request with the new token
          response = await fetch('/api/airfields?limit=1000', {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
          console.log('🔍 Available countries API retry response status:', response.status);
        } else {
          // Refresh failed, user will be redirected to login
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        const countries = [...new Set(data.airfields.map((airfield: any) => airfield.country as string))] as string[];
        setAvailableCountries(countries.sort());
      }
    } catch (err) {
      console.error('Failed to fetch available countries:', err);
    }
  };

  useEffect(() => {
    fetchAirfields();
  }, [pagination.page, pagination.limit, search, typeFilter, statusFilter, countryFilter, provinceFilter]);

  // Fetch all airfields for combobox options (once on mount)
  useEffect(() => {
    const fetchAllAirfields = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/airfields?limit=10000', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAllAirfields(data.airfields);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchAllAirfields();
  }, []);

  // Fetch current user to check permissions
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Check if user can edit (ADMIN or SUPER_ADMIN)
  const canEdit = useMemo(() => {
    if (!currentUser?.userRoles) return false;
    return currentUser.userRoles.some((userRole: any) => 
      userRole.roles.name === 'ADMIN' || userRole.roles.name === 'SUPER_ADMIN'
    );
  }, [currentUser]);

  // Generate unique type, country, status, and province options from allAirfields
  const allTypes = useMemo(() => Array.from(new Set(allAirfields.map(a => a.type).filter(Boolean))).sort(), [allAirfields]);
  const allCountries = useMemo(() => Array.from(new Set(allAirfields.map(a => a.country).filter(Boolean))).sort(), [allAirfields]);
  const allStatuses = useMemo(() => Array.from(new Set(allAirfields.map(a => a.status).filter(Boolean))).sort(), [allAirfields]);
  const allProvinces = useMemo(() => Array.from(new Set(allAirfields.map(a => a.state).filter((p): p is string => Boolean(p)))).sort((a: string, b: string) => a.localeCompare(b)), [allAirfields]);

  const typeOptions = useMemo(() => [
    { value: 'ALL_TYPES', label: 'All types' },
    ...allTypes.map(t => ({ value: t, label: t }))
  ], [allTypes]);
  const countryOptions = useMemo(() => [
    { value: 'ALL_COUNTRIES', label: 'All countries' },
    ...allCountries.map(c => ({ value: c || '', label: c || '' }))
  ], [allCountries]);
  const statusOptions = useMemo(() => [
    { value: 'ALL_STATUSES', label: 'All statuses' },
    ...allStatuses.map(s => ({ 
      value: s, 
      label: s.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) 
    }))
  ], [allStatuses]);
  const provinceOptions = useMemo(() => [
    { value: 'ALL_PROVINCES', label: 'All provinces' },
    ...allProvinces.map((p: string) => ({ value: p, label: p }))
  ], [allProvinces]);

  const filteredAirfields = useMemo(() => {
    return airfields.filter(airfield => {
      const matchesSearch = search ? (
        (airfield.name + ' ' + airfield.code + ' ' + airfield.city + ' ' + airfield.state + ' ' + airfield.country)
          .toLowerCase()
          .includes(search.toLowerCase())
      ) : true;
      const matchesType = typeFilter === 'ALL_TYPES' || airfield.type === typeFilter;
      const matchesCountry = countryFilter === 'ALL_COUNTRIES' || airfield.country === countryFilter;
      const matchesStatus = statusFilter === 'ALL_STATUSES' || airfield.status === statusFilter;
      const matchesProvince = provinceFilter === 'ALL_PROVINCES' || airfield.state === provinceFilter;
      return matchesSearch && matchesType && matchesCountry && matchesStatus && matchesProvince;
    });
  }, [airfields, search, typeFilter, countryFilter, statusFilter, provinceFilter]);

  const handleCreateAirfield = async (data: CreateAirfieldForm) => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/airfields', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create airfield');
      }

      // Reset form and close dialog
      reset();
      setShowCreateDialog(false);
      
      // Refresh airfields list
      fetchAirfields();
      
      // Clear any errors
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (airfieldId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // First get the current airfield data
      const getResponse = await fetch(`/api/airfields/${airfieldId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!getResponse.ok) {
        throw new Error('Failed to fetch airfield data');
      }

      const currentAirfield = await getResponse.json();
      
      // Update with new status
      const response = await fetch(`/api/airfields/${airfieldId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...currentAirfield, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update airfield status');
      }

      // Refresh airfields list
      fetchAirfields();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteAirfield = async (airfieldId: string) => {
    if (!confirm('Are you sure you want to delete this airfield?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/airfields/${airfieldId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete airfield');
      }

      // Refresh airfields list
      fetchAirfields();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'AIRPORT':
        return 'bg-primary-10 text-primary border-primary-20';
      case 'SMALL_AIRPORT':
        return 'bg-green-10 text-green border-green-20';
      case 'MEDIUM_AIRPORT':
        return 'bg-yellow-10 text-yellow border-yellow-20';
      case 'LARGE_AIRPORT':
        return 'bg-red-10 text-red border-red-20';
      case 'ULTRALIGHT_FIELD':
        return 'bg-success-10 text-success border-success-20';
      case 'HELIPORT':
        return 'bg-secondary-10 text-secondary-foreground border-secondary-20';
      case 'SEAPLANE_BASE':
        return 'bg-accent-10 text-accent-foreground border-accent-20';
      case 'BALLOON_PORT':
        return 'bg-purple-10 text-purple border-purple-20';
      case 'GLIDER_PORT':
        return 'bg-orange-10 text-orange border-orange-20';
      case 'AIRSTRIP':
        return 'bg-blue-10 text-blue border-blue-20';
      default:
        return 'bg-muted text-muted-foreground border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success-10 text-success border-success-20';
      case 'INACTIVE':
        return 'bg-muted text-muted-foreground border-gray-200 dark:border-gray-700';
      case 'MAINTENANCE':
        return 'bg-warning-10 text-warning border-warning-20';
      case 'CLOSED':
        return 'bg-destructive-10 text-destructive border-destructive-20';
      default:
        return 'bg-muted text-muted-foreground border-gray-200 dark:border-gray-700';
    }
  };

  const formatProvince = (state: string | undefined) => {
    if (!state) return '-';
    
    // Remove country prefix (e.g., "RO-" from "RO-CT")
    const cleanState = state.replace(/^[A-Z]{2}-/, '');
    
    // Convert to readable format and capitalize
    return cleanState
      .split('-')
      .map(word => word.toUpperCase())
      .join(' ');
  };

  const getAirportTypeLabel = (airfield: ExtendedAirfield) => {
    // Use the OurAirports type directly to determine the display label
    switch (airfield.type) {
      case 'LARGE_AIRPORT':
        return 'Large Airport';
      case 'MEDIUM_AIRPORT':
        return 'Medium Airport';
      case 'SMALL_AIRPORT':
        return 'Small Airport';
      case 'HELIPORT':
        return 'Heliport';
      case 'SEAPLANE_BASE':
        return 'Seaplane Base';
      case 'BALLOON_PORT':
        return 'Balloon Port';
      case 'GLIDER_PORT':
        return 'Glider Port';
      case 'ULTRALIGHT_FIELD':
        return 'Ultralight Field';
      case 'AIRSTRIP':
        return 'Airstrip';
      case 'AIRPORT':
        return 'Airport';
      default:
        // Fallback for any unrecognized types
        return airfield.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const handleRowClick = async (airfield: ExtendedAirfield) => {
    setSelectedAirfield(airfield);
    setShowAirfieldDialog(true);
    
    // Fetch additional aviation data
    setLoadingAdditionalData(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/airfields/${airfield.id}/additional-data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdditionalAirfieldData(data);
      } else {
        console.error('Failed to fetch additional airfield data');
        setAdditionalAirfieldData(null);
      }
    } catch (error) {
      console.error('Error fetching additional airfield data:', error);
      setAdditionalAirfieldData(null);
    } finally {
      setLoadingAdditionalData(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Airfields Table */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Airfields Management</CardTitle>
              <CardDescription>Manage airfields and search reference database</CardDescription>
            </div>
            <Button 
              onClick={() => {
                console.log('Button clicked, setting showSearchModal to true');
                setShowSearchModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Airfield
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Airfield</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
                <TableRow>
                  {/* Airfield search */}
                  <TableCell>
                    <Input
                      placeholder="Search airfield..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  {/* Type combobox */}
                  <TableCell>
                    <CompactCombobox
                      options={typeOptions}
                      value={typeFilter}
                      onValueChange={setTypeFilter}
                      placeholder="All types"
                      className="min-w-[110px] w-auto"
                    />
                  </TableCell>
                  {/* Country combobox */}
                  <TableCell>
                    <CompactCombobox
                      options={countryOptions}
                      value={countryFilter}
                      onValueChange={setCountryFilter}
                      placeholder="All countries"
                      className="min-w-[110px] w-auto"
                    />
                  </TableCell>
                  {/* Province combobox */}
                  <TableCell>
                    <CompactCombobox
                      options={provinceOptions}
                      value={provinceFilter}
                      onValueChange={setProvinceFilter}
                      placeholder="All provinces"
                      className="min-w-[110px] w-auto"
                    />
                  </TableCell>
                  {/* Status combobox */}
                  <TableCell>
                    <CompactCombobox
                      options={statusOptions}
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                      placeholder="All statuses"
                      className="min-w-[110px] w-auto"
                    />
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="text-muted-foreground">Loading airfields...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAirfields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <Plane className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">No airfields found</span>
                        <span className="text-sm text-muted-foreground">Try adjusting your filters</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAirfields.map((airfield) => (
                    <TableRow 
                      key={airfield.id} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(airfield)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            airfield.isBase ? 'bg-accent text-accent-foreground' : 'bg-primary-10 text-primary'
                          }`}>
                            <Plane className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{airfield.name}</div>
                            <div className="text-sm text-muted-foreground font-mono">{airfield.code}</div>
                            {airfield.isBase && (
                              <div className="text-xs text-accent-foreground font-medium bg-accent/10 px-1.5 py-0.5 rounded">
                                Base Airfield
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTypeBadgeColor(airfield.type)} text-xs`}>
                          {getAirportTypeLabel(airfield)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{airfield.city}</div>
                          <div className="text-sm text-muted-foreground">{airfield.country}</div>
                          {airfield.latitude && airfield.longitude && (
                            <div className="text-xs text-muted-foreground">
                              {Number(airfield.latitude || 0).toFixed(4)}, {Number(airfield.longitude || 0).toFixed(4)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatProvince(airfield.state)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(airfield.status)} text-xs`}>
                          {airfield.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRowClick(airfield)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(airfield.id, airfield.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>
                                  <MapPin className="h-4 w-4 mr-2" />
                                  {airfield.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteAirfield(airfield.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Airfield
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4">
        <div className="text-sm text-muted-foreground">
          {pagination.total > 0 ? (
            <>
              Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> airfields
            </>
          ) : (
            'No airfields found'
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

      {/* Create Airfield Dialog */}
      <Modal
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Add New Airfield"
      >
          <form onSubmit={handleSubmit(handleCreateAirfield)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Airfield Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter airfield name"
                    {...register('name')}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Airfield Code *</Label>
                  <Input
                    id="code"
                    placeholder="ICAO/IATA code"
                    {...register('code')}
                    className={errors.code ? 'border-destructive' : ''}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select onValueChange={(value) => setValue('type', value as any)} defaultValue="AIRPORT">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AIRPORT">Airport</SelectItem>
                      <SelectItem value="ULTRALIGHT_FIELD">Ultralight Field</SelectItem>
                      <SelectItem value="HELIPORT">Heliport</SelectItem>
                      <SelectItem value="SEAPLANE_BASE">Seaplane Base</SelectItem>
                      <SelectItem value="BALLOON_PORT">Balloon Port</SelectItem>
                      <SelectItem value="GLIDER_PORT">Glider Port</SelectItem>
                      <SelectItem value="AIRSTRIP">Airstrip</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-destructive">{errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select onValueChange={(value) => setValue('status', value as any)} defaultValue="ACTIVE">
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-destructive">{errors.status.message}</p>
                  )}
                </div>
              </div>
            </div>

              {/* Additional Data Summary */}
              {additionalAirfieldData && Object.keys(additionalAirfieldData).length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Available Aviation Data</h4>
                  <div className="flex flex-wrap gap-2">
                    {additionalAirfieldData.runways && additionalAirfieldData.runways.length > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {additionalAirfieldData.runways.length} Runway{additionalAirfieldData.runways.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {additionalAirfieldData.frequencies && additionalAirfieldData.frequencies.length > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {additionalAirfieldData.frequencies.length} Frequency{additionalAirfieldData.frequencies.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {additionalAirfieldData.navaids && additionalAirfieldData.navaids.length > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        {additionalAirfieldData.navaids.length} Navaid{additionalAirfieldData.navaids.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {additionalAirfieldData.comments && additionalAirfieldData.comments.length > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {additionalAirfieldData.comments.length} Comment{additionalAirfieldData.comments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Loading Indicator for Additional Data */}
              {loadingAdditionalData && (
                <div className="bg-muted/50 rounded-lg p-6">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Loading aviation data...</span>
                  </div>
                </div>
              )}

              {/* No Additional Data Available */}
              {!loadingAdditionalData && !additionalAirfieldData && (
                <div className="bg-muted/50 rounded-lg p-6">
                  <div className="text-center text-muted-foreground">
                    <p>No additional aviation data available for this airfield.</p>
                    <p className="text-sm mt-1">This airfield may not have detailed runway, frequency, or navaid information in our reference database.</p>
                  </div>
                </div>
              )}

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    {...register('city')}
                    className={errors.city ? 'border-destructive' : ''}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    placeholder="Enter state"
                    {...register('state')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    placeholder="Enter country"
                    {...register('country')}
                    className={errors.country ? 'border-destructive' : ''}
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Technical Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Technical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    placeholder="e.g., 40.7128"
                    {...register('latitude')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    placeholder="e.g., -74.0060"
                    {...register('longitude')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elevation">Elevation (ft)</Label>
                  <Input
                    id="elevation"
                    placeholder="Enter elevation"
                    {...register('elevation')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="runwayLength">Runway Length (ft)</Label>
                  <Input
                    id="runwayLength"
                    placeholder="Enter runway length"
                    {...register('runwayLength')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="runwaySurface">Runway Surface</Label>
                  <Input
                    id="runwaySurface"
                    placeholder="e.g., Asphalt, Concrete, Grass"
                    {...register('runwaySurface')}
                  />
                </div>
              </div>
            </div>

              {/* Radio Frequencies */}
              {additionalAirfieldData?.frequencies && additionalAirfieldData.frequencies.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Radio className="h-5 w-5 mr-2" />
                    Radio Frequencies
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {additionalAirfieldData.frequencies.map((frequency: any, index: number) => (
                      <div key={index} className="bg-background rounded-lg p-4 border">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-muted-foreground">
                              {frequency.type || 'Frequency'}
                            </span>
                            <span className="text-sm font-mono bg-blue-100 text-blue-800 px-3 py-1 rounded border">
                              {frequency.frequency_mhz} MHz
                            </span>
                          </div>
                          {frequency.description && (
                            <p className="text-sm text-card-foreground">{frequency.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Aids */}
              {additionalAirfieldData?.navaids && additionalAirfieldData.navaids.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Compass className="h-5 w-5 mr-2" />
                    Navigation Aids
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {additionalAirfieldData.navaids.map((navaid: any, index: number) => (
                      <div key={index} className="bg-background rounded-lg p-4 border">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-muted-foreground">
                              {navaid.name || 'Navaid'}
                            </span>
                            <span className="text-sm font-mono bg-green-100 text-green-800 px-3 py-1 rounded border">
                              {navaid.type}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Frequency: </span>
                              <span className="font-medium">{navaid.frequency_khz} kHz</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Range: </span>
                              <span className="font-medium">{navaid.range_nm} nm</span>
                            </div>
                          </div>
                          {navaid.usageType && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Usage: </span>
                              <span className="font-medium">{navaid.usageType}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Airport Comments */}
              {additionalAirfieldData?.comments && additionalAirfieldData.comments.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Airport Information
                  </h3>
            <div className="space-y-4">
                    {additionalAirfieldData.comments.map((comment: any, index: number) => (
                      <div key={index} className="bg-background rounded-lg p-4 border">
                        <div className="space-y-2">
                          {comment.date && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(comment.date).toLocaleDateString()}
                            </div>
                          )}
                          {comment.body && (
                            <p className="text-sm text-card-foreground">{comment.body}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Information */}
                                              <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Phone className="h-5 w-2 mr-2" />
                    Contact Information
                  </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    {...register('phone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    {...register('email')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="Enter website URL"
                    {...register('website')}
                    className={errors.website ? 'border-destructive' : ''}
                  />
                  {errors.website && (
                    <p className="text-sm text-destructive">{errors.website.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
              >
                {createLoading ? 'Creating...' : 'Create Airfield'}
              </Button>
            </div>
          </form>
      </Modal>

      {/* Airfield Details Dialog */}
      <Modal
        open={showAirfieldDialog}
        onClose={() => {
          setShowAirfieldDialog(false);
          setAdditionalAirfieldData(null);
        }}
        title="Airfield Details"
      >
          {selectedAirfield && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Plane className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Airfield Name</Label>
                    <p className="text-base font-medium text-card-foreground">{selectedAirfield.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Airfield Code</Label>
                    <p className="text-base text-card-foreground">{selectedAirfield.code}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                    <Badge className={getTypeBadgeColor(selectedAirfield.type)}>
                      {selectedAirfield.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedAirfield.status)}>
                      {selectedAirfield.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>

                </div>
              </div>

              {/* Location Information */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Location Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">City</Label>
                    <p className="text-base text-card-foreground">{selectedAirfield.city}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">State/Province</Label>
                    <p className="text-base text-card-foreground">{formatProvince(selectedAirfield.state)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                    <p className="text-base text-card-foreground">{selectedAirfield.country}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Coordinates</Label>
                    <p className="text-base text-card-foreground">
                      {selectedAirfield.latitude && selectedAirfield.longitude 
                        ? `${selectedAirfield.latitude}, ${selectedAirfield.longitude}`
                        : '-'
                      }
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Elevation</Label>
                    <p className="text-base text-card-foreground">{selectedAirfield.elevation ? `${selectedAirfield.elevation} ft` : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Technical Information */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Plane className="h-5 w-5 mr-2" />
                  Technical Information
                </h3>
                
                {/* Runways */}
                {additionalAirfieldData?.runways && additionalAirfieldData.runways.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-card-foreground">Runways</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {additionalAirfieldData.runways.map((runway: any, index: number) => (
                        <div key={index} className="bg-background rounded-lg p-4 border">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-muted-foreground">Runway {index + 1}</span>
                              {runway.le_ident && runway.he_ident && (
                                <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded border">
                                  {runway.le_ident}/{runway.he_ident}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Length: </span>
                                <span className="font-medium">{runway.length_ft?.toLocaleString()} ft</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Width: </span>
                                <span className="font-medium">{runway.width_ft} ft</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Surface: </span>
                                <span className="font-medium">{runway.surface || 'Unknown'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Lighted: </span>
                                <span className="font-medium">{runway.lighted ? 'Yes' : 'No'}</span>
                              </div>
                            </div>
                            {(runway.le_heading_degT || runway.he_heading_degT) && (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {runway.le_heading_degT && (
                                  <div>
                                    <span className="text-muted-foreground">LE Heading: </span>
                                    <span className="font-medium">{runway.le_heading_degT}°</span>
                                  </div>
                                )}
                                {runway.he_heading_degT && (
                                  <div>
                                    <span className="text-muted-foreground">HE Heading: </span>
                                    <span className="font-medium">{runway.he_heading_degT}°</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Runway Length</Label>
                    <p className="text-base text-card-foreground">-</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Runway Surface</Label>
                    <p className="text-base text-card-foreground">-</p>
                  </div>
                </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p className="text-base text-card-foreground">{selectedAirfield.phone || '-'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-base text-card-foreground">{selectedAirfield.email || '-'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                    <p className="text-base text-card-foreground">{selectedAirfield.website || '-'}</p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  System Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-base text-card-foreground">{formatDate(selectedAirfield.createdAt)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-base text-card-foreground">{formatDate(selectedAirfield.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
      </Modal>

      {/* Add Airfield Modal */}
      <AddAirfieldModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onAirfieldAdded={() => fetchAirfields()}
      />
    </div>
  );
} 