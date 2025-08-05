import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { VeriffService } from '@/lib/veriff-service';

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

    // Get user's Veriff status
    const status = await VeriffService.getUserVeriffStatus(decoded.userId);

    const response = {
      success: true,
      status: {
        isVerified: status.isVerified,
        sessionId: status.sessionId,
        veriffStatus: status.status,
        veriffData: status.veriffData,
      },
      needsVerification: !status.isVerified,
    };

    console.log('Veriff status API response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching Veriff status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch verification status',
        details: (error as any)?.message || String(error)
      },
      { status: 500 }
    );
  }
} 