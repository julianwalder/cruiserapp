import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get user to check permissions
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

    // Fetch dashboard statistics using Supabase
    const [
      totalUsersResult,
      activeUsersResult,
      pendingApprovalsResult,
      totalAirfieldsResult,
      activeAirfieldsResult,
      totalAircraftResult,
      activeAircraftResult,
      fleetStatusResult
    ] = await Promise.all([
      // Total users
      supabase.from('users').select('id', { count: 'exact', head: true }),
      
      // Active users
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      
      // Pending approvals
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL'),
      
      // Total airfields
      supabase.from('airfields').select('id', { count: 'exact', head: true }),
      
      // Active airfields
      supabase.from('airfields').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      
      // Total aircraft (excluding retired)
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('hidden', false).neq('status', 'RETIRED'),
      
      // Active aircraft
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('hidden', false).eq('status', 'ACTIVE'),
      
      // Fleet status with hobbs data - exclude retired aircraft
      supabase
        .from('aircraft')
        .select(`
          id,
          callSign,
          status,
          icao_reference_type (
            typeDesignator,
            model,
            manufacturer
          ),
          aircraft_hobbs (
            last_hobbs_reading,
            last_hobbs_date,
            updated_at
          )
        `)
        .eq('hidden', false)
        .neq('status', 'RETIRED')
        .order('callSign')
    ]);

    // Extract counts from results
    const totalUsers = totalUsersResult.count || 0;
    const activeUsers = activeUsersResult.count || 0;
    const pendingApprovals = pendingApprovalsResult.count || 0;
    const totalAirfields = totalAirfieldsResult.count || 0;
    const activeAirfields = activeAirfieldsResult.count || 0;
    const totalAircraft = totalAircraftResult.count || 0;
    const activeAircraft = activeAircraftResult.count || 0;
    const fleetStatus = fleetStatusResult.data || [];




    // Placeholder values for flight statistics (will be implemented with flight scheduling)
    const todayFlights = 0;
    const scheduledFlights = 0;

    // Process fleet status data - transform icao_reference_type to icaoReferenceType like the fleet API does
    const processedFleetStatus = fleetStatus.map(aircraft => {
      // Supabase returns related data as arrays even for one-to-one relationships
      const icaoReferenceType = Array.isArray(aircraft.icao_reference_type) 
        ? aircraft.icao_reference_type[0] 
        : aircraft.icao_reference_type;
        
      const transformedAircraft = {
        ...aircraft,
        icaoReferenceType: icaoReferenceType,
      };
      
      return {
        id: transformedAircraft.id,
        callSign: transformedAircraft.callSign,
        status: transformedAircraft.status,
        type: transformedAircraft.icaoReferenceType ? 
          `${transformedAircraft.icaoReferenceType.manufacturer} ${transformedAircraft.icaoReferenceType.model}` : 
          'Unknown',
        lastHobbs: Array.isArray(transformedAircraft.aircraft_hobbs) 
          ? (transformedAircraft.aircraft_hobbs as any)[0]?.last_hobbs_reading || null
          : (transformedAircraft.aircraft_hobbs as any)?.last_hobbs_reading || null,
        lastHobbsDate: Array.isArray(transformedAircraft.aircraft_hobbs)
          ? (transformedAircraft.aircraft_hobbs as any)[0]?.last_hobbs_date || null
          : (transformedAircraft.aircraft_hobbs as any)?.last_hobbs_date || null,
        lastUpdated: Array.isArray(transformedAircraft.aircraft_hobbs)
          ? (transformedAircraft.aircraft_hobbs as any)[0]?.updated_at || null
          : (transformedAircraft.aircraft_hobbs as any)?.updated_at || null
      };
    });

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        pendingApprovals: pendingApprovals,
      },
      airfields: {
        total: totalAirfields,
        active: activeAirfields,
      },
      flights: {
        today: todayFlights,
        scheduled: scheduledFlights,
      },
      aircraft: {
        total: totalAircraft,
        active: activeAircraft,
      },
      fleetStatus: processedFleetStatus,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 