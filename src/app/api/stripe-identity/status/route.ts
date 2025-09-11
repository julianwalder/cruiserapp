import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { StripeIdentityService } from '@/lib/stripe-identity-service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's verification status
    const status = await StripeIdentityService.getUserVerificationStatus(decoded.userId);

    return NextResponse.json({
      success: true,
      isVerified: status.isVerified,
      sessionId: status.sessionId,
      status: status.status,
      verifiedData: status.verifiedData
    });

  } catch (error) {
    console.error('❌ Error getting Stripe Identity status:', error);
    return NextResponse.json({
      error: 'Failed to get verification status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
