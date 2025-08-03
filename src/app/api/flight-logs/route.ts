import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
import { ActivityLogger } from '@/lib/activity-logger';
import crypto from 'crypto';
import { UUID } from '@/types/uuid-types';


export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Flight logs API called');
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

    console.log('🔍 User roles:', userRoles);
    console.log('🔍 Permissions - Admin:', isAdmin, 'BaseManager:', isBaseManager, 'Instructor:', isInstructor, 'Pilot:', isPilot);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const flightType = searchParams.get('flightType') || '';
    const pilotId = searchParams.get('pilotId') || '';
    const aircraftId = searchParams.get('aircraftId') || '';
    const instructorId = searchParams.get('instructorId') || '';
    const departureAirfieldId = searchParams.get('departureAirfieldId') || '';
    const arrivalAirfieldId = searchParams.get('arrivalAirfieldId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const viewMode = searchParams.get('viewMode') || 'personal';

    const skip = (page - 1) * limit;

    // Build query - use the correct table name
    let query;
    const tableName = 'flight_logs'; // Your table is named flight_logs
    
    console.log('✅ Using table name: flight_logs');
    
    // For now, let's use a simple query without relationships to get the basic data working
    query = supabase
      .from(tableName)
      .select('*');

    // Apply permission-based filtering based on viewMode
    if (viewMode === 'personal') {
      if (isPilot && !isInstructor && !isAdmin && !isBaseManager) {
        // Regular pilots can only see their own flight logs
        query = query.eq('pilotId', user.id);
      } else if (isInstructor && !isAdmin && !isBaseManager) {
        // Instructors can see logs where they are the instructor OR their own logs
        query = query.or(`instructorId.eq.${user.id},pilotId.eq.${user.id}`);
      } else if (isBaseManager && !isAdmin) {
        // Base managers see their own logs in personal view
        query = query.eq('pilotId', user.id);
      }
      // Admins see their own logs in personal view
      else if (isAdmin) {
        query = query.eq('pilotId', user.id);
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
      // Reset the query to show all records
      query = supabase
        .from('flight_logs')
        .select('*');
    }
    
    // Debug logging
    console.log('🔍 Flight Logs API Debug:');
    console.log('👤 User ID:', user.id);
    console.log('👤 User roles:', userRoles);
    console.log('👤 Is Admin:', isAdmin);
    console.log('👤 Is Instructor:', isInstructor);
    console.log('👤 Is Base Manager:', isBaseManager);
    console.log('👤 Is Pilot:', isPilot);
    console.log('👤 View Mode:', viewMode);

    if (search) {
      query = query.or(`pilot.firstName.ilike.%${search}%,pilot.lastName.ilike.%${search}%,aircraft.callSign.ilike.%${search}%,purpose.ilike.%${search}%`);
    }

    if (flightType) {
      query = query.eq('flightType', flightType);
    }

    if (pilotId) {
      query = query.eq('pilotId', pilotId);
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

    // Get flight logs with related data, sorted by date (descending) then by departure time (descending)
    const { data: flightLogs, error: flightLogsError } = await query
      .order('date', { ascending: false })
      .order('departureTime', { ascending: false })
      .range(skip, skip + limit - 1);

    // Get total count for pagination (after applying filters)
    // Create a separate query for counting (without range/limit)
    let countQuery = supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Apply the same filters to the count query
    // TEMPORARY: For debugging, let's bypass all filtering for SUPER_ADMIN in count query too
    if (userRoles.includes('SUPER_ADMIN')) {
      console.log('🔧 TEMPORARY: Bypassing all filtering for SUPER_ADMIN in count query');
      // Reset the count query to show all records
      countQuery = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
    } else {
      if (viewMode === 'personal') {
        if (isPilot && !isInstructor && !isAdmin && !isBaseManager) {
          countQuery.eq('pilotId', user.id);
        } else if (isInstructor && !isAdmin && !isBaseManager) {
          countQuery.or(`instructorId.eq.${user.id},pilotId.eq.${user.id}`);
        } else if (isBaseManager && !isAdmin) {
          countQuery.eq('pilotId', user.id);
        } else if (isAdmin) {
          countQuery.eq('pilotId', user.id);
        }
      }
    }

    if (search) {
      countQuery.or(`pilot.firstName.ilike.%${search}%,pilot.lastName.ilike.%${search}%,aircraft.callSign.ilike.%${search}%,purpose.ilike.%${search}%`);
    }

    if (flightType) {
      countQuery.eq('flightType', flightType);
    }

    if (pilotId) {
      countQuery.eq('pilotId', pilotId);
    }

    if (aircraftId) {
      countQuery.eq('aircraftId', aircraftId);
    }

    if (instructorId) {
      countQuery.eq('instructorId', instructorId);
    }

    if (departureAirfieldId) {
      countQuery.eq('departureAirfieldId', departureAirfieldId);
    }

    if (arrivalAirfieldId) {
      countQuery.eq('arrivalAirfieldId', arrivalAirfieldId);
    }

    if (dateFrom) {
      countQuery.gte('date', dateFrom);
    }

    if (dateTo) {
      countQuery.lte('date', dateTo);
    }

    const { count: total } = await countQuery;

    console.log('📊 Total flight logs after filtering:', total);

    console.log('🔍 Flight logs query result:', {
      dataCount: flightLogs?.length || 0,
      error: flightLogsError?.message || 'No error',
      hasError: !!flightLogsError
    });

    // For all users, use manual joins to get full relationship data
    if (true) {
      console.log('🔍 User detected, applying manual joins...');
      
      // Get the flight logs data (either from complex query or simple query)
      let flightLogsData = flightLogs;
      let flightLogsErrorData = flightLogsError;
      
      // If complex query failed, try simple query
      if (flightLogsError) {
        console.log('❌ Complex query failed, trying simple query for admin user...');
        const { data: simpleFlightLogs, error: simpleError } = await supabase
          .from(tableName)
          .select('*')
          .order('date', { ascending: false })
          .range(skip, skip + limit - 1);
        
        if (simpleError) {
          console.log('❌ Simple query also failed:', simpleError);
          return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        } else {
          flightLogsData = simpleFlightLogs;
          flightLogsErrorData = null;
          console.log('✅ Simple query succeeded for admin user, got', flightLogsData?.length, 'records');
        }
      }
      
      // Now apply manual joins
      try {
        console.log('🔍 Enriching admin user data with manual joins...');
        
        // Get all the IDs we need for relationships
        const aircraftIds = [...new Set(flightLogsData?.map(log => log.aircraftId) || [])];
        const pilotIds = [...new Set(flightLogsData?.map(log => log.pilotId) || [])];
        const instructorIds = [...new Set(flightLogsData?.map(log => log.instructorId).filter(Boolean) || [])];
        const airfieldIds = [...new Set([
          ...(flightLogsData?.map(log => log.departureAirfieldId) || []),
          ...(flightLogsData?.map(log => log.arrivalAirfieldId) || [])
        ])];
        const createdByIds = [...new Set(flightLogsData?.map(log => log.createdById) || [])];

        console.log('🔍 Manual joins - IDs found:', {
          aircraftIds: aircraftIds.length,
          pilotIds: pilotIds.length,
          instructorIds: instructorIds.length,
          airfieldIds: airfieldIds.length,
          createdByIds: createdByIds.length
        });
        console.log('🔍 Aircraft IDs in flight logs:', aircraftIds);

        console.log('🔍 Fetching related data for:', {
          aircraftIds: aircraftIds.length,
          pilotIds: pilotIds.length,
          instructorIds: instructorIds.length,
          airfieldIds: airfieldIds.length,
          createdByIds: createdByIds.length
        });

        // Fetch all related data
        const [aircraftData, pilotsData, instructorsData, airfieldsData, createdByData] = await Promise.all([
          aircraftIds.length > 0 ? supabase.from('aircraft').select('*').in('id', aircraftIds) : { data: [], error: null },
          pilotIds.length > 0 ? supabase.from('users').select('*').in('id', pilotIds) : { data: [], error: null },
          instructorIds.length > 0 ? supabase.from('users').select('*').in('id', instructorIds) : { data: [], error: null },
          airfieldIds.length > 0 ? supabase.from('airfields').select('*').in('id', airfieldIds) : { data: [], error: null },
          createdByIds.length > 0 ? supabase.from('users').select('*').in('id', createdByIds) : { data: [], error: null }
        ]);

        // Create lookup maps
        const aircraftMap = new Map(aircraftData.data?.map(ac => [ac.id, ac]) || []);
        const pilotsMap = new Map(pilotsData.data?.map(p => [p.id, p]) || []);
        const instructorsMap = new Map(instructorsData.data?.map(i => [i.id, i]) || []);
        const airfieldsMap = new Map(airfieldsData.data?.map(af => [af.id, af]) || []);
        const createdByMap = new Map(createdByData.data?.map(cb => [cb.id, cb]) || []);

        console.log('🔍 Lookup maps created:', {
          aircraft: aircraftMap.size,
          pilots: pilotsMap.size,
          instructors: instructorsMap.size,
          airfields: airfieldsMap.size,
          createdBy: createdByMap.size
        });

        // Combine the data
        const enrichedFlightLogs = flightLogsData?.map(log => ({
          ...log,
          aircraft: aircraftMap.get(log.aircraftId) || null,
          pilot: pilotsMap.get(log.pilotId) || null,
          instructor: log.instructorId ? instructorsMap.get(log.instructorId) || null : null,
          departureAirfield: airfieldsMap.get(log.departureAirfieldId) || null,
          arrivalAirfield: airfieldsMap.get(log.arrivalAirfieldId) || null,
          createdBy: createdByMap.get(log.createdById) || null
        })) || [];

        console.log('✅ Manual joins succeeded for admin user, returning enriched data');
        
        return NextResponse.json({
          flightLogs: enrichedFlightLogs || [],
          totalPages: Math.ceil((total || 0) / limit),
          totalRecords: total || 0,
          currentPage: page,
          pageSize: limit,
        });
        
      } catch (enrichError) {
        console.log('❌ Manual joins failed for admin user, returning simple data:', enrichError);
        // Return the simple data if enrichment fails
        return NextResponse.json({
          flightLogs: flightLogsData || [],
          totalPages: Math.ceil((total || 0) / limit),
          totalRecords: total || 0,
          currentPage: page,
          pageSize: limit,
        });
      }
    }

    // If we get an error, let's try a simpler query first
    if (flightLogsError) {
      console.log('❌ Error with complex query, trying simple query...');
      console.log('❌ Error details:', flightLogsError);
      
      // Try a simple query without relationships
      const { data: simpleFlightLogs, error: simpleError } = await supabase
        .from(tableName)
        .select('*')
        .order('date', { ascending: false })
        .range(skip, skip + limit - 1);
      
      if (simpleError) {
        console.log('❌ Simple query also failed:', simpleError);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      } else {
        console.log('✅ Simple query succeeded, got', simpleFlightLogs?.length, 'records');
        
        // Now let's enrich the data with manual joins
        try {
          console.log('🔍 Enriching data with manual joins...');
          
          // Get all the IDs we need for relationships
          const aircraftIds = [...new Set(simpleFlightLogs?.map(log => log.aircraftId) || [])];
          const pilotIds = [...new Set(simpleFlightLogs?.map(log => log.pilotId) || [])];
          const instructorIds = [...new Set(simpleFlightLogs?.map(log => log.instructorId).filter(Boolean) || [])];
          const airfieldIds = [...new Set([
            ...(simpleFlightLogs?.map(log => log.departureAirfieldId) || []),
            ...(simpleFlightLogs?.map(log => log.arrivalAirfieldId) || [])
          ])];
          const createdByIds = [...new Set(simpleFlightLogs?.map(log => log.createdById) || [])];

          // Fetch all related data
          const [aircraftData, pilotsData, instructorsData, airfieldsData, createdByData] = await Promise.all([
            aircraftIds.length > 0 ? supabase.from('aircraft').select('*').in('id', aircraftIds) : { data: [], error: null },
            pilotIds.length > 0 ? supabase.from('users').select('*').in('id', pilotIds) : { data: [], error: null },
            instructorIds.length > 0 ? supabase.from('users').select('*').in('id', instructorIds) : { data: [], error: null },
            airfieldIds.length > 0 ? supabase.from('airfields').select('*').in('id', airfieldIds) : { data: [], error: null },
            createdByIds.length > 0 ? supabase.from('users').select('*').in('id', createdByIds) : { data: [], error: null }
          ]);

          // Create lookup maps
          const aircraftMap = new Map(aircraftData.data?.map(ac => [ac.id, ac]) || []);
          const pilotsMap = new Map(pilotsData.data?.map(p => [p.id, p]) || []);
          const instructorsMap = new Map(instructorsData.data?.map(i => [i.id, i]) || []);
          const airfieldsMap = new Map(airfieldsData.data?.map(af => [af.id, af]) || []);
          const createdByMap = new Map(createdByData.data?.map(cb => [cb.id, cb]) || []);

          // Combine the data
          const enrichedFlightLogs = simpleFlightLogs?.map(log => ({
            ...log,
            aircraft: aircraftMap.get(log.aircraftId) || null,
            pilot: pilotsMap.get(log.pilotId) || null,
            instructor: log.instructorId ? instructorsMap.get(log.instructorId) || null : null,
            departureAirfield: airfieldsMap.get(log.departureAirfieldId) || null,
            arrivalAirfield: airfieldsMap.get(log.arrivalAirfieldId) || null,
            createdBy: createdByMap.get(log.createdById) || null
          })) || [];

          console.log('✅ Manual joins succeeded, returning enriched data');
          
          return NextResponse.json({
            flightLogs: enrichedFlightLogs || [],
            totalPages: Math.ceil((total || 0) / limit),
            totalRecords: total || 0,
            currentPage: page,
            pageSize: limit,
          });
          
        } catch (enrichError) {
          console.log('❌ Manual joins failed, returning simple data:', enrichError);
          // Return the simple data if enrichment fails
          return NextResponse.json({
            flightLogs: simpleFlightLogs || [],
            totalPages: Math.ceil((total || 0) / limit),
            totalRecords: total || 0,
            currentPage: page,
            pageSize: limit,
          });
        }
      }
    }

    console.log('📊 Flight logs returned:', flightLogs?.length || 0);
    console.log('📊 Skip:', skip, 'Limit:', limit);

    if (flightLogsError) {
      console.error('Error fetching flight logs:', flightLogsError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      flightLogs: flightLogs || [],
      totalPages: Math.ceil((total || 0) / limit),
      totalRecords: total || 0,
      currentPage: page,
      pageSize: limit,
    });
  } catch (error) {
    console.error('Error fetching flight logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Check if user has permission to create flight logs
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
    const isStudent = userRoles.includes('STUDENT');

    const hasPermission = isAdmin || isBaseManager || isInstructor || isPilot || isStudent;

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Additional validation for pilots and students
    const body = await request.json();
    
    if ((isPilot || isStudent) && !isInstructor && !isAdmin && !isBaseManager) {
      // Regular pilots and students can only create flight logs for themselves
      if (body.pilotId !== user.id) {
        return NextResponse.json(
          { error: 'Pilots and students can only create flight logs for themselves' },
          { status: 403 }
        );
      }
    }

    const {
      aircraftId,
      pilotId,
      instructorId,
      date,
      departureTime,
      arrivalTime,
      departureAirfieldId,
      arrivalAirfieldId,
      flightType,
      purpose,
      remarks,
      route,
      conditions,
      // Jeppesen time breakdown
      pilotInCommand = 0,
      secondInCommand = 0,
      dualReceived = 0,
      dualGiven = 0,
      solo = 0,
      crossCountry = 0,
      night = 0,
      instrument = 0,
      actualInstrument = 0,
      simulatedInstrument = 0,
      // Landings
      dayLandings = 0,
      nightLandings = 0,
      // Hobbs readings
      departureHobbs,
      arrivalHobbs,
      // Fuel and oil information
      oilAdded = 0,
      fuelAdded = 0,
    } = body;

    // Validate required fields
    if (!aircraftId || !pilotId || !date || !departureTime || !arrivalTime || !departureAirfieldId || !arrivalAirfieldId || !flightType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate aircraft exists
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id')
      .eq('id', aircraftId)
      .single();

    if (aircraftError || !aircraft) {
      return NextResponse.json(
        { error: 'Aircraft not found' },
        { status: 404 }
      );
    }

    // Validate pilot exists
    const { data: pilot, error: pilotError } = await supabase
      .from('users')
      .select('id, totalFlightHours')
      .eq('id', pilotId)
      .single();

    if (pilotError || !pilot) {
      return NextResponse.json(
        { error: 'Pilot not found' },
        { status: 404 }
      );
    }

    // Validate instructor if provided
    if (instructorId) {
      const { data: instructor, error: instructorError } = await supabase
        .from('users')
        .select('id')
        .eq('id', instructorId)
        .single();

      if (instructorError || !instructor) {
        return NextResponse.json(
          { error: 'Instructor not found' },
          { status: 404 }
        );
      }
    }

    // Validate airfields exist
    const { data: departureAirfield, error: departureError } = await supabase
      .from('airfields')
      .select('id')
      .eq('id', departureAirfieldId)
      .single();

    if (departureError || !departureAirfield) {
      return NextResponse.json(
        { error: 'Departure airfield not found' },
        { status: 404 }
      );
    }

    const { data: arrivalAirfield, error: arrivalError } = await supabase
      .from('airfields')
      .select('id')
      .eq('id', arrivalAirfieldId)
      .single();

    if (arrivalError || !arrivalAirfield) {
      return NextResponse.json(
        { error: 'Arrival airfield not found' },
        { status: 404 }
      );
    }

    // Calculate total flight hours
    const calculateFlightHours = (departureTime: string, arrivalTime: string) => {
      const departure = new Date(`2000-01-01T${departureTime}`);
      const arrival = new Date(`2000-01-01T${arrivalTime}`);
      const diffMs = arrival.getTime() - departure.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHours);
    };

    const totalHours = calculateFlightHours(departureTime, arrivalTime);

    // Create flight log
    const now = new Date().toISOString();
    const { data: flightLog, error: createError } = await supabase
      .from('flight_logs')
      .insert({
        id: crypto.randomUUID(),
        aircraftId,
        pilotId,
        instructorId,
        date: new Date(date).toISOString(),
        departureTime,
        arrivalTime,
        departureAirfieldId,
        arrivalAirfieldId,
        flightType,
        purpose: purpose || null,
        remarks: remarks || null,
        totalHours,
        // Jeppesen time breakdown
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
        // Landings
        dayLandings,
        nightLandings,
        // Hobbs readings
        departureHobbs,
        arrivalHobbs,
        // Fuel and oil information
        oilAdded,
        fuelAdded,
        // Additional information
        route: route || null,
        conditions: conditions || null,
        createdById: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating flight log:', createError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Log flight log creation activity
    await ActivityLogger.logFlightCreated(
      user.id,
      flightLog.id,
      aircraftId
    );

    // Update pilot's total flight hours
    await supabase
      .from('users')
      .update({
        totalFlightHours: pilot.totalFlightHours + totalHours,
      })
      .eq('id', pilotId);

    return NextResponse.json({ flightLog }, { status: 201 });
  } catch (error) {
    console.error('Error creating flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}