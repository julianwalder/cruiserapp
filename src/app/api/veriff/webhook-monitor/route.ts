import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { WebhookMonitor } from '@/lib/webhook-monitor';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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

    const { searchParams } = new URL(request.url);
    const hoursParam = searchParams.get('hours');
    const hours = hoursParam ? parseInt(hoursParam) : 0; // Default to 0 (all time)

    // Get webhook metrics
    const metrics = await WebhookMonitor.getWebhookMetrics(hours);
    
    // Get alerts
    const alerts = await WebhookMonitor.getAlerts();
    
    // Get failed webhooks
    const failedWebhooks = await WebhookMonitor.getFailedWebhooks();

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        alerts,
        failedWebhooks,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Error fetching webhook monitor data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch webhook monitor data',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST endpoint to retry failed webhooks
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
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
    const { action, eventId } = body;

    if (action === 'retry' && eventId) {
      // Increment retry count
      await WebhookMonitor.incrementRetryCount(eventId);
      
      return NextResponse.json({
        success: true,
        message: 'Retry count incremented'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing webhook monitor action:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process action',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 