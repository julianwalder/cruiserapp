import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';
import crypto from 'crypto';

const upgradeRoleSchema = z.object({
  newRole: z.enum(['STUDENT', 'PILOT', 'INSTRUCTOR']),
  validationData: z.object({
    licenseNumber: z.string().optional(),
    medicalClass: z.string().optional(),
    instructorRating: z.string().optional(),
    totalFlightHours: z.number().optional(),
    // Add any other validation fields you need
  }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    
    // Check if user has permission to upgrade roles (ADMIN+, SUPER_ADMIN, BASE_MANAGER, or INSTRUCTOR)
    if (!AuthService.hasRole(userRoles, 'ADMIN') && 
        !AuthService.hasRole(userRoles, 'SUPER_ADMIN') && 
        !AuthService.hasRole(userRoles, 'BASE_MANAGER') &&
        !AuthService.hasRole(userRoles, 'INSTRUCTOR')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to upgrade user roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = upgradeRoleSchema.parse(body);
    const { newRole, validationData } = validatedData;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Get the target user
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user currently has PROSPECT role
    const currentRoles = targetUser.user_roles.map((ur: any) => ur.roles.name);
    if (!currentRoles.includes('PROSPECT')) {
      return NextResponse.json(
        { error: 'User is not a prospect and cannot be upgraded' },
        { status: 400 }
      );
    }

    // Get the new role
    const { data: newRoleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', newRole)
      .single();

    if (roleError || !newRoleData) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Start a transaction to update user and role
    const { error: updateError } = await supabase
      .from('users')
      .update({
        licenseNumber: validationData?.licenseNumber || targetUser.licenseNumber,
        medicalClass: validationData?.medicalClass || targetUser.medicalClass,
        instructorRating: validationData?.instructorRating || targetUser.instructorRating,
        totalFlightHours: validationData?.totalFlightHours || targetUser.totalFlightHours || 0,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Remove PROSPECT role and add new role
    const { error: removeProspectError } = await supabase
      .from('user_roles')
      .delete()
      .eq('userId', params.id)
      .eq('roleId', (await supabase.from('roles').select('id').eq('name', 'PROSPECT').single()).data?.id);

    if (removeProspectError) {
      console.error('Error removing PROSPECT role:', removeProspectError);
      return NextResponse.json(
        { error: 'Failed to remove PROSPECT role' },
        { status: 500 }
      );
    }

    // Add new role
    const { error: addRoleError } = await supabase
      .from('user_roles')
      .insert({
        id: crypto.randomUUID(),
        userId: params.id,
        roleId: newRoleData.id,
        assignedAt: new Date().toISOString(),
      });

    if (addRoleError) {
      console.error('Error adding new role:', addRoleError);
      return NextResponse.json(
        { error: 'Failed to assign new role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `User role upgraded from PROSPECT to ${newRole} successfully`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        newRole,
      },
    });

  } catch (error: any) {
    console.error('Role upgrade error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 