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
    
    // Test different possible API patterns
    const testCases = [
      // Test 1: Basic GET requests
      {
        name: 'GET /company',
        url: 'https://ws.smartbill.ro/SBORO/api/company',
        method: 'GET',
        body: null
      },
      {
        name: 'GET /invoice',
        url: 'https://ws.smartbill.ro/SBORO/api/invoice',
        method: 'GET',
        body: null
      },
      // Test 2: POST requests with empty body
      {
        name: 'POST /company (empty)',
        url: 'https://ws.smartbill.ro/SBORO/api/company',
        method: 'POST',
        body: {}
      },
      {
        name: 'POST /invoice (empty)',
        url: 'https://ws.smartbill.ro/SBORO/api/invoice',
        method: 'POST',
        body: {}
      },
      // Test 3: POST requests with basic data
      {
        name: 'POST /company (with data)',
        url: 'https://ws.smartbill.ro/SBORO/api/company',
        method: 'POST',
        body: { cif: process.env.SMARTBILL_CIF || 'test' }
      },
      {
        name: 'POST /invoice (with data)',
        url: 'https://ws.smartbill.ro/SBORO/api/invoice',
        method: 'POST',
        body: { cif: process.env.SMARTBILL_CIF || 'test' }
      },
      // Test 4: Different API base URLs
      {
        name: 'GET /api/company',
        url: 'https://ws.smartbill.ro/api/company',
        method: 'GET',
        body: null
      },
      {
        name: 'POST /api/company',
        url: 'https://ws.smartbill.ro/api/company',
        method: 'POST',
        body: {}
      },
      // Test 5: SOAP-style endpoints
      {
        name: 'POST /soap/company',
        url: 'https://ws.smartbill.ro/SBORO/soap/company',
        method: 'POST',
        body: {}
      },
      // Test 6: REST-style with different paths
      {
        name: 'GET /rest/company',
        url: 'https://ws.smartbill.ro/SBORO/rest/company',
        method: 'GET',
        body: null
      },
      {
        name: 'POST /rest/company',
        url: 'https://ws.smartbill.ro/SBORO/rest/company',
        method: 'POST',
        body: {}
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        const requestOptions: RequestInit = {
          method: testCase.method,
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        };

        if (testCase.body && testCase.method === 'POST') {
          requestOptions.body = JSON.stringify(testCase.body);
        }

        const response = await fetch(testCase.url, requestOptions);
        const responseText = await response.text();

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '');
        }

        results.push({
          name: testCase.name,
          url: testCase.url,
          method: testCase.method,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          responseData: responseData,
          success: response.ok
        });
      } catch (error) {
        results.push({
          name: testCase.name,
          url: testCase.url,
          method: testCase.method,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    // Find successful responses
    const successfulTests = results.filter(r => r.success);
    const recommendations = [];

    if (successfulTests.length > 0) {
      recommendations.push(`Found ${successfulTests.length} successful API calls`);
      successfulTests.forEach(test => {
        recommendations.push(`✅ ${test.name}: ${test.status} ${test.statusText}`);
      });
    } else {
      recommendations.push('No successful API calls found');
      recommendations.push('Check SmartBill API documentation for correct endpoints');
      recommendations.push('Verify your credentials and API access permissions');
    }

    return NextResponse.json({
      credentials: {
        username: username ? `${username.substring(0, 3)}***` : 'not set',
        password: password ? '***' : 'not set',
        cif: process.env.SMARTBILL_CIF || 'not set'
      },
      testResults: results,
      recommendations: recommendations,
      summary: {
        total: results.length,
        successful: successfulTests.length,
        failed: results.length - successfulTests.length
      }
    });
  } catch (error) {
    console.error('SmartBill debug v2 error:', error);
    return NextResponse.json(
      { error: 'Debug failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 