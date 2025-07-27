import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '@/lib/middleware';
import { userUpdateSchema, userStatusUpdateSchema, userRoleUpdateSchema } from '@/lib/validations';

const prisma = new PrismaClient();

// GET /api/users/[id] - Get user details
async function getUser(request: NextRequest, currentUser: any) {
  try {
    const userId = request.nextUrl.pathname.split('/').pop();
    
    // Users can view their own profile, or ADMIN+ can view any profile
    if (currentUser.id !== userId && !requireRole('ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        personalNumber: true,
        phone: true,
        dateOfBirth: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        status: true,
        totalFlightHours: true,
        licenseNumber: true,
        medicalClass: true,
        instructorRating: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        userRoles: {
          include: {
            role: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ user });
    
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

    // Users can update their own profile, or ADMIN+ can update any profile
    if (currentUser.id !== userId && !requireRole('ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate input
    const validatedData = userUpdateSchema.parse(body);

    // Prepare update data
    const updateData: any = { ...validatedData };

    // Convert date string to Date object if provided, or null if empty
    if (validatedData.dateOfBirth && validatedData.dateOfBirth.trim() !== '' && validatedData.dateOfBirth !== 'null') {
      try {
        const date = new Date(validatedData.dateOfBirth);
        if (isNaN(date.getTime())) {
          updateData.dateOfBirth = null;
        } else {
          updateData.dateOfBirth = date;
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
    let roleUpdateData = {};
    let rolesToAssign: any[] = [];
    if ((validatedData as any).roles || (validatedData as any).role) {
      const roleNames = Array.isArray((validatedData as any).roles) && (validatedData as any).roles.length > 0
        ? (validatedData as any).roles
        : [(validatedData as any).role];

      console.log('Updating roles for user:', userId, 'New roles:', roleNames); // Debug log

      // Find role records
      const roles = await prisma.role.findMany({
        where: { name: { in: roleNames } },
      });

      console.log('Found roles in database:', roles.map(r => r.name)); // Debug log

      if (roles.length === 0) {
        return NextResponse.json(
          { error: 'No valid roles provided' },
          { status: 400 }
        );
      }

      // Remove existing roles and assign new ones
      roleUpdateData = {
        userRoles: {
          deleteMany: {},
        },
      };
      
      // Store roles to assign after user update
      rolesToAssign = roles;
    }

    // Remove role fields from updateData since we handle them separately
    delete updateData.role;
    delete updateData.roles;

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          ...roleUpdateData,
        },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      // Assign roles separately if needed
      if (rolesToAssign.length > 0) {
        await tx.userRole.createMany({
          data: rolesToAssign.map((role: any) => ({
            userId: user.id,
            roleId: role.id,
            assignedBy: currentUser.id || null,
            assignedAt: new Date(),
          })),
        });

        // Fetch updated user with roles
        const updatedUser = await tx.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: { include: { role: true } },
          },
        });

        // Map roles to array of strings
        const userWithRoles = {
          ...updatedUser,
          roles: updatedUser!.userRoles.map((ur: any) => ur.role.name),
        };

        console.log('Returning updated user with roles:', userWithRoles.roles); // Debug log
        return userWithRoles;
      }

      // Map roles to array of strings
      const userWithRoles = {
        ...user,
        roles: user.userRoles.map((ur: any) => ur.role.name),
      };

      console.log('Returning user without role changes:', userWithRoles.roles); // Debug log
      return userWithRoles;
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: result,
    });

  } catch (error: any) {
    console.error('Update user error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid role reference' },
        { status: 400 }
      );
    }

    console.error('Full error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });

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
    
    const user = await prisma.user.delete({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    
    return NextResponse.json({
      message: 'User deleted successfully',
      user,
    });
    
  } catch (error: any) {
    console.error('Delete user error:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id]/status - Update user status (ADMIN+ only)
async function updateUserStatus(request: NextRequest, currentUser: any) {
  try {
    const userId = request.nextUrl.pathname.split('/').pop();
    const body = await request.json();
    
    // Validate input
    const validatedData = userStatusUpdateSchema.parse(body);
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: validatedData.status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({
      message: 'User status updated successfully',
      user,
    });
    
  } catch (error: any) {
    console.error('Update user status error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id]/role - Update user role (ADMIN+ only)
async function updateUserRole(request: NextRequest, currentUser: any) {
  try {
    const userId = request.nextUrl.pathname.split('/').pop();
    const body = await request.json();
    
    // Validate input
    const validatedData = userRoleUpdateSchema.parse(body);
    
    // Find role records
    const roles = await prisma.role.findMany({
      where: { name: { in: validatedData.roles } },
    });

    if (roles.length === 0) {
      return NextResponse.json(
        { error: 'No valid roles provided' },
        { status: 400 }
      );
    }

    // First, delete existing roles
    await prisma.user.update({
      where: { id: userId },
      data: {
        userRoles: {
          deleteMany: {},
        },
      },
    });

    // Then create new roles
    await prisma.userRole.createMany({
      data: roles.map((role: any) => ({
        userId: userId!,
        roleId: role.id,
        assignedBy: currentUser.id,
        assignedAt: new Date(),
      })),
    });

    // Fetch updated user with roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
      },
    });
    
    // Map roles to array of strings
    const userWithRoles = {
      ...user,
      roles: user!.userRoles.map((ur: any) => ur.role.name),
    };
    
    return NextResponse.json({
      message: 'User role updated successfully',
      user: userWithRoles,
    });
    
  } catch (error: any) {
    console.error('Update user role error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export handlers with appropriate protection
export const GET = requireAuth(getUser);
export const PUT = requireAuth(updateUser);
export const DELETE = requireRole('ADMIN')(deleteUser);
export const PATCH = requireRole('ADMIN')(updateUserStatus); 