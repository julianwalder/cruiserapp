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

    // Get all users with their roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        "firstName",
        "lastName",
        email,
        status,
        user_roles (
          roles (
            name
          )
        )
      `)
      .order('"firstName"', { ascending: true });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Get all available roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('name, description')
      .order('name', { ascending: true });

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    // Filter users with appropriate roles for base management
    const baseManagerCandidates = (users || []).filter((user: any) => {
      const userRoles = user.user_roles?.map((ur: any) => ur.roles.name) || [];
      return userRoles.some((role: string) => 
        ['ADMIN', 'SUPER_ADMIN', 'BASE_MANAGER'].includes(role)
      );
    });

    return NextResponse.json({
      allUsers: users || [],
      baseManagerCandidates,
      allRoles: roles || [],
      totalUsers: users?.length || 0,
      totalBaseManagerCandidates: baseManagerCandidates.length,
      message: 'Debug information for base managers'
    });

  } catch (error) {
    console.error('Debug base managers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
