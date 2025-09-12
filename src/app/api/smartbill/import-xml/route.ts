import { NextRequest, NextResponse } from 'next/server';
import { InvoiceImportService } from '@/lib/invoice-import-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const xmlContent = formData.get('xmlContent') as string;
    const editedInvoiceJson = formData.get('editedInvoice') as string;
    const hasEdits = formData.get('hasEdits') === 'true';

    if (!file && !xmlContent) {
      return NextResponse.json(
        { error: 'No file or XML content provided' },
        { status: 400 }
      );
    }

    let xmlString: string;

    if (file) {
      // Handle file upload
      if (!file.name.endsWith('.xml')) {
        return NextResponse.json(
          { error: 'Only XML files are allowed' },
          { status: 400 }
        );
      }

      xmlString = await file.text();
    } else {
      // Handle direct XML content
      xmlString = xmlContent;
    }

    // Parse edited invoice if provided
    let editedInvoice = null;
    
    if (editedInvoiceJson && hasEdits) {
      try {
        editedInvoice = JSON.parse(editedInvoiceJson);
      } catch (parseError) {
        console.error('Failed to parse edited invoice:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse edited invoice data' },
          { status: 400 }
        );
      }
    }

    // Import invoice using the database service
    const result = await InvoiceImportService.importInvoice(xmlString, editedInvoice);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.message,
          details: result.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      invoiceId: result.invoiceId,
      userId: result.userId,
      flightHoursId: result.flightHoursId
    });

  } catch (error) {
    console.error('Error importing XML invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const invoices = await InvoiceImportService.getImportedInvoices({
      status: status && status !== 'all' ? status : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });
    
    return NextResponse.json({
      success: true,
      invoices: invoices,
      total: invoices.length
    });

  } catch (error) {
    console.error('Error fetching imported invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
} 