import { z } from 'zod';

export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  personalNumber: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  role: z.enum(['PILOT', 'STUDENT', 'INSTRUCTOR', 'BASE_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'PROSPECT']).optional(),
  roles: z.array(z.enum(['PILOT', 'STUDENT', 'INSTRUCTOR', 'BASE_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'PROSPECT'])).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL']).optional(),
  totalFlightHours: z.number().optional(),
  licenseNumber: z.string().optional(),
  medicalClass: z.string().optional(),
  instructorRating: z.string().optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const userUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  personalNumber: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL']).optional(),
  totalFlightHours: z.number().optional(),
  licenseNumber: z.string().optional(),
  medicalClass: z.string().optional(),
  instructorRating: z.string().optional(),
  roles: z.array(z.enum(['PILOT', 'STUDENT', 'INSTRUCTOR', 'BASE_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'PROSPECT'])).optional(),
});

export const userStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL']),
});

export const userRoleUpdateSchema = z.object({
  roles: z.array(z.enum(['PILOT', 'STUDENT', 'INSTRUCTOR', 'BASE_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'PROSPECT'])),
});

export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserStatusUpdateInput = z.infer<typeof userStatusUpdateSchema>;
export type UserRoleUpdateInput = z.infer<typeof userRoleUpdateSchema>; 