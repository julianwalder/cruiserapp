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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

// 1. Update the Aircraft interface to match the backend response
interface Aircraft {
  id: string;
  callSign: string;
  serialNumber: string;
  yearOfManufacture: number;
  imagePath?: string;
  status: string;
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

export default function FleetManagement() {
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
      setAircraft(data.aircraft);
      setPagination({
        ...pagination,
        total: data.pagination?.total || data.aircraft.length,
        pages: data.pagination?.pages || Math.ceil((data.pagination?.total || data.aircraft.length) / pagination.limit)
      });
    } catch (err: any) {
      setError(err.message);
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

  useEffect(() => {
    fetchAircraft();
    fetchAirfields();
    fetchPilots();
    fetchIcaoAircraftTypes();
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
      setEditValue('icaoTypeDesignator', selectedAircraft.icaoReferenceType.typeDesignator);
      setEditValue('model', selectedAircraft.icaoReferenceType.model);
      setEditValue('manufacturer', selectedAircraft.icaoReferenceType.manufacturer);
      setEditValue('callSign', selectedAircraft.callSign);
      setEditValue('serialNumber', selectedAircraft.serialNumber);
      setEditValue('yearOfManufacture', selectedAircraft.yearOfManufacture);
      setEditValue('status', (selectedAircraft.status || 'ACTIVE') as 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'RETIRED');
      
      // Set ICAO designator for combobox filtering
      setSelectedIcaoDesignator(selectedAircraft.icaoReferenceType.typeDesignator);
      setSelectedManufacturer(selectedAircraft.icaoReferenceType.manufacturer);
      
      // Set image preview if exists
      if (selectedAircraft.imagePath) {
        setImagePreview(selectedAircraft.imagePath);
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
      setError(err.message);
      toast.error('Failed to create aircraft', {
        description: err.message
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
      setError(err.message);
      toast.error('Failed to update aircraft', {
        description: err.message
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
      setError(err.message);
      toast.error('Failed to update fleet management', {
        description: err.message
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
      setError(err.message);
      toast.error('Failed to update aircraft status', {
        description: err.message
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
      setError(err.message);
      toast.error('Failed to delete aircraft', {
        description: err.message
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
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Aircraft
        </Button>
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
            <Card key={aircraft.id} className="hover:shadow-lg transition-shadow h-full flex flex-col p-0 relative">
              {/* Aircraft Image */}
              <AspectRatio ratio={16 / 9} className="w-full">
                {aircraft.imagePath ? (
                  <img
                    src={aircraft.imagePath}
                    alt={`${aircraft.icaoReferenceType.model} ${aircraft.callSign}`}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center rounded-t-lg">
                    <Plane className="h-8 w-8 text-muted-foreground" />
            </div>
                )}
              </AspectRatio>

              {/* Action Menu - Top Right Corner */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 bg-white/30 dark:bg-black/30 backdrop-blur-md hover:bg-white/50 dark:hover:bg-black/50 text-black dark:text-white border border-white/30 dark:border-white/30 shadow-lg">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setSelectedAircraft(aircraft);
                      setShowAircraftDialog(true);
                    }}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openFleetDialog(aircraft)}>
                      <Settings className="mr-2 h-4 w-4" />
                      Fleet Management
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditClick(aircraft)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteAircraft(aircraft.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
              <CardHeader className="pb-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg leading-tight">{aircraft.callSign}</CardTitle>
                    <Badge className={`text-xs ${getTypeBadgeColor(aircraft.icaoReferenceType.typeDesignator)}`}>
                      {aircraft.icaoReferenceType.typeDesignator}
                    </Badge>
            </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{aircraft.icaoReferenceType.model}</div>
                    <div className="text-xs text-muted-foreground">{aircraft.icaoReferenceType.manufacturer}</div>
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

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Badge className={getStatusBadgeColor(aircraft.status)}>
                    {getStatusLabel(aircraft.status)}
                  </Badge>
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
                    <TableRow key={aircraft.id}>
                      <TableCell>
                    <div className="font-medium">{aircraft.callSign}</div>
                    <div className="text-sm text-muted-foreground">{aircraft.icaoReferenceType.typeDesignator}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getTypeBadgeColor(aircraft.icaoReferenceType.typeDesignator)}`}>
                      {aircraft.icaoReferenceType.typeDesignator}
                        </Badge>
                      </TableCell>
                      <TableCell>
                    <div className="text-sm font-medium">{aircraft.icaoReferenceType.model}</div>
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
                      <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                              setSelectedAircraft(aircraft);
                              setShowAircraftDialog(true);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openFleetDialog(aircraft)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Fleet Management
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(aircraft)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteAircraft(aircraft.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
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

      {/* Create Aircraft Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Aircraft</DialogTitle>
            <DialogDescription>
              Enter the details for the new aircraft
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      {/* Fleet Management Dialog */}
      <Dialog open={showFleetDialog} onOpenChange={setShowFleetDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fleet Management - {selectedAircraft?.callSign}</DialogTitle>
            <DialogDescription>
              Configure operational settings for this aircraft
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      {/* Aircraft Details Dialog */}
      <Dialog open={showAircraftDialog} onOpenChange={setShowAircraftDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
            <DialogTitle>Aircraft Details</DialogTitle>
            <DialogDescription>
              Complete aircraft information and fleet management details
            </DialogDescription>
              </div>
              {selectedAircraft && (
                <div className="flex space-x-2">
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
                </div>
              )}
            </div>
          </DialogHeader>
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
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Plane className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Aircraft Image</Label>
                        {selectedAircraft.imagePath ? (
                          <img
                            src={selectedAircraft.imagePath}
                            alt={selectedAircraft.callSign}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg text-gray-500">
                            <Plane className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Registration</Label>
                        <p className="text-base font-medium text-card-foreground">{selectedAircraft.callSign}</p>
                  </div>
                                      <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">ICAO Type</Label>
                        <Badge className={getTypeBadgeColor(selectedAircraft.icaoReferenceType.typeDesignator)}>
                          {selectedAircraft.icaoReferenceType.typeDesignator}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Engine</Label>
                      <div className="text-sm">
                          <span className="font-medium">{selectedAircraft.icaoReferenceType.typeDesignator}</span>
                          <span className="text-muted-foreground ml-2">({selectedAircraft.icaoReferenceType.model})</span>
                      </div>
                    </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedAircraft.status)}>
                      {getStatusLabel(selectedAircraft.status)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                        <p className="text-base text-card-foreground">{selectedAircraft.icaoReferenceType.model}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Manufacturer</Label>
                        <p className="text-base text-card-foreground">{selectedAircraft.icaoReferenceType.manufacturer}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Year</Label>
                    <p className="text-base text-card-foreground">{selectedAircraft.yearOfManufacture || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Fleet Management Information */}
              {selectedAircraft.fleetManagement && (
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Fleet Management
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Maintenance Information */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Maintenance Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Total Flight Hours</Label>
                        <p className="text-base text-card-foreground">{selectedAircraft.totalFlightHours?.toFixed(1)} hours</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Last Maintenance</Label>
                    <p className="text-base text-card-foreground">
                      {selectedAircraft.lastMaintenance ? formatDate(selectedAircraft.lastMaintenance) : '-'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Next Maintenance</Label>
                    <p className="text-base text-card-foreground">
                      {selectedAircraft.nextMaintenance ? formatDate(selectedAircraft.nextMaintenance) : '-'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Base Airfield</Label>
                    <p className="text-base text-card-foreground">
                      {selectedAircraft.baseAirfield ? `${selectedAircraft.baseAirfield.code} - ${selectedAircraft.baseAirfield.name}` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  System Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Notes
                  </h3>
                  <p className="text-base text-card-foreground">{selectedAircraft.notes}</p>
                </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 