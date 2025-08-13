import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
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

    // Fetch the flight log with basic data (avoid complex joins)
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
    } else if (isPilot) {
      // Pilots can only view their own flight logs
      hasAccess = flightLog.pilotId === user.id;
    }

    if (!hasAccess) {
      console.log('❌ Insufficient permissions to view this flight log');
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    console.log('✅ Flight log fetched successfully');
    return NextResponse.json(flightLog);

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
        userRole.roles.name === 'INSTRUCTOR'
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

    const body = await request.json();
    console.log('📦 Request body received:', body);
    
    const {
      aircraftId,
      pilotId,
      instructorId,
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
    if (!aircraftId || !pilotId || !date || !departureTime || !arrivalTime || !departureAirfieldId || !arrivalAirfieldId || !flightType) {
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
      .eq('id', pilotId)
      .single();

    if (pilotError || !pilot) {
      return NextResponse.json(
        { error: 'Pilot not found' },
        { status: 404 }
      );
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
    
    // For editing, allow manual flight type selection but log suggestions
    const finalFlightType = flightType || automaticFlightType;
    
    // Log the automatic flight type determination
    const pilotRoles = pilot.user_roles?.map((ur: any) => ur.roles?.name || '').filter(Boolean) || [];
    console.log(`🔍 Flight type for pilot ${pilotId} (EDIT mode):`, {
      pilotRoles,
      providedFlightType: flightType,
      automaticFlightType,
      finalFlightType
    });
    
    // Log suggestions but allow override
    if (flightType && flightType !== automaticFlightType) {
      console.log(`💡 Suggestion: For pilot ${pilotId}, automatic logic suggests "${automaticFlightType}" but using provided "${flightType}"`);
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
        pilotId,
        instructorId,
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
    if (pilotId !== existingFlightLog.pilotId) {
      // Remove hours from old pilot
      await supabase
        .from('users')
        .update({
          totalFlightHours: existingFlightLog.pilot.totalFlightHours - existingFlightLog.totalHours,
        })
        .eq('id', existingFlightLog.pilotId);

      // Add hours to new pilot
      await supabase
        .from('users')
        .update({
          totalFlightHours: pilot.totalFlightHours + newTotalHours,
        })
        .eq('id', pilotId);
    } else if (hoursDifference !== 0) {
      // Update hours for same pilot
      await supabase
        .from('users')
        .update({
          totalFlightHours: pilot.totalFlightHours + hoursDifference,
        })
        .eq('id', pilotId);
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
      .eq('id', existingFlightLog.pilotId)
      .single();

    if (!pilotError && pilot) {
      // Remove flight hours from pilot's total
      await supabase
        .from('users')
        .update({
          totalFlightHours: pilot.totalFlightHours - existingFlightLog.totalHours,
        })
        .eq('id', existingFlightLog.pilotId);
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

    return NextResponse.json({ message: 'Flight log deleted successfully' });
  } catch (error) {
    console.error('Error deleting flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 