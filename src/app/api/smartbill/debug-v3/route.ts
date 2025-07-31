import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const username = process.env.SMARTBILL_USERNAME;
    const password = process.env.SMARTBILL_PASSWORD;
    const cif = process.env.SMARTBILL_CIF;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'SmartBill credentials not configured' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Test the exact call that returned 401 in our earlier debug
    const testCases = [
      {
        name: 'POST /invoice (empty body)',
        url: 'https://ws.smartbill.ro/SBORO/api/invoice',
        method: 'POST',
        body: {}
      },
      {
        name: 'POST /invoice (with CIF)',
        url: 'https://ws.smartbill.ro/SBORO/api/invoice',
        method: 'POST',
        body: { cif: cif || 'test' }
      },
      {
        name: 'POST /invoice (with CIF and limit)',
        url: 'https://ws.smartbill.ro/SBORO/api/invoice',
        method: 'POST',
        body: { cif: cif || 'test', limit: 1 }
      },
      {
        name: 'POST /invoice (minimal data)',
        url: 'https://ws.smartbill.ro/SBORO/api/invoice',
        method: 'POST',
        body: { cif: cif || 'test', startDate: '2024-01-01', endDate: '2024-12-31' }
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
          responseData = responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '');
        }

        results.push({
          name: testCase.name,
          url: testCase.url,
          method: testCase.method,
          requestBody: testCase.body,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          responseData: responseData,
          success: response.ok,
          isJson: response.headers.get('content-type')?.includes('application/json')
        });
      } catch (error) {
        results.push({
          name: testCase.name,
          url: testCase.url,
          method: testCase.method,
          requestBody: testCase.body,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    // Find successful responses
    const successfulTests = results.filter(r => r.success);
    const jsonResponses = results.filter(r => r.isJson);
    const recommendations = [];

    if (successfulTests.length > 0) {
      recommendations.push(`Found ${successfulTests.length} successful API calls`);
      successfulTests.forEach(test => {
        recommendations.push(`✅ ${test.name}: ${test.status} ${test.statusText}`);
      });
    } else {
      recommendations.push('No successful API calls found');
      
      if (jsonResponses.length > 0) {
        recommendations.push(`Found ${jsonResponses.length} JSON responses (check for error messages)`);
        jsonResponses.forEach(test => {
          recommendations.push(`📄 ${test.name}: ${test.status} ${test.statusText}`);
        });
      }
      
      recommendations.push('Check SmartBill API documentation for correct parameters');
      recommendations.push('Verify your credentials and API access permissions');
    }

    return NextResponse.json({
      credentials: {
        username: username ? `${username.substring(0, 3)}***` : 'not set',
        password: password ? '***' : 'not set',
        cif: cif || 'not set'
      },
      testResults: results,
      recommendations: recommendations,
      summary: {
        total: results.length,
        successful: successfulTests.length,
        failed: results.length - successfulTests.length,
        jsonResponses: jsonResponses.length
      }
    });
  } catch (error) {
    console.error('SmartBill debug v3 error:', error);
    return NextResponse.json(
      { error: 'Debug failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 