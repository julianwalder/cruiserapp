import { UUID, BaseEntity } from './uuid-types';

export type DocumentType = 'pilot_license' | 'medical_certificate' | 'radio_certificate';

export interface PilotDocument extends BaseEntity {
  id: UUID;
  user_id: UUID;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
  expires_at?: Date;
  is_active: boolean;
}

export interface ClassTypeRating {
  rating: string; // e.g., "SEP(land)", "MEP(land)"
  validUntil: Date;
  remarks?: string;
}

export interface LanguageProficiency {
  language: string; // e.g., "Romanian", "English"
  level: string; // e.g., "Level 4", "Level 5", "Level 6"
  validityExpiry: Date | null;
}

export interface ExaminerSignature {
  name: string;
  title: string;
  date: Date;
  signatureUrl?: string;
}

export interface PilotLicense extends BaseEntity {
  id: UUID;
  user_id: UUID;
  document_id?: UUID;
  
  // License archiving fields
  status: 'active' | 'archived' | 'expired';
  version: number;
  archived_at?: Date;
  archive_reason?: string;
  
  // Holder Information (some fields already in users table)
  place_of_birth?: string;
  nationality?: string;
  
  // License Details
  state_of_issue: string;
  issuing_authority: string;
  license_number: string;
  license_type: string; // e.g., PPL(A), CPL(A), ATPL(A)
  date_of_initial_issue: Date;
  country_code_of_initial_issue: string;
  date_of_issue: Date;
  issuing_officer_name?: string;
  issuing_authority_seal?: string; // URL to seal/stamp image
  
  // Ratings & Privileges
  class_type_ratings?: ClassTypeRating[];
  ir_valid_until?: Date;
  
  // Language Proficiency
  language_proficiency?: LanguageProficiency[];
  
  // Medical Requirements
  medical_class_required?: string;
  medical_certificate_expiry?: Date;
  
  // Radio Telephony
  radiotelephony_languages?: string[];
  radiotelephony_remarks?: string;
  
  // Signatures
  holder_signature_present: boolean;
  examiner_signatures?: ExaminerSignature[];
  
  // Additional Information
  icao_compliant: boolean;
  abbreviations_reference?: string;
  
  // Related documents (added by API)
  pilot_documents?: PilotDocument[];
}

// Form data interface for pilot license upload
export interface PilotLicenseFormData {
  // File upload
  licenseFile: File;
  
  // Holder Information
  placeOfBirth: string;
  nationality: string;
  
  // License Details
  stateOfIssue: string;
  issuingAuthority: string;
  licenseNumber: string;
  licenseType: string;
  dateOfInitialIssue: string | Date; // ISO date string or Date object
  countryCodeOfInitialIssue: string;
  dateOfIssue: string; // ISO date string
  issuingOfficerName?: string;
  issuingAuthoritySeal?: File;
  
  // Ratings & Privileges
  classTypeRatings: ClassTypeRating[];
  irValidUntil?: string | Date; // ISO date string or Date object
  
  // Language Proficiency
  languageProficiency: LanguageProficiency[];
  
  // Medical Requirements
  medicalClassRequired?: string;
  medicalCertificateExpiry?: string | Date; // ISO date string or Date object
  
  // Radio Telephony
  radiotelephonyLanguages: string[];
  radiotelephonyRemarks?: string;
  
  // Signatures
  holderSignaturePresent: boolean;
  examinerSignatures: ExaminerSignature[];
  
  // Additional Information
  icaoCompliant: boolean;
  abbreviationsReference?: string;
}

// API response types
export interface PilotLicenseResponse {
  document: PilotDocument;
  license: PilotLicense;
}

export interface PilotDocumentsListResponse {
  documents: PilotDocument[];
  licenses: PilotLicense[];
}

// License type options
export const LICENSE_TYPES = [
  'PPL(A)', // Private Pilot License (Aeroplane)
  'CPL(A)', // Commercial Pilot License (Aeroplane)
  'ATPL(A)', // Airline Transport Pilot License (Aeroplane)
  'PPL(H)', // Private Pilot License (Helicopter)
  'CPL(H)', // Commercial Pilot License (Helicopter)
  'ATPL(H)', // Airline Transport Pilot License (Helicopter)
  'SPL', // Sailplane Pilot License
  'BPL', // Balloon Pilot License
  'ULM', // Ultralight Motor
] as const;

export type LicenseType = typeof LICENSE_TYPES[number];

// Medical class options
export const MEDICAL_CLASSES = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'LAPL',
] as const;

export type MedicalClass = typeof MEDICAL_CLASSES[number];

// Language proficiency levels
export const LANGUAGE_LEVELS = [
  'Level 1 (Pre-elementary)',
  'Level 2 (Elementary)',
  'Level 3 (Pre-operational)',
  'Level 4 (Operational)',
  'Level 5 (Extended)',
  'Level 6 (Expert)',
] as const;

export type LanguageLevel = typeof LANGUAGE_LEVELS[number];

// Common languages for aviation
export const AVIATION_LANGUAGES = [
  'English',
  'Romanian',
  'French',
  'German',
  'Spanish',
  'Italian',
  'Portuguese',
  'Russian',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean',
] as const;

export type AviationLanguage = typeof AVIATION_LANGUAGES[number];
