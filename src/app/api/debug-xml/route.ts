import { NextRequest, NextResponse } from 'next/server';
import { XMLInvoiceParser } from '@/lib/xml-invoice-parser';

export async function POST(request: NextRequest) {
  try {
    const { xmlContent } = await request.json();
    
    console.log('=== DEBUG XML PARSING ===');
    console.log('XML Content length:', xmlContent?.length);
    
    const result = await XMLInvoiceParser.parseXMLInvoice(xmlContent);
    
    return NextResponse.json({
      success: true,
      parsedInvoice: result,
      debug: {
        message: 'XML parsed successfully'
      }
    });
  } catch (error) {
    console.error('XML Debug Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        message: 'XML parsing failed'
      }
    }, { status: 500 });
  }
} 