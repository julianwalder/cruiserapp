'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Modal } from "@/components/ui/Modal";
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
  User as UserIcon, 
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
import { toast } from "sonner";
import { useFormattedDate } from "@/lib/date-utils";
import { cn, intelligentSearch } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/auth";
import { DateRange } from "react-day-picker";
import { createFlightLogSchema, defaultFlightLogValues, CreateFlightLogForm } from "@/lib/schemas/flight-log";
import { FlightLogsProps, FlightLog, User, Aircraft, Airfield, Pagination, ExtendedFlightLog, UserRole } from "@/lib/types/flight-log";
import { formatHours, flightLogToFormData, getFlightTypeLabel, getFlightTypeBadgeColor, getFlightTypeBorderColor, calculateFlightHours } from "@/lib/utils/flight-log-form";
import { TimeInput, HobbsInput } from "@/components/ui/form-inputs";

// Move nested components outside to prevent hook order violations

// Client-side date formatter component to prevent hydration issues
function FormattedDate({ date }: { date: string | Date | null | undefined }) {
  const formattedDate = useFormattedDate(date);
  return <span>{formattedDate}</span>;
}

// Utility function to format hours as HH:MM - now imported from shared utils

// TimeInput and HobbsInput components are now imported from shared UI components

// All interfaces are now imported from shared types

export default function FlightLogs({ openCreateModal = false }: FlightLogsProps) {
  const [flightLogs, setFlightLogs] = useState<FlightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  // Unified modal state
  const [showModal, setShowModal] = useState(openCreateModal);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedFlightLog, setSelectedFlightLog] = useState<FlightLog | null>(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [flightLogToDelete, setFlightLogToDelete] = useState<FlightLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAircraft, setSelectedAircraft] = useState<string>('all');
  const [selectedPilot, setSelectedPilot] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [pilots, setPilots] = useState<User[]>([]);
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showPPLView, setShowPPLView] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"personal" | "company">("personal");
  const [activeTab, setActiveTab] = useState("all");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [filters, setFilters] = useState({
    aircraftId: '',
    userId: null as string | null,
    instructorId: '',
    departureAirfieldId: '',
    arrivalAirfieldId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    status: string;
  } | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const router = useRouter();

  // Form management
  const form = useForm<CreateFlightLogForm>({
    resolver: zodResolver(createFlightLogSchema),
    defaultValues: defaultFlightLogValues,
  });

  // Populate form with flight log data when editing
  useEffect(() => {
    if (selectedFlightLog && modalMode === 'edit') {
      const formData = flightLogToFormData(selectedFlightLog);
      
      // Check if current user is a student (and only a student, no other roles)
      const isStudentOnly = currentUser && currentUser.userRoles?.some((ur: UserRole) => 
        (ur.role?.name || ur.roles?.name) === 'STUDENT'
      ) && !currentUser.userRoles?.some((ur: UserRole) => 
        (ur.role?.name || ur.roles?.name) === 'INSTRUCTOR' || 
        (ur.role?.name || ur.roles?.name) === 'ADMIN' || 
        (ur.role?.name || ur.roles?.name) === 'SUPER_ADMIN' ||
        (ur.role?.name || ur.roles?.name) === 'BASE_MANAGER'
      );
      
      // For students, always set flight type to SCHOOL
      if (isStudentOnly) {
        formData.flightType = 'SCHOOL';
      }
      
      console.log('🔍 Populating form with flight log data:', {
        selectedFlightLog: selectedFlightLog.flightType,
        formData: formData.flightType,
        modalMode,
        isStudentOnly
      });
      form.reset(formData);
    } else if (modalMode === 'create') {
      const defaultValues = { ...defaultFlightLogValues };
      
      // Check if current user is a student (and only a student, no other roles)
      const isStudentOnly = currentUser && currentUser.userRoles?.some((ur: UserRole) => 
        (ur.role?.name || ur.roles?.name) === 'STUDENT'
      ) && !currentUser.userRoles?.some((ur: UserRole) => 
        (ur.role?.name || ur.roles?.name) === 'INSTRUCTOR' || 
        (ur.role?.name || ur.roles?.name) === 'ADMIN' || 
        (ur.role?.name || ur.roles?.name) === 'SUPER_ADMIN' ||
        (ur.role?.name || ur.roles?.name) === 'BASE_MANAGER'
      );
      
      // For students, always set flight type to SCHOOL
      if (isStudentOnly) {
        defaultValues.flightType = 'SCHOOL';
      }
      // For pilots and other users, default is already INVOICED from the schema
      
      form.reset(defaultValues);
    }
  }, [selectedFlightLog, modalMode, form, currentUser]);

  // Client-side authentication check - moved to proper location
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const token = AuthService.getToken();
        if (!token) {
          console.log('🔍 FlightLogs - No token found, redirecting to login');
          setIsAuthenticated(false);
          router.push('/login?redirect=/flight-logs&error=auth_required');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          setIsAuthenticated(true);
          console.log('🔍 FlightLogs - Client-side authentication successful');
        } else {
          console.log('🔍 FlightLogs - Client-side authentication failed, redirecting to login');
          setIsAuthenticated(false);
          router.push('/login?redirect=/flight-logs&error=auth_required');
        }
      } catch (error) {
        console.error('🔍 FlightLogs - Authentication check error:', error);
        setIsAuthenticated(false);
        router.push('/login?redirect=/flight-logs&error=auth_required');
      }
    };

    checkAuthentication();
  }, [router]);

  // Note: Authentication check moved to end of component to avoid hook order issues

  // Fetch current user function
  const fetchCurrentUser = async () => {
    try {
    
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      
      
      if (response.ok) {
        const data = await response.json();
        
        setCurrentUser(data);
        
        // Set appropriate view mode based on user role
        const userRoles = data.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isPilot = userRoles.includes('PILOT');
        const isStudent = userRoles.includes('STUDENT');
        const isInstructor = userRoles.includes('INSTRUCTOR');
        const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
        const isBaseManager = userRoles.includes('BASE_MANAGER');
        
        
        
        // Admins, instructors, and base managers should default to company view (priority over pilot/student)
        if (isAdmin || isInstructor || isBaseManager) {
          
          setViewMode('company');
        }
        // Pilots and students should ONLY see personal view (no toggle allowed)
        else if (isPilot || isStudent) {
          
          setViewMode('personal');
        }
        
        // If user should not show pilot selection, automatically set them as the pilot
        if (!shouldShowPilotSelection()) {
          form.setValue('userId', data.id);
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

  // Refetch pilots when view mode changes (for BASE_MANAGER + PILOT/STUDENT users)
  useEffect(() => {
    if (currentUser) {
      const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
      const isPilot = userRoles.includes('PILOT');
      const isStudent = userRoles.includes('STUDENT');
      const isBaseManager = userRoles.includes('BASE_MANAGER');
      
      // Refetch pilots when BASE_MANAGER + PILOT/STUDENT switches view modes
      if (isBaseManager && (isPilot || isStudent)) {
        fetchPilots();
      }
    }
  }, [viewMode, currentUser]);

  // Refetch instructors when current user changes (for instructor users)
  useEffect(() => {
    if (currentUser) {
      fetchInstructors();
    }
  }, [currentUser]);

  
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      
    }
  }, [form.formState.errors]);

  // Auto-open create modal if prop is true
  useEffect(() => {
    if (openCreateModal && !loading) {
      setModalMode('create');
      setSelectedFlightLog(null);
      setShowModal(true);
    }
  }, [openCreateModal, loading]);

  // Fetch data when component mounts or currentUser changes
  useEffect(() => {

    
    const fetchData = async () => {

      setLoading(true);
      try {
        await Promise.all([
          fetchFlightLogs(),
          fetchAircraft(),
          fetchPilots(),
          fetchInstructors(),
          fetchAirfields(),
          fetchAllUsers(),
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchData();
    }
  }, [currentUser, pagination.page, pagination.limit, viewMode]);

  // Update flight logs when pagination, activeTab, viewMode, or filters change
  useEffect(() => {
    if (!loading) {
      fetchFlightLogs();
    }
  }, [pagination.page, pagination.limit, activeTab, viewMode, filters]);

  // Specific effect to handle userId filter changes for base managers
  useEffect(() => {
    if (currentUser && !loading) {
      const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
      const isBaseManager = userRoles.includes('BASE_MANAGER');
      
      if (isBaseManager) {
        fetchFlightLogs();
      }
    }
  }, [filters.userId, currentUser, loading]);

  // Reset to first page when activeTab, viewMode, or filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [activeTab, viewMode, filters]);

  // Handle pilot filter for BASE_MANAGER + PILOT/STUDENT users when switching view modes
  useEffect(() => {
    if (!currentUser) return;
    
    const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
    const isPilot = userRoles.includes('PILOT');
    const isStudent = userRoles.includes('STUDENT');
    const isBaseManager = userRoles.includes('BASE_MANAGER');
    
    // If user is BASE_MANAGER + PILOT/STUDENT and switches to personal view, set pilot filter to self
    if (isBaseManager && (isPilot || isStudent) && viewMode === 'personal') {
      setFilters(prev => ({ ...prev, userId: currentUser.id }));
    }
    
    // If user is BASE_MANAGER and switches to company view, set userId to null to show all flights
    if (isBaseManager && viewMode === 'company') {
      setFilters(prev => ({ ...prev, userId: null }));
    }
  }, [viewMode, currentUser]);

  const fetchFlightLogs = async () => {
    try {

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
          setFlightLogs([]);
          return;
        }
      }


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
      if (filters.userId && filters.userId !== null && filters.userId.trim() !== '') {
        params.append('userId', filters.userId);
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


      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      

      
      if (response.ok) {
        const data = await response.json();

        setFlightLogs(data.flightLogs || []);
        const newPagination = {
          ...pagination,
          total: data.totalRecords || 0,
          pages: data.totalPages || 1,
        };

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
          return;
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setPilots([]);
        return;
      }

      // Check if user should be restricted to only themselves
      const shouldRestrictToSelf = () => {
        if (!currentUser) return false;
        
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isPilot = userRoles.includes('PILOT');
        const isStudent = userRoles.includes('STUDENT');
        const isInstructor = userRoles.includes('INSTRUCTOR');
        const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
        const isBaseManager = userRoles.includes('BASE_MANAGER');
        
        // If user is PILOT or STUDENT and doesn't have additional roles, restrict to self
        if ((isPilot || isStudent) && !isInstructor && !isAdmin && !isBaseManager) {
          return true;
        }
        
        // If user is BASE_MANAGER + PILOT/STUDENT and in personal view, restrict to self
        if (isBaseManager && (isPilot || isStudent) && viewMode === 'personal') {
          return true;
        }
        
        return false;
      };

      // If user should be restricted to only themselves, just set them as the only option
      if (shouldRestrictToSelf() && currentUser) {
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isBaseManager = userRoles.includes('BASE_MANAGER');
        
        if (isBaseManager && viewMode === 'personal') {
  
        } else {
  
        }
        
        setPilots([currentUser]);
        // Automatically set the pilot filter to the current user
        setFilters(prev => ({ ...prev, userId: currentUser.id }));
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

      } else {
        console.error('Error fetching pilots:', pilotsResponse.status);
      }

      // Handle students response
      let studentsData = { users: [] };
      if (studentsResponse.ok) {
        studentsData = await studentsResponse.json();
      } else if (studentsResponse.status === 403) {

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
          return;
        }
      }

      let token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setInstructors([]);
        return;
      }
      


      // If current user is a pilot-only user, they might not have access to instructor list
      // This is fine since instructor is optional
      let response = await fetch('/api/users?role=INSTRUCTOR&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      

      
      // If we get a 401, try to refresh the token
      if (response.status === 401) {
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          // Retry the request with the new token
          response = await fetch('/api/users?role=INSTRUCTOR&limit=1000', {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
        } else {
          // Refresh failed, user will be redirected to login
          return;
        }
      }
      
      if (response.ok) {
        const data = await response.json();

        setInstructors(data.users || []);
      } else if (response.status === 403) {
        // User doesn't have permission to access instructors list - this is expected for pilots

        setInstructors([]);
      } else {
        const errorText = await response.text();
        console.error('Error fetching instructors:', response.status, errorText);
        setInstructors([]);
      }
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setInstructors([]);
    }
  };

  // Helper function to handle token refresh
  const refreshTokenIfNeeded = async (): Promise<string | null> => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const userId = localStorage.getItem('userId');
    
    if (!token || !refreshToken || !userId) {

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

        return data.accessToken;
      } else {
        // Only clear token if it's a 401 (unauthorized) error
        if (response.status === 401) {
          console.log('🔍 FlightLogs - Token refresh failed with 401, clearing token');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userId');
          window.location.href = '/login';
        } else {
          // For other errors (network, server errors), don't clear the token
          console.log('🔍 FlightLogs - Token refresh failed with status:', response.status, 'keeping token');
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
      // Check if current user is a prospect - if so, don't make API calls
      if (currentUser) {
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isProspect = userRoles.includes('PROSPECT');
        if (isProspect) {
          return;
        }
      }

      let token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setAirfields([]);
        return;
      }
      


      let response = await fetch('/api/airfields?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      

      
      // If we get a 401, try to refresh the token
      if (response.status === 401) {
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          // Retry the request with the new token
          response = await fetch('/api/airfields?limit=1000', {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
        } else {
          // Refresh failed, user will be redirected to login
          return;
        }
      }
      
      if (response.ok) {
        const data = await response.json();

        setAirfields(data.airfields || []);
      } else {
        const errorText = await response.text();
        console.error('Error fetching airfields:', response.status, errorText);
        setAirfields([]);
      }
    } catch (error) {
      console.error('Error fetching airfields:', error);
      setAirfields([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // Check if current user is a prospect - if so, don't make API calls
      if (currentUser) {
        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
        const isProspect = userRoles.includes('PROSPECT');
        if (isProspect) {
          return;
        }
      }

      let token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setAllUsers([]);
        return;
      }

      // Fetch all users (without role filter) for charter flight payer selection
      let response = await fetch('/api/users?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // If we get a 401, try to refresh the token
      if (response.status === 401) {
        const newToken = await refreshTokenIfNeeded();
        if (newToken) {
          // Retry the request with the new token
          response = await fetch('/api/users?limit=1000', {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
        } else {
          // Refresh failed, user will be redirected to login
          return;
        }
      }
      
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      } else if (response.status === 403) {
        // User doesn't have permission to access all users - fallback to pilots + instructors
        console.log('No permission to fetch all users, using pilots + instructors');
        setAllUsers([]);
      } else {
        const errorText = await response.text();
        console.error('Error fetching all users:', response.status, errorText);
        setAllUsers([]);
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
      setAllUsers([]);
    }
  };

  const handleCreateFlightLog = async (data: CreateFlightLogForm) => {
    try {
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Validate charter flight requirements
      if (data.flightType === 'CHARTER' && !data.payerId) {
        toast.error('Payer is required for charter flights');
        return;
      }
      if (data.flightType !== 'CHARTER' && data.payerId) {
        toast.error('Payer can only be set for charter flights');
        return;
      }

      // Clean up the data - remove undefined instructorId and payerId
      const cleanData = {
        ...data,
        instructorId: data.instructorId || undefined,
        payerId: data.payerId || undefined,
      };

      if (modalMode === 'edit' && selectedFlightLog) {
        
        // Update existing flight log
        const response = await fetch(`/api/flight-logs/${selectedFlightLog.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(cleanData),
        });

        if (response.ok) {
          toast.success('Flight log updated successfully');
          setShowModal(false);
          setModalMode('create');
          setSelectedFlightLog(null);
          form.reset();
          fetchFlightLogs();
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to update flight log');
        }
      } else {
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
          setShowModal(false);
          setModalMode('create');
          setSelectedFlightLog(null);
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
        console.log('🔍 Fresh flight log data from API:', {
          id: freshFlightLog.id,
          flightType: freshFlightLog.flightType,
          pilot: freshFlightLog.pilot?.firstName + ' ' + freshFlightLog.pilot?.lastName
        });

        setSelectedFlightLog(freshFlightLog);
        setModalMode('edit');
        setShowModal(true);
      } else {
        console.error('❌ Failed to fetch fresh flight log data');
        // Fallback to using existing data
        setSelectedFlightLog(flightLog);
        setModalMode('edit');
        setShowModal(true);
      }
    } catch (error) {
      console.error('❌ Error fetching fresh flight log data:', error);
      // Fallback to using existing data
      setSelectedFlightLog(flightLog);
      setModalMode('edit');
      setShowModal(true);
    }
  };

  const handleEditFromView = () => {
    setModalMode('edit');
  };

  const handleCancelEdit = () => {
    setModalMode('view');
  };

  const handleUpdateFlightLog = async (data: CreateFlightLogForm) => {
    if (!selectedFlightLog) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/flight-logs/${selectedFlightLog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update flight log');
      }

      const updatedFlightLog = await response.json();
      
      // Refresh the flight logs data to get the latest information
      await fetchFlightLogs();
      
      // Close the modal completely
      setShowModal(false);
      setModalMode('create');
      setSelectedFlightLog(null);
      
      toast.success('Flight log updated successfully');
    } catch (error) {
      console.error('Error updating flight log:', error);
      toast.error('Failed to update flight log');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalMode('create');
    setSelectedFlightLog(null);
    form.reset();
  };

  // Utility functions are now imported from shared utils

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
    

    
    // Only allow view mode toggle for users who should see company-wide data
    const canToggle = currentUser.userRoles?.some((ur: UserRole) => {
      const roleName = ur.role?.name || ur.roles?.name;
      
      // Only INSTRUCTOR, ADMIN, SUPER_ADMIN, and BASE_MANAGER can toggle view mode
      // PILOT and STUDENT should only see their personal flights
      return roleName === 'INSTRUCTOR' || roleName === 'ADMIN' || roleName === 'SUPER_ADMIN' || roleName === 'BASE_MANAGER';
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
      log.userId || 'Unknown';
    
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
        log.userId || 'Unknown';
    }
    
    // In personal view, show "SELF" for own logs
    if ((isPilot || isStudent || isBaseManager || isAdmin) && log.userId === currentUser.id) {
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
      log.userId || 'Unknown';
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

  const handleExportFlightLogs = async () => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query parameters from current filters
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.aircraftId) params.append('aircraftId', filters.aircraftId);
      if (filters.instructorId) params.append('instructorId', filters.instructorId);
      if (filters.departureAirfieldId) params.append('departureAirfieldId', filters.departureAirfieldId);
      if (filters.arrivalAirfieldId) params.append('arrivalAirfieldId', filters.arrivalAirfieldId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('viewMode', viewMode);
      params.append('format', 'csv');

      const response = await fetch(`/api/flight-logs/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flight_logs_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Flight logs exported successfully!');
    } catch (error) {
      console.error('Error exporting flight logs:', error);
      toast.error('Failed to export flight logs');
    } finally {
      setExportLoading(false);
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
    // Authentication check - moved to end to avoid hook order issues
    if (isAuthenticated === null) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      );
    }
    
    if (isAuthenticated === false) {
      return null;
    }
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-end space-y-3">
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportFlightLogs}
              disabled={exportLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              {exportLoading ? 'Exporting...' : 'Export'}
            </Button>
            {canToggleViewMode() && (
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            )}
            <Button onClick={() => {
              setModalMode('create');
              setSelectedFlightLog(null);
              setShowModal(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Log Flight
            </Button>
          </div>
          
          {/* Toggles */}
          <div className="flex items-center space-x-2">
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
                      value={(() => {
                        if (!currentUser) return filters.userId;
                        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
                        const isPilot = userRoles.includes('PILOT');
                        const isStudent = userRoles.includes('STUDENT');
                        const isInstructor = userRoles.includes('INSTRUCTOR');
                        const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
                        const isBaseManager = userRoles.includes('BASE_MANAGER');
                        
                        // If user is PILOT or STUDENT and doesn't have additional roles, force their ID
                        if ((isPilot || isStudent) && !isInstructor && !isAdmin && !isBaseManager) {
                          return currentUser.id;
                        }
                        
                        // If user is BASE_MANAGER + PILOT/STUDENT and in personal view, force their ID
                        if (isBaseManager && (isPilot || isStudent) && viewMode === 'personal') {
                          return currentUser.id;
                        }
                        
                        // If user is BASE_MANAGER and in company view, show "All" (null value)
                        if (isBaseManager && viewMode === 'company') {
                          return null;
                        }
                        
                        return filters.userId;
                      })()}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
                      placeholder="All Pilots/Students"
                      searchPlaceholder="Search by name..."
                      emptyText="No pilots/students found."
                      disabled={(() => {
                        if (!currentUser) return false;
                        const userRoles = currentUser.userRoles?.map((ur: UserRole) => ur.role?.name || ur.roles?.name) || [];
                        const isPilot = userRoles.includes('PILOT');
                        const isStudent = userRoles.includes('STUDENT');
                        const isInstructor = userRoles.includes('INSTRUCTOR');
                        const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
                        const isBaseManager = userRoles.includes('BASE_MANAGER');
                        
                        // Disable if user is PILOT or STUDENT and doesn't have additional roles
                        if ((isPilot || isStudent) && !isInstructor && !isAdmin && !isBaseManager) {
                          return true;
                        }
                        
                        // Disable if user is BASE_MANAGER + PILOT/STUDENT and in personal view
                        if (isBaseManager && (isPilot || isStudent) && viewMode === 'personal') {
                          return true;
                        }
                        
                        return false;
                      })()}
                      searchFunction={(option, searchValue) => {
                        return intelligentSearch(option.searchText || option.label, searchValue);
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
                        return intelligentSearch(option.searchText || option.label, searchValue);
                      }}
                    />
                  </div>

                  {/* Departure Airfield Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Departure Airfield</Label>
                    <Combobox
                      options={airfields.map((airfield) => ({
                        value: airfield.id,
                        label: `${airfield.name} (${airfield.code})`,
                        displayLabel: airfield.code,
                        searchText: `${airfield.name} ${airfield.code} ${airfield.city} ${airfield.country}`
                      }))}
                      value={filters.departureAirfieldId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, departureAirfieldId: value }))}
                      placeholder="All Departure Airfields"
                      searchPlaceholder="Search by name or code..."
                      emptyText="No airfields found."
                      searchFunction={(option, searchValue) => {
                        return intelligentSearch(option.searchText || option.label, searchValue);
                      }}
                    />
                  </div>

                  {/* Arrival Airfield Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Arrival Airfield</Label>
                    <Combobox
                      options={airfields.map((airfield) => ({
                        value: airfield.id,
                        label: `${airfield.name} (${airfield.code})`,
                        displayLabel: airfield.code,
                        searchText: `${airfield.name} ${airfield.code} ${airfield.city} ${airfield.country}`
                      }))}
                      value={filters.arrivalAirfieldId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, arrivalAirfieldId: value }))}
                      placeholder="All Arrival Airfields"
                      searchPlaceholder="Search by name or code..."
                      emptyText="No airfields found."
                      searchFunction={(option, searchValue) => {
                        return intelligentSearch(option.searchText || option.label, searchValue);
                      }}
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
                          userId: null,
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
                                  setModalMode('view');
                                  setShowModal(true);
                                }}
                              >
                                {/* Column 1: Date */}
                                <TableCell className={`text-center text-sm font-mono border-r border-gray-200 dark:border-gray-700 border-l-4 ${getFlightTypeBorderColor(log.flightType)}`}>
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
                                  {typeDesignator || 'N/A'}
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
                                          log.userId || 'Unknown'}
                                      </span></div>
                                    )}
                                    {log.flightType === 'CHARTER' && (log as any).payer_id && (
                                      <div>Paid by: <span className={cn(
                                        log.payer?.status && log.payer.status !== 'ACTIVE' ? "text-gray-400" : ""
                                      )}>
                                        {log.payer?.firstName && log.payer?.lastName ? 
                                          `${log.payer.firstName} ${log.payer.lastName}` : 
                                          (log as any).payer_id || 'Unknown'}
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
                                          setModalMode('view');
                                          setShowModal(true);
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

        {/* Unified Flight Log Modal */}
        <Modal
          open={showModal}
          onClose={handleCloseModal}
          title={
            modalMode === 'create' ? 'Log New Flight' :
            modalMode === 'edit' ? 'Edit Flight Log' :
            'Flight Log Details'
          }
          headerActions={
            modalMode === 'view' ? (
              <Button onClick={handleEditFromView}>
                Edit Flight Log
              </Button>
            ) : (
            <Button 
              disabled={form.formState.isSubmitting}
              onClick={() => form.handleSubmit(handleCreateFlightLog)()}
            >
              {form.formState.isSubmitting 
                  ? (modalMode === 'edit' ? "Updating..." : "Creating...") 
                  : (modalMode === 'edit' ? "Update Flight Log" : "Submit Flight Log")
              }
            </Button>
            )
          }
        >
          {modalMode === 'view' ? (
            // View Mode - Same form layout but read-only
            <div className="space-y-4">
              <div className="space-y-6">
                {/* Flight Details */}
                <div className="space-y-4">
                  {/* Row 1: Pilot - Date - Aircraft - Instructor */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Pilot/Student</Label>
                      <div className="bg-muted rounded-md px-3 py-2 text-sm">
                        {selectedFlightLog?.pilot ? `${selectedFlightLog.pilot.firstName} ${selectedFlightLog.pilot.lastName}` : 'N/A'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                      <div className="bg-muted rounded-md px-3 py-2 text-sm">
                        <FormattedDate date={selectedFlightLog?.date} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Aircraft</Label>
                      <div className="bg-muted rounded-md px-3 py-2 text-sm">
                        {selectedFlightLog?.aircraft?.callSign || 'N/A'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Instructor</Label>
                      <div className="bg-muted rounded-md px-3 py-2 text-sm">
                        {selectedFlightLog?.instructor ? `${selectedFlightLog.instructor.firstName} ${selectedFlightLog.instructor.lastName}` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Departure and Arrival Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Departure Card */}
                  <div className="bg-muted rounded-lg p-6 space-y-4 h-fit">
                    <h3 className="text-lg font-medium">Departure</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">Departure Airfield</Label>
                        <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700">
                          {selectedFlightLog?.departureAirfield?.code || 'N/A'}
                        </div>
                      </div>

                      <div className="space-y-2 col-span-1">
                        <Label className="text-sm font-medium text-muted-foreground">Time</Label>
                        <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 text-center font-mono">
                          {selectedFlightLog?.departureTime || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-left">HH:MM All times UTC</p>
                      </div>

                      <div className="space-y-2 col-span-1">
                        <Label className="text-sm font-medium text-muted-foreground">Hobbs</Label>
                        <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 text-center font-mono">
                          {selectedFlightLog?.departureHobbs?.toFixed(1) || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Fuel & Oil Section */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Oil Added (ml)</Label>
                          <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700">
                            {selectedFlightLog?.oilAdded || 0}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Fuel Added (L)</Label>
                          <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700">
                            {selectedFlightLog?.fuelAdded || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrival Card */}
                  <div className="bg-muted rounded-lg p-6 space-y-4 h-fit">
                    <h3 className="text-lg font-medium">Arrival</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">Arrival Airfield</Label>
                        <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700">
                          {selectedFlightLog?.arrivalAirfield?.code || 'N/A'}
                        </div>
                      </div>

                      <div className="space-y-2 col-span-1">
                        <Label className="text-sm font-medium text-muted-foreground">Time</Label>
                        <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 text-center font-mono">
                          {selectedFlightLog?.arrivalTime || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-left">HH:MM All times UTC</p>
                      </div>

                      <div className="space-y-2 col-span-1">
                        <Label className="text-sm font-medium text-muted-foreground">Hobbs</Label>
                        <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 text-center font-mono">
                          {selectedFlightLog?.arrivalHobbs?.toFixed(1) || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Landings Section */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Day Landings</Label>
                          <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700">
                            {selectedFlightLog?.dayLandings || 0}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Night Landings</Label>
                          <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700">
                            {selectedFlightLog?.nightLandings || 0}
                          </div>
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
                          <Label className="text-sm font-medium text-muted-foreground">Calculated Time</Label>
                          <div className="bg-background rounded-md px-3 py-2 text-center text-sm font-mono border border-gray-200 dark:border-gray-700">
                            {selectedFlightLog?.totalHours ? formatHours(selectedFlightLog.totalHours) : 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Hobbs Time</Label>
                          <div className="bg-background rounded-md px-3 py-2 text-center text-sm font-mono border border-gray-200 dark:border-gray-700">
                            {selectedFlightLog?.departureHobbs && selectedFlightLog?.arrivalHobbs 
                              ? (selectedFlightLog.arrivalHobbs - selectedFlightLog.departureHobbs).toFixed(1)
                              : 'N/A'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remarks Card */}
                  <div className="bg-muted rounded-lg p-6 h-full flex flex-col">
                    <h3 className="text-lg font-medium mb-4">Remarks</h3>
                    <div className="flex-1 flex flex-col">
                      <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 flex-1 min-h-[100px]">
                        {selectedFlightLog?.remarks || 'No remarks'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-muted rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-medium">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Flight Type</Label>
                      <div className="mt-1">
                        <Badge className={getFlightTypeBadgeColor(selectedFlightLog?.flightType || '')}>
                          {getFlightTypeLabel(selectedFlightLog?.flightType || '')}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Hours</Label>
                      <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 mt-1">
                        {selectedFlightLog?.totalHours ? formatHours(selectedFlightLog.totalHours) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        {selectedFlightLog?.flightType === "CHARTER" ? "Payer" : "Purpose"}
                      </Label>
                      <div className="bg-background rounded-md px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 mt-1">
                        {selectedFlightLog?.flightType === "CHARTER" 
                          ? (selectedFlightLog.payer ? `${selectedFlightLog.payer.firstName} ${selectedFlightLog.payer.lastName}` : 'N/A')
                          : (selectedFlightLog?.purpose || 'N/A')
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Create/Edit Mode - Show form
            <form onSubmit={(e) => form.handleSubmit(handleCreateFlightLog)(e)} className="space-y-4">
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
                          value={form.watch("userId")}
                          onValueChange={(value) => form.setValue("userId", value)}
                          placeholder="Pilot/Student *"
                          searchPlaceholder="Search by name..."
                          emptyText="No active pilots or students found."
                          searchFunction={(option, searchValue) => {
                            return option.searchText?.toLowerCase().includes(searchValue.toLowerCase()) || false;
                          }}
                          className={cn(
                            "border-gray-200 dark:border-gray-700",
                            form.formState.errors.userId ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />
                      )}

                      {!shouldShowPilotSelection() && (
                        <>
                          <Input
                            id="userId"
                            value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Loading...'}
                            disabled
                            className="bg-muted"
                            placeholder="Pilot"
                          />
                          {/* Hidden input to register the userId with the form */}
                          <input
                            type="hidden"
                            {...form.register("userId")}
                            value={currentUser?.id || ""}
                          />
                        </>
                      )}
                                            {form.formState.errors.userId &&
                        form.formState.errors.userId.message !== "Invalid input: expected string, received undefined" && (
                        <p className="text-sm text-destructive">{form.formState.errors.userId.message}</p>
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
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Combobox
                          options={airfields.map((airfield) => ({
                            value: airfield.id,
                            label: `${airfield.name} (${airfield.code})`,
                            displayLabel: airfield.code,
                            searchText: `${airfield.name} ${airfield.code} ${airfield.city} ${airfield.country}`
                          }))}
                          value={form.watch("departureAirfieldId")}
                          onValueChange={(value) => form.setValue("departureAirfieldId", value)}
                          placeholder="Departure Airfield *"
                          searchPlaceholder="Search by name or code..."
                          emptyText="No airfields found."
                          searchFunction={(option, searchValue) => {
                            return intelligentSearch(option.searchText || option.label, searchValue);
                          }}
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
                        <div>
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
                          <p className="text-xs text-muted-foreground mt-1 text-left">Hobbs</p>
                        </div>
                        {form.formState.errors.departureHobbs && (
                          <p className="text-sm text-destructive">{form.formState.errors.departureHobbs.message}</p>
                        )}
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
                            {...form.register("oilAdded", { 
                              valueAsNumber: true,
                              setValueAs: (value) => {
                                const num = parseFloat(value);
                                return isNaN(num) ? undefined : num;
                              }
                            })}
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
                            {...form.register("fuelAdded", { 
                              valueAsNumber: true,
                              setValueAs: (value) => {
                                const num = parseFloat(value);
                                return isNaN(num) ? undefined : num;
                              }
                            })}
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
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Combobox
                          options={airfields.map((airfield) => ({
                            value: airfield.id,
                            label: `${airfield.name} (${airfield.code})`,
                            displayLabel: airfield.code,
                            searchText: `${airfield.name} ${airfield.code} ${airfield.city} ${airfield.country}`
                          }))}
                          value={form.watch("arrivalAirfieldId")}
                          onValueChange={(value) => form.setValue("arrivalAirfieldId", value)}
                          placeholder="Arrival Airfield *"
                          searchPlaceholder="Search by name or code..."
                          emptyText="No airfields found."
                          searchFunction={(option, searchValue) => {
                            return intelligentSearch(option.searchText || option.label, searchValue);
                          }}
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
                        <div>
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
                          <p className="text-xs text-muted-foreground mt-1 text-left">Hobbs</p>
                        </div>
                        {form.formState.errors.arrivalHobbs && (
                          <p className="text-sm text-destructive">{form.formState.errors.arrivalHobbs.message}</p>
                        )}
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
                <div className="bg-muted rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-medium">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="flightType">Flight Type</Label>
                      {(() => {
                        // Check if current user is a student (and only a student, no other roles)
                        const isStudentOnly = currentUser && currentUser.userRoles?.some((ur: UserRole) => 
                          (ur.role?.name || ur.roles?.name) === 'STUDENT'
                        ) && !currentUser.userRoles?.some((ur: UserRole) => 
                          (ur.role?.name || ur.roles?.name) === 'INSTRUCTOR' || 
                          (ur.role?.name || ur.roles?.name) === 'ADMIN' || 
                          (ur.role?.name || ur.roles?.name) === 'SUPER_ADMIN' ||
                          (ur.role?.name || ur.roles?.name) === 'BASE_MANAGER'
                        );

                        if (isStudentOnly) {
                          // For students, show a disabled input with "School" value
                          return (
                            <>
                              <Input
                                value="School"
                                disabled
                                className="bg-muted border-gray-200 dark:border-gray-700"
                              />
                              {/* Hidden input to register the flightType with the form */}
                              <input
                                type="hidden"
                                {...form.register("flightType")}
                                value="SCHOOL"
                              />
                            </>
                          );
                        }

                        // For all other users, show the select dropdown
                        return (
                          <Select
                            value={form.watch("flightType")}
                            onValueChange={(value) => {
                              console.log('🔍 Flight type changed to:', value);
                              // Only set the value if it's not empty (prevents overriding during form population)
                              if (value && value.trim() !== '') {
                                form.setValue("flightType", value as "INVOICED" | "SCHOOL" | "FERRY" | "CHARTER" | "DEMO" | "PROMO");
                              }
                            }}
                          >
                            <SelectTrigger className="border-gray-200 dark:border-gray-700">
                              <SelectValue placeholder="Select flight type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SCHOOL">School</SelectItem>
                              <SelectItem value="INVOICED">Invoiced</SelectItem>
                              <SelectItem value="FERRY">Ferry</SelectItem>
                              <SelectItem value="CHARTER">Charter</SelectItem>
                              <SelectItem value="DEMO">Demo</SelectItem>
                              <SelectItem value="PROMO">Promo</SelectItem>
                            </SelectContent>
                          </Select>
                        );
                      })()}
                      {/* Debug info */}
                      {modalMode === 'edit' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Debug: Current value: {form.watch("flightType") || 'undefined'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Hours</Label>
                      <p className="text-sm">{(() => {
                        const totalHours = form.watch("totalHours");
                        return totalHours ? formatHours(totalHours) : 'N/A';
                      })()}</p>
                    </div>
                    <div>
                      {form.watch("flightType") === "CHARTER" ? (
                        <>
                          <Label htmlFor="payerId">Payer</Label>
                          <Combobox
                            options={(() => {
                              // For charter flights, we need to show all users, not just pilots
                              let usersToShow = allUsers;
                              
                              // If we don't have all users (due to permissions), fallback to pilots + instructors
                              if (allUsers.length === 0) {
                                usersToShow = [...pilots, ...instructors];
                                // Remove duplicates by ID
                                usersToShow = usersToShow.filter((user, index, self) => 
                                  index === self.findIndex(u => u.id === user.id)
                                );
                              }
                              
                              return usersToShow
                                .filter((user) => !user.status || user.status === 'ACTIVE')
                                .map((user) => ({
                                  value: user.id,
                                  label: `${user.firstName} ${user.lastName}`,
                                  searchText: `${user.firstName} ${user.lastName}`
                                }));
                            })()}
                            value={form.watch("payerId")}
                            onValueChange={(value) => form.setValue("payerId", value)}
                            placeholder="Select payer for charter flight"
                            searchPlaceholder="Search by name..."
                            emptyText="No active users found."
                            searchFunction={(option, searchValue) => {
                              return option.searchText?.toLowerCase().includes(searchValue.toLowerCase()) || false;
                            }}
                            className="border-gray-200 dark:border-gray-700"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Who will pay for this charter flight?</p>
                        </>
                      ) : (
                        <>
                          <Label htmlFor="purpose">Purpose</Label>
                          <Input
                            id="purpose"
                            {...form.register("purpose")}
                            placeholder="Flight purpose"
                            className="border-gray-200 dark:border-gray-700 bg-background"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </Modal>


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