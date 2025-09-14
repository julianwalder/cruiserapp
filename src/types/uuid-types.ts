// UUID type definition
export type UUID = string;

export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
  totalFlightHours?: number;
  licenseNumber?: string;
  medicalClass?: string;
  instructorRating?: string;
  // Note: My Account specific fields are now in UserProfile interface
}

// New interface for My Account profile data
export interface UserProfile extends BaseEntity {
  id: string;
  userId: string;
  veriffData?: any;
  identityVerified: boolean;
  identityVerifiedAt?: Date | null;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: Date | null;
  preferredLanguage: string;
  timezone: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
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
  validityDays: number;
  isActive: boolean;
}

export interface Airfield extends BaseEntity {
  name: string;
  code: string;
  type: 'AIRPORT' | 'SMALL_AIRPORT' | 'MEDIUM_AIRPORT' | 'LARGE_AIRPORT' | 'AIRSTRIP' | 'HELIPORT' | 'SEAPLANE_BASE' | 'BALLOON_PORT' | 'GLIDER_PORT' | 'ULTRALIGHT_FIELD';
  city?: string;
  state?: string;
  country?: string;
  countryFullName?: string;
  stateFullName?: string;
  countryCode?: string;
  stateCode?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  phone?: string;
  email?: string;
  website?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';
  isBase: boolean;
}

export interface Aircraft extends BaseEntity {
  registration: string;
  type: 'LANDPLANE' | 'SEAPLANE' | 'AMPHIBIAN' | 'HELICOPTER' | 'GYROCOPTER' | 'GLIDER' | 'POWERED_GLIDER' | 'AIRSHIP' | 'BALLOON' | 'ULTRALIGHT';
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
  flightType: 'TRAINING' | 'PERSONAL' | 'COMMERCIAL' | 'CHARTER' | 'FERRY' | 'TEST' | 'OTHER';
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
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';
}

export interface UserCompanyRelationship extends BaseEntity {
  userId: UUID;
  companyId: UUID;
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CONTRACTOR' | 'STUDENT' | 'INSTRUCTOR';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';
}

// My Account feature interfaces
export interface UserOnboarding extends BaseEntity {
  userId: UUID;
  onboardingType: 'STUDENT' | 'PILOT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  currentStep: number;
  totalSteps: number;
  veriffSessionId?: string;
  veriffStatus?: string;
  paymentPlanId?: UUID;
  hourPackageId?: UUID;
  contractSigned: boolean;
  contractSignedAt?: Date | null;
  contractDocumentUrl?: string;
}

export interface UserDocument extends BaseEntity {
  userId: UUID;
  documentType: 'PPL_LICENSE' | 'MEDICAL_CERTIFICATE' | 'RADIO_CERTIFICATE' | 'CONTRACT' | 'VERIFF_REPORT' | 'OTHER';
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: Date | null;
  documentNumber?: string;
  issuingAuthority?: string;
  isVerified: boolean;
  verifiedBy?: UUID;
  verifiedAt?: Date | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  metadata?: any;
}

export interface PaymentPlan extends BaseEntity {
  name: string;
  description?: string;
  planType: 'INSTALLMENT' | 'FULL_PAYMENT';
  totalAmount: number;
  currency: string;
  numberOfInstallments?: number;
  discountPercentage: number;
  isActive: boolean;
  validFrom: Date;
  validTo?: Date | null;
}

export interface HourPackage extends BaseEntity {
  name: string;
  description?: string;
  totalHours: number;
  price: number;
  currency: string;
  validityDays: number;
  isActive: boolean;
}

export interface UserPaymentPlan extends BaseEntity {
  userId: UUID;
  paymentPlanId?: UUID;
  hourPackageId?: UUID;
  smartbillInvoiceId?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  totalAmount: number;
  paidAmount: number;
  nextPaymentDate?: Date | null;
  nextPaymentAmount?: number;
  completedAt?: Date | null;
} 