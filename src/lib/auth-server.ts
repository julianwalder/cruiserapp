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

    // Determine access levels. INSTRUCTOR is deliberately *not* in `isAdmin`:
    // instructors have a role-specific, scoped relationship (see
    // canAccessUserData) rather than unrestricted access to any user's data.
    const isAdmin = userRoles.some(role =>
      ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'].includes(role)
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

    // Previously logged the full auth context (email, roles, etc.) to
    // prod. That's high-cardinality PII noise; skipped now.

    return authContext;

  } catch (error) {
    console.error('[auth-server] Error authenticating request:', error);
    return null;
  }
}

/**
 * Checks if the authenticated user can access another user's data.
 * Rules:
 * - Self-access is always allowed
 * - SUPER_ADMIN / ADMIN / BASE_MANAGER (isAdmin) can access anyone's data
 * - INSTRUCTOR can access a user's data *only* if they have taught that user
 *   (at least one flight_logs row with userId=target, instructorId=self)
 * - Everyone else is denied
 *
 * Async because the instructor check requires a DB query.
 */
export async function canAccessUserData(
  authContext: AuthContext,
  targetUserId: string,
): Promise<boolean> {
  if (authContext.userId === targetUserId) {
    return true;
  }
  if (authContext.isAdmin) {
    return true;
  }
  if (authContext.isInstructor) {
    return await isInstructorOf(authContext.userId, targetUserId);
  }
  return false;
}

/**
 * Returns true if `instructorId` has at least one flight_logs entry where
 * they are the instructor and the student is `studentId`.
 */
async function isInstructorOf(instructorId: string, studentId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('[auth-server] Supabase unavailable for instructor check');
    return false;
  }
  const { data, error } = await supabase
    .from('flight_logs')
    .select('id')
    .eq('instructorId', instructorId)
    .eq('userId', studentId)
    .limit(1);
  if (error) {
    console.error('[auth-server] isInstructorOf query failed:', error);
    return false;
  }
  return (data?.length ?? 0) > 0;
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
