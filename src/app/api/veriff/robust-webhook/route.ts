import { NextRequest, NextResponse } from 'next/server';
import { RobustVeriffWebhook } from '@/lib/robust-veriff-webhook';
import { VeriffMonitoring } from '@/lib/veriff-monitoring';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let webhookId: string | undefined;

  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const payload = JSON.parse(body);
    const headers = Object.fromEntries(request.headers.entries());

    console.log('🔄 Robust Veriff webhook received:', {
      id: payload.id,
      action: payload.action,
      feature: payload.feature,
      timestamp: new Date().toISOString(),
      bodyLength: body.length
    });

    // Extract webhook signature from headers
    const signature = request.headers.get('x-veriff-signature') || 
                     request.headers.get('x-hmac-signature') ||
                     request.headers.get('veriff-signature');

    if (!signature) {
      console.error('❌ No signature found in webhook headers');
      return NextResponse.json(
        { 
          status: 'error',
          message: 'No signature provided',
          webhookId: undefined
        },
        { status: 400 }
      );
    }

    // Validate signature
    const isValidSignature = RobustVeriffWebhook.validateSignature(body, signature);
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Invalid signature',
          webhookId: undefined
        },
        { status: 401 }
      );
    }

    console.log('✅ Webhook signature validated successfully');

    // Process webhook with robust error handling
    const result = await RobustVeriffWebhook.processWebhook(
      payload,
      signature,
      headers
    );

    const processingTime = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Robust webhook processed successfully in ${processingTime}ms:`, {
        userId: result.userId,
        sessionId: result.sessionId,
        action: result.action
      });

      // Trigger monitoring check for approved verifications
      if (result.action === 'approved') {
        console.log('🔍 Triggering monitoring check for approved verification...');
        try {
          await VeriffMonitoring.runMonitoringCheck();
        } catch (monitoringError) {
          console.warn('⚠️ Monitoring check failed (non-critical):', monitoringError);
        }
      }

      return NextResponse.json({
        status: 'ok',
        message: result.message,
        webhookId: result.sessionId,
        userId: result.userId,
        action: result.action,
        processingTime,
        timestamp: new Date().toISOString()
      });

    } else {
      console.error(`❌ Robust webhook processing failed after ${processingTime}ms:`, {
        error: result.error,
        retryable: result.retryable
      });

      // If retryable, return 202 to indicate processing will be retried
      if (result.retryable) {
        return NextResponse.json(
          {
            status: 'retry',
            message: result.message,
            error: result.error,
            webhookId: result.sessionId,
            processingTime,
            timestamp: new Date().toISOString()
          },
          { status: 202 }
        );
      }

      // If not retryable, return 200 to prevent further retries
      return NextResponse.json(
        {
          status: 'error',
          message: result.message,
          error: result.error,
          webhookId: result.sessionId,
          processingTime,
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      );
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Robust webhook processing error after ${processingTime}ms:`, {
      error: errorMessage,
      webhookId
    });

    // Always return 200 to prevent Veriff from retrying
    // This prevents infinite retry loops for malformed webhooks
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Webhook processing failed',
        error: errorMessage,
        webhookId,
        processingTime,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  }
}

// Handle GET requests for health checks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'health') {
      // Return health check status
      return NextResponse.json({
        status: 'healthy',
        service: 'robust-veriff-webhook',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    }

    if (action === 'metrics') {
      // Return basic metrics
      try {
        const metrics = await VeriffMonitoring.getVerificationMetrics();
        return NextResponse.json({
          status: 'ok',
          metrics,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Failed to fetch metrics',
            error: error instanceof Error ? error.message : String(error)
          },
          { status: 500 }
        );
      }
    }

    if (action === 'monitoring') {
      // Run comprehensive monitoring check
      try {
        const monitoringData = await VeriffMonitoring.runMonitoringCheck();
        return NextResponse.json({
          status: 'ok',
          monitoring: monitoringData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Failed to run monitoring check',
            error: error instanceof Error ? error.message : String(error)
          },
          { status: 500 }
        );
      }
    }

    // Default response
    return NextResponse.json({
      status: 'ok',
      service: 'robust-veriff-webhook',
      endpoints: {
        health: '/api/veriff/robust-webhook?action=health',
        metrics: '/api/veriff/robust-webhook?action=metrics',
        monitoring: '/api/veriff/robust-webhook?action=monitoring'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in GET request:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}


