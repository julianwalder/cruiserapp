import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Flight logs export API called');
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      console.log('❌ Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🔍 User authenticated:', decoded.userId);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get user with roles to check permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoles = user.user_roles.map((ur: any) => ur.roles.name);
    const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
    const isBaseManager = userRoles.includes('BASE_MANAGER');
    const isInstructor = userRoles.includes('INSTRUCTOR');
    const isPilot = userRoles.includes('PILOT');
    const isProspect = userRoles.includes('PROSPECT');

    // Block prospects from accessing flight logs
    if (isProspect) {
      console.log('❌ Prospect user attempted to export flight logs:', decoded.userId);
      return NextResponse.json({ 
        error: 'Access denied. Flight logs are not available for prospect users.' 
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const viewMode = searchParams.get('viewMode') || 'company';
    const userId = searchParams.get('userId') || '';
    const aircraftId = searchParams.get('aircraftId') || '';
    const instructorId = searchParams.get('instructorId') || '';
    const departureAirfieldId = searchParams.get('departureAirfieldId') || '';
    const arrivalAirfieldId = searchParams.get('arrivalAirfieldId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const format = searchParams.get('format') || 'csv';

    // Build query
    let query = supabase
      .from('flight_logs')
      .select('*');

    // Apply permission-based filtering based on viewMode
    if (viewMode === 'personal') {
      if (isPilot && !isInstructor && !isAdmin && !isBaseManager) {
        // Regular pilots can only see their own flight logs
        query = query.eq('userId', user.id);
      } else if (isInstructor && !isAdmin && !isBaseManager) {
        // Instructors can see logs where they are the instructor OR their own logs
        query = query.or(`instructorId.eq.${user.id},userId.eq.${user.id}`);
      } else if (isBaseManager && !isAdmin) {
        // Base managers see their own logs in personal view
        query = query.eq('userId', user.id);
      }
      // Admins see their own logs in personal view
      else if (isAdmin) {
        query = query.eq('userId', user.id);
      }
    }
    // In company view, all users can see all logs (for fleet management purposes)
    else if (viewMode === 'company') {
      // All users can see all logs in company view for fleet management
      console.log('✅ Company view - allowing access to all flight logs');
      // No additional filtering needed - they can see everything
    }
    
    // TEMPORARY: For debugging, let's bypass all filtering for SUPER_ADMIN
    if (userRoles.includes('SUPER_ADMIN')) {
      console.log('🔧 TEMPORARY: Bypassing all filtering for SUPER_ADMIN');
      // Reset the query to show all records (simple query to avoid relationship conflicts)
      query = supabase
        .from('flight_logs')
        .select('*');
    }

    // Apply filters
    if (userId) {
      query = query.eq('userId', userId);
    }

    if (aircraftId) {
      query = query.eq('aircraftId', aircraftId);
    }

    if (instructorId) {
      query = query.eq('instructorId', instructorId);
    }

    if (departureAirfieldId) {
      query = query.eq('departureAirfieldId', departureAirfieldId);
    }

    if (arrivalAirfieldId) {
      query = query.eq('arrivalAirfieldId', arrivalAirfieldId);
    }

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    // Execute the filtered query
    const { data: flightLogsData, error: flightLogsErrorData } = await query
      .order('date', { ascending: false })
      .order('departureTime', { ascending: false });

    if (flightLogsErrorData) {
      console.log('❌ Filtered query failed:', flightLogsErrorData);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    console.log('✅ Filtered query succeeded, got', flightLogsData?.length, 'records for export');
      
    // Now apply manual joins to get related data
    try {
      console.log('🔍 Enriching data with manual joins for export...');
      
      // Get all the IDs we need for relationships
      const aircraftIds = [...new Set(flightLogsData?.map(log => log.aircraftId) || [])];
      const pilotIds = [...new Set(flightLogsData?.map(log => log.userId) || [])];
      const instructorIds = [...new Set(flightLogsData?.map(log => log.instructorId).filter(Boolean) || [])];
      const airfieldIds = [...new Set([
        ...(flightLogsData?.map(log => log.departureAirfieldId) || []),
        ...(flightLogsData?.map(log => log.arrivalAirfieldId) || [])
      ])];

      // Fetch all related data
      const [aircraftData, pilotsData, instructorsData, airfieldsData] = await Promise.all([
        aircraftIds.length > 0 ? supabase.from('aircraft').select(`
          *,
          icao_reference_type (
            *
          )
        `).in('id', aircraftIds) : { data: [], error: null },
        pilotIds.length > 0 ? supabase.from('users').select('*').in('id', pilotIds) : { data: [], error: null },
        instructorIds.length > 0 ? supabase.from('users').select('*').in('id', instructorIds) : { data: [], error: null },
        airfieldIds.length > 0 ? supabase.from('airfields').select('*').in('id', airfieldIds) : { data: [], error: null }
      ]);

      // Create lookup maps
      const aircraftMap = new Map(aircraftData.data?.map(ac => [ac.id, ac]) || []);
      const pilotsMap = new Map(pilotsData.data?.map(p => [p.id, p]) || []);
      const instructorsMap = new Map(instructorsData.data?.map(i => [i.id, i]) || []);
      const airfieldsMap = new Map(airfieldsData.data?.map(af => [af.id, af]) || []);

      // Combine the data
      const enrichedFlightLogs = flightLogsData?.map(log => {
        const aircraft = aircraftMap.get(log.aircraftId);
        const pilot = pilotsMap.get(log.userId);
        const instructor = log.instructorId ? instructorsMap.get(log.instructorId) : null;
        const departureAirfield = airfieldsMap.get(log.departureAirfieldId);
        const arrivalAirfield = airfieldsMap.get(log.arrivalAirfieldId);
        
        return {
          ...log,
          aircraft: aircraft ? {
            ...aircraft,
            icaoReferenceType: aircraft.icao_reference_type ? {
              id: aircraft.icao_reference_type.id,
              typeDesignator: aircraft.icao_reference_type.typeDesignator,
              model: aircraft.icao_reference_type.model,
              manufacturer: aircraft.icao_reference_type.manufacturer
            } : null
          } : null,
          pilot,
          instructor,
          departureAirfield,
          arrivalAirfield
        };
      }) || [];

      console.log('✅ Manual joins succeeded for export, generating CSV...');

      // Generate CSV content
      const csvHeaders = [
        'Date',
        'Departure Time',
        'Arrival Time',
        'Aircraft Model',
        'Aircraft Registration',
        'Pilot',
        'Instructor',
        'Departure Airfield',
        'Arrival Airfield',
        'Flight Type',
        'Total Hours',
        'PIC Time',
        'Dual Time',
        'Solo Time',
        'Cross Country',
        'Night',
        'Instrument',
        'Day Landings',
        'Night Landings',
        'Purpose',
        'Remarks',
        'Route',
        'Conditions'
      ];

      let csvContent = csvHeaders.join(',') + '\n';

      enrichedFlightLogs.forEach((log) => {
        const row = [
          log.date || '',
          log.departureTime || '',
          log.arrivalTime || '',
          log.aircraft?.icaoReferenceType?.typeDesignator || '',
          log.aircraft?.callSign || '',
          log.pilot ? `${log.pilot.firstName} ${log.pilot.lastName}` : '',
          log.instructor ? `${log.instructor.firstName} ${log.instructor.lastName}` : '',
          log.departureAirfield?.code || '',
          log.arrivalAirfield?.code || '',
          log.flightType || '',
          log.totalHours?.toString() || '',
          log.pilotInCommand?.toString() || '',
          log.dualReceived?.toString() || '',
          log.solo?.toString() || '',
          log.crossCountry?.toString() || '',
          log.night?.toString() || '',
          log.instrument?.toString() || '',
          log.dayLandings?.toString() || '',
          log.nightLandings?.toString() || '',
          log.purpose || '',
          log.remarks || '',
          log.route || '',
          log.conditions || ''
        ].map(field => `"${field || ''}"`).join(',');
        
        csvContent += row + '\n';
      });

      console.log('✅ CSV generated successfully');

      // Return CSV file
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="flight_logs_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
      
    } catch (enrichError) {
      console.log('❌ Manual joins failed for export, returning simple data:', enrichError);
      
      // Fallback to simple CSV without enriched data
      const csvHeaders = [
        'Date',
        'Departure Time',
        'Arrival Time',
        'Aircraft ID',
        'Pilot ID',
        'Instructor ID',
        'Departure Airfield ID',
        'Arrival Airfield ID',
        'Flight Type',
        'Total Hours',
        'Purpose',
        'Remarks'
      ];

      let csvContent = csvHeaders.join(',') + '\n';

      flightLogsData?.forEach((log) => {
        const row = [
          log.date || '',
          log.departureTime || '',
          log.arrivalTime || '',
          log.aircraftId || '',
          log.userId || '',
          log.instructorId || '',
          log.departureAirfieldId || '',
          log.arrivalAirfieldId || '',
          log.flightType || '',
          log.totalHours?.toString() || '',
          log.purpose || '',
          log.remarks || ''
        ].map(field => `"${field || ''}"`).join(',');
        
        csvContent += row + '\n';
      });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="flight_logs_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting flight logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
