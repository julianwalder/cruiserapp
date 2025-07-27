import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  personalNumber: z.string().min(1, 'Personal number is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'BASE_MANAGER', 'PROSPECT']).optional(),
  roles: z.array(z.string()).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  personalNumber: z.string().min(1, 'Personal number is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'PILOT', 'STUDENT', 'BASE_MANAGER', 'PROSPECT']).optional(),
  roles: z.array(z.string()).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
}); 