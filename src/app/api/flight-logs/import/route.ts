import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { updateAircraftHobbs } from '@/lib/aircraft-hobbs';
import { parse } from 'csv-parse/sync';

// Global storage for import progress (in production, use Redis or similar)
(global as any).flightLogsImportProgress = (global as any).flightLogsImportProgress || {};
const importProgress = (global as any).flightLogsImportProgress;

// GET - Download CSV template
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get user with roles to check permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        userRoles (
          role (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is super admin
    const isSuperAdmin = user.userRoles.some((ur: any) => ur.role.name === 'SUPER_ADMIN');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    // Create CSV template content
    const csvContent = `date,pilot_email,aircraft_callsign,departure_airfield_code,arrival_airfield_code,departure_time,arrival_time,instructor_email,flight_type,purpose,remarks,departure_hobbs,arrival_hobbs,day_landings,night_landings,route,conditions,oil_added,fuel_added
# Note: Airfields not in the database will be automatically created as "Historical Airfield" records
2024-01-15,john.doe@example.com,YR-ABC,LRBS,LRCL,09:30,10:45,jane.instructor@example.com,SCHOOL,Pattern work,Good landing practice,1234.5,1235.8,3,0,Local pattern,CAVOK,0,0
2024-01-16,john.doe@example.com,YR-ABC,LRCL,LRBS,14:00,15:30,jane.instructor@example.com,INVOICED,Cross country,First cross country flight,1235.8,1237.3,2,0,LRCL-LRBS,Good visibility,0,0
2024-01-17,john.doe@example.com,YR-ABC,LRBS,LRBS,16:00,16:30,jane.instructor@example.com,PROMO,Introductory flight,Free trial flight for potential student,1237.3,1237.8,1,0,Local area,CAVOK,0,0`;

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="flight_logs_import_template.csv"',
      },
    });
  } catch (error) {
    logger.error('Error generating flight logs template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Import flight logs from CSV
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get user with roles to check permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        userRoles (
          role (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is super admin
    const isSuperAdmin = user.userRoles.some((ur: any) => ur.role.name === 'SUPER_ADMIN');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read and parse CSV file using proper CSV parsing
    const text = await file.text();
    
    // Use proper CSV parsing instead of simple split
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    const dataRows = records;

    // Generate import ID for progress tracking
    const importId = `flight-logs-${Date.now()}`;
    
    const results = {
      success: 0,
      errors: [] as string[],
      skipped: 0, // Add skipped count
      total: dataRows.length,
      details: [] as Array<{
        row: number;
        status: 'success' | 'error' | 'skipped';
        message: string;
        date?: string;
        pilot?: string;
        aircraft?: string;
        departure?: string;
        arrival?: string;
      }>
    };

    // Initialize progress
    importProgress[importId] = {
      current: 0,
      total: dataRows.length,
      percentage: 0,
      status: 'Starting import...',
      completed: false,
      results: null,
    };

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const rowData = dataRows[i] as any;
      const rowNumber = i + 2; // +2 because we start from line 2 (after header)
      
      try {
        // Validate required fields
        if (!rowData.date || !rowData.pilot_email || !rowData.aircraft_callsign || 
            !rowData.departure_airfield_code || !rowData.arrival_airfield_code || 
            !rowData.departure_time || !rowData.arrival_time) {
          throw new Error('Missing required fields');
        }

        // Find pilot by email
        const { data: pilot, error: pilotError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', rowData.pilot_email)
          .single();

        if (pilotError || !pilot) {
          throw new Error(`Pilot with email ${rowData.pilot_email} not found`);
        }

        // Find aircraft by call sign
        const { data: aircraft, error: aircraftError } = await supabase
          .from('aircraft')
          .select('id, callSign')
          .eq('callSign', rowData.aircraft_callsign)
          .single();

        if (aircraftError || !aircraft) {
          throw new Error(`Aircraft with call sign ${rowData.aircraft_callsign} not found`);
        }

        // Find departure airfield by code - create if not exists for historical data
        let { data: departureAirfield, error: departureError } = await supabase
          .from('airfield')
          .select('id, code')
          .eq('code', rowData.departure_airfield_code)
          .single();

        if (departureError || !departureAirfield) {
          // Create a temporary airfield for historical data
          const { data: newDepartureAirfield, error: createDepartureError } = await supabase
            .from('airfield')
            .insert({
              name: `Historical Airfield - ${rowData.departure_airfield_code}`,
              code: rowData.departure_airfield_code,
              type: 'AIRPORT', // Default type
              status: 'INACTIVE', // Mark as inactive since it's historical
              city: 'Unknown',
              country: 'Unknown',
              isBase: false,
              createdById: user.id,
            })
            .select('id, code')
            .single();

          if (createDepartureError || !newDepartureAirfield) {
            throw new Error(`Failed to create departure airfield ${rowData.departure_airfield_code}`);
          }
          departureAirfield = newDepartureAirfield;
        }

        // Find arrival airfield by code - create if not exists for historical data
        let { data: arrivalAirfield, error: arrivalError } = await supabase
          .from('airfield')
          .select('id, code')
          .eq('code', rowData.arrival_airfield_code)
          .single();

        if (arrivalError || !arrivalAirfield) {
          // Create a temporary airfield for historical data
          const { data: newArrivalAirfield, error: createArrivalError } = await supabase
            .from('airfield')
            .insert({
              name: `Historical Airfield - ${rowData.arrival_airfield_code}`,
              code: rowData.arrival_airfield_code,
              type: 'AIRPORT', // Default type
              status: 'INACTIVE', // Mark as inactive since it's historical
              city: 'Unknown',
              country: 'Unknown',
              isBase: false,
              createdById: user.id,
            })
            .select('id, code')
            .single();

          if (createArrivalError || !newArrivalAirfield) {
            throw new Error(`Failed to create arrival airfield ${rowData.arrival_airfield_code}`);
          }
          arrivalAirfield = newArrivalAirfield;
        }

        // Find instructor by email (optional)
        let instructor = null;
        if (rowData.instructor_email) {
          const { data: instructorData, error: instructorError } = await supabase
            .from('users')
            .select(`
              id,
              userRoles (
                role (
                  name
                )
              )
            `)
            .eq('email', rowData.instructor_email)
            .single();

          if (instructorError || !instructorData) {
            throw new Error(`Instructor with email ${rowData.instructor_email} not found`);
          }
          instructor = instructorData;
        }

        // Calculate total flight time
        const departureTime = new Date(`2000-01-01T${rowData.departure_time}:00`);
        const arrivalTime = new Date(`2000-01-01T${rowData.arrival_time}:00`);
        const totalHours = (arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);

        // Calculate time fields automatically based on instructor presence and flight type
        const hasInstructor = !!instructor;
        const isCrossCountry = departureAirfield.code !== arrivalAirfield.code;
        
        // Default time calculations
        let pilotInCommand = 0;
        let secondInCommand = 0;
        let dualReceived = 0;
        let dualGiven = 0;
        let solo = 0;
        let crossCountry = 0;
        let night = 0;
        let instrument = 0;
        let actualInstrument = 0;
        let simulatedInstrument = 0;

        if (hasInstructor) {
          // If there's an instructor, it's dual received time
          dualReceived = totalHours;
          pilotInCommand = 0; // Instructor is PIC
        } else {
          // If no instructor, it's solo time and pilot is PIC
          solo = totalHours;
          pilotInCommand = totalHours;
        }

        // Cross country time if different airfields
        if (isCrossCountry) {
          crossCountry = totalHours;
        }

        // Check for existing flight log to prevent duplicates
        const { data: existingFlightLog } = await supabase
          .from('flight_logs')
          .select('id')
          .eq('date', new Date(rowData.date).toISOString())
          .eq('pilotId', pilot.id)
          .eq('aircraftId', aircraft.id)
          .eq('departureTime', rowData.departure_time)
          .eq('arrivalTime', rowData.arrival_time)
          .eq('departureAirfieldId', departureAirfield.id)
          .eq('arrivalAirfieldId', arrivalAirfield.id)
          .single();

        if (existingFlightLog) {
          // Skip this row as it already exists
          results.skipped++;
          results.details.push({
            row: rowNumber,
            status: 'skipped',
            message: 'Flight log already exists (duplicate detected)',
            date: rowData.date,
            pilot: pilot.email,
            aircraft: aircraft.callSign,
            departure: departureAirfield.code,
            arrival: arrivalAirfield.code,
          });
          continue; // Skip to next row
        }

        // Create flight log
        const { data: flightLog, error: createError } = await supabase
          .from('flight_logs')
          .insert({
            date: new Date(rowData.date).toISOString(),
            pilotId: pilot.id,
            instructorId: instructor?.id,
            payer_id: null, // Import doesn't support payer_id yet - can be added later if needed
            aircraftId: aircraft.id,
            departureAirfieldId: departureAirfield.id,
            arrivalAirfieldId: arrivalAirfield.id,
            departureTime: rowData.departure_time,
            arrivalTime: rowData.arrival_time,
            departureHobbs: rowData.departure_hobbs ? parseFloat(rowData.departure_hobbs) : null,
            arrivalHobbs: rowData.arrival_hobbs ? parseFloat(rowData.arrival_hobbs) : null,
            flightType: (rowData.flight_type || 'SCHOOL').toUpperCase(),
            purpose: rowData.purpose || null,
            remarks: rowData.remarks || null,
            totalHours: Math.max(0, totalHours),
            pilotInCommand,
            secondInCommand,
            dualReceived,
            dualGiven,
            solo,
            crossCountry,
            night,
            instrument,
            actualInstrument,
            simulatedInstrument,
            dayLandings: rowData.day_landings ? parseInt(rowData.day_landings) : 0,
            nightLandings: rowData.night_landings ? parseInt(rowData.night_landings) : 0,
            route: rowData.route || null,
            conditions: rowData.conditions || null,
            oilAdded: rowData.oil_added ? parseInt(rowData.oil_added) : 0,
            fuelAdded: rowData.fuel_added ? parseInt(rowData.fuel_added) : 0,
            createdById: user.id,
          })
          .select('id')
          .single();

        if (createError) {
          throw new Error(`Failed to create flight log: ${createError.message}`);
        }

        // Update aircraft hobbs data if arrival hobbs is provided
        if (rowData.arrival_hobbs) {
          try {
            await updateAircraftHobbs(
              aircraft.id, 
              flightLog.id, 
              parseFloat(rowData.arrival_hobbs), 
              new Date(rowData.date).toISOString()
            );
          } catch (hobbsError) {
            logger.error('Error updating aircraft hobbs during import:', hobbsError);
            // Don't fail the import if hobbs update fails
          }
        }

        results.success++;
        results.details.push({
          row: rowNumber,
          status: 'success',
          message: 'Flight log created successfully',
          date: rowData.date,
          pilot: pilot.email,
          aircraft: aircraft.callSign,
          departure: departureAirfield.code,
          arrival: arrivalAirfield.code,
        });

      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error occurred';
        results.errors.push(`Row ${rowNumber}: ${errorMessage}`);
        results.details.push({
          row: rowNumber,
          status: 'error',
          message: errorMessage,
        });
      }

      // Update progress
      importProgress[importId].current = i + 1;
      importProgress[importId].percentage = Math.round(((i + 1) / dataRows.length) * 100);
      importProgress[importId].status = `Processing row ${i + 1} of ${dataRows.length}...`;
    }

    // Mark as completed
    importProgress[importId].completed = true;
    importProgress[importId].results = results;
    importProgress[importId].status = 'Import completed';

    // Save import summary
    const importSummary = {
      date: new Date().toISOString(),
      totalImported: results.success,
      totalErrors: results.errors.length,
      totalSkipped: results.skipped,
      lastImportDate: new Date().toISOString(),
      total: results.total,
    };

    // Save to import summary endpoint
    try {
      await fetch(`${request.nextUrl.origin}/api/flight-logs/import-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importSummary),
      });
    } catch (error) {
      logger.error('Error saving import summary:', error);
    }

    // Clean up progress data after 5 minutes
    setTimeout(() => {
      delete importProgress[importId];
    }, 5 * 60 * 1000);

    const message = results.success > 0 
      ? `Successfully imported ${results.success} flight logs${results.skipped > 0 ? `, skipped ${results.skipped} duplicates` : ''}${results.errors.length > 0 ? `, ${results.errors.length} errors` : ''}`
      : results.skipped > 0 
        ? `Skipped ${results.skipped} duplicates${results.errors.length > 0 ? `, ${results.errors.length} errors` : ''}`
        : `Import failed with ${results.errors.length} errors`;

    return NextResponse.json({
      message,
      results,
      importId,
    });

  } catch (error) {
    logger.error('Error importing flight logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 