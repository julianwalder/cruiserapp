import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Modal } from './ui/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Download, Upload, Plus, CheckCircle, AlertTriangle, RefreshCw, Eye, EyeOff, MapPin, Plane, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CompactCombobox } from './ui/compact-combobox';
import { useDateFormat } from '@/contexts/DateFormatContext';
import { formatDate, formatDateTimeWithCurrentFormat } from '@/lib/date-utils';
import { toast } from 'sonner';
import { EUROPEAN_COUNTRIES, getRegionsByCountryCode, type Country, type Region } from '@/lib/data/countries-regions';

// User creation schema
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  personalNumber: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  roles: z.array(z.string()).min(1, 'At least one role must be selected'),
  licenseNumber: z.string().optional(),
  medicalClass: z.string().optional(),
  instructorRating: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const ALL_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'INSTRUCTOR',
  'PILOT',
  'STUDENT',
  'BASE_MANAGER',
  'PROSPECT',
];

export default function UsersImportTab() {
  const { dateFormat } = useDateFormat();
  // State for users, filters, loading, etc.
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [importSummary, setImportSummary] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    status: string;
  } | null>(null);

  // Create user state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    personalNumber: '',
    phone: '',
    dateOfBirth: '',
    street: '',
    city: '',
    region: '',
    zipCode: '',
    country: '',
    roles: [],
    status: 'ACTIVE',
    totalFlightHours: 0,
    licenseNumber: '',
    medicalClass: '',
    instructorRating: '',
  });

  const handleCreateFormChange = (field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setSelectedRegion(''); // Reset region when country changes
    setCreateForm(prev => ({
      ...prev,
      country: countryCode,
      region: ''
    }));
  };

  const handleRegionChange = (regionCode: string) => {
    setSelectedRegion(regionCode);
    setCreateForm(prev => ({
      ...prev,
      region: regionCode
    }));
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      roles: ['STUDENT'], // Default to STUDENT role
    },
  });

  // Fetch users with pagination
  const fetchUsers = async (page = pagination.page, limit = pagination.limit) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (verifiedFilter) params.append('verified', verifiedFilter);
      const response = await fetch(`/api/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
      setPagination({
        page: data.pagination?.page || page,
        limit: data.pagination?.limit || limit,
        total: data.pagination?.total || (data.users?.length || 0),
        pages: data.pagination?.pages || Math.ceil((data.pagination?.total || (data.users?.length || 0)) / limit),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search, roleFilter, statusFilter, verifiedFilter]);

  // Add this effect to fetch users when limit changes
  useEffect(() => {
    fetchUsers(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.limit]);

  // Fetch import summary on component mount
  useEffect(() => {
    const fetchImportSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/import-summary', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const summary = await response.json();
          console.log('Fetched import summary:', summary); // Debug log
          if (summary) {
            setImportSummary(summary);
          }
        }
      } catch (error) {
        console.error('Failed to fetch import summary:', error);
      }
    };
    
    fetchImportSummary();
  }, []);

  // Format role label for display (copied from UserManagement)
  const formatRoleLabel = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const roleOptions = useMemo(() => {
    return [
      { value: '', label: 'All' },
      ...ALL_ROLES.filter(Boolean).map((role) => ({ value: role, label: formatRoleLabel(role) })),
    ];
  }, []);
  // All possible statuses (should match UserManagement)
  const ALL_STATUSES = [
    'ACTIVE',
    'INACTIVE',
    'INVITED',
    'SUSPENDED',
    'PENDING',
    'DELETED',
  ];
  // Format status label for display (copied from UserManagement)
  const formatStatusLabel = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  const statusOptions = useMemo(() => {
    return [
      { value: '', label: 'All' },
      ...ALL_STATUSES.filter(Boolean).map((status) => ({ value: status, label: formatStatusLabel(status) })),
    ];
  }, []);

  const verifiedOptions = useMemo(() => {
    return [
      { value: '', label: 'All' },
      { value: 'true', label: 'Verified' },
      { value: 'false', label: 'Not Verified' },
    ];
  }, []);

  // Button handlers (stubbed)
  // Download CSV template
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/import', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to download template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded successfully!', {
        description: 'The CSV template has been downloaded to your device.',
        duration: 3000,
      });
    } catch (error) {
      toast.error('Failed to download template', {
        description: 'There was an error downloading the template file.',
        duration: 4000,
      });
    }
  };
  // Import users from CSV with progress tracking
  const handleImportUsers = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    (async () => {
      try {
        setImportLoading(true);
        setImportSummary(null);
        setImportProgress({ current: 0, total: 0, percentage: 0, status: 'Starting import...' });
        
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        
        // First, get the total number of records to import
        const fileText = await file.text();
        const lines = fileText.split('\n').filter(line => line.trim());
        const totalRecords = Math.max(0, lines.length - 1); // Subtract header row
        
        setImportProgress({ current: 0, total: totalRecords, percentage: 0, status: 'Preparing import...' });
        
        // Start the import
        const response = await fetch('/api/users/import', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.error || 'Failed to import users');
        }
        
        const result = await response.json();
        const importId = result.importId;
        
        if (importId) {
          // Poll for progress updates
          const pollProgress = async () => {
            try {
              const progressResponse = await fetch(`/api/users/import-progress/${importId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              
              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                
                setImportProgress({
                  current: progressData.current,
                  total: progressData.total,
                  percentage: progressData.percentage,
                  status: progressData.status
                });
                
                if (progressData.completed) {
                  // Import completed
                  const summary = {
                    timestamp: new Date().toISOString(),
                    imported: progressData.results.success,
                    errors: progressData.results.errors.length,
                    success: progressData.results.success > 0,
                    total: progressData.results.total || 0,
                    details: progressData.results.details || [],
                    errorDetails: progressData.results.errors || []
                  };
                  setImportSummary(summary);
                  setImportProgress(null);
                  
                  // Store the import summary
                  try {
                    const summaryResponse = await fetch('/api/users/import-summary', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(summary),
                    });
                    if (!summaryResponse.ok) {
                      console.error('Failed to store import summary');
                    }
                  } catch (error) {
                    console.error('Error storing import summary:', error);
                  }
                  
                  // Show success/error messages
                  if (progressData.results.success > 0) {
                    toast.success('Users imported successfully!', {
                      description: `${progressData.results.success} users were imported. ${progressData.results.errors.length > 0 ? `${progressData.results.errors.length} errors occurred.` : ''}`,
                      duration: 4000,
                    });
                    // Refresh users list
                    const usersResp = await fetch('/api/users?limit=1000', { headers: { 'Authorization': `Bearer ${token}` } });
                    if (usersResp.ok) {
                      const usersData = await usersResp.json();
                      setUsers(usersData.users || []);
                    }
                  } else if (progressData.results.errors.length > 0) {
                    toast.warning('Import completed with errors', {
                      description: `No users were imported. ${progressData.results.errors.length} errors occurred.`,
                      duration: 4000,
                    });
                  }
                  return; // Stop polling
                }
              } else {
                console.error('Failed to fetch progress');
                return; // Stop polling on error
              }
            } catch (error) {
              console.error('Error polling progress:', error);
              return; // Stop polling on error
            }
            
            // Continue polling if not completed
            setTimeout(pollProgress, 500); // Poll every 500ms
          };
          
          // Start polling
          pollProgress();
        } else {
          // Fallback to regular response handling
          const summary = {
            timestamp: new Date().toISOString(),
            imported: result.results.success,
            errors: result.results.errors.length,
            success: result.results.success > 0,
            total: result.results.total || 0,
            details: result.results.details || [],
            errorDetails: result.results.errors || []
          };
          setImportSummary(summary);
          setImportProgress(null);
          
          // Store the import summary
          try {
            const summaryResponse = await fetch('/api/users/import-summary', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(summary),
            });
            if (!summaryResponse.ok) {
              console.error('Failed to store import summary');
            }
          } catch (error) {
            console.error('Error storing import summary:', error);
          }
          
          // Show success/error messages
          if (result.results.success > 0) {
            toast.success('Users imported successfully!', {
              description: `${result.results.success} users were imported. ${result.results.errors.length > 0 ? `${result.results.errors.length} errors occurred.` : ''}`,
              duration: 4000,
            });
            // Refresh users list
            const usersResp = await fetch('/api/users?limit=1000', { headers: { 'Authorization': `Bearer ${token}` } });
            if (usersResp.ok) {
              const usersData = await usersResp.json();
              setUsers(usersData.users || []);
            }
          } else if (result.results.errors.length > 0) {
            toast.warning('Import completed with errors', {
              description: `No users were imported. ${result.results.errors.length} errors occurred.`,
              duration: 4000,
            });
          }
        }
      } catch (error: any) {
        setError(error.message);
        setImportProgress(null);
        toast.error('Import failed', {
          description: error.message,
          duration: 4000,
        });
      } finally {
        setImportLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    })();
  };
  const handleAddUser = () => {
    setShowCreateDialog(true);
  };

  const handleCreateUser = async () => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('token');
      
      // Add the selected roles to the form data
      const userData = {
        email: createForm.email,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        personalNumber: createForm.personalNumber,
        phone: createForm.phone,
        dateOfBirth: createForm.dateOfBirth,
        address: createForm.street, // Map street to address for API compatibility
        city: createForm.city,
        state: createForm.region, // Map region to state for API compatibility
        zipCode: createForm.zipCode,
        country: createForm.country,
        status: createForm.status,
        totalFlightHours: typeof createForm.totalFlightHours === 'string' ? parseFloat(createForm.totalFlightHours) || 0 : createForm.totalFlightHours,
        licenseNumber: createForm.licenseNumber,
        medicalClass: createForm.medicalClass,
        instructorRating: createForm.instructorRating,
        roles: selectedRoles,
        requiresPasswordSetup: true, // Flag to indicate password setup is needed
      };
      
      console.log('Sending user data:', userData); // Debug log
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        const result = await response.json();
        console.error('API Error Response:', result); // Debug log
        
        // Handle validation errors
        if (result.details && Array.isArray(result.details)) {
          const validationErrors = result.details.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
          throw new Error(`Validation error: ${validationErrors}`);
        }
        
        throw new Error(result.error || 'Failed to create user');
      }

      const result = await response.json();
      console.log('Success response:', result); // Debug log

      // Show success message
      toast.success(result.message || 'User created successfully', {
        description: result.requiresPasswordSetup 
          ? 'The user will receive an email to set up their password.'
          : 'User account is ready to use.',
        duration: 5000,
      });

      // Reset form and close dialog
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        personalNumber: '',
        phone: '',
        dateOfBirth: '',
        street: '',
        city: '',
        region: '',
        zipCode: '',
        country: '',
        roles: [],
        status: 'ACTIVE',
        totalFlightHours: 0,
        licenseNumber: '',
        medicalClass: '',
        instructorRating: '',
      });
      setSelectedRoles([]);
      setSelectedCountry('');
      setSelectedRegion('');
      setShowCreateDialog(false);
      
      // Refresh users list
      fetchUsers();
      
      // Clear any errors
      setError('');
      
      // Show success toast
      toast.success('User created successfully!', {
        description: `${userData.firstName} ${userData.lastName} has been added to the system.`,
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Create user error:', err); // Debug log
      setError(err.message);
      toast.error('Failed to create user', {
        description: err.message,
        duration: 4000,
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Function to refresh import summary
  const refreshImportSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/import-summary', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const summary = await response.json();
        console.log('Refreshed import summary:', summary); // Debug log
        setImportSummary(summary);
      }
    } catch (error) {
      console.error('Failed to refresh import summary:', error);
    }
  };

  // Badge color logic copied from UserManagement
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-destructive-10 text-destructive border-destructive-20';
      case 'ADMIN':
        return 'bg-accent-10 text-accent-foreground border-accent-20';
      case 'INSTRUCTOR':
        return 'bg-primary-10 text-primary border-primary-20';
      case 'PILOT':
        return 'bg-success-10 text-success border-success-20';
      case 'STUDENT':
        return 'bg-warning-10 text-warning border-warning-20';
      case 'BASE_MANAGER':
        return 'bg-primary-20 text-primary border-primary-20';
      case 'PROSPECT':
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
      case 'SUSPENDED':
        return 'bg-destructive-10 text-destructive border-destructive-20';
      case 'PENDING_APPROVAL':
        return 'bg-warning-10 text-warning border-warning-20';
      default:
        return 'bg-muted text-muted-foreground border-gray-200 dark:border-gray-700';
    }
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  // Sync selectedRoles with form state
  useEffect(() => {
    setValue('roles', selectedRoles);
  }, [selectedRoles, setValue]);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      case 'INSTRUCTOR':
        return 'Instructor';
      case 'PILOT':
        return 'Pilot';
      case 'STUDENT':
        return 'Student';
      case 'BASE_MANAGER':
        return 'Base Manager';
      case 'PROSPECT':
        return 'Prospect';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6 w-full">
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImportUsers}
        disabled={importLoading}
      />
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Users Import
              </CardTitle>
              <CardDescription>
                Import users in bulk, download a template, or add a user manually. Only accessible to superadmins.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importLoading ? 'Importing...' : 'Import Users'}
              </Button>
              <Button onClick={handleAddUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 w-full">
          {/* Import Progress Indicator */}
          {importProgress && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="font-medium text-sm">Importing Users</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {importProgress.current} / {importProgress.total} ({importProgress.percentage}%)
                </span>
              </div>
              <Progress value={importProgress.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">{importProgress.status}</p>
            </div>
          )}
          
          {/* Last Import Summary */}
          <Alert className="mb-0 w-full flex items-center gap-4">
            {importSummary ? (
              <>
                {importSummary.success ? (
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <AlertTitle>Last Import Summary</AlertTitle>
                  <AlertDescription>
                    {formatDateTimeWithCurrentFormat(importSummary.timestamp)} -{' '}
                    {importSummary.imported} users imported successfully
                    {importSummary.errors > 0 && ` (${importSummary.errors} errors)`}
                    {importSummary.total > 0 && ` from ${importSummary.total} total records`}
                  </AlertDescription>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshImportSummary}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Badge className={(importSummary.success ? 'bg-success-10 text-success border-success-20' : 'bg-destructive-10 text-destructive border-destructive-20')}>
                    {importSummary.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <AlertTitle>Last Import Summary</AlertTitle>
                  <AlertDescription>
                    No import has been performed yet. Use the "Import Users" button to start importing users from a CSV file.
                  </AlertDescription>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshImportSummary}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Badge className="bg-muted text-muted-foreground border-gray-200 dark:border-gray-700">
                    No Data
                  </Badge>
                </div>
              </>
            )}
          </Alert>
          {/* Show detailed import errors if any */}
          {importSummary && importSummary.errors > 0 && (
            <div className="bg-destructive/10 border border-destructive rounded p-4 mb-4 max-h-64 overflow-y-auto">
              <div className="font-semibold mb-2 text-destructive">Import Errors ({importSummary.errors}):</div>
              {importSummary.errorDetails && Array.isArray(importSummary.errorDetails) && importSummary.errorDetails.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-destructive">
                  {importSummary.errorDetails.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-destructive">Error details not available</p>
              )}
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4 w-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Flight Hours</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Input
                      placeholder="Search name/email..."
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <CompactCombobox
                      options={roleOptions}
                      value={roleFilter}
                      onValueChange={v => { setRoleFilter(v); setPagination(p => ({ ...p, page: 1 })); }}
                      placeholder="All roles..."
                    />
                  </TableCell>
                  <TableCell>
                    <CompactCombobox
                      options={statusOptions}
                      value={statusFilter}
                      onValueChange={v => { setStatusFilter(v); setPagination(p => ({ ...p, page: 1 })); }}
                      placeholder="All statuses..."
                    />
                  </TableCell>
                  <TableCell>
                    <CompactCombobox
                      options={verifiedOptions}
                      value={verifiedFilter}
                      onValueChange={v => { setVerifiedFilter(v); setPagination(p => ({ ...p, page: 1 })); }}
                      placeholder="All verification statuses..."
                    />
                  </TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, idx) => (
                    <TableRow key={user.id || idx}>
                      <TableCell>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {user.roles.map((role: string) => (
                            <Badge key={role} className={getRoleBadgeColor(role)}>{formatRoleLabel(role)}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(user.status)}>{user.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.identityVerified ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}>
                          {user.identityVerified ? 'Verified' : 'Not Verified'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.totalFlightHours}</TableCell>
                      <TableCell>{user.createdAt ? formatDate(user.createdAt, dateFormat) : ''}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination Controls - match User Management */}
          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} users
              </div>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Modal
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setCreateForm({
            firstName: '',
            lastName: '',
            email: '',
            personalNumber: '',
            phone: '',
            dateOfBirth: '',
            street: '',
            city: '',
            region: '',
            zipCode: '',
            country: '',
            roles: [],
            status: 'ACTIVE',
            totalFlightHours: 0,
            licenseNumber: '',
            medicalClass: '',
            instructorRating: '',
          });
          setSelectedRoles([]);
          setSelectedCountry('');
          setSelectedRegion('');
          setError('');
        }}
        title="Create New User"
        headerActions={
          <Button onClick={handleCreateUser} disabled={createLoading}>
            {createLoading ? 'Creating...' : 'Create User'}
          </Button>
        }
      >
          
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">First Name *</Label>
                  <Input
                    value={createForm.firstName}
                    onChange={(e) => handleCreateFormChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Last Name *</Label>
                  <Input
                    value={createForm.lastName}
                    onChange={(e) => handleCreateFormChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email Address *</Label>
                  <Input
                    value={createForm.email}
                    onChange={(e) => handleCreateFormChange('email', e.target.value)}
                    placeholder="Enter email"
                    type="email"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Personal Number</Label>
                  <Input
                    value={createForm.personalNumber}
                    onChange={(e) => handleCreateFormChange('personalNumber', e.target.value)}
                    placeholder="CNP (Romania), SSN (US), etc."
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                  <Input
                    value={createForm.phone}
                    onChange={(e) => handleCreateFormChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  <Input
                    value={createForm.dateOfBirth}
                    onChange={(e) => handleCreateFormChange('dateOfBirth', e.target.value)}
                    type="date"
                    className="bg-background border-input"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Address Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Country *</Label>
                  <Select value={selectedCountry} onValueChange={handleCountryChange}>
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {EUROPEAN_COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Region/State</Label>
                  <Select 
                    value={selectedRegion} 
                    onValueChange={handleRegionChange}
                    disabled={!selectedCountry}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder={selectedCountry ? "Select region" : "Select country first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCountry && getRegionsByCountryCode(selectedCountry).map((region) => (
                        <SelectItem key={region.code} value={region.code}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">City/Place *</Label>
                  <Input
                    value={createForm.city}
                    onChange={(e) => handleCreateFormChange('city', e.target.value)}
                    placeholder="Enter city or place"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Street Details</Label>
                  <Input
                    value={createForm.street}
                    onChange={(e) => handleCreateFormChange('street', e.target.value)}
                    placeholder="Street, number, building, etc."
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">ZIP/Postal Code</Label>
                  <Input
                    value={createForm.zipCode}
                    onChange={(e) => handleCreateFormChange('zipCode', e.target.value)}
                    placeholder="Enter postal code"
                    className="bg-background border-input"
                  />
                </div>
              </div>
            </div>

            {/* Flight School Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <Plane className="h-5 w-5 mr-2" />
                Flight School Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Role *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'BASE_MANAGER', 'PROSPECT'].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`role-${role}`}
                          checked={selectedRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles(prev => [...prev, role]);
                            } else {
                              setSelectedRoles(prev => prev.filter(r => r !== role));
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`role-${role}`} className="text-sm">
                          {getRoleDisplayName(role)}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedRoles.length === 0 && (
                    <p className="text-sm text-destructive">At least one role must be selected</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Select value={createForm.status} onValueChange={(value) => handleCreateFormChange('status', value)}>
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Total Flight Hours</Label>
                  <Input
                    value={createForm.totalFlightHours}
                    onChange={(e) => handleCreateFormChange('totalFlightHours', parseFloat(e.target.value) || 0)}
                    type="number"
                    step="0.1"
                    placeholder="Enter flight hours"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                  <Input
                    value={createForm.licenseNumber}
                    onChange={(e) => handleCreateFormChange('licenseNumber', e.target.value)}
                    placeholder="Enter license number"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Medical Class</Label>
                  <Input
                    value={createForm.medicalClass}
                    onChange={(e) => handleCreateFormChange('medicalClass', e.target.value)}
                    placeholder="Enter medical class"
                    className="bg-background border-input"
                  />
                </div>
                {selectedRoles.includes('INSTRUCTOR') && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Instructor Rating</Label>
                    <Input
                      value={createForm.instructorRating}
                      onChange={(e) => handleCreateFormChange('instructorRating', e.target.value)}
                      placeholder="Enter instructor rating"
                      className="bg-background border-input"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
      </Modal>
    </div>
  );
} 