import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// PUT /api/base-management/[id] - Assign base manager
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.managerId) {
      return NextResponse.json(
        { error: 'Manager ID is required' },
        { status: 400 }
      );
    }

    // Check if manager exists and has appropriate role
    const { data: managerExists, error: managerError } = await supabase
      .from('users')
      .select(`
        id,
        "firstName",
        "lastName",
        userRoles (
          role (
            name
          )
        )
      `)
      .eq('id', body.managerId)
      .single();

    if (managerError || !managerExists) {
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 404 }
      );
    }

    // Check if user has appropriate role (ADMIN, SUPER_ADMIN, or BASE_MANAGER)
    const managerRoles = managerExists.userRoles.map((ur: any) => ur.role.name);
    const hasAppropriateRole = managerRoles.some((role: string) => 
      ['ADMIN', 'SUPER_ADMIN', 'BASE_MANAGER'].includes(role)
    );

    if (!hasAppropriateRole) {
      return NextResponse.json(
        { error: 'Manager must have ADMIN, SUPER_ADMIN, or BASE_MANAGER role' },
        { status: 400 }
      );
    }

    // Check if base management already exists for this airfield
    const { data: existingBaseManagement, error: existingError } = await supabase
      .from('baseManagement')
      .select('id, "managerId"')
      .eq('airfieldId', id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing base management:', existingError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (existingBaseManagement) {
      // Update existing base management
      const { data: updatedBaseManagement, error: updateError } = await supabase
        .from('baseManagement')
        .update({
          managerId: body.managerId,
          assignedAt: new Date().toISOString(),
          assignedBy: user.id,
        })
        .eq('airfieldId', id)
        .select(`
          id,
          "airfieldId",
          "managerId",
          "assignedAt",
          "assignedBy"
        `)
        .single();

      if (updateError) {
        console.error('Error updating base management:', updateError);
        return NextResponse.json(
          { error: 'Failed to update base management' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Base manager updated successfully',
        baseManagement: updatedBaseManagement,
      });
    } else {
      // Create new base management
      const { data: newBaseManagement, error: createError } = await supabase
        .from('baseManagement')
        .insert({
          airfieldId: id,
          managerId: body.managerId,
          assignedAt: new Date().toISOString(),
          assignedBy: user.id,
        })
        .select(`
          id,
          "airfieldId",
          "managerId",
          "assignedAt",
          "assignedBy"
        `)
        .single();

      if (createError) {
        console.error('Error creating base management:', createError);
        return NextResponse.json(
          { error: 'Failed to create base management' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Base manager assigned successfully',
        baseManagement: newBaseManagement,
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error managing base:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/base-management/[id] - Remove base manager
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { id } = await params;

    // Check if base management exists
    const { data: existingBaseManagement, error: existingError } = await supabase
      .from('baseManagement')
      .select('id')
      .eq('airfieldId', id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing base management:', existingError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!existingBaseManagement) {
      return NextResponse.json(
        { error: 'Base management not found' },
        { status: 404 }
      );
    }

    // Delete base management
    const { error: deleteError } = await supabase
      .from('baseManagement')
      .delete()
      .eq('airfieldId', id);

    if (deleteError) {
      console.error('Error deleting base management:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete base management' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Base manager removed successfully' });
  } catch (error) {
    console.error('Error removing base manager:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 