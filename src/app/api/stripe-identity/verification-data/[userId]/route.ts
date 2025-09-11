import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { StripeIdentityService } from '@/lib/stripe-identity-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params for Next.js 15 compatibility
    const { userId } = await params;
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is requesting their own data or is admin
    if (decoded.userId !== userId) {
      // TODO: Add admin check here if needed
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get verification data
    const verificationData = await StripeIdentityService.getVerificationData(userId);

    if (!verificationData) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No verification data found'
      });
    }

    return NextResponse.json({
      success: true,
      data: verificationData
    });

  } catch (error) {
    console.error('❌ Error getting Stripe Identity verification data:', error);
    return NextResponse.json({
      error: 'Failed to get verification data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
