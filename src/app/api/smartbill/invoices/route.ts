import { NextRequest, NextResponse } from 'next/server';
import { SmartBillService } from '@/lib/smartbill-service';
import { InvoiceImportService } from '@/lib/invoice-import-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const useImported = searchParams.get('useImported') === 'true';

    // Get SmartBill credentials from environment variables
    const username = process.env.SMARTBILL_USERNAME;
    const password = process.env.SMARTBILL_PASSWORD;
    const cif = process.env.SMARTBILL_CIF;

    if (!username || !password) {
      return NextResponse.json(
        { 
          error: 'SmartBill credentials not configured',
          message: 'Please set SMARTBILL_USERNAME and SMARTBILL_PASSWORD environment variables',
          fallback: 'Using imported invoices instead'
        },
        { status: 500 }
      );
    }

    // If explicitly requested to use imported data, skip API call
    if (useImported) {
      const importedInvoices = await InvoiceImportService.getImportedInvoices();
      return NextResponse.json({ 
        invoices: importedInvoices,
        source: 'imported',
        total: importedInvoices.length,
        message: 'Using imported invoice data'
      });
    }

    const smartbill = new SmartBillService({
      username,
      password,
      cif,
      timeout: 30000,
      retries: 2
    });

    try {
      // Try to get invoices from SmartBill API
      const invoices = await smartbill.getInvoices(
        startDate || undefined,
        endDate || undefined,
        status || undefined
      );

      return NextResponse.json({ 
        invoices,
        source: 'api',
        total: invoices.length,
        message: 'Successfully fetched from SmartBill API'
      });
    } catch (apiError) {
      console.error('SmartBill API error:', apiError);
      
      // Fallback to imported invoices
      try {
        const importedInvoices = await InvoiceImportService.getImportedInvoices();
        
        return NextResponse.json({ 
          invoices: importedInvoices,
          source: 'imported',
          total: importedInvoices.length,
          message: 'API unavailable, using imported invoice data',
          apiError: {
            message: apiError instanceof Error ? apiError.message : 'Unknown API error',
            code: apiError instanceof Error && 'code' in apiError ? (apiError as any).code : 'UNKNOWN'
          }
        });
      } catch (importError) {
        console.error('Failed to get imported invoices:', importError);
        return NextResponse.json(
          { 
            error: 'Failed to fetch invoices from both API and imported data',
            apiError: apiError instanceof Error ? apiError.message : 'Unknown API error',
            importError: importError instanceof Error ? importError.message : 'Unknown import error'
          },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('Error fetching SmartBill invoices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoices',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 