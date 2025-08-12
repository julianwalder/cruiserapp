import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('userId', user.userId);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 });
    }

    const roles = userRoles?.map(ur => ur.roles.name) || [];
    const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    // Get all statuses from the database
    const { data: allStatuses, error: statusError } = await supabase
      .from('users')
      .select('status')
      .not('status', 'is', null);

    if (statusError) {
      console.error('Error fetching all statuses:', statusError);
      return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
    }

    const uniqueStatuses = [...new Set(allStatuses?.map(u => u.status) || [])].sort();

    // Test the list_users function
    const { data: listUsersResult, error: listUsersError } = await supabase.rpc('list_users');

    if (listUsersError) {
      console.error('Error calling list_users:', listUsersError);
      return NextResponse.json({ error: 'Failed to call list_users' }, { status: 500 });
    }

    const listUsersStatuses = [...new Set(listUsersResult?.map(u => u.status) || [])].sort();

    return NextResponse.json({
      currentUser: {
        id: user.userId,
        email: user.email,
        roles: roles,
        isAdmin: isAdmin
      },
      databaseStatuses: {
        all: uniqueStatuses,
        count: uniqueStatuses.length
      },
      listUsersFunction: {
        returnedStatuses: listUsersStatuses,
        count: listUsersStatuses.length,
        totalUsers: listUsersResult?.length || 0
      },
      analysis: {
        isAdmin: isAdmin,
        shouldSeeAllStatuses: isAdmin,
        missingStatuses: uniqueStatuses.filter(s => !listUsersStatuses.includes(s))
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
