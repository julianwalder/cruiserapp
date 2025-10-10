import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/middleware';
import { userUpdateSchema } from '@/lib/validations';
import { getSupabaseClient } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';
import { logger } from '@/lib/logger';
import crypto from 'crypto';


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
        "avatarUrl",
        homebase_id,
        homebase:airfields!homebase_id (
          id,
          name,
          code,
          city,
          country
        ),
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
    logger.error('Get user error:', error);
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

    logger.debug('API received body:', body);
    logger.debug('API received personalNumber:', body.personalNumber);

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

    logger.debug('Update data before processing:', updateData);
    logger.debug('Personal Number in updateData:', updateData.personalNumber);

    // Convert camelCase to snake_case for database
    if (updateData.homebaseId !== undefined) {
      updateData.homebase_id = updateData.homebaseId;
      delete updateData.homebaseId;
    }
    
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
        homebase_id,
        homebase:airfields!homebase_id (
          id,
          name,
          code,
          city,
          country
        ),
        user_roles (
          roles (
            name
          )
        )
      `)
      .single();

    if (updateError) {
      logger.error('Error updating user:', updateError);
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
        logger.error('Error deleting existing roles:', deleteRolesError);
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
        logger.error('Error creating new roles:', createRolesError);
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
          homebase_id,
          homebase:airfields!homebase_id (
            id,
            name,
            code,
            city,
            country
          ),
          user_roles (
            roles (
              name
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (fetchError) {
        logger.error('Error fetching user with roles:', fetchError);
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
    logger.error('Update user error:', error);

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

    // Check for flight logs where user is referenced in ANY capacity
    const { data: flightLogs, error: flightLogsError } = await supabase
      .from('flight_logs')
      .select('id, userId, instructorId, payer_id, createdById, updatedBy')
      .or(`userId.eq.${userId},instructorId.eq.${userId},payer_id.eq.${userId},createdById.eq.${userId},updatedBy.eq.${userId}`)
      .limit(1);

    if (flightLogsError) {
      logger.error('Error checking flight logs:', flightLogsError);
    }

    if (flightLogs && flightLogs.length > 0) {
      const log = flightLogs[0];
      let relationship = '';

      if (log.userId === userId) relationship = 'pilot';
      else if (log.instructorId === userId) relationship = 'instructor';
      else if (log.payer_id === userId) relationship = 'payer';
      else if (log.createdById === userId) relationship = 'creator';
      else if (log.updatedBy === userId) relationship = 'last updater';

      return NextResponse.json(
        {
          error: `Cannot delete user because they are referenced in flight logs as ${relationship}. Please reassign or delete the flight logs first.`
        },
        { status: 400 }
      );
    }

    // Delete user roles first (cascade delete)
    const { error: deleteRolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('userId', userId);

    if (deleteRolesError) {
      logger.error('Error deleting user roles:', deleteRolesError);
      return NextResponse.json(
        { error: 'Failed to delete user roles', details: deleteRolesError.message },
        { status: 500 }
      );
    }

    // Now delete the user
    const { data: user, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select('id, email, "firstName", "lastName"')
      .single();

    if (error) {
      logger.error('Error deleting user:', error);

      // Handle foreign key constraint violations
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Cannot delete user because they have associated data in the system. Please remove all related records first.', details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to delete user', details: error.message },
        { status: 500 }
      );
    }

    // Log user deletion activity
    logger.info('User deleted:', { deletedBy: currentUser.id, userId, email: user.email });

    return NextResponse.json({
      message: 'User deleted successfully',
      user,
    });

  } catch (error: any) {
    logger.error('Delete user error:', error);

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