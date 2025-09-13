import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    console.log('🎓 Students Status API called');
    
    // Check for includeInactive query parameter
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    console.log('📊 Include inactive students:', includeInactive);

    // Get authentication token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    // Verify token and get user info
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user has admin or base manager role
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get user roles
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('userId', payload.userId);

    if (roleError) {
      console.error('❌ Error fetching user roles:', roleError);
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 });
    }

    const userRoleNames = userRoles?.map((ur: any) => ur.roles?.name) || [];
    const hasAccess = userRoleNames.some(role => ['ADMIN', 'SUPER_ADMIN', 'BASE_MANAGER'].includes(role));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all students (users with STUDENT role only, not PILOT)
    let studentsQuery = supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "createdAt",
        "totalFlightHours",
        homebase_id,
        status,
        homebase:airfields!homebase_id (
          code
        ),
        user_roles (
          roles (
            name
          )
        )
      `);
    
    // Only filter by ACTIVE status if includeInactive is false
    if (!includeInactive) {
      studentsQuery = studentsQuery.eq('status', 'ACTIVE');
    }
    
    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    // Filter to only include users with STUDENT role and not PILOT
    const studentUsers = students?.filter(user => {
      const roleNames = user.user_roles?.map((ur: any) => ur.roles?.name) || [];
      return roleNames.includes('STUDENT') && !roleNames.includes('PILOT');
    }) || [];

    // Get flight logs for all students
    const studentIds = studentUsers.map(s => s.id);
    
    const { data: flightLogs, error: flightLogsError } = await supabase
      .from('flight_logs')
      .select(`
        id,
        "userId",
        date,
        "totalHours"
      `)
      .in('userId', studentIds)
      .order('date', { ascending: false });

    if (flightLogsError) {
      console.error('❌ Error fetching flight logs:', flightLogsError);
      return NextResponse.json({ error: 'Failed to fetch flight logs' }, { status: 500 });
    }

    // Note: We don't need hour packages data as we can calculate everything from flight logs

    // Calculate metrics for each student
    const studentsWithMetrics = studentUsers.map(student => {
      const studentFlightLogs = flightLogs?.filter(log => log.userId === student.id) || [];

      // Calculate metrics from flight logs only
      const totalHoursFlown = studentFlightLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
      
      const lastFlight = studentFlightLogs.length > 0 ? studentFlightLogs[0] : null;
      const lastFlightDate = lastFlight?.date || null;

      // Calculate days since start
      const startDate = new Date(student.createdAt);
      const currentDate = new Date();
      const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate average hours per week
      const weeksSinceStart = Math.max(1, Math.floor(daysSinceStart / 7)); // At least 1 week to avoid division by 0
      const averageHoursPerWeek = weeksSinceStart > 0 ? totalHoursFlown / weeksSinceStart : 0;

      // Calculate days since last flight
      const daysSinceLastFlight = lastFlightDate ? 
        Math.floor((currentDate.getTime() - new Date(lastFlightDate).getTime()) / (1000 * 60 * 60 * 24)) : 
        null;

      // Calculate average flight duration
      const averageFlightDuration = studentFlightLogs.length > 0 ? 
        studentFlightLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0) / studentFlightLogs.length : 
        0;

      // Calculate flights per week
      const flightsPerWeek = weeksSinceStart > 0 ? studentFlightLogs.length / weeksSinceStart : 0;

      return {
        id: student.id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        startDate: student.createdAt,
        homebase: (student.homebase as any)?.code || 'Not assigned',
        status: student.status,
        metrics: {
          totalHoursFlown,
          lastFlightDate,
          daysSinceStart,
          daysSinceLastFlight,
          averageHoursPerWeek: Math.round(averageHoursPerWeek * 10) / 10, // Round to 1 decimal
          averageFlightDuration: Math.round(averageFlightDuration * 10) / 10, // Round to 1 decimal
          totalFlights: studentFlightLogs.length,
          flightsPerWeek: Math.round(flightsPerWeek * 10) / 10, // Round to 1 decimal
          isActive: daysSinceLastFlight === null || daysSinceLastFlight <= 30, // Active if no flights or last flight within 30 days
        }
      };
    });

    // Sort by days since last flight (nulls first, then ascending)
    studentsWithMetrics.sort((a, b) => {
      if (a.metrics.lastFlightDate === null && b.metrics.lastFlightDate === null) return 0;
      if (a.metrics.lastFlightDate === null) return -1;
      if (b.metrics.lastFlightDate === null) return 1;
      return (b.metrics.daysSinceLastFlight || 0) - (a.metrics.daysSinceLastFlight || 0);
    });

    console.log('✅ Students status fetched successfully:', studentsWithMetrics.length);

    // Calculate summary statistics
    const activeStudents = studentsWithMetrics.filter(s => s.status === 'ACTIVE');
    const inactiveStudents = studentsWithMetrics.filter(s => s.status === 'INACTIVE');
    
    return NextResponse.json({
      students: studentsWithMetrics,
      summary: {
        totalStudents: studentsWithMetrics.length,
        activeStudents: activeStudents.length,
        inactiveStudents: inactiveStudents.length,
        currentStudents: studentsWithMetrics.filter(s => s.metrics.isActive).length,
        totalHoursFlown: studentsWithMetrics.reduce((sum, s) => sum + s.metrics.totalHoursFlown, 0),
        totalFlights: studentsWithMetrics.reduce((sum, s) => sum + s.metrics.totalFlights, 0),
        averageHoursPerWeek: studentsWithMetrics.length > 0 ? 
          Math.round((studentsWithMetrics.reduce((sum, s) => sum + s.metrics.averageHoursPerWeek, 0) / studentsWithMetrics.length) * 10) / 10 : 0
      }
    });

  } catch (error) {
    console.error('❌ Students Status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
