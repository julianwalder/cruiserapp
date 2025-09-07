import { NextRequest, NextResponse } from 'next/server';
import { VeriffService } from '@/lib/veriff-service';
import { EnhancedVeriffWebhook } from '@/lib/enhanced-veriff-webhook';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const payload = JSON.parse(body);

    console.log('Veriff Callback Received:', {
      payload: payload,
      headers: Object.fromEntries(request.headers.entries())
    });

    // Extract webhook signature from headers
    const signature = request.headers.get('x-veriff-signature') || 
                     request.headers.get('x-hmac-signature') ||
                     request.headers.get('veriff-signature');

    // Process with enhanced webhook handler
    console.log('Processing Veriff callback with enhanced handler...');
    try {
      await EnhancedVeriffWebhook.processWebhook(payload, signature || '');
      console.log('Enhanced Veriff callback processed successfully');
    } catch (enhancedError) {
      console.error('Enhanced Veriff callback failed:', enhancedError);
      throw enhancedError;
    }

    // Also call the legacy handler for backward compatibility
    console.log('Processing with legacy Veriff handler...');
    await VeriffService.handleCallback(payload);
    console.log('Legacy Veriff callback processed successfully');

    // Return success response to Veriff
    return NextResponse.json({ 
      status: 'ok',
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error handling Veriff callback:', error);
    
    // Still return 200 to Veriff to prevent retries
    return NextResponse.json(
      { 
        status: 'error',
        message: (error as any)?.message || String(error)
      },
      { status: 200 }
    );
  }
}

// Also handle GET requests (for user redirects from Veriff)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const status = searchParams.get('status');
  
  console.log('Veriff GET callback received:', { sessionId, status });
  
  // Since we don't have session info, we'll redirect to my-account and let the frontend handle status refresh
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my-account?veriff_status=completed`;
  
  console.log('Redirecting to my-account:', redirectUrl);
  return NextResponse.redirect(redirectUrl);
} 