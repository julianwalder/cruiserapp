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
    
    // Test various endpoints that might return invoice data in JSON/XML
    const dataEndpoints = [
      // Invoice data endpoints
      {
        name: 'Invoice Data (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/data?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET'
      },
      {
        name: 'Invoice Data (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/data`,
        method: 'POST',
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      },
      {
        name: 'Invoice Info (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/info?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET'
      },
      {
        name: 'Invoice Info (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/info`,
        method: 'POST',
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      },
      {
        name: 'Invoice Details (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/details?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET'
      },
      {
        name: 'Invoice Details (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/details`,
        method: 'POST',
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      },
      {
        name: 'Invoice XML (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/xml?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET'
      },
      {
        name: 'Invoice XML (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/xml`,
        method: 'POST',
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      },
      {
        name: 'Invoice JSON (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/json?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET'
      },
      {
        name: 'Invoice JSON (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/json`,
        method: 'POST',
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      },
      // Alternative endpoint patterns
      {
        name: 'Invoice by ID (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/${invoiceNumber}?cif=${cif}&seriesname=${seriesName}`,
        method: 'GET'
      },
      {
        name: 'Invoice by ID (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/${invoiceNumber}`,
        method: 'POST',
        body: { cif: cif, seriesname: seriesName }
      },
      // Different base URL patterns
      {
        name: 'Invoice Data (Alt Base)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/data/${cif}/${seriesName}/${invoiceNumber}`,
        method: 'GET'
      },
      {
        name: 'Invoice Data (Alt Base 2)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/${cif}/${seriesName}/${invoiceNumber}/data`,
        method: 'GET'
      },
      // Company and client data endpoints
      {
        name: 'Company Info (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/company/info?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Company Info (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/company/info`,
        method: 'POST',
        body: { cif: cif }
      },
      {
        name: 'Clients List (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/clients?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Clients List (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/clients`,
        method: 'POST',
        body: { cif: cif }
      },
      // Products and services
      {
        name: 'Products List (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/products?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Products List (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/products`,
        method: 'POST',
        body: { cif: cif }
      },
      // Series and numbering
      {
        name: 'Series List (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/series?cif=${cif}`,
        method: 'GET'
      },
      {
        name: 'Series List (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/series`,
        method: 'POST',
        body: { cif: cif }
      }
    ];

    const results = [];
    const successfulDataEndpoints = [];

    console.log(`Testing ${dataEndpoints.length} data endpoints for invoice ${seriesName}${invoiceNumber}...`);

    // Test data endpoints
    for (const endpoint of dataEndpoints) {
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
    const jsonResponses = results.filter(r => r.isJson);
    const xmlResponses = results.filter(r => r.isXml);
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
      investigationParameters: {
        cif: cif,
        seriesName: seriesName,
        invoiceNumber: invoiceNumber,
        fullInvoiceNumber: `${seriesName}${invoiceNumber}`
      },
      credentials: {
        username: username ? `${username.substring(0, 3)}***` : 'not set',
        password: password ? '***' : 'not set'
      },
      dataEndpoints: results,
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
    console.error('SmartBill data investigation error:', error);
    return NextResponse.json(
      { 
        error: 'SmartBill data investigation failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 