'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plane, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  FileText,
  Filter,
  Download,
  Upload,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useFormattedDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
// Remove duplicate imports - we'll use local interfaces

// Client-side date formatter component to prevent hydration issues
function FormattedDate({ date }: { date: string | Date | null | undefined }) {
  const formattedDate = useFormattedDate(date);
  return <span>{formattedDate}</span>;
}

// Utility function to format hours as HH:MM
const formatHours = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Flight log creation schema - Jeppesen format
const createFlightLogSchema = z.object({
  // Basic flight information
  date: z.string().min(1, "Date is required"),
  aircraftId: z.string().min(1, "Aircraft is required"),
  pilotId: z.string().min(1, "Pilot is required"),
  instructorId: z.string().optional().or(z.undefined()),
  
  // Departure information
  departureAirfieldId: z.string().min(1, "Departure airfield is required"),
  departureTime: z.string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .refine((time) => {
      const [hh, mm] = time.split(":").map(Number);
      return (
        !isNaN(hh) && !isNaN(mm) &&
        hh >= 0 && hh <= 23 &&
        mm >= 0 && mm <= 59
      );
    }, "Hour must be 00-23 and minute must be 00-59"),
  departureHobbs: z.number().min(0.1, "Departure Hobbs must be greater than 0"),
  
  // Arrival information
  arrivalAirfieldId: z.string().min(1, "Arrival airfield is required"),
  arrivalTime: z.string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .refine((time) => {
      const [hh, mm] = time.split(":").map(Number);
      return (
        !isNaN(hh) && !isNaN(mm) &&
        hh >= 0 && hh <= 23 &&
        mm >= 0 && mm <= 59
      );
    }, "Hour must be 00-23 and minute must be 00-59"),
  arrivalHobbs: z.number().min(0.1, "Arrival Hobbs must be greater than 0"),
  
  // Flight details
  flightType: z.enum(["INVOICED", "SCHOOL", "FERRY", "CHARTER", "DEMO", "PROMO"]),
  purpose: z.string().optional().or(z.null()),
  
  // Pilot time breakdown (Jeppesen standard)
  pilotInCommand: z.number().min(0, "PIC time must be 0 or greater"),
  secondInCommand: z.number().min(0, "SIC time must be 0 or greater"),
  dualReceived: z.number().min(0, "Dual received time must be 0 or greater"),
  dualGiven: z.number().min(0, "Dual given time must be 0 or greater"),
  solo: z.number().min(0, "Solo time must be 0 or greater"),
  crossCountry: z.number().min(0, "Cross country time must be 0 or greater"),
  night: z.number().min(0, "Night time must be 0 or greater"),
  instrument: z.number().min(0, "Instrument time must be 0 or greater"),
  actualInstrument: z.number().min(0, "Actual instrument time must be 0 or greater"),
  simulatedInstrument: z.number().min(0, "Simulated instrument time must be 0 or greater"),
  
  // Landings
  dayLandings: z.number().int().min(0, "Day landings must be a whole number 0 or greater"),
  nightLandings: z.number().int().min(0, "Night landings must be a whole number 0 or greater"),
  
  // Additional information
  remarks: z.string().optional().or(z.null()),
  route: z.string().optional().or(z.null()),
  conditions: z.string().optional().or(z.null()),
  
  // Fuel and oil information
  oilAdded: z.number().int().min(0, "Oil added must be a whole number 0 or greater").optional(),
  fuelAdded: z.number().int().min(0, "Fuel added must be a whole number 0 or greater").optional(),
});

type CreateFlightLogForm = z.infer<typeof createFlightLogSchema>;

interface Aircraft {
  id: string;
  callSign: string;
  icaoReferenceType: {
    model: string;
    manufacturer: string;
    typeDesignator: string;
  };
  icao_reference_type?: {
    model: string;
    manufacturer: string;
    type_designator: string;
  };
  status: string;
}

interface UserRole {
  role?: {
    name: string;
  };
  roles?: {
    name: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  userRoles: Array<UserRole>;
}

interface Airfield {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
}

interface FlightLog {
  id: string;
  aircraftId: string;
  pilotId: string;
  instructorId?: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  departureAirfieldId: string;
  arrivalAirfieldId: string;
  departureHobbs?: number;
  arrivalHobbs?: number;
  flightType: string;
  purpose: string;
  remarks?: string;
  totalHours: number;
  
  // Jeppesen standard pilot time breakdown
  pilotInCommand: number;
  secondInCommand: number;
  dualReceived: number;
  dualGiven: number;
  solo: number;
  crossCountry: number;
  night: number;
  instrument: number;
  actualInstrument: number;
  simulatedInstrument: number;
  
  // Landings
  dayLandings: number;
  nightLandings: number;
  
  // Fuel and oil information
  oilAdded?: number;
  fuelAdded?: number;
  
  // Additional information
  route?: string;
  conditions?: string;
  
  createdAt: string;
  updatedAt: string;
  createdById: string;
  
  // Related data
  aircraft: Aircraft;
  pilot: User;
  instructor?: User;
  departureAirfield: Airfield;
  arrivalAirfield: Airfield;
  createdBy: User;
  
  // Handle both camelCase and snake_case relationship names
  departure_airfield?: Airfield;
  arrival_airfield?: Airfield;
  created_by?: User;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Extended FlightLog type that includes all the related data
interface ExtendedFlightLog extends FlightLog {
  // Additional fields that might be added by the API
  [key: string]: any;
}

interface TimeInputProps {
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

function TimeInput({ value, onChange, name, className, ...props }: TimeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle input change with basic validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove any non-digit characters except colon
    inputValue = inputValue.replace(/[^\d:]/g, '');
    
    // Auto-add colon after 2 digits
    if (inputValue.length === 2 && !inputValue.includes(':')) {
      inputValue = inputValue + ':';
    }
    
    // Limit to HH:MM format
    if (inputValue.length > 5) {
      inputValue = inputValue.substring(0, 5);
    }
    
    // Validate hours (00-23)
    if (inputValue.length >= 2) {
      const hours = parseInt(inputValue.substring(0, 2));
      if (hours > 23) {
        inputValue = '23' + inputValue.substring(2);
      }
    }
    
    // Validate minutes (00-59)
    if (inputValue.length >= 5) {
      const minutes = parseInt(inputValue.substring(3, 5));
      if (minutes > 59) {
        inputValue = inputValue.substring(0, 3) + '59';
      }
    }
    
    // Update the input value
    e.target.value = inputValue;
    
    // Call the original onChange
    onChange(e);
  };

  // Handle focus to position cursor at beginning
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Position cursor at the beginning of the input
    e.target.setSelectionRange(0, 0);
    
    // Call the original onFocus if provided
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      name={name}
      value={value || ''}
      placeholder="HH:MM (UTC)"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center",
        className
      )}
      style={{
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: '14px',
        letterSpacing: '1px'
      }}
      onChange={handleChange}
      onFocus={handleFocus}
      maxLength={5}
      {...props}
    />
  );
}

interface HobbsInputProps {
  value?: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  className?: string;
  [key: string]: any;
}

function HobbsInput({ value, onChange, name, className, ...props }: HobbsInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Allow normal number input but limit to one decimal place
    if (inputValue.includes('.')) {
      const parts = inputValue.split('.');
      if (parts[1] && parts[1].length > 1) {
        // Limit to one decimal place
        inputValue = parts[0] + '.' + parts[1].substring(0, 1);
      }
    }
    
    // Create a synthetic event with the limited value
    const syntheticEvent = {
      target: { name, value: inputValue }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    if (inputValue && inputValue.trim() !== '') {
      // Parse the number
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        // Format to one decimal place
        const formattedValue = numValue.toFixed(1);
        e.target.value = formattedValue;
        
        // Create a synthetic event for the onChange
        const syntheticEvent = {
          target: { name, value: formattedValue }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }
    
    // Call the original onBlur if provided
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      type="number"
      name={name}
      value={value !== undefined ? value.toString() : ''}
      placeholder="0.0"
      step="0.1"
      min="0"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center",
        className
      )}
      style={{
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: '14px',
        letterSpacing: '1px'
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}

interface FlightLogsProps {
  openCreateModal?: boolean;
}

export default function FlightLogs({ openCreateModal = false }: FlightLogsProps) {
  console.log('🔍 FlightLogs component rendering');
  
  // State management
  const [loading, setLoading] = useState(true);
  const [flightLogs, setFlightLogs] = useState<ExtendedFlightLog[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [pilots, setPilots] = useState<User[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedFlightLog, setSelectedFlightLog] = useState<FlightLog | null>(null);
  const [showPPLView, setShowPPLView] = useState(true);
  const [viewMode, setViewMode] = useState<"personal" | "company">("personal");
  const [activeTab, setActiveTab] = useState("all");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });



  // Filter state
  const [filters, setFilters] = useState({
    aircraftId: '',
    pilotId: '',
    instructorId: '',
    departureAirfieldId: '',
    arrivalAirfieldId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  console.log('🔍 Component state initialized');
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flightLogToDelete, setFlightLogToDelete] = useState<FlightLog | null>(null);
  
  // Edit functionality state
  const [isEditMode, setIsEditMode] = useState(false);
  const [flightLogToEdit, setFlightLogToEdit] = useState<FlightLog | null>(null);

  // New state for import functionality
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    status: string;
  } | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  // Form management
  const form = useForm<CreateFlightLogForm>({
    resolver: zodResolver(createFlightLogSchema),
    defaultValues: {
      flightType: "SCHOOL",
      departureHobbs: undefined,
      arrivalHobbs: undefined,
      oilAdded: 0,
      fuelAdded: 0,
      dayLandings: 1,
      nightLandings: 0,
      // Add default values for all required fields
      pilotInCommand: 0,
      secondInCommand: 0,
      dualReceived: 0,
      dualGiven: 0,
      solo: 0,
      crossCountry: 0,
      night: 0,
      instrument: 0,
      actualInstrument: 0,
      simulatedInstrument: 0,
    },
  });

  // Reset form to default values every time the create modal is opened
  useEffect(() => {
    if (showCreateDialog) {
      if (isEditMode && flightLogToEdit) {
        // Populate form with existing flight log data for editing
        form.reset({
          flightType: flightLogToEdit.flightType as "INVOICED" | "SCHOOL" | "FERRY" | "CHARTER" | "DEMO" | "PROMO",
          departureHobbs: flightLogToEdit.departureHobbs,
          arrivalHobbs: flightLogToEdit.arrivalHobbs,
          oilAdded: flightLogToEdit.oilAdded || 0,
          fuelAdded: flightLogToEdit.fuelAdded || 0,
          dayLandings: flightLogToEdit.dayLandings,
          nightLandings: flightLogToEdit.nightLandings,
          pilotInCommand: flightLogToEdit.pilotInCommand,
          secondInCommand: flightLogToEdit.secondInCommand,
          dualReceived: flightLogToEdit.dualReceived,
          dualGiven: flightLogToEdit.dualGiven,
          solo: flightLogToEdit.solo,
          crossCountry: flightLogToEdit.crossCountry,
          night: flightLogToEdit.night,
          instrument: flightLogToEdit.instrument,
          actualInstrument: flightLogToEdit.actualInstrument,
          simulatedInstrument: flightLogToEdit.simulatedInstrument,
          date: flightLogToEdit.date,
          aircraftId: flightLogToEdit.aircraftId,
          pilotId: flightLogToEdit.pilotId,
          instructorId: flightLogToEdit.instructorId || undefined,
          departureAirfieldId: flightLogToEdit.departureAirfieldId,
          departureTime: flightLogToEdit.departureTime,
          arrivalAirfieldId: flightLogToEdit.arrivalAirfieldId,
          arrivalTime: flightLogToEdit.arrivalTime,
          purpose: flightLogToEdit.purpose || undefined,
          remarks: flightLogToEdit.remarks || '',
          route: flightLogToEdit.route || undefined,
          conditions: flightLogToEdit.conditions || undefined,
        });
      } else {
        // Reset to default values for creating new flight log
        form.reset({
          flightType: "SCHOOL",
          departureHobbs: undefined,
          arrivalHobbs: undefined,
          oilAdded: 0,
          fuelAdded: 0,
          dayLandings: 1,
          nightLandings: 0,
          // Add default values for all required fields
          pilotInCommand: 0,
          secondInCommand: 0,
          dualReceived: 0,
          dualGiven: 0,
          solo: 0,
          crossCountry: 0,
          night: 0,
          instrument: 0,
          actualInstrument: 0,
          simulatedInstrument: 0,
          // Clear all other fields
          date: undefined,
          aircraftId: undefined,
          pilotId: undefined,
          instructorId: undefined,
          departureAirfieldId: undefined,
          departureTime: undefined,
          arrivalAirfieldId: undefined,
          arrivalTime: undefined,
          purpose: undefined,
          remarks: undefined,
          route: undefined,
          conditions: undefined,
        });
        
        // If user should not show pilot selection, set the pilotId after reset
        if (currentUser && !shouldShowPilotSelection()) {
          console.log('🔄 Setting pilotId for user without pilot selection after form reset:', currentUser.id);
          form.setValue('pilotId', currentUser.id);
        }
      }
    }
  }, [showCreateDialog, currentUser, isEditMode, flightLogToEdit]);


  // Fetch current user function
  const fetchCurrentUser = async () => {
    try {
      console.log('🔍 fetchCurrentUser called');
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      console.log('🔍 Calling /api/auth/me...');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('🔍 /api/auth/me response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 /api/auth/me response data:', data);
        console.log('🔍 Setting currentUser to:', data);
        setCurrentUser(data);
        
        // Set appropriate view mode based on user role
        const userRoles = data.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isPilot = userRoles.includes('PILOT');
        const isStudent = userRoles.includes('STUDENT');
        const isInstructor = userRoles.includes('INSTRUCTOR');
        const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
        const isBaseManager = userRoles.includes('BASE_MANAGER');
        
        console.log('🔍 User roles detected:', userRoles);
        console.log('🔍 Role flags:', { isPilot, isStudent, isInstructor, isAdmin, isBaseManager });
        
        // Admins, instructors, and base managers should default to company view (priority over pilot/student)
        if (isAdmin || isInstructor || isBaseManager) {
          console.log('🔍 Setting view mode to company (admin/instructor/base_manager)');
          setViewMode('company');
        }
        // Pilots and students should ONLY see personal view (no toggle allowed)
        else if (isPilot || isStudent) {
          console.log('🔍 Setting view mode to personal (pilot/student)');
          setViewMode('personal');
        }
        
        // If user should not show pilot selection, automatically set them as the pilot
        if (!shouldShowPilotSelection()) {
          form.setValue('pilotId', data.id);
        }
      } else {
        console.error('Error fetching current user:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Fetch current user on component mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Refetch pilots when current user changes (for pilot-only users)
  useEffect(() => {
    if (currentUser) {
      fetchPilots();
    }
  }, [currentUser]);

  // Refetch instructors when current user changes (for instructor users)
  useEffect(() => {
    if (currentUser) {
      fetchInstructors();
    }
  }, [currentUser]);

  // Debug form errors
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log('❌ Form validation errors:', form.formState.errors);
    }
  }, [form.formState.errors]);

  // Auto-open create modal if prop is true
  useEffect(() => {
    if (openCreateModal && !loading) {
      setShowCreateDialog(true);
    }
  }, [openCreateModal, loading]);

  // Fetch data when component mounts or currentUser changes
  useEffect(() => {
    console.log('🔍 useEffect triggered - currentUser:', currentUser);
    console.log('🔍 useEffect dependencies:', { 
      currentUser: !!currentUser, 
      page: pagination.page, 
      limit: pagination.limit, 
      viewMode 
    });
    
    const fetchData = async () => {
      console.log('🔄 Fetching flight logs data...');
      console.log('👤 Current user:', currentUser);
      if (currentUser) {
        console.log('👤 Current user roles:', currentUser.userRoles?.map(ur => ur.role?.name) || []);
      }
      setLoading(true);
      try {
        await Promise.all([
          fetchFlightLogs(),
          fetchAircraft(),
          fetchPilots(),
          fetchInstructors(),
          fetchAirfields(),
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      console.log('🔍 Current user exists, calling fetchData');
      fetchData();
    } else {
      console.log('🔍 No current user, skipping fetchData');
    }
  }, [currentUser, pagination.page, pagination.limit, viewMode]);

  // Update flight logs when pagination, activeTab, viewMode, or filters change
  useEffect(() => {
    if (!loading) {
      fetchFlightLogs();
    }
  }, [pagination.page, pagination.limit, activeTab, viewMode, filters]);

  // Reset to first page when activeTab, viewMode, or filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [activeTab, viewMode, filters]);

  const fetchFlightLogs = async () => {
    try {
      console.log('🔍 fetchFlightLogs called');
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setFlightLogs([]);
        return;
      }

      // Check if current user is a prospect - if so, don't make API calls
      if (currentUser) {
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isProspect = userRoles.includes('PROSPECT');
        if (isProspect) {
          console.log('🔍 User is prospect, skipping flight logs API call');
          setFlightLogs([]);
          return;
        }
      }

      console.log('🔍 Building query parameters...');
      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });



      // Add flight type filter if not "all"
      if (activeTab !== "all") {
        params.append('flightType', activeTab.toUpperCase());
      }

      // Add view mode filter
      params.append('viewMode', viewMode);

      // Add filter parameters
      if (filters.aircraftId) {
        params.append('aircraftId', filters.aircraftId);
      }
      if (filters.pilotId) {
        params.append('pilotId', filters.pilotId);
      }
      if (filters.instructorId) {
        params.append('instructorId', filters.instructorId);
      }
      if (filters.departureAirfieldId) {
        params.append('departureAirfieldId', filters.departureAirfieldId);
      }
      if (filters.arrivalAirfieldId) {
        params.append('arrivalAirfieldId', filters.arrivalAirfieldId);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }

      const url = `/api/flight-logs?${params}`;
      console.log('🔍 Making API call to:', url);
      console.log('🔍 View mode:', viewMode);
      console.log('🔍 Active tab:', activeTab);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('🔍 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Flight logs data received:', data);
        console.log('🔍 Number of flight logs:', data.flightLogs?.length || 0);
        console.log('🔍 Total records from API:', data.totalRecords);
        console.log('🔍 Total pages from API:', data.totalPages);
        setFlightLogs(data.flightLogs || []);
        const newPagination = {
          ...pagination,
          total: data.totalRecords || 0,
          pages: data.totalPages || 1,
        };
        console.log('🔍 Setting pagination to:', newPagination);
        setPagination(newPagination);
      } else {
        console.error('Error fetching flight logs:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setFlightLogs([]);
      }
    } catch (error) {
      console.error('Error fetching flight logs:', error);
      setFlightLogs([]);
    }
  };

  const fetchAircraft = async () => {
    try {
      // Check if current user is a prospect - if so, don't make API calls
      if (currentUser) {
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isProspect = userRoles.includes('PROSPECT');
        if (isProspect) {
          console.log('🔍 User is prospect, skipping aircraft API call');
          return;
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setAircraft([]);
        return;
      }

      const response = await fetch('/api/fleet/aircraft?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAircraft(data.aircraft || []);
      } else {
        console.error('Error fetching aircraft:', response.status);
        setAircraft([]);
      }
    } catch (error) {
      console.error('Error fetching aircraft:', error);
      setAircraft([]);
    }
  };

  const fetchPilots = async () => {
    try {
      // Check if current user is a prospect - if so, don't make API calls
      if (currentUser) {
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isProspect = userRoles.includes('PROSPECT');
        if (isProspect) {
          console.log('🔍 User is prospect, skipping pilots API call');
          return;
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setPilots([]);
        return;
      }

      // Fetch both pilots and students, including inactive/suspended ones
      const [pilotsResponse, studentsResponse] = await Promise.all([
        fetch('/api/users?role=PILOT&limit=1000', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('/api/users?role=STUDENT&limit=1000', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      ]);

      // Handle pilots response
      let pilotsData = { users: [] };
      if (pilotsResponse.ok) {
        pilotsData = await pilotsResponse.json();
      } else if (pilotsResponse.status === 403) {
        console.log('User does not have permission to access pilots list (expected for some users)');
      } else {
        console.error('Error fetching pilots:', pilotsResponse.status);
      }

      // Handle students response
      let studentsData = { users: [] };
      if (studentsResponse.ok) {
        studentsData = await studentsResponse.json();
      } else if (studentsResponse.status === 403) {
        console.log('User does not have permission to access students list (expected for some users)');
      } else {
        console.error('Error fetching students:', studentsResponse.status);
      }

      // Combine pilots and students, removing duplicates by ID
      const pilotMap = new Map();
      
      // Add pilots first
      (pilotsData.users || []).forEach((pilot: User) => {
        pilotMap.set(pilot.id, pilot);
      });
      
      // Add students, but don't overwrite if already exists (pilots take precedence)
      (studentsData.users || []).forEach((student: User) => {
        if (!pilotMap.has(student.id)) {
          pilotMap.set(student.id, student);
        }
      });

      const allPilotsAndStudents = Array.from(pilotMap.values());

      setPilots(allPilotsAndStudents);
    } catch (error) {
      console.error('Error fetching pilots and students:', error);
      setPilots([]);
    }
  };

  const fetchInstructors = async () => {
    try {
      // Check if current user is a prospect - if so, don't make API calls
      if (currentUser) {
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isProspect = userRoles.includes('PROSPECT');
        if (isProspect) {
          console.log('🔍 User is prospect, skipping instructors API call');
          return;
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setInstructors([]);
        return;
      }

      // If current user is a pilot-only user, they might not have access to instructor list
      // This is fine since instructor is optional
      const response = await fetch('/api/users?role=INSTRUCTOR&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setInstructors(data.users || []);
      } else if (response.status === 403) {
        // User doesn't have permission to access instructors list - this is expected for pilots
        console.log('User does not have permission to access instructors list (expected for pilots)');
        setInstructors([]);
      } else {
        console.error('Error fetching instructors:', response.status);
        setInstructors([]);
      }
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setInstructors([]);
    }
  };

  const fetchAirfields = async () => {
    try {
      // Check if current user is a prospect - if so, don't make API calls
      if (currentUser) {
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isProspect = userRoles.includes('PROSPECT');
        if (isProspect) {
          console.log('🔍 User is prospect, skipping airfields API call');
          return;
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setAirfields([]);
        return;
      }

      const response = await fetch('/api/airfields?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAirfields(data.airfields || []);
      } else {
        console.error('Error fetching airfields:', response.status);
        setAirfields([]);
      }
    } catch (error) {
      console.error('Error fetching airfields:', error);
      setAirfields([]);
    }
  };

  const handleCreateFlightLog = async (data: CreateFlightLogForm) => {
    console.log('🎯 handleCreateFlightLog called!');
    console.log('🎯 Form submitted with data:', data);
    console.log('🎯 Is edit mode:', isEditMode);
    console.log('🎯 Flight log to edit:', flightLogToEdit);
    
    try {
      console.log('🚀 Form submission started!');
      console.log('📝 Is edit mode:', isEditMode);
      console.log('📝 Flight log to edit:', flightLogToEdit);
      console.log('Form data being submitted:', data);
      console.log('Form errors:', form.formState.errors);
      console.log('Form is valid:', form.formState.isValid);
      console.log('Form is dirty:', form.formState.isDirty);
      console.log('Departure time:', data.departureTime, 'Type:', typeof data.departureTime);
      console.log('Arrival time:', data.arrivalTime, 'Type:', typeof data.arrivalTime);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No token found in localStorage');
        toast.error('Authentication required');
        return;
      }

      console.log('✅ Token found in localStorage');

      // Clean up the data - remove undefined instructorId
      const cleanData = {
        ...data,
        instructorId: data.instructorId || undefined,
      };

      if (isEditMode && flightLogToEdit) {
        console.log('🔄 Updating existing flight log with ID:', flightLogToEdit.id);
        console.log('📤 Sending data to:', `/api/flight-logs/${flightLogToEdit.id}`);
        
        // Update existing flight log
        const response = await fetch(`/api/flight-logs/${flightLogToEdit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(cleanData),
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);

        if (response.ok) {
          console.log('✅ Flight log updated successfully');
          toast.success('Flight log updated successfully');
          setShowCreateDialog(false);
          setIsEditMode(false);
          setFlightLogToEdit(null);
          form.reset();
          fetchFlightLogs();
        } else {
          const error = await response.json();
          console.log('❌ Update failed with error:', error);
          toast.error(error.error || 'Failed to update flight log');
        }
      } else {
        console.log('🆕 Creating new flight log');
        // Create new flight log
        const response = await fetch('/api/flight-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(cleanData),
        });

        if (response.ok) {
          toast.success('Flight log created successfully');
          setShowCreateDialog(false);
          form.reset();
          fetchFlightLogs();
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to create flight log');
        }
      }
    } catch (error) {
      console.error('❌ Error creating/updating flight log:', error);
      toast.error('Failed to create/update flight log');
    }
  };

  const handleDeleteFlightLog = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/flight-logs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Flight log deleted successfully');
        fetchFlightLogs();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete flight log');
      }
    } catch (error) {
      console.error('Error deleting flight log:', error);
      toast.error('Failed to delete flight log');
    }
  };

  const confirmDeleteFlightLog = (flightLog: FlightLog) => {
    setFlightLogToDelete(flightLog);
    setShowDeleteDialog(true);
  };

  const executeDeleteFlightLog = async () => {
    if (flightLogToDelete) {
      await handleDeleteFlightLog(flightLogToDelete.id);
      setShowDeleteDialog(false);
      setFlightLogToDelete(null);
    }
  };

  const handleEditFlightLog = async (flightLog: FlightLog) => {
    console.log('✏️ Edit button clicked for flight log:', flightLog.id);
    console.log('📝 Flight log data:', flightLog);
    
    try {
      // Fetch fresh flight log data from API to ensure we have the latest remarks
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/flight-logs/${flightLog.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const freshFlightLog = await response.json();
        console.log('🔄 Fresh flight log data:', freshFlightLog);
        setFlightLogToEdit(freshFlightLog);
        setIsEditMode(true);
        setShowCreateDialog(true);
      } else {
        console.error('❌ Failed to fetch fresh flight log data');
        // Fallback to using existing data
        setFlightLogToEdit(flightLog);
        setIsEditMode(true);
        setShowCreateDialog(true);
      }
    } catch (error) {
      console.error('❌ Error fetching fresh flight log data:', error);
      // Fallback to using existing data
      setFlightLogToEdit(flightLog);
      setIsEditMode(true);
      setShowCreateDialog(true);
    }
  };

  const handleCloseModal = () => {
    setShowCreateDialog(false);
    setIsEditMode(false);
    setFlightLogToEdit(null);
    form.reset();
  };

  const getFlightTypeLabel = (type: string) => {
    const labels = {
      INVOICED: 'Invoiced',
      SCHOOL: 'School',
      FERRY: 'Ferry',
      CHARTER: 'Charter',
      DEMO: 'Demo',
      PROMO: 'Promo',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getFlightTypeBadgeColor = (type: string) => {
    const colors = {
      INVOICED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      SCHOOL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      FERRY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      CHARTER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      DEMO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      PROMO: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const calculateFlightHours = (departureTime: string, arrivalTime: string) => {
    try {
      // Ensure times are in HH:MM format
      const departure = new Date(`2000-01-01T${departureTime}:00`);
      const arrival = new Date(`2000-01-01T${arrivalTime}:00`);
      
      // Check if dates are valid
      if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
        console.error('Invalid time format:', { departureTime, arrivalTime });
        return 0;
      }
      
      const diffMs = arrival.getTime() - departure.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHours);
    } catch (error) {
      console.error('Error calculating flight hours:', error);
      return 0;
    }
  };

  const filteredFlightLogs = flightLogs; // Remove local filtering since we're using server-side pagination

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination(prev => ({ ...prev, limit: newPageSize, page: 1 })); // Reset to first page when changing page size
  };



  // Calculate pagination info
  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  // Check if user is pilot only (no other roles)
  const isPilotOnly = () => {
    if (!currentUser) return false;
    const isPilot = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'PILOT');
    const isInstructor = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'INSTRUCTOR');
    const isAdmin = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'ADMIN' || (ur.role?.name || ur.roles?.name) === 'SUPER_ADMIN');
    const isBaseManager = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'BASE_MANAGER');
    return isPilot && !isInstructor && !isAdmin && !isBaseManager;
  };

  // Check if user should see pilot selection (instructors, admins, base managers)
  const shouldShowPilotSelection = () => {
    if (!currentUser) return true;
    
    const isInstructor = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'INSTRUCTOR');
    const isAdmin = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'ADMIN' || (ur.role?.name || ur.roles?.name) === 'SUPER_ADMIN');
    const isBaseManager = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'BASE_MANAGER');
    
    // Always show pilot selection for instructors, admins, and super admins
    if (isInstructor || isAdmin) return true;
    
    // For BASE_MANAGER, show pilot selection only in company view
    if (isBaseManager && viewMode === 'company') return true;
    
    return false;
  };

  // Check if user can delete flight logs
  const canDeleteFlightLogs = () => {
    if (!currentUser) return false;
    return currentUser.userRoles?.some((ur: UserRole) => 
      (ur.role?.name || ur.roles?.name) === 'ADMIN' || (ur.role?.name || ur.roles?.name) === 'SUPER_ADMIN' || (ur.role?.name || ur.roles?.name) === 'BASE_MANAGER'
    );
  };

  // Check if user can toggle view mode
  const canToggleViewMode = () => {
    if (!currentUser) return false;
    
    console.log('🔍 canToggleViewMode - currentUser.userRoles:', JSON.stringify(currentUser.userRoles, null, 2));
    
    // Only allow view mode toggle for users who should see company-wide data
    const canToggle = currentUser.userRoles?.some((ur: UserRole) => {
      const roleName = ur.role?.name || ur.roles?.name;
      console.log('🔍 Checking role:', roleName, 'from ur:', ur);
      // Only INSTRUCTOR, ADMIN, SUPER_ADMIN, and BASE_MANAGER can toggle view mode
      // PILOT and STUDENT should only see their personal flights
      return roleName === 'INSTRUCTOR' || roleName === 'ADMIN' || roleName === 'SUPER_ADMIN' || roleName === 'BASE_MANAGER';
    });
    
    console.log('🔍 canToggleViewMode check:', {
      currentUser: currentUser?.email,
      userRoles: currentUser?.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name),
      canToggle
    });
    return canToggle;
  };

  // Check if user can edit flight logs
  const canEditFlightLogs = () => {
    if (!currentUser) return false;
    return currentUser.userRoles?.some((ur: UserRole) => 
      (ur.role?.name || ur.roles?.name) === 'ADMIN' || (ur.role?.name || ur.roles?.name) === 'SUPER_ADMIN' || (ur.role?.name || ur.roles?.name) === 'BASE_MANAGER' || (ur.role?.name || ur.roles?.name) === 'INSTRUCTOR'
    );
  };

  // Function to determine what to display in the PIC column based on user role and view mode
  const getPICDisplayName = (log: FlightLog) => {
    if (!currentUser) return log.pilot?.firstName && log.pilot?.lastName ? 
      `${log.pilot.firstName} ${log.pilot.lastName}` : 
      log.pilotId || 'Unknown';
    
    const isPilot = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'PILOT');
    const isStudent = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'STUDENT');
    const isInstructor = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'INSTRUCTOR');
    const isAdmin = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'ADMIN' || (ur.role?.name || ur.roles?.name) === 'SUPER_ADMIN');
    const isBaseManager = currentUser.userRoles?.some((ur: UserRole) => (ur.role?.name || ur.roles?.name) === 'BASE_MANAGER');
    
    // In company view, always show the actual pilot name
    if (viewMode === 'company') {
      // If there's an instructor, the instructor is the PIC
      if (log.instructor?.firstName && log.instructor?.lastName) {
        return `${log.instructor.firstName} ${log.instructor.lastName}`;
      }
      // If no instructor, show the pilot name
      return log.pilot?.firstName && log.pilot?.lastName ? 
        `${log.pilot.firstName} ${log.pilot.lastName}` : 
        log.pilotId || 'Unknown';
    }
    
    // In personal view, show "SELF" for own logs
    if ((isPilot || isStudent || isBaseManager || isAdmin) && log.pilotId === currentUser.id) {
      // If there's an instructor, the instructor is the PIC
      if (log.instructor?.firstName && log.instructor?.lastName) {
        return `${log.instructor.firstName} ${log.instructor.lastName}`;
      }
      // If no instructor, the pilot/student/base manager/admin is the PIC
      return "SELF";
    }
    
    // For all other cases, show the actual PIC name
    return log.pilot?.firstName && log.pilot?.lastName ? 
      `${log.pilot.firstName} ${log.pilot.lastName}` : 
      log.pilotId || 'Unknown';
  };

  // Track blurred state for each of the four fields
  const [blurred, setBlurred] = React.useState({
    departureTime: false,
    arrivalTime: false,
    departureHobbs: false,
    arrivalHobbs: false,
  });

  // Helper to check if all four fields are filled/valid
  function allTimeFieldsFilled() {
    const dep = form.watch("departureTime");
    const arr = form.watch("arrivalTime");
    const depH = form.watch("departureHobbs");
    const arrH = form.watch("arrivalHobbs");
    return (
      /^\d{2}:\d{2}$/.test(dep) && dep !== "" &&
      /^\d{2}:\d{2}$/.test(arr) && arr !== "" &&
      depH !== undefined && depH !== null && !isNaN(depH) && depH > 0 &&
      arrH !== undefined && arrH !== null && !isNaN(arrH) && arrH > 0
    );
  }

  // Reset blurred state for a field if its value changes
  React.useEffect(() => {
    setBlurred((prev) => ({ ...prev, departureTime: false }));
  }, [form.watch("departureTime")]);
  React.useEffect(() => {
    setBlurred((prev) => ({ ...prev, arrivalTime: false }));
  }, [form.watch("arrivalTime")]);
  React.useEffect(() => {
    setBlurred((prev) => ({ ...prev, departureHobbs: false }));
  }, [form.watch("departureHobbs")]);
  React.useEffect(() => {
    setBlurred((prev) => ({ ...prev, arrivalHobbs: false }));
  }, [form.watch("arrivalHobbs")]);

  // Handler for onBlur on any of the four fields
  function handleTimeHobbsBlur(field: string) {
    const dep = form.watch("departureTime");
    const arr = form.watch("arrivalTime");
    const depH = form.watch("departureHobbs");
    const arrH = form.watch("arrivalHobbs");
    let filled = false;
    if (field === "departureTime") filled = /^\d{2}:\d{2}$/.test(dep) && dep !== "";
    if (field === "arrivalTime") filled = /^\d{2}:\d{2}$/.test(arr) && arr !== "";
    if (field === "departureHobbs") filled = depH !== undefined && depH !== null && !isNaN(depH) && depH > 0;
    if (field === "arrivalHobbs") filled = arrH !== undefined && arrH !== null && !isNaN(arrH) && arrH > 0;
    if (filled) {
      setBlurred((prev) => ({ ...prev, [field]: true }));
    }
  }

  // Only show calculation/warning if all four fields are filled/valid and all four have been blurred
  const calculationReady = allTimeFieldsFilled() && blurred.departureTime && blurred.arrivalTime && blurred.departureHobbs && blurred.arrivalHobbs;

  // Import functionality
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/flight-logs/import', {
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
      a.download = 'flight_logs_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Template downloaded successfully!');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResults(null);
    }
  };

  const handleImportFlightLogs = async () => {
    if (!importFile) return;

    try {
      setImportProgress({ current: 0, total: 0, percentage: 0, status: 'Starting import...' });
      setImportResults(null);
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/flight-logs/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      // Check if we have an import ID for progress tracking
      if (result.importId) {
        // Start polling for progress
        const pollProgress = async () => {
          try {
            const progressResponse = await fetch(`/api/flight-logs/import-progress/${result.importId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              setImportProgress(progressData);
              
              if (!progressData.completed) {
                // Continue polling
                setTimeout(pollProgress, 1000);
              } else {
                // Import completed
                setImportResults(progressData.results);
                setImportProgress(null);
                setImportFile(null);
                
                // Refresh flight logs
                fetchFlightLogs();
                
                // Show success message
                if (progressData.results && progressData.results.success > 0) {
                  toast.success(`Successfully imported ${progressData.results.success} flight logs`);
                } else {
                  toast.error('Import failed');
                }
              }
            }
          } catch (error) {
            console.error('Error polling progress:', error);
            setImportProgress(null);
          }
        };
        
        pollProgress();
      } else {
        // Direct response without progress tracking
        setImportResults(result);
        setImportProgress(null);
        setImportFile(null);
        
        // Refresh flight logs
        fetchFlightLogs();
        
        if (result.results && result.results.success > 0) {
          toast.success(`Successfully imported ${result.results.success} flight logs`);
        } else {
          toast.error('Import failed');
        }
      }

    } catch (error: unknown) {
      console.error('Error importing flight logs:', error);
      setImportProgress(null);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Import failed: ' + errorMessage);
    }
  };

  try {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-2">
            <div className="flex items-center space-x-2 order-2 sm:order-1">
              <Tabs value={showPPLView ? "ppl" : "full"} onValueChange={(value) => setShowPPLView(value === "ppl")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="full" className="text-xs">Full View</TabsTrigger>
                  <TabsTrigger value="ppl" className="text-xs">PPL View</TabsTrigger>
                </TabsList>
              </Tabs>
              {canToggleViewMode() && (
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "personal" | "company")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                    <TabsTrigger value="company" className="text-xs">Company</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2 order-1 sm:order-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {canToggleViewMode() && (
                <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              )}
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Flight
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading flight logs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {!loading && !error && (
          <>


            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Aircraft Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Aircraft</Label>
                    <Combobox
                      options={aircraft.map((ac) => ({
                        value: ac.id,
                        label: ac.callSign
                      }))}
                      value={filters.aircraftId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, aircraftId: value }))}
                      placeholder="All Aircraft"
                      searchPlaceholder="Search aircraft..."
                      emptyText="No aircraft found."
                    />
                  </div>

                  {/* Pilot/Student Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pilot/Student</Label>
                    <Combobox
                      options={pilots.map((pilot) => ({
                        value: pilot.id,
                        label: `${pilot.firstName} ${pilot.lastName}`,
                        searchText: `${pilot.firstName} ${pilot.lastName}`,
                        status: pilot.status
                      }))}
                      value={filters.pilotId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, pilotId: value }))}
                      placeholder="All Pilots/Students"
                      searchPlaceholder="Search by name..."
                      emptyText="No pilots/students found."
                      searchFunction={(option, searchValue) => {
                        return option.searchText?.toLowerCase().includes(searchValue.toLowerCase()) || false;
                      }}
                    />
                  </div>

                  {/* Instructor Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Instructor</Label>
                    <Combobox
                      options={instructors.map((instructor) => ({
                        value: instructor.id,
                        label: `${instructor.firstName} ${instructor.lastName}`,
                        searchText: `${instructor.firstName} ${instructor.lastName}`,
                        status: instructor.status
                      }))}
                      value={filters.instructorId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, instructorId: value }))}
                      placeholder="All Instructors"
                      searchPlaceholder="Search by name..."
                      emptyText="No instructors found."
                      searchFunction={(option, searchValue) => {
                        return option.searchText?.toLowerCase().includes(searchValue.toLowerCase()) || false;
                      }}
                    />
                  </div>

                  {/* Departure Airfield Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Departure Airfield</Label>
                    <Combobox
                      options={airfields.map((airfield) => ({
                        value: airfield.id,
                        label: `${airfield.name} (${airfield.code})`
                      }))}
                      value={filters.departureAirfieldId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, departureAirfieldId: value }))}
                      placeholder="All Departure Airfields"
                      searchPlaceholder="Search by name or code..."
                      emptyText="No airfields found."
                    />
                  </div>

                  {/* Arrival Airfield Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Arrival Airfield</Label>
                    <Combobox
                      options={airfields.map((airfield) => ({
                        value: airfield.id,
                        label: `${airfield.name} (${airfield.code})`
                      }))}
                      value={filters.arrivalAirfieldId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, arrivalAirfieldId: value }))}
                      placeholder="All Arrival Airfields"
                      searchPlaceholder="Search by name or code..."
                      emptyText="No airfields found."
                    />
                  </div>

                  {/* Date Range Filters */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date From</Label>
                    <DatePicker
                      value={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                      onChange={(date) => {
                        if (date) {
                          setFilters(prev => ({ ...prev, dateFrom: date.toISOString().split('T')[0] }));
                        } else {
                          setFilters(prev => ({ ...prev, dateFrom: '' }));
                        }
                      }}
                      placeholder="Start Date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date To</Label>
                    <DatePicker
                      value={filters.dateTo ? new Date(filters.dateTo) : undefined}
                      onChange={(date) => {
                        if (date) {
                          setFilters(prev => ({ ...prev, dateTo: date.toISOString().split('T')[0] }));
                        } else {
                          setFilters(prev => ({ ...prev, dateTo: '' }));
                        }
                      }}
                      placeholder="End Date"
                    />
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-muted-foreground">
                    {Object.values(filters).some(value => value !== '') ? 'Filters applied' : 'No filters applied'}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilters({
                          aircraftId: '',
                          pilotId: '',
                          instructorId: '',
                          departureAirfieldId: '',
                          arrivalAirfieldId: '',
                          dateFrom: '',
                          dateTo: '',
                        });
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto">
                <TabsList className="w-max min-w-full">
                  <TabsTrigger value="all">All Flights</TabsTrigger>
                  <TabsTrigger value="invoiced">Invoiced</TabsTrigger>
                  <TabsTrigger value="school">School</TabsTrigger>
                  <TabsTrigger value="ferry">Ferry</TabsTrigger>
                  <TabsTrigger value="charter">Charter</TabsTrigger>
                  <TabsTrigger value="demo">Demo</TabsTrigger>
                  <TabsTrigger value="promo">Promo</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="space-y-4">
                {/* Flight Logs Table */}
                {filteredFlightLogs.length === 0 ? (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      No flight logs found. Create your first flight log to get started.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          {/* Column Numbers Row */}
                          <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                            <TableHead className="text-center font-bold text-xs bg-muted/70" rowSpan={1}>1</TableHead>
                            <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={2}>2</TableHead>
                            <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={2}>3</TableHead>
                            <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={2}>4</TableHead>
                            {!showPPLView && <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={6}>5</TableHead>}
                            <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={2}>6</TableHead>
                            <TableHead className="text-center font-bold text-xs bg-muted/70" rowSpan={1}>7</TableHead>
                            <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={4}>8</TableHead>
                            {!showPPLView && <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={4}>9</TableHead>}
                            <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={4}>10</TableHead>
                            {!showPPLView && <TableHead className="text-center font-bold text-xs bg-muted/70" colSpan={4}>11</TableHead>}
                            <TableHead className="text-center font-bold text-xs bg-muted/70" rowSpan={1}>12</TableHead>
                            <TableHead className="text-center font-bold text-xs bg-muted/70" rowSpan={3}>&nbsp;</TableHead>
                          </TableRow>
                          {/* Main Header Row */}
                          <TableRow className="border-b border-gray-200 dark:border-gray-700">
                            <TableHead className="text-center font-bold text-sm bg-muted/50" rowSpan={2}>
                              DATE<br />(dd/mm/yy)
                            </TableHead>
                            <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={2}>
                              DEPARTURE
                            </TableHead>
                            <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={2}>
                              ARRIVAL
                            </TableHead>
                            <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={2}>
                              AIRCRAFT
                            </TableHead>
                            {!showPPLView && <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={4}>
                              SINGLE PILOT<br />TIME
                            </TableHead>}
                            {!showPPLView && <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={2}>
                              MULTI-PILOT<br />TIME
                            </TableHead>}
                            <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={2}>
                              TOTAL TIME<br />OF FLIGHT
                            </TableHead>
                            <TableHead className="text-center font-bold text-sm bg-muted/50" rowSpan={2}>
                              NAME PIC
                            </TableHead>
                            <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={2}>
                              TAKEOFFS
                            </TableHead>
                            <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={2}>
                              LANDINGS
                            </TableHead>
                            {!showPPLView && <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={4}>
                              OPERATIONAL CONDITION TIME
                            </TableHead>}
                            <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={4}>
                              PILOT FUNCTION TIME
                            </TableHead>
                            {!showPPLView && <TableHead className="text-center font-bold text-sm bg-muted/50" colSpan={4}>
                              SYNTHETIC TRAINING DEVICE SESSION
                            </TableHead>}
                            <TableHead className="text-center font-bold text-sm bg-muted/50" rowSpan={2}>
                              REMARKS AND ENDORSEMENTS
                            </TableHead>
                          </TableRow>
                          {/* Sub-header Row */}
                          <TableRow className="border-b border-gray-200 dark:border-gray-700">
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              PLACE
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              TIME
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              PLACE
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              TIME
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              MODEL
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              REG
                            </TableHead>
                            {/* Column 5: Single Pilot Time */}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              SE
                            </TableHead>}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              ME
                            </TableHead>}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              {/* Blank column for extra single pilot time category */}
                            </TableHead>}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              {/* Blank column for extra single pilot time category */}
                            </TableHead>}
                            {/* Column 5: Multi-Pilot Time */}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              SE
                            </TableHead>}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              ME
                            </TableHead>}
                            {/* Column 6: Total Time of Flight */}
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              HRS
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              MIN
                            </TableHead>
                            {/* Column 7: Name PIC */}
                            {/* Column 8: Takeoffs */}
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              DAY
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              NIGHT
                            </TableHead>
                            {/* Column 8: Landings */}
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              DAY
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              NIGHT
                            </TableHead>
                            {/* Column 9: Operational Condition Time */}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium" colSpan={2}>
                              NIGHT
                            </TableHead>}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium" colSpan={2}>
                              IFR
                            </TableHead>}
                            {/* Column 10: Pilot Function Time */}
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              PIC
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              CO-PILOT
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              DUAL
                            </TableHead>
                            <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              FI
                            </TableHead>
                            {/* Column 11: Synthetic Training Device Session */}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              DATE<br />(dd/mm/yy)
                            </TableHead>}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium">
                              TYPE
                            </TableHead>}
                            {!showPPLView && <TableHead className="text-center text-xs bg-muted/30 font-medium" colSpan={2}>
                              TOTAL TIME<br />OF SESSION
                            </TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFlightLogs.map((log) => {
                            // Calculate total flight time in hours and minutes
                            const totalHours = Math.floor(log.totalHours);
                            const totalMinutes = Math.round((log.totalHours - totalHours) * 60);
                            
                            // Determine if aircraft is single or multi-engine based on ICAO designator
                            // Since we're using simple query without relationships, we'll show basic info
                            const hasAircraftData = log.aircraft && (log.aircraft.icaoReferenceType || log.aircraft.icao_reference_type);
                            const icaoType = hasAircraftData ? (log.aircraft.icaoReferenceType || log.aircraft.icao_reference_type) : null;
                            const typeDesignator = icaoType?.typeDesignator || 'N/A';
                            
                            // For now, assume single engine if we don't have aircraft data
                            const isSingleEngine = hasAircraftData ? (
                              typeDesignator?.includes('SE') || 
                              typeDesignator?.includes('172') ||
                              typeDesignator?.includes('152') ||
                              typeDesignator?.includes('PA28') ||
                              typeDesignator?.includes('C152') ||
                              typeDesignator?.includes('C172') ||
                              typeDesignator?.includes('CRUZ')
                            ) : true;
                            
                            const isMultiEngine = hasAircraftData ? (
                              typeDesignator?.includes('ME') ||
                              typeDesignator?.includes('PA34') ||
                              typeDesignator?.includes('BE76')
                            ) : false;
                            
                            // Determine if this is a multi-pilot aircraft
                            const isMultiPilotAircraft = hasAircraftData ? (
                              typeDesignator?.includes('ME') ||
                              typeDesignator?.includes('BE76') ||
                              typeDesignator?.includes('PA34') ||
                              typeDesignator?.includes('B737') ||
                              typeDesignator?.includes('A320') ||
                              typeDesignator?.includes('CRJ') ||
                              typeDesignator?.includes('ATR')
                            ) : false;
                            
                            // Determine pilot function times (placeholder logic based on instructor presence)
                            const hasInstructor = !!log.instructor;
                            const picTime = hasInstructor ? 0 : log.totalHours;
                            const dualTime = hasInstructor ? log.totalHours : 0;
                            const instructorTime = 0; // Would need additional logic to determine
                            const copilotTime = 0; // Would need additional logic to determine
                            
                            return (
                              <TableRow 
                                key={log.id} 
                                className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => {
                                  setSelectedFlightLog(log);
                                  setShowViewDialog(true);
                                }}
                              >
                                {/* Column 1: Date */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  <FormattedDate date={log.date} />
                                </TableCell>
                                
                                {/* Column 2: Departure */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.departureAirfield?.code || log.departureAirfieldId || 'N/A'}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.departureTime}
                                </TableCell>
                                
                                {/* Column 3: Arrival */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.arrivalAirfield?.code || log.arrivalAirfieldId || 'N/A'}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.arrivalTime}
                                </TableCell>
                                
                                {/* Column 4: Aircraft */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.aircraft?.callSign || log.aircraftId || 'N/A'}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.aircraft?.callSign || log.aircraftId || 'N/A'}
                                </TableCell>
                                
                                {/* Column 5: Single Pilot Time */}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {isSingleEngine ? `${Math.floor(log.totalHours).toString().padStart(2, '0')}:${Math.round((log.totalHours - Math.floor(log.totalHours)) * 60).toString().padStart(2, '0')}` : ""}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {isMultiEngine ? `${Math.floor(log.totalHours).toString().padStart(2, '0')}:${Math.round((log.totalHours - Math.floor(log.totalHours)) * 60).toString().padStart(2, '0')}` : ""}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '30px', minWidth: '30px', maxWidth: '30px' }}>
                                  {/* Blank cell for extra single pilot time category */}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '30px', minWidth: '30px', maxWidth: '30px' }}>
                                  {/* Blank cell for extra single pilot time category */}
                                </TableCell>}
                                
                                {/* Column 5: Multi-Pilot Time */}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {isSingleEngine && isMultiPilotAircraft ? `${Math.floor(copilotTime).toString().padStart(2, '0')}:${Math.round((copilotTime - Math.floor(copilotTime)) * 60).toString().padStart(2, '0')}` : ""}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {isMultiEngine && isMultiPilotAircraft ? `${Math.floor(copilotTime).toString().padStart(2, '0')}:${Math.round((copilotTime - Math.floor(copilotTime)) * 60).toString().padStart(2, '0')}` : ""}
                                </TableCell>}
                                
                                {/* Column 6: Total Time of Flight */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {totalHours.toString().padStart(2, '0')}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {totalMinutes.toString().padStart(2, '0')}
                                </TableCell>
                                
                                {/* Column 7: Name PIC */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  <span className={cn(
                                    // Check if the PIC is inactive/suspended
                                    (viewMode === 'company' && log.instructor && log.instructor.status && log.instructor.status !== 'ACTIVE') ||
                                    (viewMode === 'company' && !log.instructor && log.pilot && log.pilot.status && log.pilot.status !== 'ACTIVE') ||
                                    (viewMode !== 'company' && log.pilot && log.pilot.status && log.pilot.status !== 'ACTIVE')
                                      ? "text-gray-400" : ""
                                  )}>
                                    {getPICDisplayName(log)}
                                  </span>
                                </TableCell>
                                
                                {/* Column 8: Takeoffs */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.dayLandings}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.nightLandings}
                                </TableCell>
                                
                                {/* Column 8: Landings */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.dayLandings}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {log.nightLandings}
                                </TableCell>
                                
                                {/* Column 9: Operational Condition Time */}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {log.night > 0 ? Math.floor(log.night).toString().padStart(2, '0') : ""}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {log.night > 0 ? Math.round((log.night - Math.floor(log.night)) * 60).toString().padStart(2, '0') : ""}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {log.instrument > 0 ? Math.floor(log.instrument).toString().padStart(2, '0') : ""}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {log.instrument > 0 ? Math.round((log.instrument - Math.floor(log.instrument)) * 60).toString().padStart(2, '0') : ""}
                                </TableCell>}
                                
                                {/* Column 10: Pilot Function Time */}
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {picTime > 0 ? `${Math.floor(picTime).toString().padStart(2, '0')}:${Math.round((picTime - Math.floor(picTime)) * 60).toString().padStart(2, '0')}` : ""}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {copilotTime > 0 ? `${Math.floor(copilotTime).toString().padStart(2, '0')}:${Math.round((copilotTime - Math.floor(copilotTime)) * 60).toString().padStart(2, '0')}` : ""}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {dualTime > 0 ? `${Math.floor(dualTime).toString().padStart(2, '0')}:${Math.round((dualTime - Math.floor(dualTime)) * 60).toString().padStart(2, '0')}` : ""}
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {instructorTime > 0 ? `${Math.floor(instructorTime).toString().padStart(2, '0')}:${Math.round((instructorTime - Math.floor(instructorTime)) * 60).toString().padStart(2, '0')}` : ""}
                                </TableCell>
                                
                                {/* Column 11: Synthetic Training Device Session */}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {/* No data available */}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700">
                                  {/* No data available */}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {/* No data available */}
                                </TableCell>}
                                {!showPPLView && <TableCell className="text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                                  {/* No data available */}
                                </TableCell>}
                                
                                {/* Column 12: Remarks and Endorsements */}
                                <TableCell className="text-sm border-r border-gray-200 dark:border-gray-700 p-2">
                                  <div className="text-xs">
                                    {log.purpose && <div>Purpose: {log.purpose}</div>}
                                    {log.departureHobbs && log.arrivalHobbs && (
                                      <div>Hobbs: {log.departureHobbs.toFixed(1)} → {log.arrivalHobbs.toFixed(1)}</div>
                                    )}
                                    {log.instructor && (
                                      <div>Student: <span className={cn(
                                        log.pilot?.status && log.pilot.status !== 'ACTIVE' ? "text-gray-400" : ""
                                      )}>
                                        {log.pilot?.firstName && log.pilot?.lastName ? 
                                          `${log.pilot.firstName} ${log.pilot.lastName}` : 
                                          log.pilotId || 'Unknown'}
                                      </span></div>
                                    )}
                                  </div>
                                </TableCell>
                                
                                {/* Actions */}
                                <TableCell className="text-center border-r border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedFlightLog(log);
                                          setShowViewDialog(true);
                                        }}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      {canEditFlightLogs() && (
                                        <DropdownMenuItem
                                          onClick={() => handleEditFlightLog(log)}
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                      )}
                                      {canDeleteFlightLogs() && (
                                        <DropdownMenuItem
                                          onClick={() => confirmDeleteFlightLog(log)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4">
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          console.log('🔍 Pagination display - total:', pagination.total, 'page:', pagination.page, 'limit:', pagination.limit);
                          return pagination.total > 0 ? (
                            <>
                              Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                              <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                              <span className="font-medium">{pagination.total}</span> flight logs
                            </>
                          ) : (
                            'No flight logs found'
                          );
                        })()}
                      </div>
                      {pagination.total > 0 && (
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
                          {pagination.pages > 1 && (
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
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Create Flight Log Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="!max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Flight Log' : 'Log New Flight'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update the flight log details below.' : 'Fill in the flight details below to create a new flight log.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              console.log('📝 Form onSubmit triggered!');
              form.handleSubmit(handleCreateFlightLog)(e);
            }} className="space-y-4">
              <div className="space-y-6">
                {/* Flight Details */}
                <div className="space-y-4">
                  {/* Row 1: Pilot - Date - Aircraft - Instructor */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      {shouldShowPilotSelection() && (
                        <Combobox
                          options={pilots
                            .filter((pilot) => !pilot.status || pilot.status === 'ACTIVE')
                            .map((pilot) => ({
                              value: pilot.id,
                              label: `${pilot.firstName} ${pilot.lastName}`,
                              searchText: `${pilot.firstName} ${pilot.lastName}`
                            }))}
                          value={form.watch("pilotId")}
                          onValueChange={(value) => form.setValue("pilotId", value)}
                          placeholder="Pilot/Student *"
                          searchPlaceholder="Search by name..."
                          emptyText="No active pilots or students found."
                          searchFunction={(option, searchValue) => {
                            return option.searchText?.toLowerCase().includes(searchValue.toLowerCase()) || false;
                          }}
                          className={cn(
                            "border-gray-200 dark:border-gray-700",
                            form.formState.errors.pilotId ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />
                      )}

                      {!shouldShowPilotSelection() && (
                        <>
                          <Input
                            id="pilotId"
                            value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Loading...'}
                            disabled
                            className="bg-muted"
                            placeholder="Pilot"
                          />
                          {/* Hidden input to register the pilotId with the form */}
                          <input
                            type="hidden"
                            {...form.register("pilotId")}
                            value={currentUser?.id || ""}
                          />
                        </>
                      )}
                      {form.formState.errors.pilotId &&
                        form.formState.errors.pilotId.message !== "Invalid input: expected string, received undefined" && (
                          <p className="text-sm text-destructive">{form.formState.errors.pilotId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <DatePicker
                        value={form.watch("date") ? new Date(form.watch("date")) : undefined}
                        onChange={(date) => {
                          if (date) {
                            form.setValue("date", date.toISOString().split('T')[0]);
                          }
                        }}
                        placeholder="Date"
                        className={cn(
                          "border-gray-200 dark:border-gray-700",
                          form.formState.errors.date ? "border-red-500 focus-visible:ring-red-500" : ""
                        )}
                      />
                      {form.formState.errors.date &&
                        form.formState.errors.date.message !== "Invalid input: expected string, received undefined" && (
                          <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Combobox
                        options={aircraft.map((ac) => ({
                          value: ac.id,
                          label: ac.callSign
                        }))}
                        value={form.watch("aircraftId")}
                        onValueChange={(value) => form.setValue("aircraftId", value)}
                        placeholder="Aircraft *"
                        searchPlaceholder="Search..."
                        emptyText="No aircraft found."
                        className={cn(
                          "border-gray-200 dark:border-gray-700",
                          form.formState.errors.aircraftId ? "border-red-500 focus-visible:ring-red-500" : ""
                        )}
                      />
                      {form.formState.errors.aircraftId &&
                        form.formState.errors.aircraftId.message !== "Invalid input: expected string, received undefined" && (
                          <p className="text-sm text-destructive">{form.formState.errors.aircraftId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Combobox
                        options={instructors
                          .filter((instructor) => !instructor.status || instructor.status === 'ACTIVE')
                          .map((instructor) => ({
                            value: instructor.id,
                            label: `${instructor.firstName} ${instructor.lastName}`,
                            searchText: `${instructor.firstName} ${instructor.lastName}`
                          }))}
                        value={form.watch("instructorId") || ""}
                        onValueChange={(value) => form.setValue("instructorId", value || undefined)}
                        placeholder="Instructor (Optional)"
                        searchPlaceholder="Search by name..."
                        emptyText={instructors.filter(i => !i.status || i.status === 'ACTIVE').length === 0 ? "No active instructors available. This field is optional." : "No active instructors found."}
                        searchFunction={(option, searchValue) => {
                          return option.searchText?.toLowerCase().includes(searchValue.toLowerCase()) || false;
                        }}
                        className={cn(
                          "border-gray-200 dark:border-gray-700",
                          form.formState.errors.instructorId ? "border-red-500 focus-visible:ring-red-500" : ""
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Departure and Arrival Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Departure Card */}
                  <div className="bg-muted rounded-lg p-6 space-y-4 h-fit">
                    <h3 className="text-lg font-medium">Departure</h3>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Combobox
                          options={airfields.map((airfield) => ({
                            value: airfield.id,
                            label: `${airfield.name} (${airfield.code})`
                          }))}
                          value={form.watch("departureAirfieldId")}
                          onValueChange={(value) => form.setValue("departureAirfieldId", value)}
                          placeholder="Departure Airfield *"
                          searchPlaceholder="Search by name or code..."
                          emptyText="No airfields found."
                          className={cn(
                            "border-gray-200 dark:border-gray-700 w-full",
                            form.formState.errors.departureAirfieldId ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />
                        {form.formState.errors.departureAirfieldId &&
                          form.formState.errors.departureAirfieldId.message !== "Invalid input: expected string, received undefined" && (
                            <p className="text-sm text-destructive">{form.formState.errors.departureAirfieldId.message}</p>
                        )}
                      </div>

                      <div className="space-y-2 col-span-1">
                        <div>
                          <TimeInput
                            name="departureTime"
                            value={form.watch("departureTime")}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("departureTime", e.target.value)}
                            onBlur={() => handleTimeHobbsBlur("departureTime")}
                            className={cn(
                              "border-gray-200 dark:border-gray-700 w-full bg-background",
                              form.formState.errors.departureTime ? "border-red-500 focus-visible:ring-red-500" : ""
                            )}
                          />
                          <p className="text-xs text-muted-foreground mt-1 text-left">HH:MM All times UTC</p>
                        </div>
                        {form.formState.errors.departureTime &&
                          form.formState.errors.departureTime.message !== "Invalid input: expected string, received undefined" && (
                            <p className="text-sm text-destructive">{form.formState.errors.departureTime.message}</p>
                        )}
                      </div>

                      <div className="space-y-2 col-span-1">
                        <HobbsInput
                          name="departureHobbs"
                          value={form.watch("departureHobbs")}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("departureHobbs", parseFloat(e.target.value) || 0)}
                          onBlur={() => handleTimeHobbsBlur("departureHobbs")}
                          className={cn(
                            "border-gray-200 dark:border-gray-700 bg-background",
                            form.formState.errors.departureHobbs ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />

                      </div>
                    </div>

                    {/* Fuel & Oil Section */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="oilAdded">Oil Added (ml)</Label>
                          <Input
                            id="oilAdded"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onKeyDown={e => {
                              if ([
                                "Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight"
                              ].includes(e.key)) return;
                              if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                            }}
                            {...form.register("oilAdded", { valueAsNumber: true })}
                            className="border-gray-200 dark:border-gray-700 bg-background"
                          />
                          {form.formState.errors.oilAdded && (
                            <p className="text-sm text-destructive">{form.formState.errors.oilAdded.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fuelAdded">Fuel Added (L)</Label>
                          <Input
                            id="fuelAdded"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onKeyDown={e => {
                              if ([
                                "Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight"
                              ].includes(e.key)) return;
                              if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                            }}
                            {...form.register("fuelAdded", { valueAsNumber: true })}
                            className="border-gray-200 dark:border-gray-700 bg-background"
                          />
                          {form.formState.errors.fuelAdded && (
                            <p className="text-sm text-destructive">{form.formState.errors.fuelAdded.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrival Card */}
                  <div className="bg-muted rounded-lg p-6 space-y-4 h-fit">
                    <h3 className="text-lg font-medium">Arrival</h3>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Combobox
                          options={airfields.map((airfield) => ({
                            value: airfield.id,
                            label: `${airfield.name} (${airfield.code})`
                          }))}
                          value={form.watch("arrivalAirfieldId")}
                          onValueChange={(value) => form.setValue("arrivalAirfieldId", value)}
                          placeholder="Arrival Airfield *"
                          searchPlaceholder="Search by name or code..."
                          emptyText="No airfields found."
                          className={cn(
                            "border-gray-200 dark:border-gray-700 w-full",
                            form.formState.errors.arrivalAirfieldId ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />
                        {form.formState.errors.arrivalAirfieldId &&
                          form.formState.errors.arrivalAirfieldId.message !== "Invalid input: expected string, received undefined" && (
                            <p className="text-sm text-destructive">{form.formState.errors.arrivalAirfieldId.message}</p>
                        )}
                      </div>

                      <div className="space-y-2 col-span-1">
                        <div>
                          <TimeInput
                            name="arrivalTime"
                            value={form.watch("arrivalTime")}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("arrivalTime", e.target.value)}
                            onBlur={() => handleTimeHobbsBlur("arrivalTime")}
                            className={cn(
                              "border-gray-200 dark:border-gray-700 w-full bg-background",
                              form.formState.errors.arrivalTime ? "border-red-500 focus-visible:ring-red-500" : ""
                            )}
                          />
                          <p className="text-xs text-muted-foreground mt-1 text-left">HH:MM All times UTC</p>
                        </div>
                        {form.formState.errors.arrivalTime &&
                          form.formState.errors.arrivalTime.message !== "Invalid input: expected string, received undefined" && (
                            <p className="text-sm text-destructive">{form.formState.errors.arrivalTime.message}</p>
                        )}
                      </div>

                      <div className="space-y-2 col-span-1">
                        <HobbsInput
                          name="arrivalHobbs"
                          value={form.watch("arrivalHobbs")}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("arrivalHobbs", parseFloat(e.target.value) || 0)}
                          onBlur={() => handleTimeHobbsBlur("arrivalHobbs")}
                          className={cn(
                            "border-gray-200 dark:border-gray-700 bg-background",
                            form.formState.errors.arrivalHobbs ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />

                      </div>
                    </div>

                    {/* Landings Section */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dayLandings">Day Landings</Label>
                          <Input
                            id="dayLandings"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onKeyDown={e => {
                              if ([
                                "Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight"
                              ].includes(e.key)) return;
                              if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                            }}
                            {...form.register("dayLandings", { valueAsNumber: true })}
                            className="border-gray-200 dark:border-gray-700 bg-background"
                          />
                          {form.formState.errors.dayLandings && (
                            <p className="text-sm text-destructive">{form.formState.errors.dayLandings.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nightLandings">Night Landings</Label>
                          <Input
                            id="nightLandings"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onKeyDown={e => {
                              if ([
                                "Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight"
                              ].includes(e.key)) return;
                              if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                            }}
                            {...form.register("nightLandings", { valueAsNumber: true })}
                            className="border-gray-200 dark:border-gray-700 bg-background"
                          />
                          {form.formState.errors.nightLandings && (
                            <p className="text-sm text-destructive">{form.formState.errors.nightLandings.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Flight Time and Remarks Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Flight Time Card */}
                  <div className="bg-muted rounded-lg p-6 h-full flex flex-col">
                    <h3 className="text-lg font-medium mb-4">Flight Time</h3>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Calculated Time</Label>
                          <div className="bg-background rounded-md px-3 py-2 text-center text-sm font-mono border border-gray-200 dark:border-gray-700">
                            {/* Calculate and display time difference */}
                            {(() => {
                              const dep = form.watch("departureTime");
                              const arr = form.watch("arrivalTime");
                              if (/^\d{2}:\d{2}$/.test(dep) && /^\d{2}:\d{2}$/.test(arr)) {
                                const [dh, dm] = dep.split(":").map(Number);
                                const [ah, am] = arr.split(":").map(Number);
                                let minutes = (ah * 60 + am) - (dh * 60 + dm);
                                if (minutes < 0) minutes += 24 * 60;
                                const h = Math.floor(minutes / 60);
                                const m = minutes % 60;
                                return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                              }
                              return "--:--";
                            })()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Hobbs Time</Label>
                          <div className="bg-background rounded-md px-3 py-2 text-center text-sm font-mono border border-gray-200 dark:border-gray-700">
                            {/* Calculate and display hobbs difference */}
                            {(() => {
                              const dep = form.watch("departureHobbs");
                              const arr = form.watch("arrivalHobbs");
                              if (typeof dep === "number" && typeof arr === "number" && !isNaN(dep) && !isNaN(arr)) {
                                const diff = arr - dep;
                                return diff >= 0 ? diff.toFixed(1) : "-";
                              }
                              return "-";
                            })()}
                          </div>
                        </div>
                      </div>
                      {/* Warning below both time fields - full width, always reserve space */}
                      <div className="min-h-[60px] mt-4 flex items-center w-full">
                        {(() => {
                          if (!calculationReady) return <div className="w-full min-h-[56px]" />;
                          const dep = form.watch("departureTime");
                          const arr = form.watch("arrivalTime");
                          const depH = form.watch("departureHobbs");
                          const arrH = form.watch("arrivalHobbs");
                          const [dh, dm] = dep.split(":").map(Number);
                          const [ah, am] = arr.split(":").map(Number);
                          let minutes = (ah * 60 + am) - (dh * 60 + dm);
                          if (minutes < 0) minutes += 24 * 60;
                          const calcHours = minutes / 60;
                          const hobbs = (arrH || 0) - (depH || 0);
                          if (calcHours > 0 && Math.abs(calcHours - hobbs) / calcHours > 0.05) {
                            return (
                              <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded px-3 py-2 w-full text-sm flex items-center min-h-[56px]">
                                <span><strong>Warning:</strong> There is a significant difference between calculated time ({calcHours.toFixed(2)}h) and Hobbs time ({hobbs.toFixed(1)}h) ({'>'}{(100 * Math.abs(calcHours - hobbs) / calcHours).toFixed(1)}% difference).</span>
                              </div>
                            );
                          }
                          return <div className="w-full min-h-[56px]" />;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Remarks Card */}
                  <div className="bg-muted rounded-lg p-6 h-full flex flex-col">
                    <h3 className="text-lg font-medium mb-4">Remarks</h3>
                    <div className="flex-1 flex flex-col">
                      <Textarea
                        id="remarks"
                        {...form.register("remarks")}
                        placeholder="Additional notes about the flight"
                        className="border-gray-200 dark:border-gray-700 bg-background flex-1"
                      />
                    </div>
                  </div>
                </div>


                {/* Additional Information */}
                {/* REMOVE THIS BLOCK */}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={form.formState.isSubmitting}
                  onClick={() => {
                    console.log('🔘 Submit button clicked!');
                    console.log('Form errors:', form.formState.errors);
                    console.log('Form values:', form.getValues());
                  }}
                >
                  {form.formState.isSubmitting 
                    ? (isEditMode ? "Updating..." : "Creating...") 
                    : (isEditMode ? "Update Flight Log" : "Create Flight Log")
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Flight Log Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Flight Log Details</DialogTitle>
              <DialogDescription>
                View detailed information about this flight log entry.
              </DialogDescription>
            </DialogHeader>
            {selectedFlightLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                    <p className="text-sm"><FormattedDate date={selectedFlightLog.date} /></p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Flight Type</Label>
                    <Badge className={getFlightTypeBadgeColor(selectedFlightLog.flightType)}>
                      {getFlightTypeLabel(selectedFlightLog.flightType)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Aircraft</Label>
                    <p className="text-sm">{selectedFlightLog.aircraft.callSign} - {selectedFlightLog.aircraft.icaoReferenceType?.typeDesignator || selectedFlightLog.aircraft.icao_reference_type?.type_designator}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Total Hours</Label>
                    <p className="text-sm">{formatHours(selectedFlightLog.totalHours)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Pilot</Label>
                    <p className="text-sm">{selectedFlightLog.pilot?.firstName && selectedFlightLog.pilot?.lastName ? 
                      `${selectedFlightLog.pilot.firstName} ${selectedFlightLog.pilot.lastName}` : 
                      selectedFlightLog.pilotId || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Instructor</Label>
                    <p className="text-sm">
                      {selectedFlightLog.instructor 
                        ? `${selectedFlightLog.instructor.firstName} ${selectedFlightLog.instructor.lastName}`
                        : "None"
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Departure</Label>
                    <p className="text-sm">{selectedFlightLog.departureAirfield.code} - {selectedFlightLog.departureAirfield.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFlightLog.departureTime} UTC | Hobbs: {selectedFlightLog.departureHobbs ? selectedFlightLog.departureHobbs.toFixed(1) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Arrival</Label>
                    <p className="text-sm">{selectedFlightLog.arrivalAirfield.code} - {selectedFlightLog.arrivalAirfield.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFlightLog.arrivalTime} UTC | Hobbs: {selectedFlightLog.arrivalHobbs ? selectedFlightLog.arrivalHobbs.toFixed(1) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Purpose</Label>
                  <p className="text-sm">{selectedFlightLog.purpose}</p>
                </div>

                {selectedFlightLog.remarks && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Remarks</Label>
                    <p className="text-sm">{selectedFlightLog.remarks}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                    <p className="text-sm">{selectedFlightLog.createdBy.firstName} {selectedFlightLog.createdBy.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created On</Label>
                    <p className="text-sm"><FormattedDate date={selectedFlightLog.createdAt} /></p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Flight Logs</DialogTitle>
              <DialogDescription>
                Import flight logs from a CSV file. Download the template first to see the required format.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  onClick={() => document.getElementById('import-file-input')?.click()}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>
              
              <input
                id="import-file-input"
                type="file"
                accept=".csv"
                onChange={handleImportFileChange}
                className="hidden"
              />
              
              {importFile && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{importFile.name}</span>
                    </div>
                    <Button
                      onClick={handleImportFlightLogs}
                      disabled={importProgress !== null}
                      size="sm"
                    >
                      {importProgress ? 'Importing...' : 'Start Import'}
                    </Button>
                  </div>
                </div>
              )}
              
              {importProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing flight logs...</span>
                    <span>{importProgress.current} / {importProgress.total} ({importProgress.percentage}%)</span>
                  </div>
                  <Progress value={importProgress.percentage} className="w-full" />
                  <p className="text-xs text-muted-foreground">{importProgress.status}</p>
                </div>
              )}
              
              {importResults && (
                <div className="space-y-2">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {importResults.message}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                      <div className="font-bold text-green-600">{importResults.results?.success || 0}</div>
                      <div className="text-muted-foreground">Success</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                      <div className="font-bold text-yellow-600">{importResults.results?.skipped || 0}</div>
                      <div className="text-muted-foreground">Skipped</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                      <div className="font-bold text-red-600">{importResults.results?.errors?.length || 0}</div>
                      <div className="text-muted-foreground">Errors</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Flight Log</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this flight log? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {flightLogToDelete && (
              <div className="px-6 py-2">
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium">
                    Flight: {flightLogToDelete.aircraft.callSign} - {flightLogToDelete.aircraft.icaoReferenceType?.typeDesignator || flightLogToDelete.aircraft.icao_reference_type?.type_designator}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <FormattedDate date={flightLogToDelete.date} /> | {flightLogToDelete.departureAirfield.code} → {flightLogToDelete.arrivalAirfield.code}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Pilot: {flightLogToDelete.pilot.firstName} {flightLogToDelete.pilot.lastName}
                  </div>
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeDeleteFlightLog}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Flight Log
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  } catch (error) {
    console.error('Error rendering FlightLogs component:', error);
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-lg font-medium text-card-foreground mb-2">Error Loading Flight Logs</h2>
          <p className="text-muted-foreground">Something went wrong while loading the flight logs.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }
} 