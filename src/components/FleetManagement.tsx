'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { 
  Plane, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  MapPin,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  User,
  MoreVertical,
  Grid3X3,
  List
} from 'lucide-react';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Progress } from "@/components/ui/progress";
import { Modal } from './ui/Modal';
import { FlightLog } from "@/types/uuid-types";

// Aircraft creation schema
const createAircraftSchema = z.object({
  icaoTypeDesignator: z.string().min(2, 'ICAO type designator is required'),
  model: z.string().min(1, 'Model is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  callSign: z.string().min(2, 'Call sign is required'),
  serialNumber: z.string().min(2, 'Serial number is required'),
  yearOfManufacture: z.number().min(1900, 'Year is required').max(new Date().getFullYear() + 1),
  image: z.instanceof(File).optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED']),
});

// Fleet management schema
const fleetManagementSchema = z.object({
  assignedPilotId: z.string().optional(),
  maintenanceSchedule: z.string().optional(),
  operationalHours: z.string().optional(),
  fuelType: z.string().optional(),
  fuelCapacity: z.number().min(0).optional(),
  range: z.number().min(0).optional(),
  maxPassengers: z.number().min(0).optional(),
  maxPayload: z.number().min(0).optional(),
  specialEquipment: z.array(z.string()).optional(),
  operationalNotes: z.string().optional(),
});

type CreateAircraftForm = z.infer<typeof createAircraftSchema>;
type FleetManagementForm = z.infer<typeof fleetManagementSchema>;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ICAOReferenceTypeOption {
  id: string;
  typeDesignator: string;
  model: string;
  manufacturer: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Airfield {
  id: string;
  name: string;
  code: string;
}

// 1. Update the Aircraft interface to match the backend response
interface Aircraft {
  id: string;
  callSign: string;
  serialNumber: string;
  yearOfManufacture: number;
  imagePath?: string;
  status: string;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
  icaoReferenceType: {
    id: string;
    typeDesignator: string;
    model: string;
    manufacturer: string;
  };
  fleetManagement?: {
    id: string;
    assignedPilotId?: string;
    maintenanceSchedule?: string;
    operationalHours?: string;
    fuelType?: string;
    fuelCapacity?: number;
    range?: number;
    maxPassengers?: number;
    maxPayload?: number;
    specialEquipment: string[];
    operationalNotes?: string;
    assignedPilot?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  baseAirfield?: {
    id: string;
    name: string;
    code: string;
  };
  totalFlightHours?: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  notes?: string;
  latestHobbs?: number;
  latestHobbsDate?: string;
}

interface Airfield {
  id: string;
  name: string;
  code: string;
  city?: string;
  country: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userRoles: Array<{
    role: {
      name: string;
    };
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Add a type for ICAO reference types
interface ICAOReferenceTypeOption {
  id: string;
  typeDesignator: string;
  model: string;
  manufacturer: string;
}

interface FleetManagementProps {
  canEdit?: boolean;
}

export default function FleetManagement({ canEdit = true }: FleetManagementProps) {
  const { formatDate } = useDateFormatUtils();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [showAircraftDialog, setShowAircraftDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFleetDialog, setShowFleetDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [pilots, setPilots] = useState<User[]>([]);
  const [icaoAircraftTypes, setIcaoAircraftTypes] = useState<Aircraft[]>([]);
  const [selectedIcaoDesignator, setSelectedIcaoDesignator] = useState<string>('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');
  const [availableManufacturers, setAvailableManufacturers] = useState<Aircraft[]>([]);
  // 1. Add state for ICAO reference types
  const [icaoReferenceTypes, setIcaoReferenceTypes] = useState<ICAOReferenceTypeOption[]>([]);
  // Add state for aircraft image
  const [aircraftImage, setAircraftImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Add edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  // State for view mode (table or card)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  // State for superadmin status
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // 2. Fetch ICAO reference types on mount
  useEffect(() => {
    const fetchIcaoReferenceTypes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/fleet/aircraft/icao-reference-types', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setIcaoReferenceTypes(data.icaoTypes);
        }
      } catch (err) {
        console.error('Failed to fetch ICAO reference types:', err);
      }
    };
    fetchIcaoReferenceTypes();
  }, []);

  // 1. Remove 'engineType' from useForm default values
  const {
    register: registerAircraft,
    handleSubmit: handleSubmitAircraft,
    reset: resetAircraft,
    setValue: setAircraftValue,
    watch: watchAircraft,
    formState: { errors: aircraftErrors },
  } = useForm<CreateAircraftForm>({
    resolver: zodResolver(createAircraftSchema),
    defaultValues: {
      icaoTypeDesignator: '',
      model: '',
      manufacturer: '',
      callSign: '',
      serialNumber: '',
      yearOfManufacture: 2020,
      status: 'ACTIVE', // Default status
    },
  });

  // Add edit form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    watch: watchEdit,
    formState: { errors: editErrors },
  } = useForm<CreateAircraftForm>({
    resolver: zodResolver(createAircraftSchema),
  });

  const {
    register: registerFleet,
    handleSubmit: handleSubmitFleet,
    reset: resetFleet,
    setValue: setFleetValue,
    formState: { errors: fleetErrors },
  } = useForm<FleetManagementForm>({
    resolver: zodResolver(fleetManagementSchema),
  });

  const fetchAircraftHobbsData = async (aircraftList: Aircraft[]) => {
    try {
      const token = localStorage.getItem('token');
      
      if (aircraftList.length === 0) return aircraftList;

      // Fetch aircraft Hobbs data from the dedicated table
      const response = await fetch('/api/fleet/aircraft-hobbs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const hobbsData = data.aircraftHobbs || [];
        
        console.log(`🔍 Fetched Hobbs data for ${hobbsData.length} aircraft`);
        
        // Create a map of Hobbs data by aircraft ID
        const aircraftHobbsMap = new Map<string, { hobbs: number; date: string }>();
        
        hobbsData.forEach((item: any) => {
          if (item.aircraft_id && item.last_hobbs_reading && item.last_hobbs_date) {
            aircraftHobbsMap.set(item.aircraft_id, {
              hobbs: item.last_hobbs_reading,
              date: item.last_hobbs_date
            });
            console.log(`📊 Found Hobbs data for ${item.aircraft?.callSign || item.aircraft_id}: ${item.last_hobbs_reading} hours on ${item.last_hobbs_date}`);
          }
        });

        // Add Hobbs data to aircraft
        return aircraftList.map(aircraft => {
          const hobbsData = aircraftHobbsMap.get(aircraft.id);
          console.log(`✈️ Aircraft ${aircraft.callSign} (${aircraft.id}): ${hobbsData ? `${hobbsData.hobbs} hours on ${hobbsData.date}` : 'No Hobbs data'}`);
          
          return {
            ...aircraft,
            latestHobbs: hobbsData?.hobbs || undefined,
            latestHobbsDate: hobbsData?.date || undefined
          };
        });
      }
    } catch (error) {
      console.error('Error fetching aircraft Hobbs data:', error);
    }
    
    return aircraftList;
  };

  const fetchAircraft = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/fleet/aircraft?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch aircraft');
      }

      const data = await response.json();
      console.log('Fetched aircraft data:', data.aircraft);
      
      // Fetch Hobbs data for aircraft
      const aircraftWithHobbs = await fetchAircraftHobbsData(data.aircraft);
      setAircraft(aircraftWithHobbs);
      
      setPagination({
        ...pagination,
        total: data.pagination?.total || data.aircraft.length,
        pages: data.pagination?.pages || Math.ceil((data.pagination?.total || data.aircraft.length) / pagination.limit)
      });
      
      // Preload critical images for faster loading
      preloadAircraftImages(aircraftWithHobbs);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAirfields = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/airfields?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAirfields(data.airfields);
      }
    } catch (err) {
      console.error('Failed to fetch airfields:', err);
    }
  };

  const fetchPilots = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users?role=PILOT&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPilots(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch pilots:', err);
    }
  };

  const fetchIcaoAircraftTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fleet/aircraft?limit=5000&icaoOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIcaoAircraftTypes(data.aircraft);
      }
    } catch (err) {
      console.error('Failed to fetch ICAO aircraft types:', err);
    }
  };

  // Check if user is superadmin
  const checkSuperAdminStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('🔍 User data for superadmin check:', userData);
        const hasSuperAdminRole = userData.userRoles?.some(
          (userRole: any) => userRole.roles.name === 'SUPER_ADMIN'
        );
        console.log('🔍 Is superadmin:', hasSuperAdminRole);
        setIsSuperAdmin(hasSuperAdminRole || false);
      }
    } catch (err) {
      console.error('Failed to check superadmin status:', err);
    }
  };

  useEffect(() => {
    fetchAircraft();
    fetchAirfields();
    fetchPilots();
    fetchIcaoAircraftTypes();
    checkSuperAdminStatus();
  }, [pagination.page]);

  // Reset state when dialog is closed
  useEffect(() => {
    if (!showCreateDialog) {
      setSelectedIcaoDesignator('');
      setSelectedManufacturer('');
      setAvailableManufacturers([]);
      setAircraftImage(null);
      setImagePreview(null);
      resetAircraft();
    }
  }, [showCreateDialog, resetAircraft]);

  // Populate edit form when selectedAircraft changes and we're in edit mode
  useEffect(() => {
    if (selectedAircraft && isEditMode) {
              setEditValue('icaoTypeDesignator', selectedAircraft.icaoReferenceType?.typeDesignator || '');
      setEditValue('model', selectedAircraft.icaoReferenceType?.model || '');
      setEditValue('manufacturer', selectedAircraft.icaoReferenceType?.manufacturer || '');
      setEditValue('callSign', selectedAircraft.callSign);
      setEditValue('serialNumber', selectedAircraft.serialNumber);
      setEditValue('yearOfManufacture', selectedAircraft.yearOfManufacture);
      setEditValue('status', (selectedAircraft.status || 'ACTIVE') as 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'RETIRED');
      
      // Set ICAO designator for combobox filtering
              setSelectedIcaoDesignator(selectedAircraft.icaoReferenceType?.typeDesignator || '');
      setSelectedManufacturer(selectedAircraft.icaoReferenceType?.manufacturer || '');
      
      // Set image preview if exists
      if (selectedAircraft.imagePath) {
        const imageUrl = getImageUrl(selectedAircraft.imagePath);
        setImagePreview(imageUrl || null);
      }
    }
  }, [selectedAircraft, isEditMode, setEditValue]);

  // Reset edit mode when dialog closes
  useEffect(() => {
    if (!showAircraftDialog) {
      setIsEditMode(false);
      setAircraftImage(null);
      setImagePreview(null);
      resetEdit();
      setSelectedIcaoDesignator('');
      setSelectedManufacturer('');
    }
  }, [showAircraftDialog, resetEdit]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAircraftImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAircraft = async (data: CreateAircraftForm) => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('token');
      
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('icaoTypeDesignator', data.icaoTypeDesignator);
      formData.append('model', data.model);
      formData.append('manufacturer', data.manufacturer);
      formData.append('callSign', data.callSign);
      formData.append('serialNumber', data.serialNumber);
      formData.append('yearOfManufacture', data.yearOfManufacture.toString());
      formData.append('status', data.status || 'ACTIVE'); // Add status to form data
      
      if (aircraftImage) {
        formData.append('image', aircraftImage);
      }
      
      const response = await fetch('/api/fleet/aircraft', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create aircraft');
      }

      setShowCreateDialog(false);
      resetAircraft();
      setSelectedIcaoDesignator('');
      setSelectedManufacturer('');
      setAvailableManufacturers([]);
      setAircraftImage(null);
      setImagePreview(null);
      fetchAircraft();
      toast.success('Aircraft created successfully!', {
        description: `${data.callSign} has been added to the fleet.`
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast.error('Failed to create aircraft', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditAircraft = async (data: CreateAircraftForm) => {
    if (!selectedAircraft) return;
    
    try {
      setEditLoading(true);
      const token = localStorage.getItem('token');
      
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('icaoTypeDesignator', data.icaoTypeDesignator);
      formData.append('model', data.model);
      formData.append('manufacturer', data.manufacturer);
      formData.append('callSign', data.callSign);
      formData.append('serialNumber', data.serialNumber);
      formData.append('yearOfManufacture', data.yearOfManufacture.toString());
      formData.append('status', data.status || 'ACTIVE'); // Add status to form data
      
      if (aircraftImage) {
        formData.append('image', aircraftImage);
      }
      
      const response = await fetch(`/api/fleet/aircraft/${selectedAircraft.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update aircraft');
      }

      const updatedAircraft = await response.json();
      setSelectedAircraft(updatedAircraft.aircraft);
      setIsEditMode(false);
      setAircraftImage(null);
      setImagePreview(null);
      fetchAircraft();
      toast.success('Aircraft updated successfully!', {
        description: `${data.callSign} has been updated.`
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast.error('Failed to update aircraft', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleFleetManagement = async (data: FleetManagementForm) => {
    if (!selectedAircraft) return;
    
    try {
      setFleetLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/fleet/management/${selectedAircraft.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update fleet management');
      }

      setShowFleetDialog(false);
      resetFleet();
      fetchAircraft();
      toast.success('Fleet management updated successfully!', {
        description: `Fleet management settings for ${selectedAircraft.callSign} has been updated.`
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast.error('Failed to update fleet management', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setFleetLoading(false);
    }
  };

  const handleStatusChange = async (aircraftId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/fleet/aircraft/${aircraftId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update aircraft status');
      }

      fetchAircraft();
      toast.success('Aircraft status updated successfully!', {
        description: `Aircraft status has been changed to ${newStatus.toLowerCase().replace('_', ' ')}.`
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast.error('Failed to update aircraft status', {
        description: err.message || 'An error occurred'
      });
    }
  };

  const handleDeleteAircraft = async (aircraftId: string) => {
    if (!confirm('Are you sure you want to delete this aircraft? This action cannot be undone.')) {
      toast.info('Delete operation cancelled', {
        description: 'The aircraft was not deleted.'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/fleet/aircraft/${aircraftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete aircraft');
      }

      fetchAircraft();
      toast.success('Aircraft deleted successfully!', {
        description: 'The aircraft has been removed from the fleet.'
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast.error('Failed to delete aircraft', {
        description: err.message || 'An error occurred'
      });
    }
  };

  const handleToggleHidden = async (aircraftId: string, currentHidden: boolean) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/fleet/aircraft/${aircraftId}/hide`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ hidden: !currentHidden }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update aircraft visibility');
      }

      fetchAircraft();
      toast.success(`Aircraft ${!currentHidden ? 'hidden' : 'unhidden'} successfully!`, {
        description: `The aircraft is now ${!currentHidden ? 'hidden from other users' : 'visible to all users'}.`
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast.error('Failed to update aircraft visibility', {
        description: err.message || 'An error occurred'
      });
    }
  };

  const enterEditMode = () => {
    setIsEditMode(true);
  };

  const handleEditClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setShowAircraftDialog(true);
    setIsEditMode(true);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setAircraftImage(null);
    setImagePreview(null);
    resetEdit();
    setSelectedIcaoDesignator('');
    setSelectedManufacturer('');
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SINGLE_ENGINE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MULTI_ENGINE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'HELICOPTER':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'GLIDER':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ULTRALIGHT':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'SEAPLANE':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string | undefined) => {
    if (!status) return 'bg-green-100 text-green-800 border-green-200'; // Default to ACTIVE color
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'OUT_OF_SERVICE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAircraftTypeLabel = (type: string) => {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return 'Active'; // Default status for aircraft without status
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const calculateMaintenanceProgress = (lastMaintenance?: string, nextMaintenance?: string) => {
    if (!lastMaintenance || !nextMaintenance) return null;
    
    const lastDate = new Date(lastMaintenance);
    const nextDate = new Date(nextMaintenance);
    const currentDate = new Date();
    
    // Calculate total maintenance cycle duration
    const totalCycle = nextDate.getTime() - lastDate.getTime();
    
    // Calculate elapsed time since last maintenance
    const elapsed = currentDate.getTime() - lastDate.getTime();
    
    // Calculate progress percentage
    const progress = Math.min(Math.max((elapsed / totalCycle) * 100, 0), 100);
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      progress,
      daysRemaining,
      isOverdue: currentDate > nextDate,
      totalCycleDays: Math.ceil(totalCycle / (1000 * 60 * 60 * 24))
    };
  };

  const openFleetDialog = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    if (aircraft.fleetManagement) {
      setFleetValue('assignedPilotId', aircraft.fleetManagement.assignedPilotId || '');
      setFleetValue('maintenanceSchedule', aircraft.fleetManagement.maintenanceSchedule || '');
      setFleetValue('operationalHours', aircraft.fleetManagement.operationalHours || '');
      setFleetValue('fuelType', aircraft.fleetManagement.fuelType || '');
      setFleetValue('fuelCapacity', aircraft.fleetManagement.fuelCapacity || 0);
      setFleetValue('range', aircraft.fleetManagement.range || 0);
      setFleetValue('maxPassengers', aircraft.fleetManagement.maxPassengers || 0);
      setFleetValue('maxPayload', aircraft.fleetManagement.maxPayload || 0);
      setFleetValue('operationalNotes', aircraft.fleetManagement.operationalNotes || '');
    }
    setShowFleetDialog(true);
  };

  // Utility function to handle both old and new image paths
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath || imagePath.trim() === '') return null;
    
    console.log('getImageUrl called with:', imagePath);
    
    // If it's already a full URL (Vercel Blob), add optimization parameters
    if (imagePath.startsWith('http')) {
      console.log('Optimizing Vercel Blob URL:', imagePath);
      // Add Vercel Blob optimization parameters
      const optimizedUrl = `${imagePath}?w=400&h=300&fit=crop&f=webp&q=80`;
      return optimizedUrl;
    }
    
    // If it's using the old /uploads/ path, convert to new API route
    if (imagePath.startsWith('/uploads/')) {
      const filename = imagePath.replace('/uploads/', '');
      const convertedUrl = `/api/uploads/${filename}`;
      console.log('Converting old uploads path to:', convertedUrl);
      return convertedUrl;
    }
    
    // If it's using the old API route, return as is
    if (imagePath.startsWith('/api/uploads/')) {
      console.log('Returning API uploads URL:', imagePath);
      return imagePath;
    }
    
    // For any other format, return as is
    console.log('Returning as-is:', imagePath);
    return imagePath;
  };

  // Preload critical aircraft images for faster loading
  const preloadAircraftImages = (aircraftList: Aircraft[]) => {
    const criticalImages = aircraftList.slice(0, 6); // Preload first 6 images
    
    criticalImages.forEach((aircraft) => {
      if (aircraft.imagePath && aircraft.imagePath.startsWith('http')) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = `${aircraft.imagePath}?w=400&h=300&fit=crop&f=webp&q=80`;
        document.head.appendChild(link);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Aircraft
          </Button>
        )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Aircraft Cards/Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading aircraft...</div>
        </div>
      ) : aircraft.length === 0 ? (
        <Alert>
          <Plane className="h-4 w-4" />
          <AlertDescription>
            No aircraft in fleet yet. Add your first aircraft to get started.
          </AlertDescription>
        </Alert>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aircraft.map((aircraft) => (
            <Card 
              key={aircraft.id} 
              className="hover:shadow-lg transition-shadow h-full flex flex-col p-0 relative cursor-pointer"
              onClick={() => {
                setSelectedAircraft(aircraft);
                setShowAircraftDialog(true);
              }}
            >
              {/* Aircraft Image */}
              <OptimizedImage
                src={aircraft.imagePath}
                alt={`${aircraft.icaoReferenceType?.model || 'Aircraft'} ${aircraft.callSign}`}
                className="rounded-t-lg"
                aspectRatio={16 / 9}
                placeholder={<Plane className="h-8 w-8 text-muted-foreground" />}
              />

              {/* Action Menu - Top Right Corner (Only for editors) */}
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
                      <DropdownMenuItem onClick={() => openFleetDialog(aircraft)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Fleet Management
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditClick(aircraft)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {isSuperAdmin && (
                        <DropdownMenuItem onClick={() => handleToggleHidden(aircraft.id, aircraft.hidden || false)}>
                          {aircraft.hidden ? (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Unhide Aircraft
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Hide Aircraft
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDeleteAircraft(aircraft.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                    <CardTitle className="text-lg leading-tight">{aircraft.callSign}</CardTitle>
                    <Badge className={`text-xs ${getTypeBadgeColor(aircraft.icaoReferenceType?.typeDesignator || 'UNKNOWN')}`}>
                      {aircraft.icaoReferenceType?.typeDesignator || 'UNKNOWN'}
                    </Badge>
                  </div>
                  
                                    <div className="space-y-1">
                    <div className="font-medium text-sm">{aircraft.icaoReferenceType?.model || 'Unknown Model'}</div>
                    <div className="text-xs text-muted-foreground">{aircraft.icaoReferenceType?.manufacturer || 'Unknown Manufacturer'}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium text-sm">Serial: {aircraft.serialNumber}</div>
                    <div className="text-xs text-muted-foreground">Year: {aircraft.yearOfManufacture}</div>
                  </div>
                </div>
        </CardHeader>
              <CardContent className="space-y-2 flex-1 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    {aircraft.baseAirfield && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-sm">{aircraft.baseAirfield.name}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {aircraft.fleetManagement?.assignedPilot && (
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-sm">
                            {aircraft.fleetManagement.assignedPilot.firstName} {aircraft.fleetManagement.assignedPilot.lastName}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusBadgeColor(aircraft.status)}>
                      {getStatusLabel(aircraft.status)}
                    </Badge>
                    {aircraft.hidden && isSuperAdmin && (
                      <Badge variant="secondary" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {formatDate(aircraft.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                <TableHead>Registration</TableHead>
                <TableHead>ICAO Type</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Base Airfield</TableHead>
                <TableHead>Assigned Pilot</TableHead>
                <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aircraft.map((aircraft) => (
                    <TableRow 
                      key={aircraft.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedAircraft(aircraft);
                        setShowAircraftDialog(true);
                      }}
                    >
                      <TableCell>
                    <div className="font-medium">{aircraft.callSign}</div>
                    <div className="text-sm text-muted-foreground">{aircraft.icaoReferenceType?.typeDesignator || 'UNKNOWN'}</div>
                  </TableCell>
                                        <TableCell>
                                            <Badge className={`text-xs ${getTypeBadgeColor(aircraft.icaoReferenceType?.typeDesignator || 'UNKNOWN')}`}>
                      {aircraft.icaoReferenceType?.typeDesignator || 'UNKNOWN'}
                    </Badge>
                      </TableCell>
                      <TableCell>
                    <div className="text-sm font-medium">{aircraft.icaoReferenceType?.model || 'Unknown Model'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(aircraft.status)}>
                          {getStatusLabel(aircraft.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                    {aircraft.baseAirfield ? `${aircraft.baseAirfield.code} - ${aircraft.baseAirfield.name}` : '-'}
                      </TableCell>
                      <TableCell>
                    {aircraft.fleetManagement?.assignedPilot 
                      ? `${aircraft.fleetManagement.assignedPilot.firstName} ${aircraft.fleetManagement.assignedPilot.lastName}`
                      : '-'
                    }
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openFleetDialog(aircraft)}>
                                <Settings className="mr-2 h-4 w-4" />
                                Fleet Management
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditClick(aircraft)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {isSuperAdmin && (
                                <DropdownMenuItem onClick={() => handleToggleHidden(aircraft.id, aircraft.hidden || false)}>
                                  {aircraft.hidden ? (
                                    <>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Unhide Aircraft
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Hide Aircraft
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDeleteAircraft(aircraft.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

      {/* Create Aircraft Dialog */}
      <Modal
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Add New Aircraft"
        description="Enter the details for the new aircraft"
      >
          <form onSubmit={handleSubmitAircraft(handleCreateAircraft as any)} className="space-y-6">
            {/* ICAO Type Designator Selection */}
              <div>
                <Label htmlFor="icaoTypeDesignator">ICAO Type Designator</Label>
                    <Combobox
                options={Array.from(new Set(icaoReferenceTypes.map((type: ICAOReferenceTypeOption) => type.typeDesignator))).map((designator: string) => ({
                        value: designator,
                        label: designator
                      }))}
                      placeholder="Search ICAO type (e.g., C172, PIVI, CRUZ)"
                      value={selectedIcaoDesignator}
                      onValueChange={(value) => {
                        setSelectedIcaoDesignator(value);
                        setAircraftValue('icaoTypeDesignator', value);
                        setSelectedManufacturer('');
                        setAircraftValue('manufacturer', '');
                        setAircraftValue('model', '');
                      }}
                    />
                  </div>
            {/* Model Selection */}
            {selectedIcaoDesignator && (
                  <div>
                    <Label htmlFor="model">Model</Label>
                        <Combobox
                  options={Array.from(new Set(icaoReferenceTypes.filter((type: ICAOReferenceTypeOption) => type.typeDesignator === selectedIcaoDesignator).map((type: ICAOReferenceTypeOption) => type.model))).map((model: string) => ({
                            value: model,
                            label: model
                          }))}
                  placeholder="Select model"
                          value={watchAircraft('model') || ''}
                          onValueChange={(value) => {
                            setAircraftValue('model', value);
                            setSelectedManufacturer('');
                            setAircraftValue('manufacturer', '');
                          }}
                        />
                      </div>
            )}
            {/* Manufacturer Selection */}
            {selectedIcaoDesignator && watchAircraft('model') && (
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Combobox
                  options={Array.from(new Set(icaoReferenceTypes.filter((type: ICAOReferenceTypeOption) => type.typeDesignator === selectedIcaoDesignator && type.model === watchAircraft('model')).map((type: ICAOReferenceTypeOption) => type.manufacturer))).map((manufacturer: string) => ({
                          value: manufacturer,
                          label: manufacturer
                        }))}
                        placeholder="Select manufacturer"
                        value={selectedManufacturer}
                        onValueChange={(value) => {
                          setSelectedManufacturer(value);
                          setAircraftValue('manufacturer', value);
                        }}
                      />
                    </div>
            )}
            {/* Call Sign */}
                        <div>
              <Label htmlFor="callSign">Call Sign<span className="text-destructive">*</span></Label>
                <Input
                id="callSign"
                placeholder="e.g., D-EABC"
                {...registerAircraft('callSign')}
                className={aircraftErrors.callSign ? 'border-destructive' : ''}
              />
              {aircraftErrors.callSign && (
                <p className="text-sm text-destructive">{aircraftErrors.callSign.message}</p>
                )}
              </div>
            {/* Serial Number */}
              <div>
              <Label htmlFor="serialNumber">Serial Number<span className="text-destructive">*</span></Label>
                <Input
                id="serialNumber"
                placeholder="e.g., 123456"
                {...registerAircraft('serialNumber')}
                className={aircraftErrors.serialNumber ? 'border-destructive' : ''}
              />
              {aircraftErrors.serialNumber && (
                <p className="text-sm text-destructive">{aircraftErrors.serialNumber.message}</p>
              )}
              </div>
            {/* Year of Manufacture */}
              <div>
              <Label htmlFor="yearOfManufacture">Year of Manufacture<span className="text-destructive">*</span></Label>
                <Input
                id="yearOfManufacture"
                  type="number"
                placeholder="e.g., 2020"
                {...registerAircraft('yearOfManufacture', { valueAsNumber: true })}
                className={aircraftErrors.yearOfManufacture ? 'border-destructive' : ''}
              />
              {aircraftErrors.yearOfManufacture && (
                <p className="text-sm text-destructive">{aircraftErrors.yearOfManufacture.message}</p>
                )}
              </div>
            {/* Status */}
              <div>
              <Label htmlFor="status">Status<span className="text-destructive">*</span></Label>
                <Select 
                value={watchAircraft('status')}
                onValueChange={(value) => setAircraftValue('status', value as 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'RETIRED')}
                >
                  <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                  <SelectItem value="RETIRED">Retired</SelectItem>
                  </SelectContent>
                </Select>
              {aircraftErrors.status && (
                <p className="text-sm text-destructive">{aircraftErrors.status.message}</p>
                )}
              </div>
            {/* Aircraft Image */}
              <div>
              <Label htmlFor="aircraftImage">Aircraft Image</Label>
              <div className="space-y-2">
                <Input
                  id="aircraftImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Aircraft preview"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
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
                {createLoading ? 'Creating...' : 'Create Aircraft'}
              </Button>
            </div>
          </form>
      </Modal>

      {/* Fleet Management Dialog */}
      <Modal
        open={showFleetDialog}
        onClose={() => setShowFleetDialog(false)}
        title={`Fleet Management - ${selectedAircraft?.callSign}`}
        description="Configure operational settings for this aircraft"
      >
          <form onSubmit={handleSubmitFleet(handleFleetManagement)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedPilot">Assigned Pilot</Label>
                <Combobox
                  options={pilots.map(pilot => ({
                    value: pilot.id,
                    label: `${pilot.firstName} ${pilot.lastName} (${pilot.email})`
                  }))}
                  placeholder="Select assigned pilot"
                  onValueChange={(value) => setFleetValue('assignedPilotId', value)}
                />
              </div>

              <div>
                <Label htmlFor="maintenanceSchedule">Maintenance Schedule</Label>
                <Input
                  id="maintenanceSchedule"
                  placeholder="e.g., Every 100 hours"
                  {...registerFleet('maintenanceSchedule')}
                />
              </div>

              <div>
                <Label htmlFor="operationalHours">Operational Hours</Label>
                <Input
                  id="operationalHours"
                  placeholder="e.g., 6:00 AM - 10:00 PM"
                  {...registerFleet('operationalHours')}
                />
              </div>

              <div>
                <Label htmlFor="fuelType">Fuel Type</Label>
                <Input
                  id="fuelType"
                  placeholder="e.g., 100LL"
                  {...registerFleet('fuelType')}
                />
              </div>

              <div>
                <Label htmlFor="fuelCapacity">Fuel Capacity (gallons)</Label>
                <Input
                  id="fuelCapacity"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 56"
                  {...registerFleet('fuelCapacity', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="range">Range (nm)</Label>
                <Input
                  id="range"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 800"
                  {...registerFleet('range', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="maxPassengers">Max Passengers</Label>
                <Input
                  id="maxPassengers"
                  type="number"
                  placeholder="e.g., 3"
                  {...registerFleet('maxPassengers', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="maxPayload">Max Payload (lbs)</Label>
                <Input
                  id="maxPayload"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 1000"
                  {...registerFleet('maxPayload', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="operationalNotes">Operational Notes</Label>
              <Textarea
                id="operationalNotes"
                placeholder="Operational notes and special instructions..."
                {...registerFleet('operationalNotes')}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFleetDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={fleetLoading}
              >
                {fleetLoading ? 'Saving...' : 'Save Fleet Settings'}
              </Button>
            </div>
          </form>
      </Modal>

      {/* Aircraft Details Dialog */}
      <Modal
        open={showAircraftDialog}
        onClose={() => setShowAircraftDialog(false)}
        title={selectedAircraft?.callSign || 'Aircraft Details'}
      >
        <div className="flex items-center gap-2 mb-4">
          {selectedAircraft && canEdit && (
            <>
              {!isEditMode ? (
                <Button onClick={enterEditMode} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Button onClick={exitEditMode} variant="outline" size="sm">
                  Cancel
                </Button>
              )}
            </>
          )}
        </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">
          {selectedAircraft && (
            <div className="space-y-6">
              {isEditMode ? (
                // Edit Mode Form
                <form onSubmit={handleSubmitEdit(handleEditAircraft)} className="space-y-6">
                  {/* ICAO Type Designator Selection */}
                  <div>
                    <Label htmlFor="edit-icaoTypeDesignator">ICAO Type Designator</Label>
                    <Combobox
                      options={Array.from(new Set(icaoReferenceTypes.map((type: ICAOReferenceTypeOption) => type.typeDesignator))).map((designator: string) => ({
                        value: designator,
                        label: designator
                      }))}
                      placeholder="Search ICAO type (e.g., C172, PIVI, CRUZ)"
                      value={selectedIcaoDesignator}
                      onValueChange={(value) => {
                        setSelectedIcaoDesignator(value);
                        setEditValue('icaoTypeDesignator', value);
                        setSelectedManufacturer('');
                        setEditValue('manufacturer', '');
                        setEditValue('model', '');
                      }}
                    />
                  </div>
                  {/* Model Selection */}
                  {selectedIcaoDesignator && (
                    <div>
                      <Label htmlFor="edit-model">Model</Label>
                      <Combobox
                        options={Array.from(new Set(icaoReferenceTypes.filter((type: ICAOReferenceTypeOption) => type.typeDesignator === selectedIcaoDesignator).map((type: ICAOReferenceTypeOption) => type.model))).map((model: string) => ({
                          value: model,
                          label: model
                        }))}
                        placeholder="Select model"
                        value={watchEdit('model') || ''}
                        onValueChange={(value) => {
                          setEditValue('model', value);
                          setSelectedManufacturer('');
                          setEditValue('manufacturer', '');
                        }}
                      />
                    </div>
                  )}
                  {/* Manufacturer Selection */}
                  {selectedIcaoDesignator && watchEdit('model') && (
                    <div>
                      <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                      <Combobox
                        options={Array.from(new Set(icaoReferenceTypes.filter((type: ICAOReferenceTypeOption) => type.typeDesignator === selectedIcaoDesignator && type.model === watchEdit('model')).map((type: ICAOReferenceTypeOption) => type.manufacturer))).map((manufacturer: string) => ({
                          value: manufacturer,
                          label: manufacturer
                        }))}
                        placeholder="Select manufacturer"
                        value={selectedManufacturer}
                        onValueChange={(value) => {
                          setSelectedManufacturer(value);
                          setEditValue('manufacturer', value);
                        }}
                      />
                    </div>
                  )}
                  {/* Call Sign */}
                  <div>
                    <Label htmlFor="edit-callSign">Call Sign<span className="text-destructive">*</span></Label>
                    <Input
                      id="edit-callSign"
                      placeholder="e.g., D-EABC"
                      {...registerEdit('callSign')}
                      className={editErrors.callSign ? 'border-destructive' : ''}
                    />
                    {editErrors.callSign && (
                      <p className="text-sm text-destructive">{editErrors.callSign.message}</p>
                    )}
                  </div>
                  {/* Serial Number */}
                  <div>
                    <Label htmlFor="edit-serialNumber">Serial Number<span className="text-destructive">*</span></Label>
                    <Input
                      id="edit-serialNumber"
                      placeholder="e.g., 123456"
                      {...registerEdit('serialNumber')}
                      className={editErrors.serialNumber ? 'border-destructive' : ''}
                    />
                    {editErrors.serialNumber && (
                      <p className="text-sm text-destructive">{editErrors.serialNumber.message}</p>
                    )}
                  </div>
                  {/* Year of Manufacture */}
                  <div>
                    <Label htmlFor="edit-yearOfManufacture">Year of Manufacture<span className="text-destructive">*</span></Label>
                    <Input
                      id="edit-yearOfManufacture"
                      type="number"
                      placeholder="e.g., 2020"
                      {...registerEdit('yearOfManufacture', { valueAsNumber: true })}
                      className={editErrors.yearOfManufacture ? 'border-destructive' : ''}
                    />
                    {editErrors.yearOfManufacture && (
                      <p className="text-sm text-destructive">{editErrors.yearOfManufacture.message}</p>
                    )}
                  </div>
                  {/* Status */}
                  <div>
                    <Label htmlFor="edit-status">Status<span className="text-destructive">*</span></Label>
                    <Select
                      value={watchEdit('status')}
                      onValueChange={(value) => setEditValue('status', value as 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'RETIRED')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                        <SelectItem value="RETIRED">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                    {editErrors.status && (
                      <p className="text-sm text-destructive">{editErrors.status.message}</p>
                    )}
                  </div>
                  {/* Aircraft Image */}
                  <div>
                    <Label htmlFor="edit-aircraftImage">Aircraft Image</Label>
                    <div className="space-y-2">
                      <Input
                        id="edit-aircraftImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="cursor-pointer"
                      />
                      {imagePreview && (
                        <div className="mt-2">
                          <img
                            src={imagePreview}
                            alt="Aircraft preview"
                            className="w-32 h-32 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={exitEditMode}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={editLoading}
                    >
                      {editLoading ? 'Updating...' : 'Update Aircraft'}
                    </Button>
                  </div>
                </form>
              ) : (
                // View Mode
                <>
              {/* Basic Information */}
              {/* Aircraft Overview */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Plane className="h-5 w-5 mr-2" />
                  Aircraft Overview
                </h3>
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Aircraft Image */}
                  <div className="flex-shrink-0">
                    {selectedAircraft.imagePath && getImageUrl(selectedAircraft.imagePath) ? (
                      <img
                        src={getImageUrl(selectedAircraft.imagePath)!}
                        alt={selectedAircraft.callSign}
                        className="w-64 h-40 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-64 h-40 bg-gray-200 flex items-center justify-center rounded-lg text-gray-500 border">
                        <Plane className="h-16 w-16" />
                      </div>
                    )}
                  </div>
                  
                  {/* Basic Information */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Column 1: Registration, ICAO Type, Model */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Registration</Label>
                        <p className="text-lg font-semibold text-card-foreground">{selectedAircraft.callSign}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">ICAO Type</Label>
                        <Badge className={getTypeBadgeColor(selectedAircraft.icaoReferenceType?.typeDesignator || 'UNKNOWN')}>
                          {selectedAircraft.icaoReferenceType?.typeDesignator || 'UNKNOWN'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                        <p className="text-base text-card-foreground">{selectedAircraft.icaoReferenceType?.model || 'Unknown Model'}</p>
                      </div>
                    </div>

                    {/* Column 2: Manufacturer, Year of Manufacture, Serial Number */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Manufacturer</Label>
                        <p className="text-base text-card-foreground">{selectedAircraft.icaoReferenceType?.manufacturer || 'Unknown Manufacturer'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Year of Manufacture</Label>
                        <p className="text-base text-card-foreground">{selectedAircraft.yearOfManufacture || '-'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                        <p className="text-base text-card-foreground">{selectedAircraft.serialNumber || '-'}</p>
                      </div>
                    </div>

                    {/* Column 3: Status, Total Flight Hours, Updated At */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                        <Badge className={getStatusBadgeColor(selectedAircraft.status)}>
                          {getStatusLabel(selectedAircraft.status)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Last Recorded Hobbs</Label>
                        <p className="text-lg font-semibold text-card-foreground">
                          {selectedAircraft.latestHobbs ? `${selectedAircraft.latestHobbs.toFixed(1)} hours` : 'No data'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Recorded on</Label>
                        <p className="text-base text-card-foreground">
                          {selectedAircraft.latestHobbsDate ? formatDate(selectedAircraft.latestHobbsDate) : 'No data'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fleet Management Information */}
              {selectedAircraft.fleetManagement && (
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Fleet Management
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Assigned Pilot</Label>
                      <p className="text-base text-card-foreground">
                        {selectedAircraft.fleetManagement.assignedPilot 
                          ? `${selectedAircraft.fleetManagement.assignedPilot.firstName} ${selectedAircraft.fleetManagement.assignedPilot.lastName}`
                          : '-'
                        }
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Maintenance Schedule</Label>
                      <p className="text-base text-card-foreground">{selectedAircraft.fleetManagement.maintenanceSchedule || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Operational Hours</Label>
                      <p className="text-base text-card-foreground">{selectedAircraft.fleetManagement.operationalHours || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Fuel Type</Label>
                      <p className="text-base text-card-foreground">{selectedAircraft.fleetManagement.fuelType || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Fuel Capacity</Label>
                      <p className="text-base text-card-foreground">
                        {selectedAircraft.fleetManagement.fuelCapacity ? `${selectedAircraft.fleetManagement.fuelCapacity} gallons` : '-'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Range</Label>
                      <p className="text-base text-card-foreground">
                        {selectedAircraft.fleetManagement.range ? `${selectedAircraft.fleetManagement.range} nm` : '-'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Max Passengers</Label>
                      <p className="text-base text-card-foreground">{selectedAircraft.fleetManagement.maxPassengers || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Max Payload</Label>
                      <p className="text-base text-card-foreground">
                        {selectedAircraft.fleetManagement.maxPayload ? `${selectedAircraft.fleetManagement.maxPayload} lbs` : '-'}
                      </p>
                    </div>
                  </div>
                  {selectedAircraft.fleetManagement.operationalNotes && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Operational Notes</Label>
                      <p className="text-base text-card-foreground">{selectedAircraft.fleetManagement.operationalNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Maintenance Cycles */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Maintenance Cycles
                </h3>
                <div className="space-y-4">
                  {/* Mock Maintenance Cycle 1 - Annual Inspection */}
                  <div className={cn(
                    "border-2 rounded-lg p-4 bg-background",
                    "border-green-500"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-lg">Annual Inspection</p>
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Last: {formatDate(new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cycle: 365 days • Next: {formatDate(new Date(Date.now() + 165 * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                      </div>
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">
                        In Progress
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                                              <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Total</p>
                            <p className="text-lg font-bold">365 days</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Elapsed</p>
                            <p className="text-lg font-bold">200 days</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Remaining</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">165 days</p>
                          </div>
                        </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cycle Progress</span>
                          <span>55%</span>
                        </div>
                        <Progress 
                          value={55}
                          className="bg-green-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mock Maintenance Cycle 2 - 100-Hour Inspection */}
                  <div className={cn(
                    "border-2 rounded-lg p-4 bg-background",
                    "border-orange-500"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-lg">100-Hour Inspection</p>
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Due Soon
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Last: {formatDate(new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cycle: 100 hours • Next: {formatDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                      </div>
                      <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                        Due Soon
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                                              <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Total</p>
                            <p className="text-lg font-bold">100 hours</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Used</p>
                            <p className="text-lg font-bold">85 hours</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Remaining</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">15 hours</p>
                          </div>
                        </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cycle Progress</span>
                          <span>85%</span>
                        </div>
                        <Progress 
                          value={85}
                          className="bg-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mock Maintenance Cycle 3 - Oil Change */}
                  <div className={cn(
                    "border-2 rounded-lg p-4 bg-background",
                    "border-green-500"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-lg">Oil Change</p>
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Last: {formatDate(new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cycle: 50 hours • Next: {formatDate(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                      </div>
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">
                        In Progress
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                                              <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Total</p>
                            <p className="text-lg font-bold">50 hours</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Used</p>
                            <p className="text-lg font-bold">42 hours</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-600 dark:text-gray-400">Remaining</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">8 hours</p>
                          </div>
                        </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cycle Progress</span>
                          <span>84%</span>
                        </div>
                        <Progress 
                          value={84}
                          className="bg-green-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial & Legal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Purchase Date</Label>
                    <p className="text-base text-card-foreground">
                      {selectedAircraft.purchaseDate ? formatDate(selectedAircraft.purchaseDate) : '-'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Purchase Price</Label>
                    <p className="text-base text-card-foreground">
                      {selectedAircraft.purchasePrice ? `$${selectedAircraft.purchasePrice.toLocaleString()}` : '-'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Insurance Expiry</Label>
                    <p className="text-base text-card-foreground">
                      {selectedAircraft.insuranceExpiry ? formatDate(selectedAircraft.insuranceExpiry) : '-'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Registration Expiry</Label>
                    <p className="text-base text-card-foreground">
                      {selectedAircraft.registrationExpiry ? formatDate(selectedAircraft.registrationExpiry) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  System Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-base text-card-foreground">{formatDate(selectedAircraft.createdAt)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-base text-card-foreground">{formatDate(selectedAircraft.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {selectedAircraft.notes && (
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Additional Notes
                  </h3>
                  <div className="bg-background rounded-lg p-4 border">
                    <p className="text-base text-card-foreground leading-relaxed">{selectedAircraft.notes}</p>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}
          </div>
      </Modal>
    </div>
  );
} 