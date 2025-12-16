import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
import { ActivityLogger } from '@/lib/activity-logger';
import { updateAircraftHobbs } from '@/lib/aircraft-hobbs';
import crypto from 'crypto';
import { UUID } from '@/types/uuid-types';
import { logger } from '@/lib/logger';


export async function GET(request: NextRequest) {
  try {
    logger.debug('🔍 Flight logs API called');
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      logger.security('No token provided in flight logs request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      logger.security('Invalid token in flight logs request');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    logger.debug('🔍 User authenticated:', decoded.userId);

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
    const isStudent = userRoles.includes('STUDENT');
    const isProspect = userRoles.includes('PROSPECT');

    // Block prospects from accessing flight logs
    if (isProspect) {
      logger.security('Prospect user attempted to access flight logs', { userId: decoded.userId });
      return NextResponse.json({
        error: 'Access denied. Flight logs are not available for prospect users.'
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const viewMode = searchParams.get('viewMode') || 'company';
    const search = searchParams.get('search') || '';
    const flightType = searchParams.get('flightType') || '';
    const userId = searchParams.get('userId') || '';
    const aircraftId = searchParams.get('aircraftId') || '';
    const instructorId = searchParams.get('instructorId') || '';
    const departureAirfieldId = searchParams.get('departureAirfieldId') || '';
    const arrivalAirfieldId = searchParams.get('arrivalAirfieldId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const skip = (page - 1) * limit;

    // Build query - use the correct table name
    let query;
    const tableName = 'flight_logs';

    logger.debug('✅ Using table name: flight_logs');

    // Use simple query to avoid relationship conflicts, then enrich with manual joins
    query = supabase
      .from(tableName)
      .select('*');

    // Apply permission-based filtering based on viewMode
    if (viewMode === 'personal') {
      if ((isPilot || isStudent) && !isInstructor && !isAdmin && !isBaseManager) {
        // Regular pilots and students can only see their own flight logs
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
      logger.debug('✅ Company view - allowing access to all flight logs');
      // No additional filtering needed - they can see everything
    }

    // TEMPORARY: For debugging, let's bypass all filtering for SUPER_ADMIN
    if (userRoles.includes('SUPER_ADMIN')) {
      logger.debug('🔧 TEMPORARY: Bypassing all filtering for SUPER_ADMIN');
      // Reset the query to show all records (simple query to avoid relationship conflicts)
      query = supabase
        .from('flight_logs')
        .select('*');
    }

    // Debug logging
    logger.debug('🔍 Flight Logs API Debug:', {
      userId: user.id,
      userRoles,
      isAdmin,
      isInstructor,
      isBaseManager,
      isPilot,
      viewMode
    });

    // Apply filters to the query
    if (search) {
      query = query.or(`purpose.ilike.%${search}%`);
    }

    if (flightType) {
      query = query.eq('flightType', flightType);
    }

    // Handle userId filter - only apply if it doesn't conflict with permission-based filtering
    if (userId) {
      // In personal view, if the user is restricted to their own logs, 
      // only apply userId filter if it matches the current user
      if (viewMode === 'personal') {
        if (isPilot && !isInstructor && !isAdmin && !isBaseManager) {
          // Regular pilots can only see their own logs, so userId filter must match current user
          if (userId === user.id) {
            query = query.eq('userId', userId);
          } else {
            logger.debug('⚠️ userId filter ignored - pilot can only see their own logs');
          }
        } else if (isInstructor && !isAdmin && !isBaseManager) {
          // Instructors can see logs where they are the instructor OR their own logs
          if (userId === user.id) {
            query = query.eq('userId', userId);
          } else {
            // For other users, check if they are the instructor
            query = query.eq('instructorId', userId);
          }
        } else if (isBaseManager && !isAdmin) {
          // Base managers see their own logs in personal view
          if (userId === user.id) {
            query = query.eq('userId', userId);
          } else {
            logger.debug('⚠️ userId filter ignored - base manager can only see their own logs in personal view');
          }
        } else if (isAdmin) {
          // Admins see their own logs in personal view
          if (userId === user.id) {
            query = query.eq('userId', userId);
          } else {
            logger.debug('⚠️ userId filter ignored - admin can only see their own logs in personal view');
          }
        }
      } else {
        // In company view, apply userId filter normally
        query = query.eq('userId', userId);
      }
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

    // Get total count for pagination (after applying filters)
    let countQuery = supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Apply the same filters to the count query
    if (userRoles.includes('SUPER_ADMIN')) {
      logger.debug('🔧 TEMPORARY: Bypassing all filtering for SUPER_ADMIN in count query');
      countQuery = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
    } else {
      if (viewMode === 'personal') {
        if (isPilot && !isInstructor && !isAdmin && !isBaseManager) {
          countQuery.eq('userId', user.id);
        } else if (isInstructor && !isAdmin && !isBaseManager) {
          countQuery.or(`instructorId.eq.${user.id},userId.eq.${user.id}`);
                  } else if (isBaseManager && !isAdmin) {
            countQuery.eq('userId', user.id);
                  } else if (isAdmin) {
            countQuery.eq('userId', user.id);
        }
      }
    }

    if (search) {
      countQuery.or(`purpose.ilike.%${search}%`);
    }

    if (flightType) {
      countQuery.eq('flightType', flightType);
    }

    // Handle userId filter for count query - same logic as main query
    if (userId) {
      if (viewMode === 'personal') {
        if (isPilot && !isInstructor && !isAdmin && !isBaseManager) {
          if (userId === user.id) {
            countQuery.eq('userId', userId);
          }
        } else if (isInstructor && !isAdmin && !isBaseManager) {
          if (userId === user.id) {
            countQuery.eq('userId', userId);
          } else {
            countQuery.eq('instructorId', userId);
          }
        } else if (isBaseManager && !isAdmin) {
          if (userId === user.id) {
            countQuery.eq('userId', userId);
          }
        } else if (isAdmin) {
          if (userId === user.id) {
            countQuery.eq('userId', userId);
          }
        }
      } else {
        countQuery.eq('userId', userId);
      }
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

    logger.debug('📊 Total flight logs after filtering:', total);

    // Execute the filtered query
    // If limit is >= 5000, fetch all records (for heatmaps and exports)
    // Otherwise use pagination with range
    let queryWithPagination = query
      .order('date', { ascending: false })
      .order('departureTime', { ascending: false });

    if (limit < 5000) {
      queryWithPagination = queryWithPagination.range(skip, skip + limit - 1);
    }

    const { data: flightLogsData, error: flightLogsErrorData } = await queryWithPagination;

    if (flightLogsErrorData) {
      logger.error('❌ Filtered query failed:', flightLogsErrorData);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    logger.debug('✅ Filtered query succeeded, got', flightLogsData?.length, 'records');
      
    // Now apply manual joins
    try {
      logger.debug('🔍 Enriching data with manual joins...');

      // Get all the IDs we need for relationships
      const aircraftIds = [...new Set(flightLogsData?.map(log => log.aircraftId) || [])];
      const userIds = [...new Set(flightLogsData?.map(log => log.userId) || [])];
      const instructorIds = [...new Set(flightLogsData?.map(log => log.instructorId).filter(Boolean) || [])];
      const payerIds = [...new Set(flightLogsData?.map(log => log.payer_id).filter(Boolean) || [])];
      const airfieldIds = [...new Set([
        ...(flightLogsData?.map(log => log.departureAirfieldId) || []),
        ...(flightLogsData?.map(log => log.arrivalAirfieldId) || [])
      ])];
      const createdByIds = [...new Set(flightLogsData?.map(log => log.createdById) || [])];
      const updatedByIds = [...new Set(flightLogsData?.map(log => log.updatedBy).filter(Boolean) || [])];

      logger.debug('🔍 Manual joins - IDs found:', {
        aircraftIds: aircraftIds.length,
        userIds: userIds.length,
        instructorIds: instructorIds.length,
        payerIds: payerIds.length,
        airfieldIds: airfieldIds.length,
        createdByIds: createdByIds.length,
        updatedByIds: updatedByIds.length
      });

      // Fetch all related data
      const [aircraftData, pilotsData, instructorsData, payersData, airfieldsData, createdByData, updatedByData] = await Promise.all([
        aircraftIds.length > 0 ? supabase.from('aircraft').select(`
          *,
          icao_reference_type (
            *
          )
        `).in('id', aircraftIds) : { data: [], error: null },
        userIds.length > 0 ? supabase.from('users').select('*').in('id', userIds) : { data: [], error: null },
        instructorIds.length > 0 ? supabase.from('users').select('*').in('id', instructorIds) : { data: [], error: null },
        payerIds.length > 0 ? supabase.from('users').select('*').in('id', payerIds) : { data: [], error: null },
        airfieldIds.length > 0 ? supabase.from('airfields').select('*').in('id', airfieldIds) : { data: [], error: null },
        createdByIds.length > 0 ? supabase.from('users').select('*').in('id', createdByIds) : { data: [], error: null },
        updatedByIds.length > 0 ? supabase.from('users').select('*').in('id', updatedByIds) : { data: [], error: null }
      ]);

      // Create lookup maps
      const aircraftMap = new Map(aircraftData.data?.map(ac => [ac.id, ac]) || []);
      const pilotsMap = new Map(pilotsData.data?.map(p => [p.id, p]) || []);
      const instructorsMap = new Map(instructorsData.data?.map(i => [i.id, i]) || []);
      const payersMap = new Map(payersData.data?.map(p => [p.id, p]) || []);
      const airfieldsMap = new Map(airfieldsData.data?.map(af => [af.id, af]) || []);
      const createdByMap = new Map(createdByData.data?.map(cb => [cb.id, cb]) || []);
      const updatedByMap = new Map(updatedByData.data?.map(ub => [ub.id, ub]) || []);

      logger.debug('🔍 Lookup maps created:', {
        aircraft: aircraftMap.size,
        pilots: pilotsMap.size,
        instructors: instructorsMap.size,
        payers: payersMap.size,
        airfields: airfieldsMap.size,
        createdBy: createdByMap.size,
        updatedBy: updatedByMap.size
      });

      // Combine the data
      const enrichedFlightLogs = flightLogsData?.map(log => {
        const aircraft = aircraftMap.get(log.aircraftId);
        return {
          ...log,
          aircraft: aircraft ? {
            ...aircraft,
            // Transform icao_reference_type to icaoReferenceType for frontend compatibility
            icaoReferenceType: aircraft.icao_reference_type ? {
              id: aircraft.icao_reference_type.id,
              typeDesignator: aircraft.icao_reference_type.typeDesignator,
              model: aircraft.icao_reference_type.model,
              manufacturer: aircraft.icao_reference_type.manufacturer
            } : null
          } : null,
          pilot: pilotsMap.get(log.userId) || null,
          instructor: log.instructorId ? instructorsMap.get(log.instructorId) || null : null,
          payer: log.payer_id ? payersMap.get(log.payer_id) || null : null,
          departureAirfield: airfieldsMap.get(log.departureAirfieldId) || null,
          arrivalAirfield: airfieldsMap.get(log.arrivalAirfieldId) || null,
          createdBy: createdByMap.get(log.createdById) || null,
          updatedByUser: log.updatedBy ? updatedByMap.get(log.updatedBy) || null : null
        };
      }) || [];

      logger.debug('✅ Manual joins succeeded, returning enriched data');

      return NextResponse.json({
        flightLogs: enrichedFlightLogs || [],
        totalPages: Math.ceil((total || 0) / limit),
        totalRecords: total || 0,
        currentPage: page,
        pageSize: limit,
      });

    } catch (enrichError) {
      logger.error('❌ Manual joins failed, returning simple data:', enrichError);
      // Return the simple data if enrichment fails
      return NextResponse.json({
        flightLogs: flightLogsData || [],
        totalPages: Math.ceil((total || 0) / limit),
        totalRecords: total || 0,
        currentPage: page,
        pageSize: limit,
      });
    }
  } catch (error) {
    logger.error('Error fetching flight logs:', error);
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
    const isProspect = userRoles.includes('PROSPECT');

    // Block prospects from creating flight logs
    if (isProspect) {
      logger.security('Prospect user attempted to create flight log', { userId: decoded.userId });
      return NextResponse.json({
        error: 'Access denied. Flight logs are not available for prospect users.'
      }, { status: 403 });
    }

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
      if (body.userId !== user.id) {
        return NextResponse.json(
          { error: 'Pilots and students can only create flight logs for themselves' },
          { status: 403 }
        );
      }
    }

    const {
      aircraftId,
      userId,
      instructorId,
      payerId, // User ID of the person who pays for the flight (used for charter flights)
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
    if (!aircraftId || !userId || !date || !departureTime || !arrivalTime || !departureAirfieldId || !arrivalAirfieldId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate payerId for charter flights
    if (flightType === 'CHARTER' && !payerId) {
      return NextResponse.json(
        { error: 'Payer ID is required for charter flights' },
        { status: 400 }
      );
    }

    // Validate that payerId is not set for non-charter flights
    if (flightType !== 'CHARTER' && payerId) {
      return NextResponse.json(
        { error: 'Payer ID can only be set for charter flights' },
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

    // Validate pilot exists and get their roles for automatic flight type
    const { data: pilot, error: pilotError } = await supabase
      .from('users')
      .select(`
        id, 
        totalFlightHours,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (pilotError || !pilot) {
      return NextResponse.json(
        { error: 'Pilot not found' },
        { status: 404 }
      );
    }

    // Validate payer exists if provided
    if (payerId) {
      const { data: payer, error: payerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', payerId)
        .single();

      if (payerError || !payer) {
        return NextResponse.json(
          { error: 'Payer not found' },
          { status: 404 }
        );
      }
    }

    // Automatic flight type logic based on pilot's roles
    const getDefaultFlightType = (pilotData: any): "SCHOOL" | "INVOICED" | "FERRY" => {
      if (!pilotData) return "SCHOOL";
      
      const userRoles = pilotData.user_roles || [];
      const roleNames = userRoles.map((ur: any) => ur.roles?.name || '').filter(Boolean);
      
      // Check if user has PILOT role (graduates from school)
      const hasPilotRole = roleNames.includes('PILOT');
      const hasStudentRole = roleNames.includes('STUDENT');
      const hasBaseManagerRole = roleNames.includes('BASE_MANAGER');
      const hasAdminRole = roleNames.includes('ADMIN') || roleNames.includes('SUPER_ADMIN');
      
      // If user has PILOT role (even if they also have STUDENT), all flights are INVOICED
      if (hasPilotRole) {
        return "INVOICED";
      }
      
      // If user is only STUDENT (no PILOT role), flights are SCHOOL
      if (hasStudentRole && !hasPilotRole) {
        return "SCHOOL";
      }
      
      // If user is BASE_MANAGER or ADMIN logging their own flights, it's FERRY
      if ((hasBaseManagerRole || hasAdminRole) && !hasPilotRole && !hasStudentRole) {
        return "FERRY";
      }
      
      // Default fallback
      return "SCHOOL";
    };

    // Determine the correct flight type automatically
    const automaticFlightType = getDefaultFlightType(pilot);
    
    // For creating new flight logs, always use automatic flight type
    const finalFlightType = automaticFlightType;
    
    // Log the automatic flight type determination
    const pilotRoles = pilot.user_roles?.map((ur: any) => ur.roles?.name || '').filter(Boolean) || [];
    logger.debug(`🔍 Automatic flight type for pilot ${userId} (CREATE mode):`, {
      pilotRoles,
      providedFlightType: flightType,
      automaticFlightType,
      finalFlightType
    });

    // Log if there was a mismatch
    if (flightType && flightType !== automaticFlightType) {
      logger.debug(`✅ Overriding provided "${flightType}" with automatic "${automaticFlightType}" for new flight log`);
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
        userId,
        instructorId,
        payer_id: payerId || null, // User ID of the person who pays for the flight (used for charter flights)
        date: date, // Keep the date as a string to avoid timezone conversion
        departureTime,
        arrivalTime,
        departureAirfieldId,
        arrivalAirfieldId,
        flightType: finalFlightType,
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
        updatedBy: user.id, // Set updatedBy to the same as createdBy for new records
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating flight log:', createError);
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

    // Update aircraft hobbs data if arrival hobbs is provided
    if (arrivalHobbs) {
      try {
        await updateAircraftHobbs(aircraftId, flightLog.id, arrivalHobbs, date);
      } catch (hobbsError) {
        logger.error('Error updating aircraft hobbs:', hobbsError);
        // Don't fail the entire request if hobbs update fails
      }
    }

    // Update pilot's total flight hours
    await supabase
      .from('users')
      .update({
        totalFlightHours: pilot.totalFlightHours + totalHours,
      })
      .eq('id', userId);

    return NextResponse.json({ flightLog }, { status: 201 });
  } catch (error) {
    logger.error('Error creating flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}