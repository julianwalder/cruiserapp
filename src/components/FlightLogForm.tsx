'use client';

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useFormattedDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

// Flight log creation schema - Jeppesen format
const createFlightLogSchema = z.object({
  // Basic flight information
  date: z.string().min(1, "Date is required"),
  aircraftId: z.string().min(1, "Aircraft is required"),
  userId: z.string().min(1, "Pilot is required"),
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
  payerId: z.string().optional().or(z.undefined()), // User ID of the person who pays for the flight (used for charter flights)
  
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

// Local interfaces matching FlightLogs.tsx
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

interface Aircraft {
  id: string;
  callSign: string;
  icaoReferenceType?: {
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
  userId: string;
  instructorId?: string;
  payerId?: string; // User ID of the person who pays for the flight (used for charter flights)
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
  updatedBy?: string;
  
  // Related data
  aircraft: Aircraft;
  pilot: User;
  instructor?: User;
  departureAirfield: Airfield;
  arrivalAirfield: Airfield;
  createdBy: User;
  updatedByUser?: User;
  
  // Handle both camelCase and snake_case relationship names
  departure_airfield?: Airfield;
  arrival_airfield?: Airfield;
  created_by?: User;
}

interface FlightLogFormProps {
  mode: 'create' | 'edit' | 'view';
  data?: FlightLog;
  pilots: User[];
  instructors: User[];
  aircraft: Aircraft[];
  airfields: Airfield[];
  currentUser?: User | null;
  onSubmit?: (data: CreateFlightLogForm) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

// TimeInput component (copied from FlightLogs.tsx)
interface TimeInputProps {
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  [key: string]: any;
}

function TimeInput({ value, onChange, name, className, disabled, ...props }: TimeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    inputValue = inputValue.replace(/[^\d:]/g, '');
    
    if (inputValue.length === 2 && !inputValue.includes(':')) {
      inputValue = inputValue + ':';
    }
    
    if (inputValue.length > 5) {
      inputValue = inputValue.substring(0, 5);
    }
    
    e.target.value = inputValue;
    onChange(e);
  };

  return (
    <input
      type="text"
      name={name}
      value={value || ''}
      onChange={handleChange}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      placeholder="HH:MM"
      disabled={disabled}
      {...props}
    />
  );
}

// HobbsInput component (copied from FlightLogs.tsx)
interface HobbsInputProps {
  value?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  className?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  [key: string]: any;
}

function HobbsInput({ value, onChange, name, className, disabled, ...props }: HobbsInputProps) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value);
    if (!isNaN(numValue) && numValue >= 0) {
      e.target.value = numValue.toFixed(1);
    }
    
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      type="number"
      name={name}
      value={value || ''}
      onChange={onChange}
      onBlur={handleBlur}
      step="0.1"
      min="0"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
}

// Helper functions
const getFlightTypeLabel = (type: string) => {
  const labels: { [key: string]: string } = {
    'SCHOOL': 'School',
    'INVOICED': 'Invoiced',
    'FERRY': 'Ferry',
    'CHARTER': 'Charter',
    'DEMO': 'Demo',
    'PROMO': 'Promo'
  };
  return labels[type] || type;
};

const getFlightTypeBadgeColor = (type: string) => {
  const colors: { [key: string]: string } = {
    'SCHOOL': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    'INVOICED': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    'FERRY': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
    'CHARTER': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    'DEMO': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
    'PROMO': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
};

const formatHours = (hours: number) => {
  return `${hours.toFixed(1)}h`;
};

const FormattedDate = ({ date }: { date: string }) => {
  const formattedDate = useFormattedDate(date);
  return <span>{formattedDate}</span>;
};

// Function to determine flight type based on user roles
const getDefaultFlightType = (user: User | null | undefined): "SCHOOL" | "INVOICED" | "FERRY" => {
  if (!user) return "SCHOOL";
  
  const userRoles = user.userRoles || [];
  const roleNames = userRoles.map(role => 
    role.role?.name || role.roles?.name || ''
  ).filter(Boolean);
  
  // Check if user has PILOT role (graduates from school)
  const hasPilotRole = roleNames.includes('PILOT');
  const hasStudentRole = roleNames.includes('STUDENT');
  const hasBaseManagerRole = roleNames.includes('BASE_MANAGER');
  const hasAdminRole = roleNames.includes('ADMIN') || roleNames.includes('SUPER_ADMIN');
  
  // If user has PILOT role (even if they also have STUDENT), all flights are INVOICED
  if (hasPilotRole) {
    return "INVOICED";
  }
  
  // If user is only STUDENT (no PILOT role), flights are SCHOOL
  if (hasStudentRole && !hasPilotRole) {
    return "SCHOOL";
  }
  
  // If user is BASE_MANAGER or ADMIN logging their own flights, it's FERRY
  if ((hasBaseManagerRole || hasAdminRole) && !hasPilotRole && !hasStudentRole) {
    return "FERRY";
  }
  
  // Default fallback
  return "SCHOOL";
};

export function FlightLogForm({
  mode,
  data,
  pilots,
  instructors,
  aircraft,
  airfields,
  currentUser,
  onSubmit,
  onCancel,
  isSubmitting = false
}: FlightLogFormProps) {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  // Form setup
  const form = useForm<CreateFlightLogForm>({
    resolver: zodResolver(createFlightLogSchema),
    defaultValues: {
      flightType: "SCHOOL", // Default, will be overridden by backend
      departureHobbs: undefined,
      arrivalHobbs: undefined,
      oilAdded: 0,
      fuelAdded: 0,
      dayLandings: 1,
      nightLandings: 0,
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
      payerId: undefined,
    },
  });

  // Populate form with data if in edit or view mode (only once when component mounts)
  React.useEffect(() => {
    if (data && (isEditMode || isViewMode)) {
      const formData = {
        flightType: data.flightType as "INVOICED" | "SCHOOL" | "FERRY" | "CHARTER" | "DEMO" | "PROMO",
        departureHobbs: data.departureHobbs,
        arrivalHobbs: data.arrivalHobbs,
        oilAdded: data.oilAdded || 0,
        fuelAdded: data.fuelAdded || 0,
        dayLandings: data.dayLandings,
        nightLandings: data.nightLandings,
        pilotInCommand: data.pilotInCommand,
        secondInCommand: data.secondInCommand,
        dualReceived: data.dualReceived,
        dualGiven: data.dualGiven,
        solo: data.solo,
        crossCountry: data.crossCountry,
        night: data.night,
        instrument: data.instrument,
        actualInstrument: data.actualInstrument,
        simulatedInstrument: data.simulatedInstrument,
        userId: data.userId,
        aircraftId: data.aircraftId,
        instructorId: data.instructorId ?? undefined,
        date: data.date,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        departureAirfieldId: data.departureAirfieldId,
        arrivalAirfieldId: data.arrivalAirfieldId,
        purpose: data.purpose,
        remarks: data.remarks,
        payerId: (data as any).payer_id ?? undefined,
      };
      
      form.reset(formData);
    }
  }, [data?.id, isEditMode, isViewMode, form]);

  // Note: Flight type is now automatically determined by the backend based on pilot roles
  // No need to set it in the frontend anymore

  // Check if user should show pilot selection
  const shouldShowPilotSelection = () => {
    if (!currentUser) return true;
    
    const userRoles = currentUser.userRoles?.map((ur: any) => ur.role?.name || ur.roles?.name) || [];
    const isInstructor = userRoles.includes('INSTRUCTOR');
    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    const isBaseManager = userRoles.includes('BASE_MANAGER');
    
    if (isInstructor || isAdmin) return true;
    if (isBaseManager && mode === 'create') return true;
    
    return false;
  };

  // Handle form submission
  const handleSubmit = (formData: CreateFlightLogForm) => {
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  // Calculate time difference for display
  const calculateTimeDifference = () => {
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
  };

  // Calculate Hobbs difference
  const calculateHobbsDifference = () => {
    const dep = form.watch("departureHobbs");
    const arr = form.watch("arrivalHobbs");
    if (typeof dep === "number" && typeof arr === "number" && !isNaN(dep) && !isNaN(arr)) {
      const diff = arr - dep;
      return diff >= 0 ? diff.toFixed(1) : "-";
    }
    return "-";
  };

  // Check for time discrepancy warning
  const getTimeWarning = () => {
    const dep = form.watch("departureTime");
    const arr = form.watch("arrivalTime");
    const depH = form.watch("departureHobbs");
    const arrH = form.watch("arrivalHobbs");
    
    if (/^\d{2}:\d{2}$/.test(dep) && /^\d{2}:\d{2}$/.test(arr) && typeof depH === "number" && typeof arrH === "number") {
      const [dh, dm] = dep.split(":").map(Number);
      const [ah, am] = arr.split(":").map(Number);
      let minutes = (ah * 60 + am) - (dh * 60 + dm);
      if (minutes < 0) minutes += 24 * 60;
      const calcHours = minutes / 60;
      const hobbs = arrH - depH;
      if (calcHours > 0 && Math.abs(calcHours - hobbs) / calcHours > 0.05) {
        return {
          show: true,
          calcHours,
          hobbs,
          percentage: (100 * Math.abs(calcHours - hobbs) / calcHours).toFixed(1)
        };
      }
    }
    return { show: false };
  };

  const timeWarning = getTimeWarning();

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-6">
        {/* Flight Details */}
        <div className="space-y-4">
          {/* Row 1: Pilot - Date - Aircraft - Instructor */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              {shouldShowPilotSelection() && !isViewMode ? (
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
              ) : (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Pilot</Label>
                  <p className="text-sm">
                    {isViewMode && data?.pilot 
                      ? `${data.pilot.firstName} ${data.pilot.lastName}`
                      : currentUser 
                        ? `${currentUser.firstName} ${currentUser.lastName}`
                        : 'Loading...'
                    }
                  </p>
                </div>
              )}

              {!shouldShowPilotSelection() && !isViewMode && (
                <>
                  <Input
                    id="userId"
                    value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Loading...'}
                    disabled
                    className="bg-muted"
                    placeholder="Pilot"
                  />
                  <input
                    type="hidden"
                    {...form.register("userId")}
                    value={currentUser?.id || ""}
                  />
                </>
              )}

                            {!isViewMode && form.formState.errors.userId &&
                form.formState.errors.userId.message !== "Invalid input: expected string, received undefined" && (
                  <p className="text-sm text-destructive">{form.formState.errors.userId.message}</p>
                )}
            </div>

            <div className="space-y-2">
              {!isViewMode ? (
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
              ) : (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p className="text-sm">{data?.date ? <FormattedDate date={data.date} /> : 'N/A'}</p>
                </div>
              )}

              {!isViewMode && form.formState.errors.date &&
                form.formState.errors.date.message !== "Invalid input: expected string, received undefined" && (
                  <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              {!isViewMode ? (
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
              ) : (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Aircraft</Label>
                  <p className="text-sm">
                    {data?.aircraft 
                      ? `${data.aircraft.callSign} - ${data.aircraft.icao_reference_type?.type_designator || data.aircraft.icaoReferenceType?.typeDesignator || 'Unknown Type'}`
                      : 'N/A'
                    }
                  </p>
                </div>
              )}

              {!isViewMode && form.formState.errors.aircraftId &&
                form.formState.errors.aircraftId.message !== "Invalid input: expected string, received undefined" && (
                  <p className="text-sm text-destructive">{form.formState.errors.aircraftId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              {!isViewMode ? (
                <Combobox
                  options={instructors
                    .filter((instructor) => !instructor.status || instructor.status === 'ACTIVE')
                    .map((instructor) => ({
                      value: instructor.id,
                      label: `${instructor.firstName} ${instructor.lastName}`,
                      searchText: `${instructor.firstName} ${instructor.lastName}`
                    }))}
                  value={form.watch("instructorId")}
                  onValueChange={(value) => form.setValue("instructorId", value)}
                  placeholder="Instructor (Optional)"
                  searchPlaceholder="Search by name..."
                  emptyText="No instructors found."
                  searchFunction={(option, searchValue) => {
                    return option.searchText?.toLowerCase().includes(searchValue.toLowerCase()) || false;
                  }}
                  className={cn(
                    "border-gray-200 dark:border-gray-700",
                    form.formState.errors.instructorId ? "border-red-500 focus-visible:ring-red-500" : ""
                  )}
                />
              ) : (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Instructor</Label>
                  <p className="text-sm">
                    {data?.instructor 
                      ? `${data.instructor.firstName} ${data.instructor.lastName}`
                      : "None"
                    }
                  </p>
                </div>
              )}

              {!isViewMode && form.formState.errors.instructorId &&
                form.formState.errors.instructorId.message !== "Invalid input: expected string, received undefined" && (
                  <p className="text-sm text-destructive">{form.formState.errors.instructorId.message}</p>
              )}
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
                {!isViewMode ? (
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
                ) : (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Airfield</Label>
                    <p className="text-sm">
                      {data?.departureAirfield 
                        ? `${data.departureAirfield.code} - ${data.departureAirfield.name}`
                        : 'N/A'
                      }
                    </p>
                  </div>
                )}

                {!isViewMode && form.formState.errors.departureAirfieldId &&
                  form.formState.errors.departureAirfieldId.message !== "Invalid input: expected string, received undefined" && (
                    <p className="text-sm text-destructive">{form.formState.errors.departureAirfieldId.message}</p>
                )}
              </div>

              <div className="space-y-2 col-span-1">
                <div>
                  {!isViewMode ? (
                    <TimeInput
                      name="departureTime"
                      value={form.watch("departureTime")}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("departureTime", e.target.value)}
                      className={cn(
                        "border-gray-200 dark:border-gray-700 w-full bg-background",
                        form.formState.errors.departureTime ? "border-red-500 focus-visible:ring-red-500" : ""
                      )}
                    />
                  ) : (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Time</Label>
                      <p className="text-sm">{data?.departureTime || 'N/A'} UTC</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 text-left">HH:MM All times UTC</p>
                </div>
                {!isViewMode && form.formState.errors.departureTime &&
                  form.formState.errors.departureTime.message !== "Invalid input: expected string, received undefined" && (
                    <p className="text-sm text-destructive">{form.formState.errors.departureTime.message}</p>
                )}
              </div>

              <div className="space-y-2 col-span-1">
                {!isViewMode ? (
                  <HobbsInput
                    name="departureHobbs"
                    value={form.watch("departureHobbs")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("departureHobbs", parseFloat(e.target.value) || 0)}
                    className={cn(
                      "border-gray-200 dark:border-gray-700 bg-background",
                      form.formState.errors.departureHobbs ? "border-red-500 focus-visible:ring-red-500" : ""
                    )}
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Hobbs</Label>
                    <p className="text-sm">{data?.departureHobbs ? data.departureHobbs.toFixed(1) : 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fuel & Oil Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {!isViewMode ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <Label className="text-sm font-medium text-muted-foreground">Oil Added (ml)</Label>
                      <p className="text-sm">{data?.oilAdded || 0}</p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {!isViewMode ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <Label className="text-sm font-medium text-muted-foreground">Fuel Added (L)</Label>
                      <p className="text-sm">{data?.fuelAdded || 0}</p>
                    </>
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
                {!isViewMode ? (
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
                ) : (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Airfield</Label>
                    <p className="text-sm">
                      {data?.arrivalAirfield 
                        ? `${data.arrivalAirfield.code} - ${data.arrivalAirfield.name}`
                        : 'N/A'
                      }
                    </p>
                  </div>
                )}

                {!isViewMode && form.formState.errors.arrivalAirfieldId &&
                  form.formState.errors.arrivalAirfieldId.message !== "Invalid input: expected string, received undefined" && (
                    <p className="text-sm text-destructive">{form.formState.errors.arrivalAirfieldId.message}</p>
                )}
              </div>

              <div className="space-y-2 col-span-1">
                <div>
                  {!isViewMode ? (
                    <TimeInput
                      name="arrivalTime"
                      value={form.watch("arrivalTime")}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("arrivalTime", e.target.value)}
                      className={cn(
                        "border-gray-200 dark:border-gray-700 w-full bg-background",
                        form.formState.errors.arrivalTime ? "border-red-500 focus-visible:ring-red-500" : ""
                      )}
                    />
                  ) : (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Time</Label>
                      <p className="text-sm">{data?.arrivalTime || 'N/A'} UTC</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 text-left">HH:MM All times UTC</p>
                </div>
                {!isViewMode && form.formState.errors.arrivalTime &&
                  form.formState.errors.arrivalTime.message !== "Invalid input: expected string, received undefined" && (
                    <p className="text-sm text-destructive">{form.formState.errors.arrivalTime.message}</p>
                )}
              </div>

              <div className="space-y-2 col-span-1">
                {!isViewMode ? (
                  <HobbsInput
                    name="arrivalHobbs"
                    value={form.watch("arrivalHobbs")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("arrivalHobbs", parseFloat(e.target.value) || 0)}
                    className={cn(
                      "border-gray-200 dark:border-gray-700 bg-background",
                      form.formState.errors.arrivalHobbs ? "border-red-500 focus-visible:ring-red-500" : ""
                    )}
                  />
                ) : (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Hobbs</Label>
                    <p className="text-sm">{data?.arrivalHobbs ? data.arrivalHobbs.toFixed(1) : 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Landings Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {!isViewMode ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <Label className="text-sm font-medium text-muted-foreground">Day Landings</Label>
                      <p className="text-sm">{data?.dayLandings || 0}</p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {!isViewMode ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <Label className="text-sm font-medium text-muted-foreground">Night Landings</Label>
                      <p className="text-sm">{data?.nightLandings || 0}</p>
                    </>
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
                  <Label className="text-sm font-medium text-muted-foreground">Calculated Time</Label>
                  <div className="bg-background rounded-md px-3 py-2 text-center text-sm font-mono border border-gray-200 dark:border-gray-700">
                    {calculateTimeDifference()}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Hobbs Time</Label>
                  <div className="bg-background rounded-md px-3 py-2 text-center text-sm font-mono border border-gray-200 dark:border-gray-700">
                    {calculateHobbsDifference()}
                  </div>
                </div>
              </div>
              {/* Warning below both time fields - full width, always reserve space */}
              <div className="min-h-[60px] mt-4 flex items-center w-full">
                                 {timeWarning.show && timeWarning.calcHours !== undefined && timeWarning.hobbs !== undefined ? (
                   <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded px-3 py-2 w-full text-sm flex items-center min-h-[56px]">
                     <span><strong>Warning:</strong> There is a significant difference between calculated time ({timeWarning.calcHours.toFixed(2)}h) and Hobbs time ({timeWarning.hobbs.toFixed(1)}h) ({'>'}{timeWarning.percentage}% difference).</span>
                   </div>
                 ) : (
                  <div className="w-full min-h-[56px]" />
                )}
              </div>
            </div>
          </div>

          {/* Remarks Card */}
          <div className="bg-muted rounded-lg p-6 h-full flex flex-col">
            <h3 className="text-lg font-medium mb-4">Remarks</h3>
            <div className="flex-1 flex flex-col">
              {!isViewMode ? (
                <Textarea
                  id="remarks"
                  {...form.register("remarks")}
                  placeholder="Additional notes about the flight"
                  className="border-gray-200 dark:border-gray-700 bg-background flex-1"
                />
              ) : (
                <div className="bg-background rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700 flex-1">
                  {data?.remarks || "No remarks"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-muted rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              {!isViewMode ? (
                <>
                  <Label htmlFor="flightType">Flight Type</Label>
                  {mode === 'create' ? (
                    <div className="space-y-2">
                      <div className="bg-muted rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                          Auto-determined
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          (Set by backend based on pilot's role)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        • Students → School flights
                        <br />
                        • Pilots → Invoiced flights  
                        <br />
                        • Admins/Base Managers → Ferry flights
                      </p>
                    </div>
                  ) : mode === 'edit' ? (
                    <div className="space-y-2">
                      <Select
                        value={form.watch("flightType")}
                        onValueChange={(value) => form.setValue("flightType", value as "INVOICED" | "SCHOOL" | "FERRY" | "CHARTER" | "DEMO" | "PROMO")}
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

                    </div>
                  ) : (
                    <Select
                      value={form.watch("flightType")}
                      onValueChange={(value) => form.setValue("flightType", value as "INVOICED" | "SCHOOL" | "FERRY" | "CHARTER" | "DEMO" | "PROMO")}
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
                  )}
                </>
              ) : (
                <>
                  <Label className="text-sm font-medium text-muted-foreground">Flight Type</Label>
                  <Badge className={getFlightTypeBadgeColor(data?.flightType || 'SCHOOL')}>
                    {getFlightTypeLabel(data?.flightType || 'SCHOOL')}
                  </Badge>
                </>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Total Hours</Label>
              <p className="text-sm">{data?.totalHours ? formatHours(data.totalHours) : 'N/A'}</p>
            </div>
            <div>
              {!isViewMode ? (
                <>
                  {form.watch("flightType") === "CHARTER" ? (
                    <>
                      <Label htmlFor="payerId">Payer</Label>
                      <Combobox
                        options={pilots
                          .filter((pilot) => !pilot.status || pilot.status === 'ACTIVE')
                          .map((pilot) => ({
                            value: pilot.id,
                            label: `${pilot.firstName} ${pilot.lastName}`,
                            searchText: `${pilot.firstName} ${pilot.lastName}`
                          }))}
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
                </>
              ) : (
                <>
                  {data?.flightType === "CHARTER" ? (
                    <>
                      <Label className="text-sm font-medium text-muted-foreground">Payer</Label>
                      <p className="text-sm">
                        {(data as any)?.payer_id ? 
                          pilots.find(p => p.id === (data as any)?.payer_id)?.firstName + ' ' + pilots.find(p => p.id === (data as any)?.payer_id)?.lastName || 'Unknown' 
                          : 'Not specified'
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <Label className="text-sm font-medium text-muted-foreground">Purpose</Label>
                      <p className="text-sm">{data?.purpose || 'N/A'}</p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
              <p className="text-sm">
                {data?.createdBy 
                  ? `${data.createdBy.firstName} ${data.createdBy.lastName}`
                  : 'N/A'
                }
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created On</Label>
              <p className="text-sm">
                {data?.createdAt ? (
                  <span title={`UTC: ${new Date(data.createdAt).toISOString()}`}>
                    {new Date(data.createdAt).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')}
                  </span>
                ) : 'N/A'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Updated By</Label>
              <p className="text-sm">
                {data?.updatedByUser 
                  ? `${data.updatedByUser.firstName} ${data.updatedByUser.lastName}`
                  : 'N/A'
                }
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Updated On</Label>
              <p className="text-sm">
                {data?.updatedAt ? (
                  <span title={`UTC: ${new Date(data.updatedAt).toISOString()}`}>
                    {new Date(data.updatedAt).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')}
                  </span>
                ) : 'N/A'}
              </p>
            </div>
          </div>

        </div>
      </div>




    </form>
  );
}
