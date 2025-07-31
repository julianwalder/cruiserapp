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
    
    // Test XML-specific endpoints and headers
    const xmlTestEndpoints = [
      // Try with XML Accept header
      {
        name: 'Invoice XML with Accept Header (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      },
      {
        name: 'Invoice XML with Accept Header (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice`,
        method: 'POST',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'Content-Type': 'application/json'
        },
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      },
      // Try specific XML endpoints
      {
        name: 'Invoice XML Endpoint (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/xml?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      },
      {
        name: 'Invoice XML Endpoint (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/xml`,
        method: 'POST',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'Content-Type': 'application/json'
        },
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      },
      // Try UBL XML format
      {
        name: 'Invoice UBL XML (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/ubl?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      },
      {
        name: 'Invoice UBL XML (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/ubl`,
        method: 'POST',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'Content-Type': 'application/json'
        },
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      },
      // Try different XML formats
      {
        name: 'Invoice XML Export (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/export?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}&format=xml`,
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      },
      {
        name: 'Invoice XML Export (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/export`,
        method: 'POST',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'Content-Type': 'application/json'
        },
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber, format: 'xml' }
      },
      // Try with different parameter names
      {
        name: 'Invoice XML with Series (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/xml?cif=${cif}&series=${seriesName}&number=${invoiceNumber}`,
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      },
      {
        name: 'Invoice XML with Series (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/invoice/xml`,
        method: 'POST',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'Content-Type': 'application/json'
        },
        body: { cif: cif, series: seriesName, number: invoiceNumber }
      },
      // Try alternative base URLs
      {
        name: 'Invoice XML Alt Base (GET)',
        url: `https://ws.smartbill.ro/SBORO/api/xml/invoice?cif=${cif}&seriesname=${seriesName}&number=${invoiceNumber}`,
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      },
      {
        name: 'Invoice XML Alt Base (POST)',
        url: `https://ws.smartbill.ro/SBORO/api/xml/invoice`,
        method: 'POST',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'Content-Type': 'application/json'
        },
        body: { cif: cif, seriesname: seriesName, number: invoiceNumber }
      }
    ];

    const results = [];
    const successfulXmlEndpoints = [];

    console.log(`Testing ${xmlTestEndpoints.length} XML endpoints for ${seriesName}${invoiceNumber}...`);

    // Test XML endpoints
    for (const endpoint of xmlTestEndpoints) {
      try {
        const requestOptions: RequestInit = {
          method: endpoint.method,
          headers: {
            'Authorization': `Basic ${auth}`,
            'User-Agent': 'CruiserApp/1.0',
            ...endpoint.headers
          },
        };

        if (endpoint.body && endpoint.method === 'POST') {
          requestOptions.body = JSON.stringify(endpoint.body);
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
                content: textResponse.substring(0, 2000) + (dataSize > 2000 ? '...' : ''),
                contentType: contentType,
                isXml: true
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

        if (response.ok && isXml) {
          successfulXmlEndpoints.push(result);
          console.log(`✅ Found XML endpoint: ${endpoint.name} (${dataSize} chars)`);
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

    if (successfulXmlEndpoints.length > 0) {
      recommendations.push(`Found ${successfulXmlEndpoints.length} endpoints with XML data`);
      successfulXmlEndpoints.forEach(test => {
        recommendations.push(`✅ ${test.name}: XML data (${test.dataSize} chars)`);
      });
    } else {
      recommendations.push('No XML endpoints found');
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
      successfulXmlEndpoints: successfulXmlEndpoints,
      recommendations: recommendations,
      summary: {
        totalEndpoints: results.length,
        successfulEndpoints: successfulTests.length,
        failedEndpoints: results.length - successfulTests.length,
        jsonResponses: jsonResponses.length,
        xmlResponses: xmlResponses.length,
        xmlDataEndpoints: successfulXmlEndpoints.length
      }
    });

  } catch (error) {
    console.error('SmartBill XML test error:', error);
    return NextResponse.json(
      { 
        error: 'SmartBill XML test failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 