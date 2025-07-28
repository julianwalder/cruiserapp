import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth';

export async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  // Verify token
  const payload = AuthService.verifyToken(token);
  if (!payload) {
    return null;
  }
  
  // Validate session
  const user = await AuthService.validateSession(token);
  if (!user) {
    return null;
  }
  
  return user;
}

export function requireAuth(handler: Function) {
  return async (request: NextRequest) => {
    const user = await authenticateUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return handler(request, user);
  };
}

export function requireRole(requiredRole: string) {
  return function(handler: Function) {
    return async (request: NextRequest) => {
      console.log('🔍 Middleware - Checking role:', requiredRole);
      
      const user = await authenticateUser(request);
      
      if (!user) {
        console.log('🔍 Middleware - Authentication failed');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      console.log('🔍 Middleware - User authenticated:', user.email);
      
      // Get user roles from JWT token
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.substring(7);
      const payload = token ? AuthService.verifyToken(token) : null;
      const userRoles = payload?.roles || [];
      
      console.log('🔍 Middleware - JWT payload:', payload);
      console.log('🔍 Middleware - User roles:', userRoles);
      
      if (!AuthService.hasPermission(userRoles, requiredRole)) {
        console.log('🔍 Middleware - Insufficient permissions');
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      
      console.log('🔍 Middleware - Permission granted');
      return handler(request, user);
    };
  };
}

export function requireAnyRole(allowedRoles: string[]) {
  return function(handler: Function) {
    return async (request: NextRequest) => {
      console.log('🔍 Middleware - Checking roles:', allowedRoles);
      
      const user = await authenticateUser(request);
      
      if (!user) {
        console.log('🔍 Middleware - Authentication failed');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      console.log('🔍 Middleware - User authenticated:', user.email);
      
      // Get user roles from JWT token
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.substring(7);
      const payload = token ? AuthService.verifyToken(token) : null;
      const userRoles = payload?.roles || [];
      
      console.log('🔍 Middleware - JWT payload:', payload);
      console.log('🔍 Middleware - User roles:', userRoles);
      
      // Check if user has any of the allowed roles
      const hasAnyRole = allowedRoles.some(role => 
        AuthService.hasPermission(userRoles, role)
      );
      
      if (!hasAnyRole) {
        console.log('🔍 Middleware - Insufficient permissions');
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      
      console.log('🔍 Middleware - Permission granted');
      return handler(request, user);
    };
  };
} 