import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

// GET /api/settings/icao-import - Download CSV template
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Simple token verification for template download
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Create CSV template content
    const csvContent = `manufacturer,model,typeDesignator,description,engineType,engineCount,wtc
Boeing,737,B738,Commercial airliner,TURBOFAN,2,MEDIUM
Airbus,A320,A320,Commercial airliner,TURBOFAN,2,MEDIUM
Cessna,172,C172,Light aircraft,PISTON,1,LIGHT
Piper,PA-28,PA28,Light aircraft,PISTON,1,LIGHT
Bombardier,CRJ-900,CRJ9,Regional jet,TURBOFAN,2,MEDIUM
Embraer,E-175,E175,Regional jet,TURBOFAN,2,MEDIUM`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="icao_aircraft_import_template.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/settings/icao-import - Import aircraft from CSV
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user has appropriate permissions
    if (!AuthService.hasPermission(userRoles, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Read and parse CSV file
    const fileText = await file.text();
    const lines = fileText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header and one data row' },
        { status: 400 }
      );
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    const results = {
      total: dataRows.length,
      success: 0,
      errors: [] as any[],
      details: [] as any[],
    };

    for (const row of dataRows) {
      try {
        const values = row.split(',').map(v => v.trim());
        const aircraftData: any = {};
        
        headers.forEach((header, index) => {
          aircraftData[header] = values[index] || '';
        });

        // Validate required fields
        if (!aircraftData.manufacturer || !aircraftData.model || !aircraftData.typeDesignator) {
          results.errors.push({
            row: dataRows.indexOf(row) + 2,
            error: 'Missing required fields (manufacturer, model, typeDesignator)',
            data: aircraftData
          });
          continue;
        }

        // Validate engine type
        const validEngineTypes = ['PISTON', 'TURBOFAN', 'TURBOPROP', 'TURBOSHAFT', 'ELECTRIC', 'HYBRID'];
        if (!validEngineTypes.includes(aircraftData.engineType)) {
          results.errors.push({
            row: dataRows.indexOf(row) + 2,
            error: `Invalid engine type: ${aircraftData.engineType}. Must be one of: ${validEngineTypes.join(', ')}`,
            data: aircraftData
          });
          continue;
        }

        // Validate WTC
        const validWtc = ['LIGHT', 'MEDIUM', 'HEAVY', 'SUPER'];
        if (!validWtc.includes(aircraftData.wtc)) {
          results.errors.push({
            row: dataRows.indexOf(row) + 2,
            error: `Invalid WTC: ${aircraftData.wtc}. Must be one of: ${validWtc.join(', ')}`,
            data: aircraftData
          });
          continue;
        }

        // Validate engine count
        const engineCount = parseInt(aircraftData.engineCount);
        if (isNaN(engineCount) || engineCount < 1 || engineCount > 10) {
          results.errors.push({
            row: dataRows.indexOf(row) + 2,
            error: `Invalid engine count: ${aircraftData.engineCount}. Must be between 1 and 10`,
            data: aircraftData
          });
          continue;
        }

        // Check if aircraft already exists
        const { data: existingAircraft, error: existingError } = await supabase
          .from('icao_reference_type')
          .select('id')
          .eq('manufacturer', aircraftData.manufacturer)
          .eq('model', aircraftData.model)
          .eq('typeDesignator', aircraftData.typeDesignator)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('Error checking existing aircraft:', existingError);
          results.errors.push({
            row: dataRows.indexOf(row) + 2,
            error: 'Database error checking existing aircraft',
            data: aircraftData
          });
          continue;
        }

        if (existingAircraft) {
          // Update existing aircraft
          const { error: updateError } = await supabase
            .from('icao_reference_type')
            .update({
              description: aircraftData.description || '',
              engineType: aircraftData.engineType,
              engineCount: engineCount,
              wtc: aircraftData.wtc,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', existingAircraft.id);

          if (updateError) {
            console.error('Error updating aircraft:', updateError);
            results.errors.push({
              row: dataRows.indexOf(row) + 2,
              error: 'Failed to update aircraft',
              data: aircraftData
            });
            continue;
          }

          results.success++;
          results.details.push({
            action: 'updated',
            manufacturer: aircraftData.manufacturer,
            model: aircraftData.model,
            typeDesignator: aircraftData.typeDesignator
          });
        } else {
          // Create new aircraft
          const { error: createError } = await supabase
            .from('icao_reference_type')
            .insert({
              id: crypto.randomUUID(),
              manufacturer: aircraftData.manufacturer,
              model: aircraftData.model,
              typeDesignator: aircraftData.typeDesignator,
              description: aircraftData.description || '',
              engineType: aircraftData.engineType,
              engineCount: engineCount,
              wtc: aircraftData.wtc,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

          if (createError) {
            console.error('Error creating aircraft:', createError);
            results.errors.push({
              row: dataRows.indexOf(row) + 2,
              error: 'Failed to create aircraft',
              data: aircraftData
            });
            continue;
          }

          results.success++;
          results.details.push({
            action: 'created',
            manufacturer: aircraftData.manufacturer,
            model: aircraftData.model,
            typeDesignator: aircraftData.typeDesignator
          });
        }
      } catch (error) {
        console.error('Error processing aircraft row:', error);
        results.errors.push({
          row: dataRows.indexOf(row) + 2,
          error: 'Unexpected error processing aircraft',
          data: row
        });
      }
    }

    return NextResponse.json({
      message: `Import completed. Success: ${results.success}, Errors: ${results.errors.length}`,
      results,
    });
  } catch (error: any) {
    console.error('Error importing aircraft:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
} 