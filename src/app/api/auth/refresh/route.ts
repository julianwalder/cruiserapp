import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken, userId } = await request.json();

    if (!refreshToken || !userId) {
      return NextResponse.json(
        { error: 'Refresh token and user ID are required' },
        { status: 400 }
      );
    }

    // Attempt to refresh the access token
    const result = await AuthService.refreshAccessToken(refreshToken, userId);

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Return new tokens
    return NextResponse.json({
      accessToken: result.accessToken,
      refreshToken: result.newRefreshToken,
      message: 'Tokens refreshed successfully'
    });

  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
