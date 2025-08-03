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
      totalAircraftResult
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
      
      // Total aircraft
      supabase.from('aircraft').select('id', { count: 'exact', head: true })
    ]);

    // Extract counts from results
    const totalUsers = totalUsersResult.count || 0;
    const activeUsers = activeUsersResult.count || 0;
    const pendingApprovals = pendingApprovalsResult.count || 0;
    const totalAirfields = totalAirfieldsResult.count || 0;
    const activeAirfields = activeAirfieldsResult.count || 0;
    const totalAircraft = totalAircraftResult.count || 0;

    // Placeholder values for flight statistics (will be implemented with flight scheduling)
    const todayFlights = 0;
    const scheduledFlights = 0;

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
      },
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