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
      const user = await authenticateUser(request);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Get user roles from JWT token
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.substring(7);
      const payload = token ? AuthService.verifyToken(token) : null;
      const userRoles = payload?.roles || [];
      
      if (!AuthService.hasPermission(userRoles, requiredRole)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      
      return handler(request, user);
    };
  };
} 