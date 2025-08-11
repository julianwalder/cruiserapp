import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

// Define role requirements for different routes
export const ROLE_REQUIREMENTS = {
  // Flight logs - all roles except PROSPECT
  FLIGHT_LOGS: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
  
  // Role management - SUPER_ADMIN only
  ROLE_MANAGEMENT: ['SUPER_ADMIN'],
  
  // Fleet management - all roles (including PROSPECT for view)
  FLEET: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
  
  // User management - admin roles
  USER_MANAGEMENT: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
  
  // Base management - admin roles
  BASE_MANAGEMENT: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
  
  // Airfields - all authenticated users
  AIRFIELDS: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
  
  // Community board - all authenticated users
  COMMUNITY_BOARD: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
  
  // Accounting - admin roles
  ACCOUNTING: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
  
  // Billing - admin roles
  BILLING: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
  
  // Orders - all roles except PROSPECT
  ORDERS: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
  
  // Packages - all roles except PROSPECT
  PACKAGES: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
  
  // Usage - all roles except PROSPECT
  USAGE: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
  
  // Reports - admin roles
  REPORTS: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
  
  // Scheduling - all roles except PROSPECT
  SCHEDULING: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
  
  // Settings - admin roles
  SETTINGS: ['SUPER_ADMIN', 'ADMIN'],
  
  // Notifications - all authenticated users
  NOTIFICATIONS: ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
} as const;

export type RoleRequirement = keyof typeof ROLE_REQUIREMENTS;

// Helper function to get user roles from database (for server-side validation)
async function getUserRolesFromDB(userId: string): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection failed');
    }

    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('userId', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return userRoles?.map((ur: any) => ur.roles.name) || [];
  } catch (error) {
    console.error('Error getting user roles from DB:', error);
    return [];
  }
}

// Helper function to check if user has required role
function hasRequiredRole(userRoles: string[], requiredRoles: string[]): boolean {
  return userRoles.some(role => requiredRoles.includes(role));
}

// Server-side guard for API routes
export async function requireRole(
  request: NextRequest,
  requiredRoles: string[]
): Promise<{ user: any; userRoles: string[] }> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No token provided');
    }

    // Verify token
    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid token');
    }

    // Get user roles from database (more secure than JWT)
    const userRoles = await getUserRolesFromDB(decoded.userId);
    
    if (userRoles.length === 0) {
      throw new Error('User has no roles');
    }

    // Check if user has required role
    if (!hasRequiredRole(userRoles, requiredRoles)) {
      throw new Error('Insufficient permissions');
    }

    // Get full user data
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection failed');
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    return { user, userRoles };
  } catch (error) {
    console.error('Role requirement check failed:', error);
    throw error;
  }
}

// Server-side guard for server components
export async function requireRoleServer(
  token: string,
  requiredRoles: string[]
): Promise<{ user: any; userRoles: string[] }> {
  try {
    if (!token) {
      notFound();
    }

    // Verify token
    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      notFound();
    }

    // Get user roles from database
    const userRoles = await getUserRolesFromDB(decoded.userId);
    
    if (userRoles.length === 0) {
      notFound();
    }

    // Check if user has required role
    if (!hasRequiredRole(userRoles, requiredRoles)) {
      notFound();
    }

    // Get full user data
    const supabase = getSupabaseClient();
    if (!supabase) {
      notFound();
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      notFound();
    }

    return { user, userRoles };
  } catch (error) {
    console.error('Server role requirement check failed:', error);
    notFound();
  }
}

// Convenience functions for specific features
export const requireFlightLogsAccess = (request: NextRequest) => 
  requireRole(request, ROLE_REQUIREMENTS.FLIGHT_LOGS);

export const requireRoleManagementAccess = (request: NextRequest) => 
  requireRole(request, ROLE_REQUIREMENTS.ROLE_MANAGEMENT);

export const requireFleetAccess = (request: NextRequest) => 
  requireRole(request, ROLE_REQUIREMENTS.FLEET);

export const requireUserManagementAccess = (request: NextRequest) => 
  requireRole(request, ROLE_REQUIREMENTS.USER_MANAGEMENT);

export const requireBaseManagementAccess = (request: NextRequest) => 
  requireRole(request, ROLE_REQUIREMENTS.BASE_MANAGEMENT);

export const requireAirfieldsAccess = (request: NextRequest) => 
  requireRole(request, ROLE_REQUIREMENTS.AIRFIELDS);

export const requireCommunityBoardAccess = (request: NextRequest) => 
  requireRole(request, ROLE_REQUIREMENTS.COMMUNITY_BOARD);

// Server component versions
export const requireFlightLogsAccessServer = (token: string) => 
  requireRoleServer(token, ROLE_REQUIREMENTS.FLIGHT_LOGS);

export const requireRoleManagementAccessServer = (token: string) => 
  requireRoleServer(token, ROLE_REQUIREMENTS.ROLE_MANAGEMENT);

export const requireFleetAccessServer = (token: string) => 
  requireRoleServer(token, ROLE_REQUIREMENTS.FLEET);

export const requireUserManagementAccessServer = (token: string) => 
  requireRoleServer(token, ROLE_REQUIREMENTS.USER_MANAGEMENT);

export const requireBaseManagementAccessServer = (token: string) => 
  requireRoleServer(token, ROLE_REQUIREMENTS.BASE_MANAGEMENT);

export const requireAirfieldsAccessServer = (token: string) => 
  requireRoleServer(token, ROLE_REQUIREMENTS.AIRFIELDS);

export const requireCommunityBoardAccessServer = (token: string) => 
  requireRoleServer(token, ROLE_REQUIREMENTS.COMMUNITY_BOARD);
