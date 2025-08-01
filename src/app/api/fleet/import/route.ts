import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded.roles.includes('ADMIN') && !decoded.roles.includes('BASE_MANAGER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create CSV template
    const csvTemplate = `callSign,serialNumber,yearOfManufacture,icaoTypeDesignator,model,manufacturer,status,imagePath
YR-ZCK,456789,2021,CRUZ,SportCruiser,CSA,ACTIVE,/uploads/cruz.jpg
YR-ABC,123456,2020,CRUZ,PS-28 Cruiser,CAG (2),ACTIVE,/uploads/cruz2.jpg
YR-DEF,789012,2019,CRUZ,PiperSport,PIPER,ACTIVE,/uploads/cruz3.jpg`;

    return new NextResponse(csvTemplate, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="fleet-import-template.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded.roles.includes('ADMIN') && !decoded.roles.includes('BASE_MANAGER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'text/csv') {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    // Read and parse CSV
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must contain at least a header and one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    // Validate headers
    const requiredHeaders = ['callSign', 'serialNumber', 'yearOfManufacture', 'icaoTypeDesignator', 'model', 'manufacturer', 'status'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: `Missing required headers: ${missingHeaders.join(', ')}` 
      }, { status: 400 });
    }

    let imported = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const values = row.split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors++;
        errorDetails.push(`Row ${i + 2}: Column count mismatch`);
        continue;
      }

      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });

      try {
        // Validate required fields
        if (!rowData.callSign || !rowData.serialNumber || !rowData.yearOfManufacture || 
            !rowData.icaoTypeDesignator || !rowData.model || !rowData.manufacturer || !rowData.status) {
          errors++;
          errorDetails.push(`Row ${i + 2}: Missing required fields`);
          continue;
        }

        // Validate year
        const year = parseInt(rowData.yearOfManufacture);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
          errors++;
          errorDetails.push(`Row ${i + 2}: Invalid year of manufacture`);
          continue;
        }

        // Validate status
        const validStatuses = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED'];
        if (!validStatuses.includes(rowData.status)) {
          errors++;
          errorDetails.push(`Row ${i + 2}: Invalid status. Must be one of: ${validStatuses.join(', ')}`);
          continue;
        }

        // Check if aircraft already exists
        const { data: existingAircraft } = await supabase
          .from('aircraft')
          .select('id')
          .or(`callSign.eq.${rowData.callSign},serialNumber.eq.${rowData.serialNumber}`)
          .limit(1);

        if (existingAircraft && existingAircraft.length > 0) {
          errors++;
          errorDetails.push(`Row ${i + 2}: Aircraft with call sign ${rowData.callSign} or serial number ${rowData.serialNumber} already exists`);
          continue;
        }

        // Find ICAO reference type
        const { data: icaoRef } = await supabase
          .from('icao_reference_type')
          .select('id')
          .eq('typeDesignator', rowData.icaoTypeDesignator)
          .eq('manufacturer', rowData.manufacturer)
          .eq('model', rowData.model)
          .single();

        if (!icaoRef) {
          errors++;
          errorDetails.push(`Row ${i + 2}: ICAO reference type not found for ${rowData.icaoTypeDesignator} - ${rowData.manufacturer} ${rowData.model}`);
          continue;
        }

        // Create aircraft
        const { error: createError } = await supabase
          .from('aircraft')
          .insert({
            callSign: rowData.callSign,
            serialNumber: rowData.serialNumber,
            yearOfManufacture: year,
            icaoReferenceTypeId: icaoRef.id,
            status: rowData.status,
            imagePath: rowData.imagePath || null,
          });

        if (createError) {
          errors++;
          errorDetails.push(`Row ${i + 2}: ${createError.message}`);
          continue;
        }

        imported++;
      } catch (error) {
        errors++;
        errorDetails.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const summary = {
      total: dataRows.length,
      imported,
      errors,
      details: errorDetails
    };

    return NextResponse.json({
      success: true,
      message: `Fleet import completed. ${imported} aircraft imported successfully, ${errors} errors.`,
      summary
    });

  } catch (error) {
    console.error('Error importing fleet:', error);
    return NextResponse.json({ 
      error: 'Failed to import fleet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 