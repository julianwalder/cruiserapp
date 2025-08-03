import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/middleware';
import { userUpdateSchema } from '@/lib/validations';
import { getSupabaseClient } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';
import crypto from 'crypto';
import { UUID } from '@/types/uuid-types';


// GET /api/users/[id] - Get user details
async function getUser(request: NextRequest, currentUser: any) {
  try {
    const userId = request.nextUrl.pathname.split('/').pop();
    
    // Check if user has admin role or is viewing their own profile
    const hasAdminRole = currentUser.user_roles?.some((userRole: any) => 
      userRole.roles.name === 'ADMIN' || userRole.roles.name === 'SUPER_ADMIN'
    );
    
    if (currentUser.id !== userId && !hasAdminRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "personalNumber",
        phone,
        "dateOfBirth",
        address,
        city,
        state,
        "zipCode",
        country,
        status,
        "totalFlightHours",
        "licenseNumber",
        "medicalClass",
        "instructorRating",
        "createdAt",
        "updatedAt",
        "lastLoginAt",
        user_roles (
          roles (
            name
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
    const userWithRoles = {
      ...user,
      roles: user.user_roles.map((ur: any) => ur.roles.name),
    };
    
    return NextResponse.json({ user: userWithRoles });
    
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
async function updateUser(request: NextRequest, currentUser: any) {
  try {
    const userId = request.nextUrl.pathname.split('/').pop();
    const body = await request.json();
    
    console.log('API received body:', body); // Debug log
    console.log('API received personalNumber:', body.personalNumber); // Debug log

    // Check if user has admin role or is updating their own profile
    const hasAdminRole = currentUser.user_roles?.some((userRole: any) => 
      userRole.roles.name === 'ADMIN' || userRole.roles.name === 'SUPER_ADMIN'
    );
    
    if (currentUser.id !== userId && !hasAdminRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate input
    const validatedData = userUpdateSchema.parse(body);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    console.log('Update data before processing:', updateData); // Debug log
    console.log('Personal Number in updateData:', updateData.personalNumber); // Debug log
    
    // Remove roles from update data since they're handled separately
    delete updateData.roles;
    delete updateData.role;

    // Convert date string to Date object if provided, or null if empty
    if (validatedData.dateOfBirth && validatedData.dateOfBirth.trim() !== '' && validatedData.dateOfBirth !== 'null') {
      try {
        const date = new Date(validatedData.dateOfBirth);
        if (isNaN(date.getTime())) {
          updateData.dateOfBirth = null;
        } else {
          updateData.dateOfBirth = date.toISOString();
        }
      } catch (error) {
        updateData.dateOfBirth = null;
      }
    } else {
      updateData.dateOfBirth = null;
    }

    // Clean up empty string values to null for optional fields
    const optionalStringFields = ['personalNumber', 'phone', 'address', 'city', 'state', 'zipCode', 'country', 'licenseNumber', 'medicalClass', 'instructorRating'];
    optionalStringFields.forEach(field => {
      if (updateData[field] === '') {
        updateData[field] = null;
      }
    });

    // Handle role updates if provided
    let rolesToAssign: any[] = [];
    if ((validatedData as any).roles || (validatedData as any).role) {
      const roleNames = Array.isArray((validatedData as any).roles) && (validatedData as any).roles.length > 0
        ? (validatedData as any).roles
        : [(validatedData as any).role];

      // Find role records
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', roleNames);

      if (rolesError || !roles || roles.length === 0) {
        return NextResponse.json(
          { error: 'No valid roles provided' },
          { status: 400 }
        );
      }

      rolesToAssign = roles;
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "personalNumber",
        phone,
        "dateOfBirth",
        address,
        city,
        state,
        "zipCode",
        country,
        status,
        "totalFlightHours",
        "licenseNumber",
        "medicalClass",
        "instructorRating",
        "createdAt",
        "updatedAt",
        "lastLoginAt",
        user_roles (
          roles (
            name
          )
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user', details: updateError },
        { status: 500 }
      );
    }

    // Log user update activity
    if (userId) {
      const changes = Object.keys(updateData).filter(key => key !== 'updatedAt');
      await ActivityLogger.logUserUpdate(
        userId,
        currentUser.id,
        changes.reduce((acc, key) => ({ ...acc, [key]: updateData[key] }), {})
      );
    }

    // Handle role updates if needed
    if (rolesToAssign.length > 0) {
      // Delete existing roles
      const { error: deleteRolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('userId', userId);

      if (deleteRolesError) {
        console.error('Error deleting existing roles:', deleteRolesError);
        return NextResponse.json(
          { error: 'Failed to update user roles' },
          { status: 500 }
        );
      }

      // Create new role assignments
      const roleAssignments = rolesToAssign.map((role) => ({
        id: crypto.randomUUID(),
        userId: userId,
        roleId: role.id,
      }));

      const { error: createRolesError } = await supabase
        .from('user_roles')
        .insert(roleAssignments);

      if (createRolesError) {
        console.error('Error creating new roles:', createRolesError);
        return NextResponse.json(
          { error: 'Failed to assign new roles', details: createRolesError },
          { status: 500 }
        );
      }

      // Fetch updated user with roles
      const { data: userWithRoles, error: fetchError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          "firstName",
          "lastName",
          "personalNumber",
          phone,
          "dateOfBirth",
          address,
          city,
          state,
          "zipCode",
          country,
          status,
          "totalFlightHours",
          "licenseNumber",
          "medicalClass",
          "instructorRating",
          "createdAt",
          "updatedAt",
          "lastLoginAt",
          user_roles (
            roles (
              name
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching user with roles:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch updated user' },
          { status: 500 }
        );
      }

      const result = {
        ...userWithRoles,
        roles: userWithRoles.user_roles.map((ur: any) => ur.roles.name),
      };

      return NextResponse.json({
        message: 'User updated successfully',
        user: result,
      });
    }

    // Map roles to array of strings
    const userWithRoles = {
      ...updatedUser,
      roles: updatedUser.user_roles.map((ur: any) => ur.roles.name),
    };

    return NextResponse.json({
      message: 'User updated successfully',
      user: userWithRoles,
    });

  } catch (error: any) {
    console.error('Update user error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Return the specific error message if available
    if (error.message) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (ADMIN+ only)
async function deleteUser(request: NextRequest, currentUser: any) {
  try {
    const userId = request.nextUrl.pathname.split('/').pop();
    
    // Prevent self-deletion
    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
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
    
    const { data: user, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select('id, email, "firstName", "lastName"')
      .single();
    
    if (error) {
      console.error('Error deleting user:', error);
      
      // Handle foreign key constraint violations
      if (error.code === '23503') {
        // Check which table is causing the constraint violation
        if (error.message.includes('flight_logs')) {
          return NextResponse.json(
            { error: 'Cannot delete user because they have associated flight logs. Please delete the flight logs first or reassign them to another user.' },
            { status: 400 }
          );
        } else if (error.message.includes('user_roles')) {
          return NextResponse.json(
            { error: 'Cannot delete user because they have role assignments. Please remove their roles first.' },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { error: 'Cannot delete user because they have associated data in the system. Please remove all related records first.' },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to delete user', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'User deleted successfully',
      user,
    });
    
  } catch (error: any) {
    console.error('Delete user error:', error);
    
    // Handle specific error types
    if (error.code === '23503') {
      // Foreign key constraint violation
      if (error.message.includes('flight_logs')) {
        return NextResponse.json(
          { error: 'Cannot delete user because they have associated flight logs. Please delete the flight logs first or reassign them to another user.' },
          { status: 400 }
        );
      } else if (error.message.includes('user_roles')) {
        return NextResponse.json(
          { error: 'Cannot delete user because they have role assignments. Please remove their roles first.' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Cannot delete user because they have associated data in the system. Please remove all related records first.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message || 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Export handlers with middleware
export const GET = requireAuth(getUser);
export const PUT = requireAuth(updateUser);
export const DELETE = requireRole('ADMIN')(deleteUser); 