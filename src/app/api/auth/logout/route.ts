import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Previously this route called AuthService.deleteSession(token),
    // which is a no-op that just console.logs a notice. That meant
    // logout did not actually invalidate anything — the caller's
    // refresh tokens kept working and the cookie-set JWT was still
    // presented on future requests.
    //
    // Now:
    //  1. Decode the token to find the user (best-effort; we still
    //     200 even if the token is malformed so the client can always
    //     drop local state).
    //  2. Revoke every outstanding refresh token for that user so
    //     they can no longer mint new access tokens.
    //  3. Clear the token cookie the browser may be sending.
    //
    // The currently-held JWT still lives out its natural TTL — a real
    // JWT blocklist / tokenVersion mechanism is a separate follow-up.
    const payload = AuthService.verifyToken(token);
    if (payload?.userId) {
      try {
        await AuthService.revokeAllUserTokens(payload.userId, 'User logout');
      } catch (err) {
        console.error('Logout: failed to revoke refresh tokens', err);
      }
    }

    const response = NextResponse.json({
      message: 'Logged out successfully',
    });
    // Expire the token cookie on both "token" (server cookie) paths.
    response.cookies.set('token', '', {
      path: '/',
      maxAge: 0,
      httpOnly: false,
      sameSite: 'strict',
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
