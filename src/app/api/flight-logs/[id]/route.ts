import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
import { ActivityLogger } from '@/lib/activity-logger';
import { updateAircraftHobbs, recalculateAircraftHobbs } from '@/lib/aircraft-hobbs';
import { UUID } from '@/types/uuid-types';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 GET request received for flight log');
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      console.log('❌ Invalid token or user not found');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('✅ Token verified, user ID:', user.id);

    const { id } = await params;
    console.log('📝 Flight log ID to fetch:', id);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('👤 User found:', user.email);
    console.log('🔑 User roles:', (user as any).user_roles?.map((ur: any) => ur.roles.name) || []);

    const userRoles = (user as any).user_roles?.map((ur: any) => ur.roles.name) || [];
    const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
    const isBaseManager = userRoles.includes('BASE_MANAGER');
    const isInstructor = userRoles.includes('INSTRUCTOR');
    const isPilot = userRoles.includes('PILOT');
    const isStudent = userRoles.includes('STUDENT');

    // Fetch the flight log with basic data and enrich with payer information
    const { data: flightLog, error: flightLogError } = await supabase
      .from('flight_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (flightLogError || !flightLog) {
      console.log('❌ Flight log not found:', flightLogError);
      return NextResponse.json(
        { error: 'Flight log not found' },
        { status: 404 }
      );
    }

    // Check permissions based on user role
    let hasAccess = false;

    if (isAdmin || isBaseManager || isInstructor) {
      // Admins, base managers, and instructors can view all flight logs
      hasAccess = true;
    } else if (isPilot || isStudent) {
      // Pilots and students can only view their own flight logs
      hasAccess = flightLog.userId === user.id;
    }

    if (!hasAccess) {
      console.log('❌ Insufficient permissions to view this flight log');
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Enrich with payer information if payer_id exists
    let enrichedFlightLog = { ...flightLog };
    if (flightLog.payer_id) {
      try {
        const { data: payerData, error: payerError } = await supabase
          .from('users')
          .select('*')
          .eq('id', flightLog.payer_id)
          .single();
        
        if (!payerError && payerData) {
          enrichedFlightLog = {
            ...flightLog,
            payer: payerData
          };
        }
      } catch (error) {
        console.log('⚠️ Error fetching payer data:', error);
        // Continue without payer data
      }
    }

    console.log('✅ Flight log fetched successfully');
    return NextResponse.json(enrichedFlightLog);

  } catch (error) {
    console.error('❌ Error fetching flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 PUT request received for flight log update');
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      console.log('❌ Invalid token or user not found');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('✅ Token verified, user ID:', user.id);

    const { id } = await params;
    console.log('📝 Flight log ID to update:', id);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('👤 User found:', user.email);
    console.log('🔑 User roles:', (user as any).user_roles?.map((ur: any) => ur.roles.name) || []);

    const hasPermission = (user as any).user_roles?.some(
      (userRole: any) =>
        userRole.roles.name === 'SUPER_ADMIN' ||
        userRole.roles.name === 'ADMIN' ||
        userRole.roles.name === 'BASE_MANAGER' ||
        userRole.roles.name === 'INSTRUCTOR' ||
        userRole.roles.name === 'PILOT' ||
        userRole.roles.name === 'STUDENT'
    ) || false;

    console.log('🔐 Has permission:', hasPermission);

    if (!hasPermission) {
      console.log('❌ Insufficient permissions');
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if flight log exists
    console.log('🔍 Looking for flight log with ID:', id);
    const { data: existingFlightLog, error: existingError } = await supabase
      .from('flight_logs')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 Flight log lookup result:', { existingFlightLog, existingError });

    if (existingError || !existingFlightLog) {
      console.log('❌ Flight log not found or error:', existingError);
      return NextResponse.json(
        { error: 'Flight log not found' },
        { status: 404 }
      );
    }

    console.log('✅ Flight log found:', existingFlightLog.id);

    // Additional validation for students and pilots - they can only edit their own flight logs
    const userRoles = (user as any).user_roles?.map((ur: any) => ur.roles.name) || [];
    const isStudent = userRoles.includes('STUDENT');
    const isPilot = userRoles.includes('PILOT');
    const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
    const isBaseManager = userRoles.includes('BASE_MANAGER');
    const isInstructor = userRoles.includes('INSTRUCTOR');

    if ((isStudent || isPilot) && !isAdmin && !isBaseManager && !isInstructor) {
      // Students and pilots can only edit their own flight logs
      if (existingFlightLog.userId !== user.id) {
        console.log('❌ Student/Pilot attempted to edit another user\'s flight log');
        return NextResponse.json(
          { error: 'You can only edit your own flight logs' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    console.log('📦 Request body received:', body);
    
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
      departureHobbs,
      arrivalHobbs,
      flightType,
      purpose,
      remarks,
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
      dayLandings,
      nightLandings,
      oilAdded,
      fuelAdded,
    } = body;

    // Validate required fields
    if (!aircraftId || !userId || !date || !departureTime || !arrivalTime || !departureAirfieldId || !arrivalAirfieldId || !flightType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate aircraft exists
    console.log('🔍 Validating aircraft with ID:', aircraftId);
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id')
      .eq('id', aircraftId)
      .single();

    console.log('🔍 Aircraft validation result:', { aircraft, aircraftError });

    if (aircraftError || !aircraft) {
      console.log('❌ Aircraft not found:', aircraftError);
      return NextResponse.json(
        { error: 'Aircraft not found' },
        { status: 404 }
      );
    }

    console.log('✅ Aircraft validation passed');

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

    // For editing, always use the provided flight type from the frontend (which comes from the database)
    const finalFlightType = flightType;
    
    // Log the flight type being used for editing
    const pilotRoles = pilot.user_roles?.map((ur: any) => ur.roles?.name || '').filter(Boolean) || [];
    console.log(`🔍 Flight type for pilot ${userId} (EDIT mode):`, {
      pilotRoles,
      providedFlightType: flightType,
      finalFlightType
    });

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

    const newTotalHours = calculateFlightHours(departureTime, arrivalTime);
    const hoursDifference = newTotalHours - existingFlightLog.totalHours;

    // Use the remarks as provided by the frontend
    const updatedRemarks = remarks === '' ? null : remarks;

    // Update flight log
    console.log('🔄 Updating flight log with ID:', id);
    const { data: flightLog, error: updateError } = await supabase
      .from('flight_logs')
      .update({
        aircraftId,
        userId,
        instructorId,
        payer_id: payerId || null, // User ID of the person who pays for the flight (used for charter flights)
        date: date, // Keep the date as a string to avoid timezone conversion
        departureTime,
        arrivalTime,
        departureAirfieldId,
        arrivalAirfieldId,
        departureHobbs,
        arrivalHobbs,
        flightType: finalFlightType,
        purpose,
        remarks: updatedRemarks,
        totalHours: newTotalHours,
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
        dayLandings,
        nightLandings,
        oilAdded,
        fuelAdded,
        updatedBy: user.id, // Track who updated the record
        updatedAt: new Date().toISOString(), // Update the timestamp
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating flight log:', updateError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Update pilot's total flight hours if pilot changed or hours changed
    if (userId !== existingFlightLog.userId) {
      // Get the old pilot's data to remove hours
      const { data: oldPilot, error: oldPilotError } = await supabase
        .from('users')
        .select('totalFlightHours')
        .eq('id', existingFlightLog.userId)
        .single();

      if (!oldPilotError && oldPilot) {
        // Remove hours from old pilot
        await supabase
          .from('users')
          .update({
            totalFlightHours: oldPilot.totalFlightHours - existingFlightLog.totalHours,
          })
          .eq('id', existingFlightLog.userId);
      }

      // Add hours to new pilot
      await supabase
        .from('users')
        .update({
          totalFlightHours: pilot.totalFlightHours + newTotalHours,
        })
        .eq('id', userId);
    } else if (hoursDifference !== 0) {
      // Update hours for same pilot
      await supabase
        .from('users')
        .update({
          totalFlightHours: pilot.totalFlightHours + hoursDifference,
        })
        .eq('id', userId);
    }

    // Log flight log update activity
    await ActivityLogger.logFlightUpdated(
      user.id,
      flightLog.id,
      {
        oldPilotId: existingFlightLog.userId,
        newPilotId: userId,
        oldTotalHours: existingFlightLog.totalHours,
        newTotalHours: newTotalHours,
        hoursDifference
      }
    );

    // Update aircraft hobbs data if arrival hobbs changed
    if (arrivalHobbs && arrivalHobbs !== existingFlightLog.arrivalHobbs) {
      try {
        await updateAircraftHobbs(aircraftId, flightLog.id, arrivalHobbs, date);
      } catch (hobbsError) {
        console.error('Error updating aircraft hobbs:', hobbsError);
        // Don't fail the entire request if hobbs update fails
      }
    }

    // If aircraft changed, recalculate hobbs for both old and new aircraft
    if (aircraftId !== existingFlightLog.aircraftId) {
      try {
        // Recalculate hobbs for the old aircraft (in case this was the latest flight)
        await recalculateAircraftHobbs(existingFlightLog.aircraftId);
        
        // Update hobbs for the new aircraft if arrival hobbs is provided
        if (arrivalHobbs) {
          await updateAircraftHobbs(aircraftId, flightLog.id, arrivalHobbs, date);
        }
      } catch (hobbsError) {
        console.error('Error updating aircraft hobbs after aircraft change:', hobbsError);
        // Don't fail the entire request if hobbs update fails
      }
    }

    return NextResponse.json({ flightLog });
  } catch (error) {
    console.error('Error updating flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🗑️ DELETE request received for flight log');
    
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

    const { id } = await params;
    console.log('🗑️ Flight log ID to delete:', id);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if user has permission to delete flight logs
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

    const hasPermission = user.user_roles.some(
      (userRole: any) =>
        userRole.roles.name === 'SUPER_ADMIN' ||
        userRole.roles.name === 'ADMIN' ||
        userRole.roles.name === 'BASE_MANAGER'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if flight log exists
    console.log('🔍 Looking for flight log with ID:', id);
    const { data: existingFlightLog, error: existingError } = await supabase
      .from('flight_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (existingError) {
      console.log('❌ Error finding flight log:', existingError);
      return NextResponse.json(
        { error: 'Flight log not found' },
        { status: 404 }
      );
    }

    if (!existingFlightLog) {
      console.log('❌ Flight log not found with ID:', id);
      return NextResponse.json(
        { error: 'Flight log not found' },
        { status: 404 }
      );
    }

    console.log('✅ Flight log found:', existingFlightLog.id);

    // Get pilot's current total flight hours
    const { data: pilot, error: pilotError } = await supabase
      .from('users')
      .select('totalFlightHours')
      .eq('id', existingFlightLog.userId) // Use userId instead of pilotId
      .single();

    if (!pilotError && pilot) {
      // Remove flight hours from pilot's total
      await supabase
        .from('users')
        .update({
          totalFlightHours: pilot.totalFlightHours - existingFlightLog.totalHours,
        })
        .eq('id', existingFlightLog.userId);
    }

    // Handle aircraft_hobbs foreign key constraint
    // First, check if this flight log is referenced as last_flight_log_id in aircraft_hobbs
    const { data: hobbsRecords, error: hobbsError } = await supabase
      .from('aircraft_hobbs')
      .select('id, aircraft_id')
      .eq('last_flight_log_id', id);

    if (hobbsError) {
      console.error('Error checking aircraft_hobbs references:', hobbsError);
      return NextResponse.json(
        { error: 'Error checking aircraft references' },
        { status: 500 }
      );
    }

    // If this flight log is referenced in aircraft_hobbs, we need to find a replacement
    if (hobbsRecords && hobbsRecords.length > 0) {
      console.log('🔧 Flight log is referenced in aircraft_hobbs, finding replacement...');
      
      for (const hobbsRecord of hobbsRecords) {
        // Find the most recent flight log for this aircraft (excluding the one being deleted)
        const { data: replacementFlightLog, error: replacementError } = await supabase
          .from('flight_logs')
          .select('id, arrival_hobbs, date')
          .eq('aircraft_id', hobbsRecord.aircraft_id)
          .neq('id', id) // Exclude the flight log being deleted
          .order('date', { ascending: false })
          .order('arrival_hobbs', { ascending: false })
          .limit(1)
          .single();

        if (replacementError || !replacementFlightLog) {
          // No replacement found, set last_flight_log_id to null
          console.log('⚠️ No replacement flight log found, setting last_flight_log_id to null');
          await supabase
            .from('aircraft_hobbs')
            .update({ last_flight_log_id: null })
            .eq('id', hobbsRecord.id);
        } else {
          // Update with the replacement flight log
          console.log('✅ Found replacement flight log:', replacementFlightLog.id);
          await supabase
            .from('aircraft_hobbs')
            .update({ 
              last_flight_log_id: replacementFlightLog.id,
              last_hobbs: replacementFlightLog.arrival_hobbs,
              last_flight_date: replacementFlightLog.date
            })
            .eq('id', hobbsRecord.id);
        }
      }
    }

    // Delete flight log
    const { error: deleteError } = await supabase
      .from('flight_logs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting flight log:', deleteError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Log flight log deletion activity
    await ActivityLogger.logFlightDeleted(
      decoded.userId,
      existingFlightLog.id
    );

    console.log('✅ Flight log deleted successfully:', id);
    return NextResponse.json({ message: 'Flight log deleted successfully' });
  } catch (error) {
    console.error('Error deleting flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 