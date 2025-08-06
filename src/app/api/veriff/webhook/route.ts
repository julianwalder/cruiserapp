import { NextRequest, NextResponse } from 'next/server';
import { EnhancedVeriffWebhook } from '@/lib/enhanced-veriff-webhook';
import { VeriffService } from '@/lib/veriff-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Received Veriff webhook');
    
    // Get the raw body for signature validation
    const body = await request.text();
    const signature = request.headers.get('x-veriff-signature');
    
    console.log('Webhook signature:', signature);
    console.log('Webhook body length:', body.length);
    
    if (!signature) {
      console.error('❌ Missing Veriff signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }
    
    // Parse the JSON payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('❌ Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    console.log('📋 Webhook payload type:', payload.feature || 'traditional');
    console.log('📋 Webhook action:', payload.action || payload.verification?.status);
    
    // Validate the webhook signature
    const isValidSignature = EnhancedVeriffWebhook.validateSignature(body, signature);
    
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    console.log('✅ Webhook signature validated successfully');
    
    // Process the webhook using the enhanced handler
    try {
      await EnhancedVeriffWebhook.processWebhook(payload, signature);
      console.log('✅ Webhook processed successfully by EnhancedVeriffWebhook');
    } catch (enhancedError) {
      console.error('❌ Enhanced webhook processing failed:', enhancedError);
      
      // Fallback to legacy VeriffService
      try {
        await VeriffService.handleCallback(payload);
        console.log('✅ Webhook processed successfully by VeriffService (fallback)');
      } catch (legacyError) {
        console.error('❌ Legacy webhook processing also failed:', legacyError);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
      }
    }
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Veriff webhook endpoint is active',
    timestamp: new Date().toISOString(),
    status: 'ready'
  });
} 