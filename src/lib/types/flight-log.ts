// Shared TypeScript interfaces for flight log components

export interface UserRole {
  role?: {
    name: string;
  };
  roles?: {
    name: string;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  userRoles: Array<UserRole>;
}

export interface Aircraft {
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

export interface Airfield {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
}

export interface FlightLog {
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
  payer?: User; // User who pays for the flight (for charter flights)
  departureAirfield: Airfield;
  arrivalAirfield: Airfield;
  createdBy: User;
  updatedByUser?: User;
  
  // Handle both camelCase and snake_case relationship names
  departure_airfield?: Airfield;
  arrival_airfield?: Airfield;
  created_by?: User;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Extended FlightLog type that includes all the related data
export interface ExtendedFlightLog extends FlightLog {
  // Additional fields that might be added by the API
  [key: string]: any;
}

// Flight log form props
export interface FlightLogFormProps {
  mode: 'create' | 'edit' | 'view';
  data?: FlightLog;
  pilots: User[];
  instructors: User[];
  aircraft: Aircraft[];
  airfields: Airfield[];
  currentUser: User | null;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

// Flight logs main component props
export interface FlightLogsProps {
  openCreateModal?: boolean;
}
