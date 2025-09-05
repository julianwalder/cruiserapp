import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { RobustVeriffService } from '@/lib/robust-veriff-service';
import { VeriffMonitoring } from '@/lib/veriff-monitoring';

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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId') || decoded.userId;

    console.log('🔍 Robust Veriff status request:', {
      userId,
      action,
      requester: decoded.userId
    });

    if (action === 'comprehensive') {
      // Get comprehensive verification status with API sync
      const status = await RobustVeriffService.getUserVerificationStatus(userId);
      
      return NextResponse.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'sync') {
      // Force sync with Veriff API
      const { data: user } = await RobustVeriffService.supabase
        .from('users')
        .select('veriffSessionId')
        .eq('id', userId)
        .single();

      if (!user?.veriffSessionId) {
        return NextResponse.json({
          success: false,
          error: 'No Veriff session found for user'
        }, { status: 404 });
      }

      const syncResult = await RobustVeriffService.syncUserVerificationData(
        userId,
        user.veriffSessionId
      );

      return NextResponse.json({
        success: syncResult.success,
        data: syncResult.data,
        error: syncResult.error,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'monitoring') {
      // Get monitoring data (admin only)
      if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const monitoringData = await VeriffMonitoring.getDashboardData();
      
      return NextResponse.json({
        success: true,
        monitoring: monitoringData,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'health-check') {
      // Run health check on user's verification session
      const { data: user } = await RobustVeriffService.supabase
        .from('users')
        .select('veriffSessionId, veriffStatus, veriffSubmittedAt, updatedAt')
        .eq('id', userId)
        .single();

      if (!user?.veriffSessionId) {
        return NextResponse.json({
          success: true,
          health: {
            status: 'no_session',
            message: 'No verification session found'
          }
        });
      }

      // Check if session is stuck
      const submittedAt = new Date(user.veriffSubmittedAt);
      const now = new Date();
      const hoursSinceSubmission = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);

      let healthStatus = 'healthy';
      let issues: string[] = [];

      if (hoursSinceSubmission > 24) {
        healthStatus = 'error';
        issues.push(`Session stuck for ${Math.round(hoursSinceSubmission)} hours`);
      } else if (hoursSinceSubmission > 2) {
        healthStatus = 'warning';
        issues.push(`Session pending for ${Math.round(hoursSinceSubmission)} hours`);
      }

      // Try API sync to check session validity
      try {
        const syncResult = await RobustVeriffService.syncUserVerificationData(
          userId,
          user.veriffSessionId
        );

        if (!syncResult.success) {
          healthStatus = 'error';
          issues.push(`API sync failed: ${syncResult.error}`);
        }
      } catch (error) {
        healthStatus = 'error';
        issues.push(`API sync error: ${error}`);
      }

      return NextResponse.json({
        success: true,
        health: {
          status: healthStatus,
          sessionId: user.veriffSessionId,
          currentStatus: user.veriffStatus,
          hoursSinceSubmission: Math.round(hoursSinceSubmission),
          issues,
          lastActivity: user.updatedAt
        },
        timestamp: new Date().toISOString()
      });
    }

    // Default: get basic status
    const status = await RobustVeriffService.getUserVerificationStatus(userId);
    
    return NextResponse.json({
      success: true,
      status: {
        sessionId: status.sessionId,
        sessionUrl: status.sessionUrl,
        veriffStatus: status.veriffStatus,
        isVerified: status.isVerified,
        needsNewSession: status.needsNewSession,
        lastSync: status.lastSync
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in robust status API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { action, userId } = body;

    console.log('🔄 Robust Veriff status POST request:', {
      action,
      userId: userId || decoded.userId,
      requester: decoded.userId
    });

    if (action === 'force-sync') {
      // Force sync with Veriff API
      const targetUserId = userId || decoded.userId;
      
      const { data: user } = await RobustVeriffService.supabase
        .from('users')
        .select('veriffSessionId')
        .eq('id', targetUserId)
        .single();

      if (!user?.veriffSessionId) {
        return NextResponse.json({
          success: false,
          error: 'No Veriff session found for user'
        }, { status: 404 });
      }

      const syncResult = await RobustVeriffService.syncUserVerificationData(
        targetUserId,
        user.veriffSessionId
      );

      return NextResponse.json({
        success: syncResult.success,
        data: syncResult.data,
        error: syncResult.error,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'create-session') {
      // Create new verification session
      const { firstName, lastName, email } = body;
      
      if (!firstName || !lastName || !email) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: firstName, lastName, email'
        }, { status: 400 });
      }

      // Check if user already has a verification session
      const existingStatus = await RobustVeriffService.getUserVerificationStatus(decoded.userId);
      
      if (existingStatus.isVerified) {
        return NextResponse.json({
          success: false,
          error: 'User is already verified',
          status: 'verified'
        }, { status: 400 });
      }

      if (existingStatus.sessionId && existingStatus.veriffStatus === 'submitted') {
        return NextResponse.json({
          success: false,
          error: 'Verification session already exists',
          sessionId: existingStatus.sessionId,
          status: 'pending'
        }, { status: 400 });
      }

      // Create new session
      const session = await RobustVeriffService.createSession(decoded.userId, {
        firstName,
        lastName,
        email,
      });

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          url: session.url,
          status: session.status
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error in robust status POST API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

