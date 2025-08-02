import { NextRequest, NextResponse } from 'next/server';
import { XMLInvoiceParser } from '@/lib/xml-invoice-parser';
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
      xmlString = await file.text();
    } else {
      xmlString = xmlContent;
    }

    // Parse edited invoice if provided
    let editedInvoice = null;
    if (editedInvoiceJson && hasEdits) {
      try {
        editedInvoice = JSON.parse(editedInvoiceJson);
      } catch (parseError) {
        return NextResponse.json({
          step: 'edited_invoice_parsing',
          success: false,
          error: 'Failed to parse edited invoice data'
        });
      }
    }

    // Step 1: Validate XML
    const validation = XMLInvoiceParser.validateXMLInvoice(xmlString);
    if (!validation.isValid) {
      return NextResponse.json({
        step: 'validation',
        success: false,
        errors: validation.errors
      });
    }

    // Step 2: Parse XML
    let parsedInvoice;
    try {
      parsedInvoice = await XMLInvoiceParser.parseXMLInvoice(xmlString);
    } catch (parseError) {
      return NextResponse.json({
        step: 'parsing',
        success: false,
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      });
    }

    // Step 3: Check existing invoice
    try {
      const existingInvoice = await InvoiceImportService['checkExistingInvoice'](parsedInvoice.id);
      if (existingInvoice) {
        return NextResponse.json({
          step: 'duplicate_check',
          success: false,
          error: `Invoice ${parsedInvoice.id} already exists in the database`
        });
      }
    } catch (checkError) {
      return NextResponse.json({
        step: 'duplicate_check',
        success: false,
        error: checkError instanceof Error ? checkError.message : 'Unknown error checking existing invoice'
      });
    }

    // Step 4: Try to import
    try {
      const result = await InvoiceImportService.importInvoice(xmlString, editedInvoice);
      
      if (result.success) {
        return NextResponse.json({
          step: 'import',
          success: true,
          message: result.message,
          invoiceId: result.invoiceId,
          userId: result.userId,
          companyId: result.companyId,
          isPPL: result.isPPL,
          pplHoursPaid: result.pplHoursPaid
        });
      } else {
        return NextResponse.json({
          step: 'import',
          success: false,
          error: result.message,
          details: result.errors
        });
      }
    } catch (importError) {
      return NextResponse.json({
        step: 'import',
        success: false,
        error: importError instanceof Error ? importError.message : 'Unknown import error'
      });
    }

  } catch (error) {
    console.error('Debug import error:', error);
    return NextResponse.json(
      { 
        step: 'general',
        error: 'Failed to process import',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 