import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Derive the owning userId from the DB row, NOT from request body.
    // Previously this route accepted `userId` in the body and trusted
    // it alongside the refresh token — an attacker could POST somebody
    // else's refresh token paired with any userId. Even though the
    // downstream RPC likely pins validity to (token_hash, user_id),
    // trusting caller-supplied identity here was fragile. Looking up
    // the token's owner eliminates the foot-gun.
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const { data: tokenRow, error: tokenLookupError } = await supabase
      .from('refresh_tokens')
      .select('"userId"')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (tokenLookupError || !tokenRow?.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Attempt to refresh the access token using the DB-owned userId.
    const result = await AuthService.refreshAccessToken(refreshToken, tokenRow.userId);

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
