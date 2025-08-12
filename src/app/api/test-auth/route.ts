import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('🔍 Test auth - Token present:', !!token);
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    console.log('🔍 Test auth - User validated:', !!user);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    console.log('🔍 Test auth - JWT payload:', payload);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        roles: payload?.roles || []
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('🔍 Test auth - Error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
