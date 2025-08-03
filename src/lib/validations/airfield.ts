import { z } from 'zod';

// Airfield type enum
export const AirfieldTypeEnum = z.enum(['AIRPORT', 'AIRSTRIP', 'HELIPORT', 'SEAPLANE_BASE']);

// Airfield status enum
export const AirfieldStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED']);

// Create airfield schema
export const createAirfieldSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().min(1, 'Code is required').max(10, 'Code must be less than 10 characters'),
  type: AirfieldTypeEnum.default('AIRPORT'),
  status: AirfieldStatusEnum.default('ACTIVE'),
  city: z.string().min(1, 'City is required').max(50, 'City must be less than 50 characters'),
  state: z.string().max(50, 'State must be less than 50 characters').optional(),
  country: z.string().min(1, 'Country is required').max(50, 'Country must be less than 50 characters'),
  latitude: z.string().max(20, 'Latitude must be less than 20 characters').optional(),
  longitude: z.string().max(20, 'Longitude must be less than 20 characters').optional(),
  elevation: z.string().max(20, 'Elevation must be less than 20 characters').optional(),
  runwayLength: z.string().max(20, 'Runway length must be less than 20 characters').optional(),
  runwaySurface: z.string().max(50, 'Runway surface must be less than 50 characters').optional(),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional(),
  email: z.string().email('Invalid email format').max(100, 'Email must be less than 100 characters').optional(),
  website: z.string().url('Invalid website URL').max(200, 'Website must be less than 200 characters').optional(),
});

// Update airfield schema (all fields optional except id)
export const updateAirfieldSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().min(1, 'Code is required').max(10, 'Code must be less than 10 characters'),
  type: AirfieldTypeEnum,
  status: AirfieldStatusEnum,
  city: z.string().min(1, 'City is required').max(50, 'City must be less than 50 characters'),
  state: z.string().max(50, 'State must be less than 50 characters').optional(),
  country: z.string().min(1, 'Country is required').max(50, 'Country must be less than 50 characters'),
  latitude: z.string().max(20, 'Latitude must be less than 20 characters').optional(),
  longitude: z.string().max(20, 'Longitude must be less than 20 characters').optional(),
  elevation: z.string().max(20, 'Elevation must be less than 20 characters').optional(),
  runwayLength: z.string().max(20, 'Runway length must be less than 20 characters').optional(),
  runwaySurface: z.string().max(50, 'Runway surface must be less than 50 characters').optional(),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional(),
  email: z.string().email('Invalid email format').max(100, 'Email must be less than 100 characters').optional(),
  website: z.string().url('Invalid website URL').max(200, 'Website must be less than 200 characters').optional(),
});

// Airfield interface
import { Airfield } from "@/types/uuid-types";

// Using Airfield from uuid-types

// Airfield form data interface
export interface AirfieldFormData {
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
} 