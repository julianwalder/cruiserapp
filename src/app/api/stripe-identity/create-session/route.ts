import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { StripeIdentityService } from '@/lib/stripe-identity-service';

export async function POST(request: NextRequest) {
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

    // Get user data from request body
    const body = await request.json();
    const { firstName, lastName, email } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({
        error: 'Missing required fields: firstName, lastName, email'
      }, { status: 400 });
    }

    // Check if user already has a verification session
    const existingStatus = await StripeIdentityService.getUserVerificationStatus(decoded.userId);
    
    if (existingStatus.isVerified) {
      return NextResponse.json({
        error: 'User is already verified',
        status: 'verified'
      }, { status: 400 });
    }

    // Allow creating new sessions even if there's an existing one
    // This gives users the flexibility to restart verification if needed
    if (existingStatus.sessionId && existingStatus.status === 'requires_input') {
      console.log('User has existing verification session, but allowing new session creation');
    }

    // Create new Stripe Identity session
    const session = await StripeIdentityService.createSession(decoded.userId, {
      firstName,
      lastName,
      email,
    });

    // Debug: Log the response being sent to frontend
    console.log('Stripe Identity API Response to Frontend:', {
      sessionId: session.id,
      sessionUrl: session.url,
      sessionStatus: session.status,
      clientSecret: session.client_secret
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      clientSecret: session.client_secret,
      status: session.status
    });

  } catch (error) {
    console.error('❌ Error creating Stripe Identity session:', error);
    return NextResponse.json({
      error: 'Failed to create verification session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
