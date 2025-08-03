'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, UserCheck, UserX, Eye, EyeOff, X, User, MapPin, Plane, Settings, Download, Upload, ChevronsUpDown, Check, MoreVertical, UserMinus } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Modal } from './ui/Modal';

// User creation schema
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  personalNumber: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  roles: z.array(z.string()).min(1, 'At least one role must be selected'),
  licenseNumber: z.string().optional(),
  medicalClass: z.string().optional(),
  instructorRating: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  personalNumber?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  roles: string[];
  status: string;
  totalFlightHours: number;
  licenseNumber?: string;
  medicalClass?: string;
  instructorRating?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
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
  placeholder 
}: { 
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
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
          className="w-full h-8 justify-between text-xs"
          size="sm"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
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

export default function UserManagement() {
  const { formatDate } = useDateFormatUtils();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL_STATUSES');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['STUDENT']);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [upgradeRoleDialogOpen, setUpgradeRoleDialogOpen] = useState(false);
  const [userToUpgrade, setUserToUpgrade] = useState<User | null>(null);
  const [upgradeRole, setUpgradeRole] = useState<string>('STUDENT');
  const [upgradeValidationData, setUpgradeValidationData] = useState({
    licenseNumber: '',
    medicalClass: '',
    instructorRating: '',
    totalFlightHours: 0,
  });
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [userToActivate, setUserToActivate] = useState<User | null>(null);
  const [activatePaymentData, setActivatePaymentData] = useState({
    paymentReference: '',
    paymentAmount: 0,
    paymentMethod: '',
    notes: '',
  });

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

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (roleFilter && roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter && statusFilter !== 'ALL_STATUSES') params.append('status', statusFilter);

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      console.log('fetchUsers response:', data); // Debug log
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, search, roleFilter, statusFilter]);

  // Fetch all users for combobox options (once on mount)
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users?limit=10000', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAllUsers(data.users);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchAllUsers();
  }, []);

  const handleCreateUser = async (data: CreateUserForm) => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('token');
      
      // Add the selected roles to the data
      const userData = {
        ...data,
        roles: selectedRoles,
      };
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create user');
      }

      // Reset form and close dialog
      reset();
      setSelectedRoles(['STUDENT']);
      setShowCreateDialog(false);
      
      // Refresh users list
      fetchUsers();
      
      // Clear any errors
      setError('');
      
      // Show success toast
      toast.success('User created successfully!', {
        description: `${data.firstName} ${data.lastName} has been added to the system.`,
        duration: 3000,
      });
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to create user', {
        description: err.message,
        duration: 4000,
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user status');
      }

      // Refresh users list
      fetchUsers();
      
      // Show success toast
      const user = users.find(u => u.id === userId);
      toast.success('Status updated successfully!', {
        description: `${user?.firstName} ${user?.lastName}'s status has been changed to ${newStatus.toLowerCase()}.`,
        duration: 3000,
      });
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to update status', {
        description: err.message,
        duration: 4000,
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserToDelete(users.find(u => u.id === userId) || null);
    setDeleteConfirmOpen(true);
  };

  const handleUpgradeRole = async (userId: string, newRole: string, validationData?: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}/upgrade-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newRole,
          validationData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upgrade user role');
      }

      const result = await response.json();
      
      // Refresh users list
      fetchUsers();
      
      // Show success toast
      toast.success('User role upgraded successfully!', {
        description: `${result.user.firstName} ${result.user.lastName} has been upgraded from PROSPECT to ${newRole}.`,
        duration: 3000,
      });
      
      // Close dialog
      setUpgradeRoleDialogOpen(false);
      setUserToUpgrade(null);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to upgrade user role', {
        description: err.message,
        duration: 4000,
      });
    }
  };

  const openUpgradeDialog = (user: User) => {
    setUserToUpgrade(user);
    setUpgradeRole('STUDENT');
    setUpgradeValidationData({
      licenseNumber: user.licenseNumber || '',
      medicalClass: user.medicalClass || '',
      instructorRating: user.instructorRating || '',
      totalFlightHours: user.totalFlightHours || 0,
    });
    setUpgradeRoleDialogOpen(true);
  };

  const handleActivateUser = async (userId: string, paymentData?: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData || {}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate user');
      }

      const result = await response.json();
      
      // Refresh users list
      fetchUsers();
      
      // Show success toast
      toast.success('User activated successfully!', {
        description: `${result.user.firstName} ${result.user.lastName} has been activated after payment verification.`,
        duration: 3000,
      });
      
      // Close dialog
      setActivateDialogOpen(false);
      setUserToActivate(null);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to activate user', {
        description: err.message,
        duration: 4000,
      });
    }
  };

  const openActivateDialog = (user: User) => {
    setUserToActivate(user);
    setActivatePaymentData({
      paymentReference: '',
      paymentAmount: 0,
      paymentMethod: '',
      notes: '',
    });
    setActivateDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Get user info before deletion for toast
      const user = userToDelete;
      
      // Refresh users list
      fetchUsers();
      
      // Show success toast
      toast.success('User deleted successfully!', {
        description: `${user?.firstName} ${user?.lastName} has been removed from the system.`,
        duration: 3000,
      });
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to delete user', {
        description: err.message,
        duration: 4000,
      });
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  };

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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

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

  // Check if current user is super admin
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Debug - API response data:', data); // Debug log
          setCurrentUser(data); // The API returns user data directly, not nested under 'user'
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  const isSuperAdmin = currentUser?.userRoles?.some((userRole: any) => userRole.roles.name === 'SUPER_ADMIN');
  const isAdmin = currentUser?.userRoles?.some((userRole: any) => userRole.roles.name === 'ADMIN');
  const canEdit = isSuperAdmin || isAdmin;

  // Debug: Log role detection
  console.log('Debug - currentUser:', currentUser);
  console.log('Debug - currentUser.userRoles:', currentUser?.userRoles);
  console.log('Debug - isSuperAdmin:', isSuperAdmin);
  console.log('Debug - isAdmin:', isAdmin);
  console.log('Debug - canEdit:', canEdit);

  // Initialize edit form when user is selected
  useEffect(() => {
    if (selectedUser) {
      setEditForm({
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
        personalNumber: selectedUser.personalNumber || '',
        phone: selectedUser.phone || '',
        dateOfBirth: selectedUser.dateOfBirth ? selectedUser.dateOfBirth.split('T')[0] : '',
        address: selectedUser.address || '',
        city: selectedUser.city || '',
        state: selectedUser.state || '',
        zipCode: selectedUser.zipCode || '',
        country: selectedUser.country || '',
        status: selectedUser.status,
        totalFlightHours: selectedUser.totalFlightHours,
        licenseNumber: selectedUser.licenseNumber || '',
        medicalClass: selectedUser.medicalClass || '',
        instructorRating: selectedUser.instructorRating || '',
        roles: selectedUser.roles
      });
    }
  }, [selectedUser]);

  // Debug: Monitor selectedUser changes
  useEffect(() => {
    console.log('selectedUser changed:', selectedUser);
  }, [selectedUser]);

  // Handle edit form changes
  const handleEditChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // Save user changes
  const handleSaveUser = async () => {
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('Sending update data:', editForm); // Debug log
      
      const response = await fetch(`/api/users/${selectedUser?.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const result = await response.json();
        console.error('API Error Response:', result); // Debug log
        throw new Error(result.error || 'Failed to update user');
      }

      const result = await response.json();
      
      console.log('API Response:', result); // Debug log
      
      // Update the selectedUser state with the updated data
      if (result.user) {
        console.log('Updating selectedUser with:', result.user); // Debug log
        
        // Force a complete state update by creating a new object
        const updatedUser = {
          ...result.user,
          // Ensure all fields are properly set
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          personalNumber: result.user.personalNumber || null,
          phone: result.user.phone || null,
          dateOfBirth: result.user.dateOfBirth,
          address: result.user.address || null,
          city: result.user.city || null,
          state: result.user.state || null,
          zipCode: result.user.zipCode || null,
          country: result.user.country || null,
          status: result.user.status,
          totalFlightHours: result.user.totalFlightHours,
          licenseNumber: result.user.licenseNumber || null,
          medicalClass: result.user.medicalClass || null,
          instructorRating: result.user.instructorRating || null,
          roles: result.user.roles || [],
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
          lastLoginAt: result.user.lastLoginAt,
          createdBy: result.user.createdBy
        };
        
        setSelectedUser(updatedUser);
        
        // Also update the editForm to match the new data
        setEditForm({
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          email: result.user.email,
          personalNumber: result.user.personalNumber || '',
          phone: result.user.phone || '',
          dateOfBirth: result.user.dateOfBirth ? result.user.dateOfBirth.split('T')[0] : '',
          address: result.user.address || '',
          city: result.user.city || '',
          state: result.user.state || '',
          zipCode: result.user.zipCode || '',
          country: result.user.country || '',
          status: result.user.status,
          totalFlightHours: result.user.totalFlightHours,
          licenseNumber: result.user.licenseNumber || '',
          medicalClass: result.user.medicalClass || '',
          instructorRating: result.user.instructorRating || '',
          roles: result.user.roles
        });
      }
      
      setIsEditing(false);
      
      // Add a small delay to ensure the database transaction has completed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh both the users list and allUsers for combobox options
      await fetchUsers();
      
      // Also refresh allUsers for combobox options
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users?limit=10000', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAllUsers(data.users);
        }
      } catch (err) {
        console.error('Error refreshing allUsers:', err);
      }
      
      setError('');
      
      // Show success toast
      toast.success('User updated successfully!', {
        description: `${result.user?.firstName || selectedUser?.firstName} ${result.user?.lastName || selectedUser?.lastName}'s information has been updated.`,
        duration: 3000,
      });
    } catch (error: any) {
      setError(error.message);
      toast.error('Failed to update user', {
        description: error.message,
        duration: 4000,
      });
    } finally {
      setSaveLoading(false);
    }
  };

  // Download CSV template
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/import', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success toast
      toast.success('Template downloaded successfully!', {
        description: 'The CSV template has been downloaded to your device.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      setError('Failed to download template');
      toast.error('Failed to download template', {
        description: 'There was an error downloading the template file.',
        duration: 4000,
      });
    }
  };

  // Import users from CSV
  const handleImportUsers = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      setImportResults(null);
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/users/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import users');
      }

      setImportResults(result);
      
      // Refresh users list if any users were created
      if (result.results.success > 0) {
        fetchUsers();
        
        // Show success toast
        toast.success('Users imported successfully!', {
          description: `${result.results.success} users were imported. ${result.results.errors.length > 0 ? `${result.results.errors.length} errors occurred.` : ''}`,
          duration: 4000,
        });
      } else if (result.results.errors.length > 0) {
        // Show warning if no users were imported but there were errors
        toast.warning('Import completed with errors', {
          description: `No users were imported. ${result.results.errors.length} errors occurred.`,
          duration: 4000,
        });
      }
    } catch (error: any) {
      setError(error.message);
      toast.error('Import failed', {
        description: error.message,
        duration: 4000,
      });
    } finally {
      setImportLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Generate unique role and status options from all users
  const allRoles = useMemo(() => {
    const roles = new Set<string>();
    allUsers.forEach(u => u.roles.forEach(r => roles.add(r)));
    return Array.from(roles).sort();
  }, [allUsers]);
  const allStatuses = useMemo(() => {
    const statuses = new Set(allUsers.map(u => u.status));
    return Array.from(statuses).sort();
  }, [allUsers]);

  const roleOptions = useMemo(() => [
    { value: 'ALL', label: 'All Roles' },
    ...allRoles.map(r => ({ value: r, label: getRoleDisplayName(r) }))
  ], [allRoles]);
  const statusOptions = useMemo(() => [
    { value: 'ALL_STATUSES', label: 'All Statuses' },
    ...allStatuses.map(s => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))
  ], [allStatuses]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = search ? (user.firstName + ' ' + user.lastName + ' ' + user.email + ' ' + user.personalNumber + ' ' + user.licenseNumber).toLowerCase().includes(search.toLowerCase()) : true;
      const matchesRole = roleFilter && roleFilter !== 'ALL' ? user.roles.includes(roleFilter) : true;
      const matchesStatus = statusFilter && statusFilter !== 'ALL_STATUSES' ? user.status === statusFilter : true;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <>
      {/* Main User Table Section - no Card wrapper */}
      <div className="space-y-6">
        {/* Users Table */}
        <Card className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-64">User</TableHead>
                    <TableHead className="w-48">Role</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-32">Flight Hours</TableHead>
                    <TableHead className="w-32">Created</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Input
                        placeholder="Search name/email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <CompactCombobox
                        options={roleOptions}
                        value={roleFilter}
                        onValueChange={setRoleFilter}
                        placeholder="Select role..."
                      />
                    </TableCell>
                    <TableCell>
                      <CompactCombobox
                        options={statusOptions}
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                        placeholder="Select status..."
                      />
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                    ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                      filteredUsers.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserDialog(true);
                        }}
                      >
                        <TableCell className="w-64">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(user.firstName, user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-48">
                          <div className="flex flex-wrap gap-2">
                            {user.roles.map((role) => (
                              <Badge key={role} className={getRoleBadgeColor(role)}>
                                {getRoleDisplayName(role)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="w-32">
                          <Badge className={getStatusBadgeColor(user.status)}>
                            {user.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-32">{user.totalFlightHours}</TableCell>
                        <TableCell className="w-32">
                            {formatDate(user.createdAt)}
                          </TableCell>
                        <TableCell className="w-24" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(user);
                                setShowUserDialog(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" /> Edit User
                              </DropdownMenuItem>
                              {user.roles.includes('PROSPECT') && (
                                <DropdownMenuItem onClick={() => openUpgradeDialog(user)}>
                                  <UserCheck className="h-4 w-4 mr-2" /> Upgrade Role
                                </DropdownMenuItem>
                              )}
                              {user.status === 'INACTIVE' && (
                                <DropdownMenuItem onClick={() => openActivateDialog(user)}>
                                  <UserCheck className="h-4 w-4 mr-2" /> Activate User
                                </DropdownMenuItem>
                              )}
                              {user.status === 'ACTIVE' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'INACTIVE')}>
                                    <UserMinus className="h-4 w-4 mr-2" /> Mark Inactive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'SUSPENDED')}>
                                    <UserX className="h-4 w-4 mr-2" /> Suspend
                                  </DropdownMenuItem>
                                </>
                              )}
                              {user.status === 'INACTIVE' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'ACTIVE')}>
                                    <UserCheck className="h-4 w-4 mr-2" /> Activate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'SUSPENDED')}>
                                    <UserX className="h-4 w-4 mr-2" /> Suspend
                                  </DropdownMenuItem>
                                </>
                              )}
                              {user.status === 'SUSPENDED' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'ACTIVE')}>
                                    <UserCheck className="h-4 w-4 mr-2" /> Activate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'INACTIVE')}>
                                    <UserMinus className="h-4 w-4 mr-2" /> Mark Inactive
                                  </DropdownMenuItem>
                                </>
                              )}
                              {user.status === 'PENDING_APPROVAL' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'ACTIVE')}>
                                    <UserCheck className="h-4 w-4 mr-2" /> Activate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'INACTIVE')}>
                                    <UserMinus className="h-4 w-4 mr-2" /> Mark Inactive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'SUSPENDED')}>
                                    <UserX className="h-4 w-4 mr-2" /> Suspend
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
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
      </div>
      {/* End Main User Table Section */}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the Cruiser Aviation system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    {...register('firstName')}
                    className={`bg-background border-input ${errors?.firstName ? 'border-destructive' : ''}`}
                  />
                  {errors?.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    {...register('lastName')}
                    className={`bg-background border-input ${errors?.lastName ? 'border-destructive' : ''}`}
                  />
                  {errors?.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    {...register('email')}
                    className={`bg-background border-input ${errors?.email ? 'border-destructive' : ''}`}
                  />
                  {errors?.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalNumber">Personal Number</Label>
                  <Input
                    id="personalNumber"
                    placeholder="CNP (Romania), SSN (US), etc."
                    {...register('personalNumber')}
                    className="bg-background border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    {...register('phone')}
                    className="bg-background border-input"
                  />
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Authentication</h3>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    {...register('password')}
                    className={`bg-background border-input ${errors?.password ? 'border-destructive' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors?.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Cruiser Aviation Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cruiser Aviation Information</h3>
              <div className="space-y-2">
                <Label htmlFor="roles">Roles *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['PILOT', 'STUDENT', 'INSTRUCTOR', 'ADMIN', 'BASE_MANAGER', 'PROSPECT'].map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={role}
                        checked={selectedRoles.includes(role)}
                        onChange={() => handleRoleToggle(role)}
                        className="rounded border-gray-200 dark:border-gray-700"
                      />
                      <Label htmlFor={role} className="text-sm font-normal">
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
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  placeholder="Enter license number"
                  {...register('licenseNumber')}
                  className="bg-background border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalClass">Medical Class</Label>
                <Input
                  id="medicalClass"
                  placeholder="Enter medical class"
                  {...register('medicalClass')}
                  className="bg-background border-input"
                />
              </div>

              {selectedRoles.includes('INSTRUCTOR') && (
                <div className="space-y-2">
                  <Label htmlFor="instructorRating">Instructor Rating</Label>
                  <Input
                    id="instructorRating"
                    placeholder="Enter instructor rating"
                    {...register('instructorRating')}
                    className="bg-background border-input"
                  />
                </div>
              )}
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Information</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter address"
                  {...register('address')}
                  className="bg-background border-input"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    {...register('city')}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="Enter state"
                    {...register('state')}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="Enter ZIP code"
                    {...register('zipCode')}
                    className="bg-background border-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Enter country"
                  {...register('country')}
                  className="bg-background border-input"
                />
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
                {createLoading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Modal
        open={showUserDialog}
        onClose={() => setShowUserDialog(false)}
        title="User Details"
        description="Complete user information and profile details"
        headerActions={
          selectedUser && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleSaveUser}
                    disabled={saveLoading}
                  >
                    {saveLoading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          )
        }
      >
        {selectedUser ? (
          <div key={selectedUser.id + selectedUser.updatedAt} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.firstName}
                      onChange={(e) => handleEditChange('firstName', e.target.value)}
                      placeholder="Enter first name"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base font-medium text-card-foreground">{selectedUser.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.lastName}
                      onChange={(e) => handleEditChange('lastName', e.target.value)}
                      placeholder="Enter last name"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base font-medium text-card-foreground">{selectedUser.lastName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.email}
                      onChange={(e) => handleEditChange('email', e.target.value)}
                      placeholder="Enter email"
                      type="email"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Personal Number</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.personalNumber}
                      onChange={(e) => handleEditChange('personalNumber', e.target.value)}
                      placeholder="Enter personal number"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.personalNumber || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.phone}
                      onChange={(e) => handleEditChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.phone || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  {isEditing ? (
                    <DatePicker
                      value={editForm.dateOfBirth ? new Date(editForm.dateOfBirth) : undefined}
                      onChange={(date) => handleEditChange('dateOfBirth', date ? date.toISOString().split('T')[0] : '')}
                      placeholder="Select date of birth"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">
                      {selectedUser.dateOfBirth ? formatDate(selectedUser.dateOfBirth) : '-'}
                    </p>
                  )}
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
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.address}
                      onChange={(e) => handleEditChange('address', e.target.value)}
                      placeholder="Enter address"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.address || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">City</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.city}
                      onChange={(e) => handleEditChange('city', e.target.value)}
                      placeholder="Enter city"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.city || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">State/Province</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.state}
                      onChange={(e) => handleEditChange('state', e.target.value)}
                      placeholder="Enter state"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.state || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">ZIP/Postal Code</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.zipCode}
                      onChange={(e) => handleEditChange('zipCode', e.target.value)}
                      placeholder="Enter ZIP code"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.zipCode || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.country}
                      onChange={(e) => handleEditChange('country', e.target.value)}
                      placeholder="Enter country"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.country || '-'}</p>
                  )}
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
                  <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2">
                      {['ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'BASE_MANAGER', 'PROSPECT'].map((role) => (
                        <div key={role} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`role-${role}`}
                            checked={editForm.roles.includes(role)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleEditChange('roles', [...editForm.roles, role]);
                              } else {
                                handleEditChange('roles', editForm.roles.filter((r: string) => r !== role));
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
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.roles.map((role) => (
                        <Badge key={role} className={getRoleBadgeColor(role)}>
                          {getRoleDisplayName(role)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  {isEditing ? (
                    <Select value={editForm.status} onValueChange={(value) => handleEditChange('status', value)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getStatusBadgeColor(selectedUser.status)}>
                      {selectedUser.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Total Flight Hours</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.totalFlightHours}
                      onChange={(e) => handleEditChange('totalFlightHours', parseFloat(e.target.value) || 0)}
                      type="number"
                      step="0.1"
                      placeholder="Enter flight hours"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base font-medium text-card-foreground">
                      {selectedUser.totalFlightHours ? selectedUser.totalFlightHours.toLocaleString() : '0'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.licenseNumber}
                      onChange={(e) => handleEditChange('licenseNumber', e.target.value)}
                      placeholder="Enter license number"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.licenseNumber || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Medical Class</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.medicalClass}
                      onChange={(e) => handleEditChange('medicalClass', e.target.value)}
                      placeholder="Enter medical class"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.medicalClass || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Instructor Rating</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.instructorRating}
                      onChange={(e) => handleEditChange('instructorRating', e.target.value)}
                      placeholder="Enter instructor rating"
                      className="bg-background border-input"
                    />
                  ) : (
                    <p className="text-base text-card-foreground">{selectedUser.instructorRating || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                System Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Account Created</Label>
                  <p className="text-base text-card-foreground">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <p className="text-base text-card-foreground">{formatDate(selectedUser.updatedAt)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
                  <p className="text-base text-card-foreground">
                    {selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : 'Never'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                  <p className="text-base text-card-foreground">
                    {selectedUser.createdBy ? `${selectedUser.createdBy.firstName} ${selectedUser.createdBy.lastName}` : 'System'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Import Users Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Users</DialogTitle>
            <DialogDescription>
              Import multiple users from a CSV file. Download the template first to see the required format.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Download Template Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 1: Download Template</h3>
              <p className="text-sm text-muted-foreground">
                Download the CSV template to see the required format and column headers.
              </p>
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            {/* Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 2: Upload CSV File</h3>
              <p className="text-sm text-muted-foreground">
                Select a CSV file with user data to import. The file should follow the template format.
              </p>
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportUsers}
                  className="hidden"
                  id="csv-upload"
                  disabled={importLoading}
                />
                <label
                  htmlFor="csv-upload"
                  className={`cursor-pointer inline-flex items-center space-x-2 ${
                    importLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="h-6 w-6" />
                  <span className="font-medium">
                    {importLoading ? 'Processing...' : 'Choose CSV file or drag and drop'}
                  </span>
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  Only CSV files are supported
                </p>
              </div>
            </div>

            {/* Import Results */}
            {importResults && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Import Results</h3>
                <div className="space-y-3">
                  <Alert variant={importResults.results.success > 0 ? "default" : "destructive"}>
                    <AlertDescription>
                      {importResults.message}
                    </AlertDescription>
                  </Alert>
                  
                  {importResults.results.success > 0 && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-medium mb-2">Successfully Imported ({importResults.results.success})</h4>
                      <div className="space-y-1">
                        {importResults.results.details
                          .filter((detail: any) => detail.status === 'success')
                          .map((detail: any, index: number) => (
                            <div key={index} className="text-sm text-muted-foreground">
                              Row {detail.row}: {detail.email} - {detail.message}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {importResults.results.errors.length > 0 && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <h4 className="font-medium text-destructive mb-2">Errors ({importResults.results.errors.length})</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {importResults.results.errors.map((error: string, index: number) => (
                          <div key={index} className="text-sm text-destructive">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-2">Important Notes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Email addresses must be unique</li>
                <li>• First name and last name are required</li>
                <li>• Roles should be comma-separated (e.g., "PILOT,STUDENT")</li>
                <li>• If no password is provided, a random password will be generated</li>
                <li>• Date format should be YYYY-MM-DD</li>
                <li>• Only Super Admins can import users</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportResults(null);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user "{userToDelete?.firstName} {userToDelete?.lastName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Role Dialog */}
      <Dialog open={upgradeRoleDialogOpen} onOpenChange={setUpgradeRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade User Role</DialogTitle>
            <DialogDescription>
              Upgrade {userToUpgrade?.firstName} {userToUpgrade?.lastName} from PROSPECT to a new role. Please provide validation information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newRole">New Role</Label>
              <Select value={upgradeRole} onValueChange={setUpgradeRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="PILOT">Pilot</SelectItem>
                  <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={upgradeValidationData.licenseNumber}
                onChange={(e) => setUpgradeValidationData(prev => ({
                  ...prev,
                  licenseNumber: e.target.value
                }))}
                placeholder="Enter license number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicalClass">Medical Class</Label>
              <Select 
                value={upgradeValidationData.medicalClass} 
                onValueChange={(value) => setUpgradeValidationData(prev => ({
                  ...prev,
                  medicalClass: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medical class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Class 1">Class 1</SelectItem>
                  <SelectItem value="Class 2">Class 2</SelectItem>
                  <SelectItem value="Class 3">Class 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {upgradeRole === 'INSTRUCTOR' && (
              <div className="space-y-2">
                <Label htmlFor="instructorRating">Instructor Rating</Label>
                <Input
                  id="instructorRating"
                  value={upgradeValidationData.instructorRating}
                  onChange={(e) => setUpgradeValidationData(prev => ({
                    ...prev,
                    instructorRating: e.target.value
                  }))}
                  placeholder="Enter instructor rating"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="totalFlightHours">Total Flight Hours</Label>
              <Input
                id="totalFlightHours"
                type="number"
                value={upgradeValidationData.totalFlightHours}
                onChange={(e) => setUpgradeValidationData(prev => ({
                  ...prev,
                  totalFlightHours: parseInt(e.target.value) || 0
                }))}
                placeholder="Enter total flight hours"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setUpgradeRoleDialogOpen(false);
                setUserToUpgrade(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleUpgradeRole(
                userToUpgrade!.id, 
                upgradeRole, 
                upgradeValidationData
              )}
            >
              Upgrade Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activate User Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activate User</DialogTitle>
            <DialogDescription>
              Activate {userToActivate?.firstName} {userToActivate?.lastName} after payment verification. Please provide payment details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Payment Reference</Label>
              <Input
                id="paymentReference"
                value={activatePaymentData.paymentReference}
                onChange={(e) => setActivatePaymentData(prev => ({
                  ...prev,
                  paymentReference: e.target.value
                }))}
                placeholder="Enter payment reference number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={activatePaymentData.paymentAmount}
                onChange={(e) => setActivatePaymentData(prev => ({
                  ...prev,
                  paymentAmount: parseFloat(e.target.value) || 0
                }))}
                placeholder="Enter payment amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={activatePaymentData.paymentMethod} 
                onValueChange={(value) => setActivatePaymentData(prev => ({
                  ...prev,
                  paymentMethod: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="PayPal">PayPal</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={activatePaymentData.notes}
                onChange={(e) => setActivatePaymentData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Additional notes about payment"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setActivateDialogOpen(false);
                setUserToActivate(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleActivateUser(
                userToActivate!.id, 
                activatePaymentData
              )}
            >
              Activate User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 