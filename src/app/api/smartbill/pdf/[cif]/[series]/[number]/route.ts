import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cif: string; series: string; number: string } }
) {
  try {
    const { cif, series, number } = params;
    
    const username = process.env.SMARTBILL_USERNAME;
    const password = process.env.SMARTBILL_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'SmartBill credentials not configured' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Use the working PDF endpoint
    const pdfUrl = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&seriesname=${series}&number=${number}`;
    
    const response = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/pdf, application/json, */*',
        'User-Agent': 'CruiserApp/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the PDF content
    const pdfBuffer = await response.arrayBuffer();
    
    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${series}-${number}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error fetching SmartBill PDF:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF' },
      { status: 500 }
    );
  }
} 