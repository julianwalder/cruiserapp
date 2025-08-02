import { NextRequest, NextResponse } from 'next/server';
import { InvoiceImportService } from '@/lib/invoice-import-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const invoice = await InvoiceImportService.getInvoiceById(invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        // Include XML content details
        xml_content: invoice.xml_content,
        original_xml_content: invoice.original_xml_content,
        has_edits: invoice.xml_content !== invoice.original_xml_content,
        // Parse edited content if it exists and is different from original
        edited_data: invoice.xml_content !== invoice.original_xml_content ? JSON.parse(invoice.xml_content) : null
      }
    });

  } catch (error) {
    console.error('Error fetching invoice XML:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice XML',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 