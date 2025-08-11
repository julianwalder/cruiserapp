import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

async function getRoleCapabilities(request: NextRequest, currentUser: any) {
  try {
    // Extract role ID from the URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // /api/roles/{id}/capabilities
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

    // Get role capabilities using the database function
    const { data: capabilities, error } = await supabase
      .rpc('get_role_capabilities', { role_id: id });

    if (error) {
      console.error('Error fetching role capabilities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch role capabilities' },
        { status: 500 }
      );
    }

    // Group capabilities by resource type and resource name
    const groupedCapabilities = capabilities?.reduce((acc: any, cap: any) => {
      const key = `${cap.resource_type}.${cap.resource_name}`;
      if (!acc[key]) {
        acc[key] = {
          resourceType: cap.resource_type,
          resourceName: cap.resource_name,
          capabilities: []
        };
      }
      acc[key].capabilities.push({
        id: cap.capability_id,
        name: cap.capability_name,
        action: cap.action,
        description: cap.description,
        isGranted: cap.is_granted
      });
      return acc;
    }, {});

    return NextResponse.json({
      roleId: id,
      capabilities: Object.values(groupedCapabilities || {})
    });
  } catch (error) {
    console.error('Error in getRoleCapabilities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateRoleCapabilities(request: NextRequest, currentUser: any) {
  try {
    // Extract role ID from the URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // /api/roles/{id}/capabilities
    const { capabilities } = await request.json();

    if (!Array.isArray(capabilities)) {
      return NextResponse.json(
        { error: 'Capabilities must be an array' },
        { status: 400 }
      );
    }

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

    // Process each capability update
    const results = [];
    for (const cap of capabilities) {
      try {
        if (cap.isGranted) {
          // Grant capability
          const { data, error } = await supabase.rpc('grant_capability_to_role', {
            role_id: id,
            capability_id: cap.id,
            granted_by: currentUser.id
          });
          
          if (error) {
            results.push({ capabilityId: cap.id, success: false, error: error.message });
          } else {
            results.push({ capabilityId: cap.id, success: true });
          }
        } else {
          // Revoke capability
          const { data, error } = await supabase.rpc('revoke_capability_from_role', {
            role_id: id,
            capability_id: cap.id
          });
          
          if (error) {
            results.push({ capabilityId: cap.id, success: false, error: error.message });
          } else {
            results.push({ capabilityId: cap.id, success: true });
          }
        }
      } catch (error) {
        results.push({ capabilityId: cap.id, success: false, error: 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Updated ${successCount} capabilities${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
      successCount,
      failureCount
    });
  } catch (error) {
    console.error('Error in updateRoleCapabilities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return requireAuth(getRoleCapabilities)(request);
}

export async function PUT(request: NextRequest) {
  return requireAuth(updateRoleCapabilities)(request);
}
