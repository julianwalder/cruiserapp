import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { requireAuth } from '@/lib/middleware';

async function getUserSessions(request: NextRequest, currentUser: any) {
  try {
    // Get all active refresh tokens for the user
    const sessions = await AuthService.getUserRefreshTokens(currentUser.id);

    // Return session information (without sensitive data)
    const sessionInfo = sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      deviceInfo: session.deviceInfo
    }));

    return NextResponse.json({
      sessions: sessionInfo,
      totalSessions: sessionInfo.length
    });

  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function revokeAllSessions(request: NextRequest, currentUser: any) {
  try {
    const { reason } = await request.json();

    // Revoke all refresh tokens for the user
    const revokedCount = await AuthService.revokeAllUserTokens(
      currentUser.id, 
      reason || 'User requested session termination'
    );

    return NextResponse.json({
      message: `Revoked ${revokedCount} sessions successfully`,
      revokedCount
    });

  } catch (error) {
    console.error('Error revoking all sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return requireAuth(getUserSessions)(request);
}

export async function DELETE(request: NextRequest) {
  return requireAuth(revokeAllSessions)(request);
}
