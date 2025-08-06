import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { EnhancedVeriffWebhook } from '@/lib/enhanced-veriff-webhook';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user is admin
    const isAdmin = AuthService.hasRole(userRoles, 'SUPER_ADMIN') || 
                   AuthService.hasRole(userRoles, 'ADMIN');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get verification statistics
    const stats = await EnhancedVeriffWebhook.getVerificationStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching verification stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch verification statistics',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 