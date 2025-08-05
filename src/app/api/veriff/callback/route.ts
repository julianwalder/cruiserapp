import { NextRequest, NextResponse } from 'next/server';
import { VeriffService } from '@/lib/veriff-service';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const payload = JSON.parse(body);

    console.log('Veriff Callback Received:', {
      payload: payload,
      headers: Object.fromEntries(request.headers.entries())
    });

    // Handle the callback
    await VeriffService.handleCallback(payload);

    // Return success response to Veriff
    return NextResponse.json({ status: 'ok' });

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
  
  // Redirect to completion page which will handle the redirect to my-account
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/veriff-complete?veriff_status=${status || 'completed'}&session_id=${sessionId || ''}`;
  
  console.log('Redirecting to completion page:', redirectUrl);
  return NextResponse.redirect(redirectUrl);
} 