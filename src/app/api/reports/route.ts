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
    
    // Check if user has appropriate permissions for reports
    const hasReportsAccess = userRoles.some(role => 
      role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'BASE_MANAGER'
    );
    
    if (!hasReportsAccess) {
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
    const type = searchParams.get('type') || 'overview';
    const timeframe = searchParams.get('timeframe') || 'month';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Calculate date range based on timeframe
    let startDate: string;
    let endDate: string;
    const now = new Date();

    if (fromDate && toDate) {
      startDate = fromDate;
      endDate = toDate;
    } else {
      switch (timeframe) {
        case 'week':
          const dayOfWeek = now.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - daysToMonday);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          startDate = weekStart.toISOString().split('T')[0];
          endDate = weekEnd.toISOString().split('T')[0];
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
          startDate = monthStart.toISOString().split('T')[0];
          endDate = monthEnd.toISOString().split('T')[0];
          break;
        case 'quarter':
          const currentMonth = now.getMonth();
          const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
          const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
          const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
          quarterEnd.setHours(23, 59, 59, 999);
          startDate = quarterStart.toISOString().split('T')[0];
          endDate = quarterEnd.toISOString().split('T')[0];
          break;
        case 'year':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          const yearEnd = new Date(now.getFullYear(), 11, 31);
          yearEnd.setHours(23, 59, 59, 999);
          startDate = yearStart.toISOString().split('T')[0];
          endDate = yearEnd.toISOString().split('T')[0];
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          endDate = now.toISOString().split('T')[0];
      }
    }

    // Calculate previous period for comparison
    const getPreviousPeriod = (currentStart: string, currentEnd: string) => {
      const start = new Date(currentStart);
      const end = new Date(currentEnd);
      const duration = end.getTime() - start.getTime();
      const previousEnd = new Date(start.getTime() - 1);
      const previousStart = new Date(previousEnd.getTime() - duration);
      return {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0]
      };
    };

    const previousPeriod = getPreviousPeriod(startDate, endDate);

    // Check if user is super admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', payload?.userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSuperAdmin = currentUser.user_roles.some(
      (userRole: any) => userRole.roles.name === 'SUPER_ADMIN'
    );

    // Build aircraft filter for non-superadmin users
    let aircraftFilter = {};
    if (!isSuperAdmin) {
      aircraftFilter = { hidden: false };
    }

    // Fetch comprehensive statistics using Supabase
    const [
      // Current period flight logs
      currentFlightLogsResult,
      // Previous period flight logs
      previousFlightLogsResult,
      // Total users
      totalUsersResult,
      // Active users
      activeUsersResult,
      // New users this period
      newUsersResult,
      // Users by role
      usersByRoleResult,
      // Total aircraft
      totalAircraftResult,
      // Active aircraft
      activeAircraftResult,
      // Aircraft in maintenance
      maintenanceAircraftResult,
      // Top utilized aircraft
      topUtilizedAircraftResult,
      // Top instructors
      topInstructorsResult,
      // Most active aircraft
      mostActiveAircraftResult,
      // Most active pilot
      mostActivePilotResult,
      // Top destination
      topDestinationResult,
      // Get aircraft names for top utilized
      aircraftNamesResult,
      // Get user names for top instructors
      userNamesResult,
      // Get airfield names for top destinations
      airfieldNamesResult
    ] = await Promise.all([
      // Current period flight logs
      supabase
        .from('flight_logs')
        .select(`
          id,
          date,
          "totalHours",
          "aircraftId",
          "pilotId",
          "instructorId",
          "arrivalAirfieldId",
          "flightType"
        `)
        .gte('date', startDate)
        .lte('date', endDate),
      
      // Previous period flight logs
      supabase
        .from('flight_logs')
        .select(`
          id,
          "totalHours"
        `)
        .gte('date', previousPeriod.start)
        .lte('date', previousPeriod.end),
      
      // Total users
      supabase.from('users').select('id', { count: 'exact', head: true }),
      
      // Active users
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      
      // New users this period
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('createdAt', startDate)
        .lte('createdAt', endDate),
      
      // Users by role
      supabase
        .from('user_roles')
        .select(`
          roleId,
          roles (
            name
          )
        `),
      
      // Total aircraft
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).match(aircraftFilter),
      
      // Active aircraft
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').match(aircraftFilter),
      
      // Aircraft in maintenance
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('status', 'MAINTENANCE').match(aircraftFilter),
      
      // Top utilized aircraft (simplified - would need more complex aggregation in production)
      supabase
        .from('flight_logs')
        .select(`
          "aircraftId",
          "totalHours"
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('aircraftId', 'is', null),
      
      // Top instructors (simplified)
      supabase
        .from('flight_logs')
        .select(`
          "instructorId",
          "totalHours"
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('instructorId', 'is', null),
      
      // Most active aircraft (simplified)
      supabase
        .from('flight_logs')
        .select('"aircraftId"', { count: 'exact' })
        .gte('date', startDate)
        .lte('date', endDate)
        .not('aircraftId', 'is', null)
        .limit(1),
      
      // Most active pilot (simplified)
      supabase
        .from('flight_logs')
        .select('"pilotId"', { count: 'exact' })
        .gte('date', startDate)
        .lte('date', endDate)
        .not('pilotId', 'is', null)
        .limit(1),
      
      // Top destination (simplified)
      supabase
        .from('flight_logs')
        .select('"destinationId"', { count: 'exact' })
        .gte('date', startDate)
        .lte('date', endDate)
        .not('destinationId', 'is', null)
        .limit(1),
      
      // Get aircraft names for top utilized
      supabase
        .from('aircraft')
        .select('id, callSign, serialNumber')
        .match(aircraftFilter)
        .limit(1000),
      
      // Get user names for top instructors
      supabase
        .from('users')
        .select('id, firstName, lastName, email'),
      
      // Get airfield names for top destinations
      supabase
        .from('airfields')
        .select('id, name, code')
    ]);

    // Process flight logs data
    const currentFlightLogs = currentFlightLogsResult.data || [];
    const previousFlightLogs = previousFlightLogsResult.data || [];
    
    // Debug logging
    console.log('🔍 Reports Debug - Date Range:', { startDate, endDate });
    console.log('🔍 Reports Debug - Current Flight Logs Count:', currentFlightLogs.length);
    console.log('🔍 Reports Debug - Previous Flight Logs Count:', previousFlightLogs.length);
    
    // Filter out logs with null dates and log them for debugging
    const validCurrentLogs = currentFlightLogs.filter((log: any) => log.date !== null);
    const validPreviousLogs = previousFlightLogs.filter((log: any) => log.date !== null);
    
    if (currentFlightLogs.length !== validCurrentLogs.length) {
      console.log('⚠️ Reports Warning - Found', currentFlightLogs.length - validCurrentLogs.length, 'flight logs with null dates');
    }
    
    const totalFlights = validCurrentLogs.length;
    const totalHours = validCurrentLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const previousFlights = validPreviousLogs.length;
    const previousHours = validPreviousLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    
    const flightsChange = previousFlights > 0 ? ((totalFlights - previousFlights) / previousFlights) * 100 : 0;
    const hoursChange = previousHours > 0 ? ((totalHours - previousHours) / previousHours) * 100 : 0;
    
    const averageFlightDuration = totalFlights > 0 ? totalHours / totalFlights : 0;

    // If no valid flight logs found, provide fallback data for demonstration
    let finalTotalFlights = totalFlights;
    let finalTotalHours = totalHours;
    let finalAverageFlightDuration = averageFlightDuration;
    
    if (totalFlights === 0) {
      console.log('📊 Reports Info - No valid flight logs found, using fallback data for demonstration');
      // Use total flight logs count as fallback (including null dates)
      finalTotalFlights = currentFlightLogs.length;
      finalTotalHours = currentFlightLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
      finalAverageFlightDuration = finalTotalFlights > 0 ? finalTotalHours / finalTotalFlights : 0;
    }

    // Process user statistics
    const totalUsers = totalUsersResult.count || 0;
    const activeUsers = activeUsersResult.count || 0;
    const newUsersThisMonth = newUsersResult.count || 0;

    // Process role distribution
    const usersByRole = usersByRoleResult.data || [];
    const roleCounts: { [key: string]: number } = {};
    usersByRole.forEach((ur: any) => {
      const roleName = ur.roles?.name || 'Unknown';
      roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
    });
    const roleDistribution = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count
    }));

    // Process aircraft statistics
    const totalAircraft = totalAircraftResult.count || 0;
    const activeAircraft = activeAircraftResult.count || 0;
    const maintenanceDue = maintenanceAircraftResult.count || 0;
    const utilizationRate = totalAircraft > 0 ? (activeAircraft / totalAircraft) * 100 : 0;

    // Process top utilized aircraft (simplified)
    const aircraftUtilization = topUtilizedAircraftResult.data || [];
    const aircraftNames = aircraftNamesResult.data || [];
    

    const aircraftHours: { [key: string]: number } = {};
    aircraftUtilization.forEach((log: any) => {
      if (log.aircraftId) {
        aircraftHours[log.aircraftId] = (aircraftHours[log.aircraftId] || 0) + (log.totalHours || 0);
      }
    });
    
    const topUtilized = Object.entries(aircraftHours)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([aircraftId, hours]) => {
        const aircraft = aircraftNames.find((a: any) => a.id === aircraftId);
        return {
          aircraft: aircraft ? aircraft.callSign : aircraftId,
          hours,
          flights: aircraftUtilization.filter((log: any) => log.aircraftId === aircraftId).length
        };
      });

    // Process top instructors (simplified)
    const instructorHours = topInstructorsResult.data || [];
    const userNames = userNamesResult.data || [];
    const instructorStats: { [key: string]: { hours: number; flights: number } } = {};
    instructorHours.forEach((log: any) => {
      if (log.instructorId) {
        if (!instructorStats[log.instructorId]) {
          instructorStats[log.instructorId] = { hours: 0, flights: 0 };
        }
        instructorStats[log.instructorId].hours += log.totalHours || 0;
        instructorStats[log.instructorId].flights += 1;
      }
    });
    const topInstructors = Object.entries(instructorStats)
      .sort(([, a], [, b]) => b.hours - a.hours)
      .slice(0, 5)
      .map(([instructorId, stats]) => {
        const user = userNames.find((u: any) => u.id === instructorId);
        return {
          name: user ? `${user.firstName} ${user.lastName}` : instructorId,
          flights: stats.flights,
          hours: stats.hours
        };
      });

    // Get most active aircraft name - use the top utilized aircraft instead
    const mostActiveAircraftId = topUtilized.length > 0 ? 
      Object.keys(aircraftHours).sort((a, b) => aircraftHours[b] - aircraftHours[a])[0] : null;
    const mostActiveAircraft = mostActiveAircraftId ? 
      aircraftNames.find((a: any) => a.id === mostActiveAircraftId) : null;
    const mostActiveAircraftName = mostActiveAircraft ? 
      mostActiveAircraft.callSign : 
      (mostActiveAircraftId ? mostActiveAircraftId : 'N/A');

    // Debug logging for aircraft names
    console.log('🔍 Reports Debug - Aircraft Names Count:', aircraftNames.length);
    console.log('🔍 Reports Debug - Top Utilized Aircraft Names:', topUtilized.map(t => t.aircraft));
    console.log('🔍 Reports Debug - Most Active Aircraft Name:', mostActiveAircraftName);

    // Get most active pilot name
    const mostActivePilotId = mostActivePilotResult.count ? 
      currentFlightLogs.find((log: any) => log.pilotId)?.pilotId : null;
    const mostActivePilot = mostActivePilotId ? 
      userNames.find((u: any) => u.id === mostActivePilotId) : null;
    const mostActivePilotName = mostActivePilot ? 
      `${mostActivePilot.firstName} ${mostActivePilot.lastName}` : 'N/A';

    // Get top destination name
    const airfieldNames = airfieldNamesResult.data || [];
    const topDestinationId = topDestinationResult.count ? 
      currentFlightLogs.find((log: any) => log.arrivalAirfieldId)?.arrivalAirfieldId : null;
    const topDestination = topDestinationId ? 
      airfieldNames.find((a: any) => a.id === topDestinationId) : null;
    const topDestinationName = topDestination ? 
      `${topDestination.name} (${topDestination.code})` : 'N/A';

    // Build comprehensive report
    const report = {
      flightStats: {
        totalFlights: finalTotalFlights,
        totalHours: finalTotalHours,
        flightsThisMonth: finalTotalFlights,
        hoursThisMonth: finalTotalHours,
        averageFlightDuration: finalAverageFlightDuration,
        mostActiveAircraft: mostActiveAircraftName,
        mostActivePilot: mostActivePilotName,
        topDestination: topDestinationName,
        previousFlights,
        previousHours,
        flightsChange,
        hoursChange
      },
      userStats: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        usersByRole: roleDistribution,
        topInstructors
      },
      aircraftStats: {
        totalAircraft,
        activeAircraft,
        maintenanceDue,
        utilizationRate,
        topUtilized
      },
      financialStats: {
        totalRevenue: 0, // Placeholder - would need financial data
        revenueThisMonth: 0,
        averageRevenuePerFlight: 0,
        topRevenueSources: [],
        previousRevenue: 0,
        revenueChange: 0
      }
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