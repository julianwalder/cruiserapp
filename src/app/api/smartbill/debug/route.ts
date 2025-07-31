import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const username = process.env.SMARTBILL_USERNAME;
    const password = process.env.SMARTBILL_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'SmartBill credentials not configured' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Test different possible API endpoints
    const testUrls = [
      'https://ws.smartbill.ro/SBORO/api/ping',
      'https://ws.smartbill.ro/SBORO/api/company',
      'https://ws.smartbill.ro/SBORO/api/invoice',
      'https://ws.smartbill.ro/api/ping',
      'https://ws.smartbill.ro/api/company',
      'https://api.smartbill.ro/ping',
      'https://api.smartbill.ro/company',
    ];

    const results = [];

    for (const url of testUrls) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
        });
      } catch (error) {
        results.push({
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      credentials: {
        username: username ? `${username.substring(0, 3)}***` : 'not set',
        password: password ? '***' : 'not set'
      },
      testResults: results
    });
  } catch (error) {
    console.error('SmartBill debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 