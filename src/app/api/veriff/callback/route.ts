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

// Also handle GET requests (for testing)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Veriff callback endpoint is active'
  });
} 