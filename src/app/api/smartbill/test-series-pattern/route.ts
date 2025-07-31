import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cif = searchParams.get('cif') || process.env.SMARTBILL_CIF;
    const seriesName = searchParams.get('seriesName') || 'CA';
    const invoiceNumber = searchParams.get('number') || '0766';

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
    
    // Test endpoints based on the working series pattern
    const testEndpoints = [
      // Working series endpoint (for reference)
      {
        name: 'Series List (Working)',
        url: `https://ws.smartbill.ro/SBORO/api/series?cif=${cif}`,
        method: 'GET'
      },
      // Try invoice endpoints with similar pattern
      {
        name: 'Invoice List (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Invoice List (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice`,
        method: 'POST',
        body: { cif: cif }
      },
      // Try with specific series
      {
        name: 'Invoice by Series (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice?cif=${cif}&series=${seriesName}`,
        method: 'GET'
      },
      {
        name: 'Invoice by Series (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice`,
        method: 'POST',
        body: { cif: cif, series: seriesName }
      },
      // Try with seriesname parameter (like the working endpoint)
      {
        name: 'Invoice by SeriesName (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice?cif=${cif}&seriesname=${seriesName}`,
        method: 'GET'
      },
      {
        name: 'Invoice by SeriesName (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice`,
        method: 'POST',
        body: { cif: cif, seriesname: seriesName }
      },
      // Try with date ranges
      {
        name: 'Invoice by Date Range (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice?cif=${cif}&startDate=2024-01-01&endDate=2025-12-31`,
        method: 'GET'
      },
      {
        name: 'Invoice by Date Range (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice`,
        method: 'POST',
        body: { cif: cif, startDate: '2024-01-01', endDate: '2025-12-31' }
      },
      // Try with specific invoice number
      {
        name: 'Invoice by Number (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice?cif=${cif}&number=${invoiceNumber}`,
        method: 'GET'
      },
      {
        name: 'Invoice by Number (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice`,
        method: 'POST',
        body: { cif: cif, number: invoiceNumber }
      },
      // Try with full invoice ID
      {
        name: 'Invoice by Full ID (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice?cif=${cif}&id=${seriesName}${invoiceNumber}`,
        method: 'GET'
      },
      {
        name: 'Invoice by Full ID (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice`,
        method: 'POST',
        body: { cif: cif, id: `${seriesName}${invoiceNumber}` }
      },
      // Try different endpoint variations
      {
        name: 'Invoice List Alt (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoices?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Invoice List Alt (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoices`,
        method: 'POST',
        body: { cif: cif }
      },
      // Try with different base URLs
      {
        name: 'Invoice List Alt Base (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/list?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Invoice List Alt Base (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/list`,
        method: 'POST',
        body: { cif: cif }
      }
    ];

    const results = [];
    const successfulDataEndpoints = [];

    console.log(`Testing ${testEndpoints.length} endpoints based on series pattern for ${seriesName}${invoiceNumber}...`);

    // Test endpoints
    for (const endpoint of testEndpoints) {
      try {
        const requestOptions: RequestInit = {
          method: endpoint.method,
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json, application/xml, text/xml, */*',
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
        let isXml = false;
        let dataSize = 0;
        
        if (response.ok) {
          const textResponse = await response.text();
          dataSize = textResponse.length;
          
          // Check if it's JSON
          try {
            responseData = JSON.parse(textResponse);
            isJson = true;
          } catch {
            // Check if it's XML
            if (textResponse.trim().startsWith('<?xml') || textResponse.trim().startsWith('<')) {
              responseData = {
                type: 'XML',
                size: `${dataSize} characters`,
                content: textResponse.substring(0, 1000) + (dataSize > 1000 ? '...' : ''),
                contentType: contentType
              };
              isXml = true;
            } else {
              responseData = {
                type: 'Text',
                size: `${dataSize} characters`,
                content: textResponse.substring(0, 500) + (dataSize > 500 ? '...' : ''),
                contentType: contentType
              };
            }
          }
        } else {
          responseData = {
            error: `HTTP ${response.status}: ${response.statusText}`,
            contentType: contentType
          };
        }

        const result = {
          name: endpoint.name,
          url: endpoint.url,
          method: endpoint.method,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: contentType,
          responseData: responseData,
          success: response.ok,
          isJson: isJson,
          isXml: isXml,
          dataSize: dataSize
        };

        results.push(result);

        if (response.ok && (isJson || isXml)) {
          successfulDataEndpoints.push(result);
          console.log(`✅ Found data endpoint: ${endpoint.name} (${isJson ? 'JSON' : 'XML'})`);
        }
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
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

    // Find successful responses
    const successfulTests = results.filter(r => r.success);
    const jsonResponses = results.filter(r => 'isJson' in r && r.isJson);
    const xmlResponses = results.filter(r => 'isXml' in r && r.isXml);
    const recommendations = [];

    if (successfulDataEndpoints.length > 0) {
      recommendations.push(`Found ${successfulDataEndpoints.length} endpoints with structured data`);
      successfulDataEndpoints.forEach(test => {
        recommendations.push(`✅ ${test.name}: ${test.isJson ? 'JSON' : 'XML'} data (${test.dataSize} chars)`);
      });
    } else {
      recommendations.push('No endpoints with structured data found');
    }

    if (jsonResponses.length > 0) {
      recommendations.push(`Found ${jsonResponses.length} JSON responses`);
      jsonResponses.forEach(test => {
        recommendations.push(`📄 ${test.name}: JSON data available`);
      });
    }

    if (xmlResponses.length > 0) {
      recommendations.push(`Found ${xmlResponses.length} XML responses`);
      xmlResponses.forEach(test => {
        recommendations.push(`📄 ${test.name}: XML data available`);
      });
    }

    return NextResponse.json({
      testParameters: {
        cif: cif,
        seriesName: seriesName,
        invoiceNumber: invoiceNumber,
        fullInvoiceNumber: `${seriesName}${invoiceNumber}`
      },
      results: results,
      successfulDataEndpoints: successfulDataEndpoints,
      recommendations: recommendations,
      summary: {
        totalEndpoints: results.length,
        successfulEndpoints: successfulTests.length,
        failedEndpoints: results.length - successfulTests.length,
        jsonResponses: jsonResponses.length,
        xmlResponses: xmlResponses.length,
        structuredDataEndpoints: successfulDataEndpoints.length
      }
    });

  } catch (error) {
    console.error('SmartBill series pattern test error:', error);
    return NextResponse.json(
      { 
        error: 'SmartBill series pattern test failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 