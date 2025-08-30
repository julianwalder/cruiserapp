import { NextRequest, NextResponse } from 'next/server';
import { veriffDataManager } from '@/lib/veriff-data-manager';
import { AuthService } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = AuthService.verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is requesting their own data or is an admin
    const requestingUserId = decoded.userId;
    const targetUserId = params.userId;

    if (requestingUserId !== targetUserId) {
      // Check if requesting user has admin privileges
      const hasAdminRole = decoded.roles?.some((role: string) => 
        ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'].includes(role)
      );

      if (!hasAdminRole) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    console.log(`🔍 Enhanced verification data request for user: ${targetUserId}`);

    // Get comprehensive verification data using the robust data manager
    const verificationData = await veriffDataManager.getUserVerificationData(targetUserId);

    if (!verificationData) {
      return NextResponse.json({ 
        error: 'User not found or no verification data available' 
      }, { status: 404 });
    }

    // Add metadata about the data source
    const response = {
      success: true,
      data: verificationData,
      metadata: {
        source: 'enhanced-veriff-data-manager',
        timestamp: new Date().toISOString(),
        userId: targetUserId,
        hasVerificationData: !!verificationData.status,
        isVerified: verificationData.isVerified,
        lastUpdated: verificationData.updatedAt || verificationData.webhookReceivedAt
      }
    };

    console.log(`✅ Enhanced verification data retrieved for user: ${targetUserId}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Enhanced verification data error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to retrieve verification data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
