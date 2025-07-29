import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/reports/analytics - Get detailed analytics
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    let dateFrom: string;
    let dateTo: string;
    const now = new Date();

    if (startDate && endDate) {
      dateFrom = startDate;
      dateTo = endDate;
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
          dateFrom = weekStart.toISOString().split('T')[0];
          dateTo = weekEnd.toISOString().split('T')[0];
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
          dateFrom = monthStart.toISOString().split('T')[0];
          dateTo = monthEnd.toISOString().split('T')[0];
          break;
        case 'quarter':
          const currentMonth = now.getMonth();
          const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
          const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
          const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
          quarterEnd.setHours(23, 59, 59, 999);
          dateFrom = quarterStart.toISOString().split('T')[0];
          dateTo = quarterEnd.toISOString().split('T')[0];
          break;
        case 'year':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          const yearEnd = new Date(now.getFullYear(), 11, 31);
          yearEnd.setHours(23, 59, 59, 999);
          dateFrom = yearStart.toISOString().split('T')[0];
          dateTo = yearEnd.toISOString().split('T')[0];
          break;
        default:
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          dateTo = now.toISOString().split('T')[0];
      }
    }

    // Fetch analytics data
    const [
      flightTrendsResult,
      userGrowthResult,
      aircraftUtilizationResult,
      instructorPerformanceResult,
      maintenanceAlertsResult,
      safetyMetricsResult
    ] = await Promise.all([
      // Flight trends over time
      supabase
        .from('flight_logs')
        .select(`
          date,
          "flightDuration",
          type
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true }),
      
      // User growth trends
      supabase
        .from('users')
        .select(`
          "createdAt",
          status
        `)
        .gte('createdAt', dateFrom)
        .lte('createdAt', dateTo),
      
      // Aircraft utilization patterns
      supabase
        .from('flight_logs')
        .select(`
          "aircraftId",
          "flightDuration",
          date
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .not('aircraftId', 'is', null),
      
      // Instructor performance metrics
      supabase
        .from('flight_logs')
        .select(`
          "instructorId",
          "flightDuration",
          date,
          type
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .not('instructorId', 'is', null),
      
      // Maintenance alerts
      supabase
        .from('aircraft')
        .select(`
          id,
          "registrationNumber",
          "nextMaintenanceDate",
          "insuranceExpiryDate",
          "registrationExpiryDate",
          status
        `)
        .or('status.eq.MAINTENANCE,nextMaintenanceDate.lte.' + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      
      // Safety metrics (flight types, durations, etc.)
      supabase
        .from('flight_logs')
        .select(`
          type,
          "flightDuration",
          "purpose",
          date
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
    ]);

    // Process flight trends
    const flightLogs = flightTrendsResult.data || [];
    const dailyFlights: { [key: string]: { count: number; hours: number } } = {};
    flightLogs.forEach((log: any) => {
      const date = log.date;
      if (!dailyFlights[date]) {
        dailyFlights[date] = { count: 0, hours: 0 };
      }
      dailyFlights[date].count += 1;
      dailyFlights[date].hours += log.flightDuration || 0;
    });

    const flightTrends = Object.entries(dailyFlights)
      .map(([date, data]) => ({
        date,
        flights: data.count,
        hours: data.hours
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process user growth
    const users = userGrowthResult.data || [];
    const userGrowth = users.reduce((acc: any, user: any) => {
      const date = user.createdAt.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const userGrowthTrend = Object.entries(userGrowth)
      .map(([date, count]) => ({ date, newUsers: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process aircraft utilization
    const aircraftLogs = aircraftUtilizationResult.data || [];
    const aircraftStats: { [key: string]: { hours: number; flights: number; avgDuration: number } } = {};
    aircraftLogs.forEach((log: any) => {
      if (log.aircraftId) {
        if (!aircraftStats[log.aircraftId]) {
          aircraftStats[log.aircraftId] = { hours: 0, flights: 0, avgDuration: 0 };
        }
        aircraftStats[log.aircraftId].hours += log.flightDuration || 0;
        aircraftStats[log.aircraftId].flights += 1;
      }
    });

    // Calculate average duration for each aircraft
    Object.keys(aircraftStats).forEach(aircraftId => {
      const stats = aircraftStats[aircraftId];
      stats.avgDuration = stats.flights > 0 ? stats.hours / stats.flights : 0;
    });

    const topAircraft = Object.entries(aircraftStats)
      .sort(([, a], [, b]) => b.hours - a.hours)
      .slice(0, 10)
      .map(([aircraftId, stats]) => ({
        aircraftId,
        ...stats
      }));

    // Process instructor performance
    const instructorLogs = instructorPerformanceResult.data || [];
    const instructorStats: { [key: string]: { hours: number; flights: number; studentFlights: number } } = {};
    instructorLogs.forEach((log: any) => {
      if (log.instructorId) {
        if (!instructorStats[log.instructorId]) {
          instructorStats[log.instructorId] = { hours: 0, flights: 0, studentFlights: 0 };
        }
        instructorStats[log.instructorId].hours += log.flightDuration || 0;
        instructorStats[log.instructorId].flights += 1;
        if (log.type === 'TRAINING' || log.type === 'INSTRUCTION') {
          instructorStats[log.instructorId].studentFlights += 1;
        }
      }
    });

    const topInstructors = Object.entries(instructorStats)
      .sort(([, a], [, b]) => b.hours - a.hours)
      .slice(0, 10)
      .map(([instructorId, stats]) => ({
        instructorId,
        ...stats
      }));

    // Process maintenance alerts
    const maintenanceAlerts = maintenanceAlertsResult.data || [];
    const alerts = maintenanceAlerts.map((aircraft: any) => {
      const alerts = [];
      if (aircraft.status === 'MAINTENANCE') {
        alerts.push('Currently in maintenance');
      }
      if (aircraft.nextMaintenanceDate && new Date(aircraft.nextMaintenanceDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        alerts.push('Maintenance due soon');
      }
      if (aircraft.insuranceExpiryDate && new Date(aircraft.insuranceExpiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        alerts.push('Insurance expiring soon');
      }
      if (aircraft.registrationExpiryDate && new Date(aircraft.registrationExpiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        alerts.push('Registration expiring soon');
      }
      return {
        aircraftId: aircraft.id,
        registration: aircraft.registrationNumber,
        alerts
      };
    }).filter(aircraft => aircraft.alerts.length > 0);

    // Process safety metrics
    const safetyLogs = safetyMetricsResult.data || [];
    const flightTypes = safetyLogs.reduce((acc: any, log: any) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {});

    const avgFlightDuration = safetyLogs.length > 0 
      ? safetyLogs.reduce((sum: number, log: any) => sum + (log.flightDuration || 0), 0) / safetyLogs.length 
      : 0;

    const analytics = {
      flightTrends,
      userGrowth: userGrowthTrend,
      topAircraft,
      topInstructors,
      maintenanceAlerts: alerts,
      safetyMetrics: {
        flightTypes,
        avgFlightDuration,
        totalFlights: safetyLogs.length,
        totalHours: safetyLogs.reduce((sum: number, log: any) => sum + (log.flightDuration || 0), 0)
      },
      summary: {
        period: { from: dateFrom, to: dateTo },
        totalFlights: flightLogs.length,
        totalHours: flightLogs.reduce((sum: number, log: any) => sum + (log.flightDuration || 0), 0),
        newUsers: users.length,
        activeAircraft: Object.keys(aircraftStats).length,
        activeInstructors: Object.keys(instructorStats).length,
        maintenanceAlerts: alerts.length
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 