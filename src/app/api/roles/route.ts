import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

async function getRoles(request: NextRequest, currentUser: any) {
  try {
    // Check if user is super admin
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Verify user has SUPER_ADMIN role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('roles (name)')
      .eq('userId', currentUser.id);

    if (roleError) {
      console.error('Error checking user roles:', roleError);
      return NextResponse.json(
        { error: 'Failed to verify permissions' },
        { status: 500 }
      );
    }

    const hasSuperAdmin = userRoles?.some((ur: any) => ur.roles.name === 'SUPER_ADMIN');
    if (!hasSuperAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      );
    }

    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      );
    }

    return NextResponse.json({ roles: roles || [] });
  } catch (error) {
    console.error('Error in getRoles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createRole(request: NextRequest, currentUser: any) {
  try {
    // Check if user is super admin
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Verify user has SUPER_ADMIN role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('roles (name)')
      .eq('userId', currentUser.id);

    if (roleError) {
      console.error('Error checking user roles:', roleError);
      return NextResponse.json(
        { error: 'Failed to verify permissions' },
        { status: 500 }
      );
    }

    const hasSuperAdmin = userRoles?.some((ur: any) => ur.roles.name === 'SUPER_ADMIN');
    if (!hasSuperAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      );
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        name: name.toUpperCase(),
        description: description || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Role with this name already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create role' },
        { status: 500 }
      );
    }

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Error in createRole:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return requireAuth(getRoles)(request);
}

export async function POST(request: NextRequest) {
  return requireAuth(createRole)(request);
}
