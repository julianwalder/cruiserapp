import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { VeriffService } from '@/lib/veriff-service';

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
    const existingStatus = await VeriffService.getUserVeriffStatus(decoded.userId);
    
    if (existingStatus.isVerified) {
      return NextResponse.json({
        error: 'User is already verified',
        status: 'verified'
      }, { status: 400 });
    }

    if (existingStatus.sessionId && existingStatus.status === 'created') {
      return NextResponse.json({
        error: 'Verification session already exists',
        sessionId: existingStatus.sessionId,
        status: 'pending'
      }, { status: 400 });
    }

    // Create new Veriff session
    const session = await VeriffService.createSession(decoded.userId, {
      firstName,
      lastName,
      email,
    });

    // Debug: Log the response being sent to frontend
    console.log('API Response to Frontend:', {
      sessionId: session.id,
      sessionUrl: session.url,
      sessionStatus: session.status,
      fullSession: session
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        url: session.url,
        status: session.status,
      },
      message: 'Verification session created successfully'
    });

  } catch (error) {
    console.error('Error creating Veriff session:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create verification session',
        details: (error as any)?.message || String(error)
      },
      { status: 500 }
    );
  }
} 