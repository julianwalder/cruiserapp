'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Modal } from './ui/Modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Plane, MapPin, User as UserIcon, Edit, Trash2, Plus, Shield, MoreVertical, Upload, Clock, Phone, Eye, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateWithCurrentFormat } from '@/lib/date-utils';
// import type { BaseManagement as BaseManagementType, Airfield, User } from "@/types/uuid-types";

// Temporary inline type definitions
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  personalNumber?: string;
  phone?: string;
  dateOfBirth?: Date | null;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  totalFlightHours: number;
  licenseNumber?: string;
  medicalClass?: string;
  instructorRating?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Airfield {
  id: string;
  name: string;
  code: string;
  type: 'AIRPORT' | 'AIRSTRIP' | 'HELIPORT' | 'SEAPLANE_BASE';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';
  city: string;
  state?: string;
  country: string;
  latitude?: string;
  longitude?: string;
  elevation?: string;
  runwayLength?: string;
  runwaySurface?: string;
  phone?: string;
  email?: string;
  website?: string;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BaseManagementType {
  id: string;
  airfieldId: string;
  baseManagerId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Extended BaseManagement interface for BaseManagement component
interface ExtendedBaseManagement extends BaseManagementType {
  airfield?: Airfield;
  baseManager?: User;
  additionalInfo?: string;
  facilities?: string[];
  operatingHours?: string;
  emergencyContact?: string;
  notes?: string;
  imagePath?: string;
  isActive?: boolean;
}

interface BaseManagementProps {
  canEdit?: boolean;
}

export default function BaseManagement({ canEdit = true }: BaseManagementProps) {
  const [baseManagements, setBaseManagements] = useState<ExtendedBaseManagement[]>([]);
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [baseManagers, setBaseManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseManagersLoading, setBaseManagersLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBaseDetailsDialog, setShowBaseDetailsDialog] = useState(false);
  const [selectedBase, setSelectedBase] = useState<ExtendedBaseManagement | null>(null);
  const [formData, setFormData] = useState<{
    airfieldId: string;
    baseManagerId: string | undefined;
    additionalInfo: string;
    facilities: string[];
    operatingHours: string;
    emergencyContact: string;
    notes: string;
  }>({
    airfieldId: '',
    baseManagerId: undefined,
    additionalInfo: '',
    facilities: [],
    operatingHours: '',
    emergencyContact: '',
    notes: ''
  });

  // Image-related state
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);


  useEffect(() => {
    console.log('🔍 BaseManagement - Component mounted');
    const initializeData = async () => {
      console.log('🔍 BaseManagement - Initializing data...');
      await Promise.all([
        fetchBaseManagements(),
        fetchAirfields(),
        fetchBaseManagers()
      ]);
    };
    
    initializeData();
  }, []);



  const fetchBaseManagements = async () => {
    try {
      // Use optimized endpoint for faster data retrieval
      const response = await fetch('/api/base-management/optimized', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBaseManagements(data);
      } else if (response.status === 403) {
        // User doesn't have permission to access base management
        setBaseManagements([]);
        console.log('User does not have permission to access base management');
      } else {
        toast.error('Failed to fetch bases');
      }
    } catch (error) {
      console.error('Error fetching base managements:', error);
      toast.error('Failed to fetch bases');
    } finally {
      setLoading(false);
    }
  };

  const fetchAirfields = async () => {
    try {
      const response = await fetch('/api/airfields?limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAirfields(data.airfields || data);
      }
    } catch (error) {
      console.error('Error fetching airfields:', error);
    }
  };

  const fetchBaseManagers = async () => {
    try {
      setBaseManagersLoading(true);
      console.log('🔍 Fetching base managers...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('🔍 No token found in localStorage');
        setBaseManagers([]);
        return;
      }
      
      // First try to get BASE_MANAGER users
      let response = await fetch('/api/users?role=BASE_MANAGER', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🔍 Base managers response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Base managers API response:', data);
        console.log('🔍 Base managers array:', data.users);
        console.log('🔍 Number of base managers found:', data.users?.length || 0);
        
        // If no BASE_MANAGER users found, try to get ADMIN users as fallback
        if (data.users?.length === 0) {
          console.log('🔍 No BASE_MANAGER users found, trying ADMIN users...');
          response = await fetch('/api/users?role=ADMIN', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const adminData = await response.json();
            console.log('🔍 Admin users found:', adminData.users?.length || 0);
            
            // If still no users, try to get SUPER_ADMIN users as final fallback
            if (adminData.users?.length === 0) {
              console.log('🔍 No ADMIN users found, trying SUPER_ADMIN users...');
              response = await fetch('/api/users?role=SUPER_ADMIN', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const superAdminData = await response.json();
                console.log('🔍 Super Admin users found:', superAdminData.users?.length || 0);
                setBaseManagers(superAdminData.users || []);
              } else {
                console.error('🔍 Failed to fetch SUPER_ADMIN users:', response.status);
                setBaseManagers([]);
              }
            } else {
              setBaseManagers(adminData.users || []);
            }
          } else {
            console.error('🔍 Failed to fetch ADMIN users:', response.status);
            setBaseManagers([]);
          }
        } else {
          setBaseManagers(data.users || []);
        }
      } else if (response.status === 401) {
        console.error('🔍 Authentication failed - token may be invalid');
        setBaseManagers([]);
      } else if (response.status === 403) {
        // User doesn't have permission to fetch base managers
        setBaseManagers([]);
        console.log('User does not have permission to fetch base managers');
      } else if (response.status === 404) {
        // API endpoint not found
        setBaseManagers([]);
        console.error('Base managers API endpoint not found');
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch base managers:', response.status, errorText);
        setBaseManagers([]);
      }
    } catch (error) {
      console.error('Error fetching base managers:', error);
      setBaseManagers([]);
    } finally {
      setBaseManagersLoading(false);
    }
  };

  const handleCreateBase = async () => {
    try {
      console.log('🔍 Creating base with data:', formData);
      console.log('🔍 Selected airfield ID:', formData.airfieldId);
      console.log('🔍 Available airfields:', airfields.length);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      // Validate airfield ID
      if (!formData.airfieldId) {
        toast.error('Please select an airfield');
        return;
      }
      
      // Check if airfield exists in our list
      const selectedAirfield = airfields.find(af => af.id === formData.airfieldId);
      console.log('🔍 Selected airfield:', selectedAirfield);
      
      if (!selectedAirfield) {
        toast.error('Selected airfield not found in available airfields');
        return;
      }
      
      // Create FormData to handle file upload
      const formDataToSend = new FormData();
      formDataToSend.append('airfieldId', formData.airfieldId);
      formDataToSend.append('baseManagerId', formData.baseManagerId || '');
      formDataToSend.append('additionalInfo', formData.additionalInfo || '');
      formDataToSend.append('operatingHours', formData.operatingHours || '');
      formDataToSend.append('emergencyContact', formData.emergencyContact || '');
      formDataToSend.append('notes', formData.notes || '');
      
      if (baseImage) {
        formDataToSend.append('image', baseImage);
      }

      console.log('🔍 Sending POST request to /api/base-management');
      console.log('🔍 FormData airfieldId:', formDataToSend.get('airfieldId'));
      const response = await fetch('/api/base-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      console.log('🔍 Create base response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Base created successfully:', result);
        toast.success('Base created successfully');
        setShowCreateDialog(false);
        resetForm();
        setBaseImage(null);
        setImagePreview(null);
        fetchBaseManagements();
      } else {
        const errorText = await response.text();
        console.error('🔍 Failed to create base:', response.status, errorText);
        let errorMessage = 'Failed to create base';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If not JSON, use the text as error message
          errorMessage = errorText || errorMessage;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating base:', error);
      toast.error('Error creating base');
    }
  };

  const handleUpdateBase = async () => {
    if (!selectedBase) return;

    try {
      console.log('🔍 Updating base with data:', formData);
      console.log('🔍 Selected base:', selectedBase);
      
      // Create FormData to handle file upload
      const formDataToSend = new FormData();
      formDataToSend.append('managerId', formData.baseManagerId || '');
      formDataToSend.append('additionalInfo', formData.additionalInfo || '');
      formDataToSend.append('operatingHours', formData.operatingHours || '');
      formDataToSend.append('emergencyContact', formData.emergencyContact || '');
      formDataToSend.append('notes', formData.notes || '');
      
      if (baseImage) {
        formDataToSend.append('image', baseImage);
      }

      console.log('🔍 Sending request to:', `/api/base-management/${selectedBase.airfieldId}`);
      console.log('🔍 Manager ID being sent:', formData.baseManagerId);

      const response = await fetch(`/api/base-management/${selectedBase.airfieldId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      });

      console.log('🔍 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Success response:', result);
        toast.success('Base updated successfully');
        setShowEditDialog(false);
        resetForm();
        setBaseImage(null);
        setImagePreview(null);
        fetchBaseManagements();
      } else {
        const error = await response.json();
        console.log('🔍 Error response:', error);
        toast.error(error.error || 'Failed to update base');
      }
    } catch (error) {
      console.error('Error updating base:', error);
      toast.error('Error updating base');
    }
  };

  const handleDeleteBase = async (base: ExtendedBaseManagement) => {
    if (!confirm('Are you sure you want to remove this base designation?')) return;

    try {
      const response = await fetch(`/api/base-management/${base.airfieldId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Base removed successfully');
        fetchBaseManagements();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove base');
      }
    } catch (error) {
      console.error('Error removing base:', error);
      toast.error('Error removing base');
    }
  };

  const resetForm = () => {
    setFormData({
      airfieldId: '',
      baseManagerId: undefined,
      additionalInfo: '',
      facilities: [],
      operatingHours: '',
      emergencyContact: '',
      notes: ''
    });
    setSelectedBase(null);
    setBaseImage(null);
    setImagePreview(null);
  };

  const openEditDialog = (base: ExtendedBaseManagement) => {
    setSelectedBase(base);
    setFormData({
      airfieldId: base.airfieldId,
      baseManagerId: base.baseManagerId || undefined,
      additionalInfo: base.additionalInfo || '',
      facilities: base.facilities || [],
      operatingHours: base.operatingHours || '',
      emergencyContact: base.emergencyContact || '',
      notes: base.notes || ''
    });
    // Set existing image preview if available
    if (base.imagePath) {
      setImagePreview(getImageUrl(base.imagePath) || null);
    } else {
      setImagePreview(null);
    }
    setBaseImage(null); // Reset new image selection
    setShowEditDialog(true);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'large_airport':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'medium_airport':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'small_airport':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'heliport':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'seaplane_base':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
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

  // Helper function to format status display
  const formatStatusDisplay = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'MAINTENANCE':
        return 'Maintenance';
      case 'CLOSED':
        return 'Closed';
      default:
        return 'Unknown';
    }
  };

  // Helper function to get airfield data from either airfield or airfields property
  const getAirfieldData = (base: ExtendedBaseManagement): Airfield => {
    return base.airfield || {
      id: base.airfieldId,
      name: 'Unknown Airfield',
      code: 'N/A',
      type: 'AIRPORT',
      city: 'Unknown',
      country: 'Unknown',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  // Image handling functions
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBaseImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath || imagePath.trim() === '') return null;
    
    // If it's already a full URL (Vercel Blob), add optimization parameters
    if (imagePath.startsWith('http')) {
      // Add Vercel Blob optimization parameters
      const optimizedUrl = `${imagePath}?w=400&h=300&fit=crop&f=webp&q=80`;
      return optimizedUrl;
    }
    
    // If it's using the old /uploads/ path, convert to new API route
    if (imagePath.startsWith('/uploads/')) {
      const filename = imagePath.replace('/uploads/', '');
      const convertedUrl = `/api/uploads/${filename}`;
      return convertedUrl;
    }
    
    // If it's using the old API route, return as is
    if (imagePath.startsWith('/api/uploads/')) {
      return imagePath;
    }
    
    // For any other format, return as is
    return imagePath;
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Base Management</h2>
            <p className="text-muted-foreground">Manage airfield bases and assignments</p>
          </div>
          <Button onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Designate Base
          </Button>
          
          <Modal
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            title="Designate New Base"
            description="Select an airfield to designate as a base and assign a base manager"
          >
              <div className="flex-1 overflow-y-auto space-y-4 pt-4">
                <div>
                  <Label htmlFor="airfieldId">Select Airfield</Label>
                  <Combobox
                    options={airfields
                      .filter(af => !baseManagements.some(bm => bm.airfieldId === af.id))
                      .map(airfield => ({
                        value: airfield.id,
                        label: `${airfield.name} (${airfield.code}) • ${airfield.city}, ${airfield.country}`
                      }))}
                    value={formData.airfieldId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, airfieldId: value }))}
                      placeholder="Search airfields by name, code, or city..."
                    searchPlaceholder="Search airfields..."
                    emptyText="No airfields found."
                  />
                </div>
                <div>
                  <Label htmlFor="baseManagerId">Assign Base Manager</Label>
                  <Select value={formData.baseManagerId} onValueChange={(value) => setFormData(prev => ({ ...prev, baseManagerId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={baseManagersLoading ? "Loading base managers..." : "Choose a base manager (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {baseManagersLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading base managers... ({baseManagers.length} loaded)
                        </SelectItem>
                      ) : baseManagers.length === 0 ? (
                        <SelectItem value="no-managers" disabled>
                          No base managers available (Debug: {baseManagers.length} in state)
                        </SelectItem>
                      ) : (
                        baseManagers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.firstName} {manager.lastName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="operatingHours">Operating Hours</Label>
                  <Input
                    id="operatingHours"
                    value={formData.operatingHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, operatingHours: e.target.value }))}
                    placeholder="e.g., Mon-Fri 8:00-18:00"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                    placeholder="Emergency contact information"
                  />
                </div>
                <div>
                  <Label htmlFor="additionalInfo">Base Information</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                    placeholder="Additional information about this base"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                  />
                </div>
                <div>
                  <Label htmlFor="image">Base Image</Label>
                  <div className="space-y-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                    {imagePreview && (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBase}>
                  Designate Base
                </Button>
              </div>
          </Modal>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading bases...</div>
      ) : baseManagements.length === 0 ? (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No bases designated yet. Designate your first base to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {baseManagements.map((base) => (
            <Card 
              key={base.id} 
              className="hover:shadow-lg transition-shadow h-full flex flex-col p-0 relative cursor-pointer group"
              onClick={() => {
                setSelectedBase(base);
                setShowBaseDetailsDialog(true);
              }}
            >
              {/* Base Image */}
              <OptimizedImage
                src={base.imagePath}
                alt={`${getAirfieldData(base).name} Base`}
                className="rounded-t-lg"
                aspectRatio={16 / 9}
                placeholder={<Plane className="h-8 w-8 text-muted-foreground" />}
              />

              {/* Three-dot menu - only for users with edit permissions */}
              {canEdit && (
                <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 bg-white/30 dark:bg-black/30 backdrop-blur-md hover:bg-white/50 dark:hover:bg-black/50 text-black dark:text-white border border-white/30 dark:border-white/30 shadow-lg">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(base)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit Base
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteBase(base)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Base
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Click indicator overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg pointer-events-none" />

              <CardHeader className="pb-0 px-6 pt-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-semibold leading-tight text-foreground">
                    {getAirfieldData(base).name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium ${getTypeBadgeColor(getAirfieldData(base).type)}`}
                    >
                      {getAirfieldData(base).type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4">
                <div className="space-y-3">
                  {/* Location Information */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-foreground">
                        {getAirfieldData(base).code}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getAirfieldData(base).city}, {getAirfieldData(base).country}
                      </div>
                    </div>
                  </div>
                  
                  {/* Manager Information */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {base.baseManager ? (
                        <>
                          <div className="font-semibold text-sm text-foreground">
                            {base.baseManager.firstName} {base.baseManager.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {base.baseManager.email}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          No manager assigned
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Information */}
                  {(base.operatingHours || base.emergencyContact) && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      {base.operatingHours && (
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">Operating Hours</div>
                            <div className="text-sm text-muted-foreground">
                              {base.operatingHours}
                            </div>
                          </div>
                        </div>
                      )}

                      {base.emergencyContact && (
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">Emergency Contact</div>
                            <div className="text-sm text-muted-foreground">
                              {base.emergencyContact}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                  <Badge 
                    className={`${getStatusBadgeColor(getAirfieldData(base).status || 'UNKNOWN')} text-xs`}
                  >
                    {formatStatusDisplay(getAirfieldData(base).status || 'UNKNOWN')}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Created {formatDateWithCurrentFormat(base.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Base Dialog */}
      <Modal
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        title="Edit Base"
        description="Update base information and management details"
      >
          <div className="flex-1 overflow-y-auto space-y-8 pt-4">
            {/* Base Management Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Base Management Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="editBaseManagerId">Base Manager</Label>
                  <Select 
                    value={formData.baseManagerId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, baseManagerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={baseManagersLoading ? "Loading base managers..." : "Select a base manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {baseManagersLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading base managers... ({baseManagers.length} loaded)
                        </SelectItem>
                      ) : baseManagers.length === 0 ? (
                        <SelectItem value="no-managers" disabled>
                          No base managers available (Debug: {baseManagers.length} in state)
                        </SelectItem>
                      ) : (
                        baseManagers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.firstName} {manager.lastName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editOperatingHours">Operating Hours</Label>
                  <Input
                    id="editOperatingHours"
                    value={formData.operatingHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, operatingHours: e.target.value }))}
                    placeholder="e.g., Mon-Fri 8:00-18:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmergencyContact">Emergency Contact</Label>
                  <Input
                    id="editEmergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                    placeholder="Emergency contact information"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Additional Information
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="editAdditionalInfo">Base Information</Label>
                  <Textarea
                    id="editAdditionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                    placeholder="Additional information about this base"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea
                    id="editNotes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Base Image */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                <Plane className="h-5 w-5 mr-2" />
                Base Image
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editImage">Upload New Image</Label>
                  <Input
                    id="editImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                </div>
                {imagePreview && (
                  <div className="space-y-2">
                    <Label>Image Preview</Label>
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBase}>
              Update Base
            </Button>
          </div>
      </Modal>

      {/* Base Details Dialog */}
      <Modal
        open={showBaseDetailsDialog}
        onClose={() => setShowBaseDetailsDialog(false)}
        title="Base Details"
      >
          <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">
            {selectedBase ? (
              <div key={selectedBase.id + selectedBase.updatedAt} className="space-y-8">
                {/* Airfield Information */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Airfield Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Airfield Name</Label>
                      <p className="text-base font-medium text-card-foreground">{getAirfieldData(selectedBase).name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">ICAO Code</Label>
                      <p className="text-base text-card-foreground">{getAirfieldData(selectedBase).code}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                      <Badge className={getTypeBadgeColor(getAirfieldData(selectedBase).type)}>
                        {getAirfieldData(selectedBase).type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">City</Label>
                      <p className="text-base text-card-foreground">{getAirfieldData(selectedBase).city}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">State/Province</Label>
                      <p className="text-base text-card-foreground">{getAirfieldData(selectedBase).state || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                      <p className="text-base text-card-foreground">{getAirfieldData(selectedBase).country}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge className={`${getStatusBadgeColor(getAirfieldData(selectedBase).status || 'UNKNOWN')} text-xs`}>
                        {formatStatusDisplay(getAirfieldData(selectedBase).status || 'UNKNOWN')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* GPS Coordinates & Elevation */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Location & Elevation
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Latitude</Label>
                      <p className="text-base text-card-foreground">
                        {getAirfieldData(selectedBase).latitude ? `${getAirfieldData(selectedBase).latitude}°` : '-'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Longitude</Label>
                      <p className="text-base text-card-foreground">
                        {getAirfieldData(selectedBase).longitude ? `${getAirfieldData(selectedBase).longitude}°` : '-'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Elevation</Label>
                      <p className="text-base text-card-foreground">
                        {getAirfieldData(selectedBase).elevation ? `${getAirfieldData(selectedBase).elevation} ft` : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Phone className="h-5 w-5 mr-2" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-base text-card-foreground">{getAirfieldData(selectedBase).phone || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-base text-card-foreground">{getAirfieldData(selectedBase).email || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                      {getAirfieldData(selectedBase).website ? (
                        <a 
                          href={getAirfieldData(selectedBase).website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-base text-blue-600 hover:text-blue-800 underline"
                          title={getAirfieldData(selectedBase).website}
                        >
                          {(() => {
                            const url = getAirfieldData(selectedBase).website;
                            if (!url) return '-';
                            try {
                              const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
                              return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname.substring(0, 20) + (urlObj.pathname.length > 20 ? '...' : '') : '');
                            } catch {
                              return url.length > 30 ? url.substring(0, 30) + '...' : url;
                            }
                          })()}
                        </a>
                      ) : (
                        <p className="text-base text-card-foreground">-</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Base Management Information */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    Base Management Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Base Manager</Label>
                      <p className="text-base text-card-foreground">
                        {selectedBase.baseManager ? `${selectedBase.baseManager.firstName} ${selectedBase.baseManager.lastName}` : 'Not assigned'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Operating Hours</Label>
                      <p className="text-base text-card-foreground">{selectedBase.operatingHours || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Emergency Contact</Label>
                      <p className="text-base text-card-foreground">{selectedBase.emergencyContact || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Additional Information
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Base Information</Label>
                      <p className="text-base text-card-foreground">{selectedBase.additionalInfo || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                      <p className="text-base text-card-foreground">{selectedBase.notes || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* System Information */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    System Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={selectedBase.isActive ? 'default' : 'secondary'}>
                        {selectedBase.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                      <p className="text-base text-card-foreground">
                        {new Date(selectedBase.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p className="text-base text-card-foreground">
                        {new Date(selectedBase.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No base selected</p>
              </div>
            )}
          </div>
      </Modal>
    </div>
  );
}