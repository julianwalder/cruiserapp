// UUID type definition
export type UUID = string;

export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  password?: string;
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
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
  totalFlightHours: number;
  licenseNumber?: string;
  medicalClass?: string;
  instructorRating?: string;
}

export interface Invoice extends BaseEntity {
  smartbill_id: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  currency: string;
  client_id: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    hours?: number;
  }>;
}

export interface FlightHours extends BaseEntity {
  userId: UUID;
  totalHours: number;
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
  dayLandings: number;
  nightLandings: number;
}

export interface HourPackage extends BaseEntity {
  name: string;
  description?: string;
  totalHours: number;
  price: number;
  currency: string;
  validityDays?: number;
  isActive: boolean;
}

export interface Airfield extends BaseEntity {
  name: string;
  code: string;
  type: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  phone?: string;
  email?: string;
  website?: string;
  status: 'ACTIVE' | 'INACTIVE';
  isBase: boolean;
}

export interface Aircraft extends BaseEntity {
  registration: string;
  type: string;
  model: string;
  manufacturer: string;
  yearOfManufacture?: number;
  totalFlightHours: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  airfieldId?: UUID;
  ownerId?: UUID;
}

export interface FlightLog extends BaseEntity {
  aircraftId: UUID;
  pilotId: UUID;
  instructorId?: UUID;
  date: string;
  departureTime: string;
  arrivalTime: string;
  departureAirfieldId: UUID;
  arrivalAirfieldId: UUID;
  flightType: string;
  purpose?: string;
  remarks?: string;
  totalHours: number;
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
  dayLandings: number;
  nightLandings: number;
  departureHobbs?: number;
  arrivalHobbs?: number;
  oilAdded?: number;
  fuelAdded?: number;
  route?: string;
  conditions?: string;
  createdById: UUID;
}

export interface Company extends BaseEntity {
  name: string;
  registrationNumber?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UserCompanyRelationship extends BaseEntity {
  userId: UUID;
  companyId: UUID;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
} 