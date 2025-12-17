import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Server-side authentication and authorization helpers for API routes
 * Handles both regular tokens and impersonation tokens correctly
 */

export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
  isImpersonation: boolean;
  originalUserId?: string;
  isAdmin: boolean;
  isPilot: boolean;
  isStudent: boolean;
  isInstructor: boolean;
}

/**
 * Authenticates a request and returns the auth context
 * Properly handles impersonation tokens by using roles from the token
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthContext | null> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return null;
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return null;
    }

    // Check if this is an impersonation token
    const isImpersonation = (decoded as any).isImpersonation === true;
    const originalUserId = (decoded as any).impersonatedBy;

    let userRoles: string[] = [];
    let email = decoded.email;

    if (isImpersonation && decoded.roles && Array.isArray(decoded.roles)) {
      // For impersonation tokens, use the roles from the token (target user's roles)
      userRoles = decoded.roles;
      console.log('🎭 [auth-server] Impersonation detected - using token roles:', userRoles, 'for userId:', decoded.userId);
    } else {
      // For regular tokens, fetch roles from database
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('[auth-server] Supabase client not initialized');
        return null;
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          user_roles (
            roles (
              name
            )
          )
        `)
        .eq('id', decoded.userId)
        .single();

      if (userError || !user) {
        console.error('[auth-server] User not found:', decoded.userId);
        return null;
      }

      userRoles = user.user_roles.map((userRole: any) => userRole.roles.name);
      email = user.email;
    }

    // Determine access levels
    const isAdmin = userRoles.some(role =>
      ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'INSTRUCTOR'].includes(role)
    );
    const isPilot = userRoles.includes('PILOT');
    const isStudent = userRoles.includes('STUDENT');
    const isInstructor = userRoles.includes('INSTRUCTOR');

    const authContext: AuthContext = {
      userId: decoded.userId,
      email,
      roles: userRoles,
      isImpersonation,
      originalUserId,
      isAdmin,
      isPilot,
      isStudent,
      isInstructor,
    };

    console.log('🔐 [auth-server] Auth context:', {
      userId: authContext.userId,
      email: authContext.email,
      roles: authContext.roles,
      isAdmin: authContext.isAdmin,
      isImpersonation: authContext.isImpersonation,
      originalUserId: authContext.originalUserId,
    });

    return authContext;

  } catch (error) {
    console.error('[auth-server] Error authenticating request:', error);
    return null;
  }
}

/**
 * Checks if the authenticated user can access another user's data
 * Rules:
 * - Admins can access anyone's data
 * - Non-admins can only access their own data
 */
export function canAccessUserData(authContext: AuthContext, targetUserId: string): boolean {
  // Admins can access any user's data
  if (authContext.isAdmin) {
    return true;
  }

  // Non-admins can only access their own data
  return authContext.userId === targetUserId;
}

/**
 * Determines which user IDs the authenticated user can access
 * Returns:
 * - null for admins (can access all users)
 * - [userId] for non-admins (can only access their own data)
 */
export function getAllowedUserIds(authContext: AuthContext): string[] | null {
  if (authContext.isAdmin) {
    // Admins can access all users
    return null;
  }

  // Non-admins can only access their own data
  return [authContext.userId];
}
