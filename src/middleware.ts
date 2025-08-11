import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Define route access patterns
const ROUTE_ACCESS = {
  // Public routes (no auth required)
  public: [
    '/login',
    '/register', 
    '/forgot-password',
    '/reset-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/refresh',
    '/api/auth/revoke',
    '/api/auth/sessions',
    '/api/og',
    '/api/og/stats',
    '/api/version',
    '/api/ws',
    '/invite',
  ],
  
  // Routes that require authentication but no specific role
  authenticated: [
    '/dashboard',
    '/my-account',
    '/api/auth/me',
    '/api/avatar',
    '/api/upload',
    '/api/uploads',
    '/api/activity',
    '/api/dashboard',
    '/api/notifications',
    '/api/veriff',
  ],
  
  // Role-specific routes
  roles: {
    // Flight logs - all roles except PROSPECT
    '/flight-logs': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    '/api/flight-logs': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    
    // Role management - SUPER_ADMIN only
    '/role-management': ['SUPER_ADMIN'],
    '/api/roles': ['SUPER_ADMIN'],
    
    // Fleet management - all roles (including PROSPECT for view)
    '/fleet': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
    '/api/fleet': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
    
    // User management - admin roles
    '/users': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    '/api/users': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    
    // Base management - admin roles
    '/bases': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    '/api/base-management': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    
    // Airfields - all authenticated users
    '/airfields': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
    '/api/airfields': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
    
    // Community board - all authenticated users
    '/community-board': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
    '/api/community-board': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
    
    // Other authenticated routes
    '/accounting': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    '/api/accounting': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    
    '/billing': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    '/api/billing': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    
    '/orders': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    '/api/orders': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    
    '/packages': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    '/api/packages': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    
    '/usage': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    '/api/usage': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    
    '/reports': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    '/api/reports': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'],
    
    '/scheduling': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    '/api/scheduling': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR'],
    
    '/settings': ['SUPER_ADMIN', 'ADMIN'],
    '/api/settings': ['SUPER_ADMIN', 'ADMIN'],
    
    '/notifications': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
    '/api/notifications': ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'],
  }
};

// Helper function to check if a path matches a pattern
function pathMatches(pattern: string, path: string): boolean {
  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path === pattern || path.startsWith(pattern + '/');
}

// Helper function to get user roles from JWT
async function getUserRoles(token: string): Promise<string[]> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'cruiser-aviation',
      audience: 'cruiser-app'
    });
    
    // Extract roles from JWT payload
    const roles = payload.roles as string[] || [];
    return Array.isArray(roles) ? roles : [];
  } catch (error) {
    console.error('JWT verification failed:', error);
    return [];
  }
}

// Helper function to check if user has required role
function hasRequiredRole(userRoles: string[], requiredRoles: string[]): boolean {
  return userRoles.some(role => requiredRoles.includes(role));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/og') ||
    pathname.startsWith('/api/version') ||
    pathname.startsWith('/api/ws')
  ) {
    return NextResponse.next();
  }
  
  // Check if route is public
  const isPublicRoute = ROUTE_ACCESS.public.some(pattern => pathMatches(pattern, pathname));
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Get token from Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value;
  
  // If no token, redirect to login (except for API routes which should return 401)
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Verify token and get user roles
  const userRoles = await getUserRoles(token);
  if (userRoles.length === 0) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check role-based access for specific routes
  for (const [routePattern, requiredRoles] of Object.entries(ROUTE_ACCESS.roles)) {
    if (pathMatches(routePattern, pathname)) {
      if (!hasRequiredRole(userRoles, requiredRoles)) {
        // Return 404 for unauthorized access (don't leak route existence)
        return NextResponse.json(
          { error: 'Not found' },
          { status: 404 }
        );
      }
      break;
    }
  }
  
  // Allow access for authenticated routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/og (public API routes)
     * - api/version (public API routes)
     * - api/ws (public API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/og|api/version|api/ws).*)',
  ],
};
