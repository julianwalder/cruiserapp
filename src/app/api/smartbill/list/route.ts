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
    
    // Test the working PDF endpoint and show the content
    const url = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&seriesname=${seriesName}&number=${number}`;
    
    try {
      const requestOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json, */*',
          'User-Agent': 'CruiserApp/1.0',
        },
      };

      const response = await fetch(url, requestOptions);
      const contentType = response.headers.get('content-type');
      
      let responseData;
      let dataType = 'unknown';
      
      if (response.ok) {
        const textResponse = await response.text();
        
        // Check if it's PDF content
        if (textResponse.startsWith('%PDF')) {
          dataType = 'PDF';
          responseData = {
            type: 'PDF',
            size: `${textResponse.length} characters`,
            sizeKB: `${(textResponse.length / 1024).toFixed(2)} KB`,
            firstLine: textResponse.split('\n')[0],
            secondLine: textResponse.split('\n')[1],
            preview: textResponse.substring(0, 200) + '...',
            note: 'This is PDF content returned as text. The PDF contains the invoice data.',
            pdfStructure: {
              hasPDFHeader: textResponse.startsWith('%PDF'),
              hasEndOfFile: textResponse.includes('%%EOF'),
              lineCount: textResponse.split('\n').length,
              objectCount: (textResponse.match(/^\d+ \d+ obj/gm) || []).length
            }
          };
        } else {
          // Try to parse as JSON
          try {
            responseData = JSON.parse(textResponse);
            dataType = 'JSON';
          } catch {
            dataType = 'Text';
            responseData = {
              type: 'Text',
              size: `${textResponse.length} characters`,
              content: textResponse.substring(0, 500) + (textResponse.length > 500 ? '...' : ''),
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

      return NextResponse.json({
        testParameters: {
          cif: cif,
          seriesName: seriesName,
          number: number,
          fullInvoiceNumber: `${seriesName}${number}`,
          url: url
        },
        credentials: {
          username: username ? `${username.substring(0, 3)}***` : 'not set',
          password: password ? '***' : 'not set'
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: contentType,
          dataType: dataType,
          data: responseData
        },
        summary: {
          success: response.ok,
          dataType: dataType,
          size: responseData.size || responseData.sizeKB || 'unknown'
        }
      });

    } catch (error) {
      return NextResponse.json({
        testParameters: {
          cif: cif,
          seriesName: seriesName,
          number: number,
          fullInvoiceNumber: `${seriesName}${number}`,
          url: url
        },
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'Fetch Error'
        }
      });
    }

  } catch (error) {
    console.error('SmartBill list test error:', error);
    return NextResponse.json(
      { 
        error: 'SmartBill list test failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 