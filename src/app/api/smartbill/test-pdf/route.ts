import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cif = searchParams.get('cif') || process.env.SMARTBILL_CIF;
    const seriesName = searchParams.get('seriesName') || 'CA';
    const number = searchParams.get('number') || '0766';

    if (!cif) {
      return NextResponse.json(
        { 
          error: 'CIF not provided',
          message: 'Please provide a CIF parameter or set SMARTBILL_CIF environment variable'
        },
        { status: 400 }
      );
    }

    const username = process.env.SMARTBILL_USERNAME;
    const password = process.env.SMARTBILL_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { 
          error: 'SmartBill credentials not configured',
          message: 'Please set SMARTBILL_USERNAME and SMARTBILL_PASSWORD environment variables'
        },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Test different PDF endpoint variations
    const testCases = [
      {
        name: 'PDF with CIF, Series, Number',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&seriesname=${seriesName}&number=${number}`,
        method: 'GET'
      },
      {
        name: 'PDF with CIF and Invoice ID',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&id=${seriesName}${number}`,
        method: 'GET'
      },
      {
        name: 'PDF with CIF and Full Invoice Number',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&invoiceNumber=${seriesName}${number}`,
        method: 'GET'
      },
      {
        name: 'PDF with CIF and Document Number',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&documentNumber=${seriesName}${number}`,
        method: 'GET'
      },
      {
        name: 'PDF with CIF only (list all)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}`,
        method: 'GET'
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        const requestOptions: RequestInit = {
          method: testCase.method,
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/pdf, application/json, */*',
            'User-Agent': 'CruiserApp/1.0',
          },
        };

        const response = await fetch(testCase.url, requestOptions);
        const contentType = response.headers.get('content-type');
        
        let responseData;
        let isPdf = false;
        
        if (contentType?.includes('application/pdf')) {
          // It's a PDF - get the size and first few bytes
          const arrayBuffer = await response.arrayBuffer();
          const size = arrayBuffer.byteLength;
          const firstBytes = new Uint8Array(arrayBuffer.slice(0, 20));
          responseData = {
            type: 'PDF',
            size: `${size} bytes`,
            firstBytes: Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' '),
            pdfHeader: firstBytes[0] === 0x25 && firstBytes[1] === 0x50 && firstBytes[2] === 0x44 && firstBytes[3] === 0x46
          };
          isPdf = true;
        } else {
          // Try to parse as JSON or get text
          const textResponse = await response.text();
          try {
            responseData = JSON.parse(textResponse);
          } catch {
            responseData = textResponse.substring(0, 500) + (textResponse.length > 500 ? '...' : '');
          }
        }

        results.push({
          name: testCase.name,
          url: testCase.url,
          method: testCase.method,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: contentType,
          responseData: responseData,
          success: response.ok,
          isPdf: isPdf
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
    const pdfResponses = results.filter(r => r.isPdf);
    const recommendations = [];

    if (successfulTests.length > 0) {
      recommendations.push(`Found ${successfulTests.length} successful API calls`);
      successfulTests.forEach(test => {
        recommendations.push(`✅ ${test.name}: ${test.status} ${test.statusText}`);
      });
    } else {
      recommendations.push('No successful API calls found');
    }

    if (pdfResponses.length > 0) {
      recommendations.push(`Found ${pdfResponses.length} PDF responses`);
      pdfResponses.forEach(test => {
        recommendations.push(`📄 ${test.name}: ${test.responseData.size}`);
      });
    }

    return NextResponse.json({
      testParameters: {
        cif: cif,
        seriesName: seriesName,
        number: number,
        fullInvoiceNumber: `${seriesName}${number}`
      },
      credentials: {
        username: username ? `${username.substring(0, 3)}***` : 'not set',
        password: password ? '***' : 'not set'
      },
      testResults: results,
      recommendations: recommendations,
      summary: {
        total: results.length,
        successful: successfulTests.length,
        failed: results.length - successfulTests.length,
        pdfResponses: pdfResponses.length
      }
    });

  } catch (error) {
    console.error('SmartBill PDF test error:', error);
    return NextResponse.json(
      { 
        error: 'SmartBill PDF test failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 