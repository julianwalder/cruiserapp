import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Homebase statistics API called');

    // Get token from request
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = payload.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user has admin privileges
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('userId', userId);

    if (roleError) {
      console.error('❌ Error fetching user roles:', roleError);
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      );
    }

    const roles = userRoles?.map(ur => ur.roles.name) || [];
    const isAdmin = roles.some(role => ['ADMIN', 'SUPER_ADMIN', 'BASE_MANAGER'].includes(role));

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get homebase statistics
    const { data: homebaseStats, error: statsError } = await supabase
      .from('users')
      .select(`
        homebase_id,
        airfields!homebase_id (
          id,
          name,
          icao,
          city,
          country
        ),
        user_roles (
          roles (
            name
          )
        )
      `)
      .not('homebase_id', 'is', null);

    if (statsError) {
      console.error('❌ Error fetching homebase statistics:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch homebase statistics' },
        { status: 500 }
      );
    }

    // Process the data to create statistics
    const statistics = {
      totalUsersWithHomebase: homebaseStats?.length || 0,
      homebaseDistribution: {} as Record<string, any>,
      roleDistribution: {} as Record<string, any>,
      homebaseByRole: {} as Record<string, Record<string, number>>
    };

    // Count users by homebase
    homebaseStats?.forEach(user => {
      const homebase = user.airfields;
      if (homebase) {
        const homebaseKey = `${homebase.name} (${homebase.icao})`;
        
        if (!statistics.homebaseDistribution[homebaseKey]) {
          statistics.homebaseDistribution[homebaseKey] = {
            name: homebase.name,
            icao: homebase.icao,
            city: homebase.city,
            country: homebase.country,
            count: 0
          };
        }
        statistics.homebaseDistribution[homebaseKey].count++;

        // Count by role
        const userRoles = user.user_roles || [];
        userRoles.forEach((userRole: any) => {
          const roleName = userRole.roles.name;
          
          if (!statistics.roleDistribution[roleName]) {
            statistics.roleDistribution[roleName] = 0;
          }
          statistics.roleDistribution[roleName]++;

          // Count homebase by role
          if (!statistics.homebaseByRole[roleName]) {
            statistics.homebaseByRole[roleName] = {};
          }
          if (!statistics.homebaseByRole[roleName][homebaseKey]) {
            statistics.homebaseByRole[roleName][homebaseKey] = 0;
          }
          statistics.homebaseByRole[roleName][homebaseKey]++;
        });
      }
    });

    // Get total users for percentage calculations
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (totalUsersError) {
      console.error('❌ Error fetching total users:', totalUsersError);
    }

    console.log('✅ Homebase statistics fetched successfully');

    return NextResponse.json({
      statistics: {
        ...statistics,
        totalUsers: totalUsers || 0,
        usersWithoutHomebase: (totalUsers || 0) - statistics.totalUsersWithHomebase
      },
      summary: {
        mostPopularHomebase: Object.entries(statistics.homebaseDistribution)
          .sort(([,a], [,b]) => b.count - a.count)[0] || null,
        leastPopularHomebase: Object.entries(statistics.homebaseDistribution)
          .sort(([,a], [,b]) => a.count - b.count)[0] || null,
        homebaseCoverage: statistics.totalUsersWithHomebase > 0 
          ? Math.round((statistics.totalUsersWithHomebase / (totalUsers || 1)) * 100)
          : 0
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in homebase statistics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
