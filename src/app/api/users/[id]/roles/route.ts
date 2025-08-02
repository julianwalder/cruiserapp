import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireAnyRole } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/users/[id]/roles - Get user roles
async function getUserRoles(request: NextRequest, currentUser: any) {
  try {
    const userId = request.nextUrl.pathname.split('/')[3]; // Extract user ID from path

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Get user with roles
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        userRoles (
          id,
          "assignedAt",
          "assignedBy",
          role (
            id,
            name,
            description
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Map roles to array of strings
    const roles = user.userRoles.map((ur: any) => ur.role.name);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        userRoles: user.userRoles,
      },
    });
  } catch (error) {
    console.error('Error getting user roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id]/roles - Update user roles
async function updateUserRoles(request: NextRequest, currentUser: any) {
  try {
    const userId = request.nextUrl.pathname.split('/')[3]; // Extract user ID from path
    const body = await request.json();

    // Validate required fields
    if (!body.roles || !Array.isArray(body.roles)) {
      return NextResponse.json(
        { error: 'Roles array is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email, "firstName", "lastName"')
      .eq('id', userId)
      .single();

    if (userError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find role records
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')
      .in('name', body.roles);

    if (rolesError || !roles || roles.length === 0) {
      return NextResponse.json(
        { error: 'No valid roles provided' },
        { status: 400 }
      );
    }

    // Delete existing roles
    const { error: deleteError } = await supabase
      .from('userRoles')
      .delete()
      .eq('userId', userId);

    if (deleteError) {
      console.error('Error deleting existing roles:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update user roles' },
        { status: 500 }
      );
    }

    // Create new role assignments
    const roleAssignments = roles.map((role) => ({
      userId: userId,
      roleId: role.id,
      assignedBy: currentUser.id,
      assignedAt: new Date().toISOString(),
    }));

    const { error: createError } = await supabase
      .from('userRoles')
      .insert(roleAssignments);

    if (createError) {
      console.error('Error creating new roles:', createError);
      return NextResponse.json(
        { error: 'Failed to update user roles' },
        { status: 500 }
      );
    }

    // Fetch updated user with roles
    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        userRoles (
          id,
          "assignedAt",
          "assignedBy",
          role (
            id,
            name,
            description
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated user:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated user' },
        { status: 500 }
      );
    }

    // Map roles to array of strings
    const updatedRoles = updatedUser.userRoles.map((ur: any) => ur.role.name);

    return NextResponse.json({
      message: 'User roles updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        roles: updatedRoles,
        userRoles: updatedUser.userRoles,
      },
    });
  } catch (error) {
    console.error('Error updating user roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export handlers with middleware
export const GET = requireAnyRole(['BASE_MANAGER', 'ADMIN', 'SUPER_ADMIN'])(getUserRoles);
export const PUT = requireAnyRole(['ADMIN', 'SUPER_ADMIN'])(updateUserRoles); 