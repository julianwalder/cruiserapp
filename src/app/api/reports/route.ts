import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/reports - Get comprehensive reports
export async function GET(request: NextRequest) {
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `date.gte.${startDate},date.lte.${endDate}`;
    }

    // Fetch comprehensive statistics using Supabase
    const [
      totalFlightsResult,
      totalUsersResult,
      totalAircraftResult,
      activeAircraftResult,
      maintenanceAircraftResult,
      roleDistributionResult,
      aircraftTypeDistributionResult,
      flightTypeDistributionResult,
      mostActiveAircraftResult,
      mostActivePilotResult,
      topDestinationResult,
      roleDetailsResult,
      userDetailsResult
    ] = await Promise.all([
      // Total flights
      supabase.from('flight_logs').select('id', { count: 'exact', head: true }),
      
      // Total users
      supabase.from('users').select('id', { count: 'exact', head: true }),
      
      // Total aircraft
      supabase.from('aircraft').select('id', { count: 'exact', head: true }),
      
      // Active aircraft
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      
      // Aircraft in maintenance
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('status', 'MAINTENANCE'),
      
      // Role distribution
      supabase.from('userRoles').select('roleId', { count: 'exact' }),
      
      // Aircraft type distribution
      supabase.from('flight_logs').select('aircraftId', { count: 'exact' }),
      
      // Flight type distribution
      supabase.from('flight_logs').select('type', { count: 'exact' }),
      
      // Most active aircraft (placeholder - would need complex aggregation)
      supabase.from('flight_logs').select('aircraftId', { count: 'exact' }).limit(1),
      
      // Most active pilot (placeholder - would need complex aggregation)
      supabase.from('flight_logs').select('pilotId', { count: 'exact' }).limit(1),
      
      // Top destination (placeholder - would need complex aggregation)
      supabase.from('flight_logs').select('destinationId', { count: 'exact' }).limit(1),
      
      // Role details
      supabase.from('roles').select('id, name'),
      
      // User details for current user
      supabase.from('users').select(`
        id,
        "firstName",
        "lastName",
        email,
        status,
        userRoles (
          role (
            name
          )
        )
      `).eq('id', user.id).single()
    ]);

    // Extract counts from results
    const totalFlights = totalFlightsResult.count || 0;
    const totalUsers = totalUsersResult.count || 0;
    const totalAircraft = totalAircraftResult.count || 0;
    const activeAircraft = activeAircraftResult.count || 0;
    const maintenanceAircraft = maintenanceAircraftResult.count || 0;

    // Build comprehensive report
    const report = {
      summary: {
        totalFlights,
        totalUsers,
        totalAircraft,
        activeAircraft,
        maintenanceAircraft,
        aircraftUtilization: totalAircraft > 0 ? ((activeAircraft / totalAircraft) * 100).toFixed(1) : '0',
      },
      userStats: {
        totalUsers,
        roleDistribution: roleDistributionResult.count || 0,
        roleDetails: roleDetailsResult.data || [],
      },
      aircraftStats: {
        totalAircraft,
        activeAircraft,
        maintenanceAircraft,
        aircraftTypeDistribution: aircraftTypeDistributionResult.count || 0,
      },
      flightStats: {
        totalFlights,
        flightTypeDistribution: flightTypeDistributionResult.count || 0,
        mostActiveAircraft: mostActiveAircraftResult.count || 0,
        mostActivePilot: mostActivePilotResult.count || 0,
        topDestination: topDestinationResult.count || 0,
      },
      user: userDetailsResult.data || null,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}