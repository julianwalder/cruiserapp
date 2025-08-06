import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { EnhancedVeriffWebhook } from '@/lib/enhanced-veriff-webhook';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    // Await params before destructuring
    const { userId } = await params;

    // Check if user is requesting their own data or is an admin
    if (decoded.userId !== userId && !decoded.roles?.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comprehensive verification data
    const verificationData = await EnhancedVeriffWebhook.getUserVerificationData(userId);

    return NextResponse.json({
      success: true,
      data: verificationData
    });

  } catch (error) {
    console.error('Error fetching verification data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch verification data',
        details: (error as any)?.message || String(error)
      },
      { status: 500 }
    );
  }
} 