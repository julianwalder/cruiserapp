import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cif = searchParams.get('cif') || process.env.SMARTBILL_CIF;
    const seriesName = searchParams.get('seriesName') || 'CA';
    const startNumber = parseInt(searchParams.get('startNumber') || '750');
    const endNumber = parseInt(searchParams.get('endNumber') || '800');

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
    
    // Method 1: Try different invoice listing endpoints
    const listingEndpoints = [
      {
        name: 'Invoice List (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/list?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Invoice List (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/list`,
        method: 'POST',
        body: { cif: cif }
      },
      {
        name: 'Invoice Search (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/search?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Invoice Search (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/search`,
        method: 'POST',
        body: { cif: cif }
      },
      {
        name: 'Invoice All (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/all?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Invoice All (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/all`,
        method: 'POST',
        body: { cif: cif }
      },
      {
        name: 'Invoice Range (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/range?cif=${cif}&startDate=2024-01-01&endDate=2025-12-31`,
        method: 'GET'
      },
      {
        name: 'Invoice Range (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/range`,
        method: 'POST',
        body: { cif: cif, startDate: '2024-01-01', endDate: '2025-12-31' }
      }
    ];

    const results = [];
    const discoveredInvoices = [];

    // Test listing endpoints
    for (const endpoint of listingEndpoints) {
      try {
        const requestOptions: RequestInit = {
          method: endpoint.method,
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json, */*',
            'User-Agent': 'CruiserApp/1.0',
          },
        };

        if (endpoint.body && endpoint.method === 'POST') {
          requestOptions.body = JSON.stringify(endpoint.body);
          requestOptions.headers = {
            ...requestOptions.headers,
            'Content-Type': 'application/json',
          };
        }

        const response = await fetch(endpoint.url, requestOptions);
        const contentType = response.headers.get('content-type');
        
        let responseData;
        let isJson = false;
        
        if (response.ok) {
          const textResponse = await response.text();
          try {
            responseData = JSON.parse(textResponse);
            isJson = true;
          } catch {
            responseData = {
              type: 'Text',
              size: `${textResponse.length} characters`,
              content: textResponse.substring(0, 500) + (textResponse.length > 500 ? '...' : ''),
              contentType: contentType
            };
          }
        } else {
          responseData = {
            error: `HTTP ${response.status}: ${response.statusText}`,
            contentType: contentType
          };
        }

        results.push({
          name: endpoint.name,
          url: endpoint.url,
          method: endpoint.method,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: contentType,
          responseData: responseData,
          success: response.ok,
          isJson: isJson
        });
      } catch (error) {
        results.push({
          name: endpoint.name,
          url: endpoint.url,
          method: endpoint.method,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    // Method 2: Discover invoices by testing PDF endpoint with different numbers
    console.log(`Starting invoice discovery for range ${startNumber}-${endNumber}...`);
    
    for (let number = startNumber; number <= endNumber; number++) {
      const paddedNumber = number.toString().padStart(4, '0');
      const pdfUrl = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&seriesname=${seriesName}&number=${paddedNumber}`;
      
      try {
        const requestOptions: RequestInit = {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json, */*',
            'User-Agent': 'CruiserApp/1.0',
          },
        };

        const response = await fetch(pdfUrl, requestOptions);
        
        if (response.ok) {
          const textResponse = await response.text();
          if (textResponse.startsWith('%PDF')) {
            discoveredInvoices.push({
              series: seriesName,
              number: paddedNumber,
              fullNumber: `${seriesName}${paddedNumber}`,
              url: pdfUrl,
              size: `${(textResponse.length / 1024).toFixed(2)} KB`,
              status: 'Found'
            });
            console.log(`✅ Found invoice: ${seriesName}${paddedNumber}`);
          }
        }
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Error checking ${seriesName}${paddedNumber}: ${error}`);
      }
    }

    // Method 3: Try different series names
    const seriesToTest = ['CA', 'FACT', 'INV', 'DOC'];
    const seriesResults = [];

    for (const series of seriesToTest) {
      if (series === seriesName) continue; // Skip the main series we already tested
      
      try {
        const testUrl = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&seriesname=${series}&number=0001`;
        const requestOptions: RequestInit = {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json, */*',
            'User-Agent': 'CruiserApp/1.0',
          },
        };

        const response = await fetch(testUrl, requestOptions);
        seriesResults.push({
          series: series,
          status: response.status,
          ok: response.ok,
          url: testUrl
        });
      } catch (error) {
        seriesResults.push({
          series: series,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Find successful responses
    const successfulTests = results.filter(r => r.success);
    const jsonResponses = results.filter(r => r.isJson);
    const recommendations = [];

    if (successfulTests.length > 0) {
      recommendations.push(`Found ${successfulTests.length} successful listing endpoints`);
      successfulTests.forEach(test => {
        recommendations.push(`✅ ${test.name}: ${test.status} ${test.statusText}`);
      });
    } else {
      recommendations.push('No successful listing endpoints found');
    }

    if (discoveredInvoices.length > 0) {
      recommendations.push(`Discovered ${discoveredInvoices.length} invoices via PDF endpoint`);
      recommendations.push(`Invoices found: ${discoveredInvoices.map(inv => inv.fullNumber).join(', ')}`);
    }

    if (jsonResponses.length > 0) {
      recommendations.push(`Found ${jsonResponses.length} JSON responses`);
      jsonResponses.forEach(test => {
        recommendations.push(`📄 ${test.name}: JSON data available`);
      });
    }

    return NextResponse.json({
      investigationParameters: {
        cif: cif,
        seriesName: seriesName,
        startNumber: startNumber,
        endNumber: endNumber,
        range: `${startNumber}-${endNumber}`
      },
      credentials: {
        username: username ? `${username.substring(0, 3)}***` : 'not set',
        password: password ? '***' : 'not set'
      },
      listingEndpoints: results,
      discoveredInvoices: discoveredInvoices,
      seriesResults: seriesResults,
      recommendations: recommendations,
      summary: {
        totalEndpoints: results.length,
        successfulEndpoints: successfulTests.length,
        failedEndpoints: results.length - successfulTests.length,
        jsonResponses: jsonResponses.length,
        discoveredInvoices: discoveredInvoices.length,
        seriesTested: seriesToTest.length
      }
    });

  } catch (error) {
    console.error('SmartBill investigation error:', error);
    return NextResponse.json(
      { 
        error: 'SmartBill investigation failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 