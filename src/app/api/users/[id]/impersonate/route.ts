import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    console.log('🔍 Impersonation - Decoded token:', decoded);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: targetUserId } = await params;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get the current user (impersonator) with roles
    console.log('🔍 Impersonation - Looking for user with ID:', decoded.userId);
    
    // First get the user
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        firstName,
        lastName
      `)
      .eq('id', decoded.userId)
      .single();

    console.log('🔍 Impersonation - Current user query result:', { currentUser, currentUserError });

    if (currentUserError || !currentUser) {
      console.error('🔍 Impersonation - Current user not found:', { currentUserError, decoded });
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Then get the user's roles separately
    const { data: currentUserRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('userId', decoded.userId);

    console.log('🔍 Impersonation - Current user roles:', { currentUserRoles, rolesError });

    if (rolesError) {
      console.error('🔍 Impersonation - Error fetching user roles:', rolesError);
      return NextResponse.json({ error: 'Error fetching user roles' }, { status: 500 });
    }

    // Check if current user is SUPER_ADMIN
    const isSuperAdmin = currentUserRoles?.some((userRole: any) => 
      userRole.roles.name === 'SUPER_ADMIN'
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only SUPER_ADMIN users can impersonate other users' },
        { status: 403 }
      );
    }

    // Get the target user to impersonate
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        firstName,
        lastName,
        status
      `)
      .eq('id', targetUserId)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Get the target user's roles separately
    const { data: targetUserRoles, error: targetRolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('userId', targetUserId);

    if (targetRolesError) {
      console.error('🔍 Impersonation - Error fetching target user roles:', targetRolesError);
      return NextResponse.json({ error: 'Error fetching target user roles' }, { status: 500 });
    }

    // Prevent impersonating another SUPER_ADMIN
    const targetIsSuperAdmin = targetUserRoles?.some((userRole: any) => 
      userRole.roles.name === 'SUPER_ADMIN'
    );

    if (targetIsSuperAdmin) {
      return NextResponse.json(
        { error: 'Cannot impersonate another SUPER_ADMIN user' },
        { status: 403 }
      );
    }

    // Create impersonation token
    const impersonationToken = AuthService.createImpersonationToken(
      targetUser.id,
      targetUser.email,
      targetUser.firstName,
      targetUser.lastName,
      targetUserRoles?.map((ur: any) => ur.roles.name) || [],
      currentUser.id // Store the original user ID
    );

    // Log the impersonation action
    console.log(`SUPER_ADMIN ${currentUser.email} (${currentUser.id}) is impersonating ${targetUser.email} (${targetUser.id})`);

    return NextResponse.json({
      success: true,
      message: `Successfully impersonating ${targetUser.firstName} ${targetUser.lastName}`,
      impersonationToken,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        status: targetUser.status,
        roles: targetUserRoles?.map((ur: any) => ur.roles.name) || []
      },
      originalUser: {
        id: currentUser.id,
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName
      }
    });

  } catch (error) {
    console.error('Error during impersonation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
