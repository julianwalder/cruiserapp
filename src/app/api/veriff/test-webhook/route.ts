import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { EnhancedVeriffWebhook } from '@/lib/enhanced-veriff-webhook';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (admin only)
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

    const body = await request.json();
    const { userId, webhookType = 'verification', status = 'approved' } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Create test webhook payload based on type
    let testPayload: any;

    if (webhookType === 'verification') {
      testPayload = {
        verification: {
          id: `test-verification-${Date.now()}`,
          status: status,
          reason: status === 'declined' ? 'Document quality insufficient' : undefined
        },
        vendorData: userId,
        person: {
          givenName: 'John',
          lastName: 'Doe',
          idNumber: '123456789',
          dateOfBirth: '1990-01-01',
          nationality: 'US',
          gender: 'male',
          country: 'US'
        },
        document: {
          type: 'PASSPORT',
          number: 'P123456789',
          country: 'US',
          validFrom: '2020-01-01',
          validUntil: '2030-01-01',
          issuedBy: 'US Department of State'
        },
        additionalVerification: {
          faceMatch: {
            similarity: 0.95,
            status: 'approved'
          }
        },
        decisionScore: 0.92,
        insights: {
          quality: 'high',
          flags: [],
          context: 'Standard verification process'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else if (webhookType === 'selfid') {
      testPayload = {
        id: `test-session-${Date.now()}`,
        feature: 'selfid',
        action: status,
        code: 200,
        vendorData: userId,
        attemptId: `attempt-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid webhookType. Use "verification" or "selfid"' },
        { status: 400 }
      );
    }

    console.log('Processing test webhook:', {
      userId,
      webhookType,
      status,
      payload: testPayload
    });

    // Process the test webhook
    const result = await EnhancedVeriffWebhook.processWebhook(testPayload);

    return NextResponse.json({
      success: true,
      message: 'Test webhook processed successfully',
      result: result,
      testPayload: testPayload
    });

  } catch (error) {
    console.error('Error processing test webhook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process test webhook',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 