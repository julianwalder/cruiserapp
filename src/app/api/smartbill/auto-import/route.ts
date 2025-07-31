import { NextRequest, NextResponse } from 'next/server';
import { InvoiceImportService } from '@/lib/invoice-import-service';
import { SmartbillPDFParser } from '@/lib/smartbill-pdf-parser';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cif = searchParams.get('cif') || process.env.SMARTBILL_CIF;
    const seriesName = searchParams.get('seriesName') || 'CA';
    const startNumber = parseInt(searchParams.get('startNumber') || '750');
    const endNumber = parseInt(searchParams.get('endNumber') || '800');
    const dryRun = searchParams.get('dryRun') === 'true';

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
    
    console.log(`Starting automated import for range ${startNumber}-${endNumber}...`);
    
    const discoveredInvoices = [];
    const importResults = [];
    const errors = [];

    // Step 1: Discover invoices
    for (let number = startNumber; number <= endNumber; number++) {
      const paddedNumber = number.toString().padStart(4, '0');
      const pdfUrl = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cif}&seriesname=${seriesName}&number=${paddedNumber}`;
      
      try {
        const requestOptions: RequestInit = {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json, */*',
            'User-Agent': 'CruiserApp/1.0',
          },
        };

        const response = await fetch(pdfUrl, requestOptions);
        
        if (response.ok) {
          const textResponse = await response.text();
          if (textResponse.startsWith('%PDF')) {
            discoveredInvoices.push({
              series: seriesName,
              number: paddedNumber,
              fullNumber: `${seriesName}${paddedNumber}`,
              url: pdfUrl,
              size: `${(textResponse.length / 1024).toFixed(2)} KB`,
              pdfContent: textResponse,
              status: 'Found'
            });
            console.log(`✅ Found invoice: ${seriesName}${paddedNumber}`);
          }
        }
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Error checking ${seriesName}${paddedNumber}: ${error}`);
        errors.push({
          invoice: `${seriesName}${paddedNumber}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          type: 'Discovery Error'
        });
      }
    }

    console.log(`Discovered ${discoveredInvoices.length} invoices`);

    // Step 2: Check which invoices are already imported
    const existingInvoices = await InvoiceImportService.getImportedInvoices();
    const existingInvoiceNumbers = existingInvoices.map(inv => inv.smartbill_id);

    const newInvoices = discoveredInvoices.filter(invoice => 
      !existingInvoiceNumbers.includes(invoice.fullNumber)
    );

    console.log(`Found ${newInvoices.length} new invoices to import`);

    // Step 3: Import new invoices (if not dry run)
    if (!dryRun && newInvoices.length > 0) {
      for (const invoice of newInvoices) {
        try {
          console.log(`Importing ${invoice.fullNumber}...`);
          
          // Convert PDF to XML using the Smartbill PDF parser
          const xmlContent = SmartbillPDFParser.generateBasicXML(invoice.fullNumber);
          
          const importResult = await InvoiceImportService.importInvoice(xmlContent);
          
          if (importResult.success) {
            importResults.push({
              invoice: invoice.fullNumber,
              status: 'Imported',
              invoiceId: importResult.invoiceId,
              message: importResult.message
            });
            console.log(`✅ Successfully imported ${invoice.fullNumber}`);
          } else {
            importResults.push({
              invoice: invoice.fullNumber,
              status: 'Failed',
              error: importResult.message
            });
            console.log(`❌ Failed to import ${invoice.fullNumber}: ${importResult.message}`);
          }
          
          // Add delay between imports
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.log(`❌ Error importing ${invoice.fullNumber}: ${error}`);
          importResults.push({
            invoice: invoice.fullNumber,
            status: 'Error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    const summary = {
      totalDiscovered: discoveredInvoices.length,
      alreadyImported: discoveredInvoices.length - newInvoices.length,
      newInvoices: newInvoices.length,
      successfullyImported: importResults.filter(r => r.status === 'Imported').length,
      failedImports: importResults.filter(r => r.status === 'Failed' || r.status === 'Error').length,
      dryRun: dryRun
    };

    return NextResponse.json({
      importParameters: {
        cif: cif,
        seriesName: seriesName,
        startNumber: startNumber,
        endNumber: endNumber,
        range: `${startNumber}-${endNumber}`,
        dryRun: dryRun
      },
      summary: summary,
      discoveredInvoices: discoveredInvoices.map(inv => ({
        series: inv.series,
        number: inv.number,
        fullNumber: inv.fullNumber,
        size: inv.size,
        alreadyImported: existingInvoiceNumbers.includes(inv.fullNumber)
      })),
      importResults: importResults,
      errors: errors,
      recommendations: [
        `Discovered ${discoveredInvoices.length} invoices in range ${startNumber}-${endNumber}`,
        `${newInvoices.length} new invoices found for import`,
        `${summary.successfullyImported} invoices successfully imported`,
        dryRun ? 'This was a dry run - no actual imports were performed' : 'Import completed'
      ]
    });

  } catch (error) {
    console.error('SmartBill auto-import error:', error);
    return NextResponse.json(
      { 
        error: 'SmartBill auto-import failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
}

 