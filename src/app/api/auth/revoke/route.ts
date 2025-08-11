import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { requireAuth } from '@/lib/middleware';

async function revokeToken(request: NextRequest, currentUser: any) {
  try {
    const { refreshToken, reason } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Revoke the specific refresh token
    const success = await AuthService.revokeRefreshToken(refreshToken, reason || 'User requested revocation');

    if (!success) {
      return NextResponse.json(
        { error: 'Token not found or already revoked' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Token revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return requireAuth(revokeToken)(request);
}
