import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// PUT /api/base-management/[id] - Update base management
export async function PUT(request: NextRequest) {
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
    
    // Check if user has appropriate permissions
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN') && 
        !AuthService.hasRole(userRoles, 'ADMIN') && 
        !AuthService.hasRole(userRoles, 'BASE_MANAGER')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const pathSegments = request.nextUrl.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1]; // Get ID from URL
    const body = await request.json();

    console.log('PUT /api/base-management/[id] - Request body:', body);
    console.log('PUT /api/base-management/[id] - Base ID:', id);
    console.log('PUT /api/base-management/[id] - Path segments:', pathSegments);

    // Validate baseManagerId if provided
    if (body.baseManagerId && body.baseManagerId !== null) {
      const managerExists = await prisma.user.findUnique({
        where: { id: body.baseManagerId },
        select: { id: true }
      });
      
      if (!managerExists) {
        console.error('Invalid baseManagerId provided:', body.baseManagerId);
        return NextResponse.json(
          { error: 'Invalid base manager ID provided' },
          { status: 400 }
        );
      }
    }

    // Check if base management exists
    const existingBaseManagement = await prisma.baseManagement.findUnique({
      where: { id },
      include: { airfield: true },
    });

    if (!existingBaseManagement) {
      return NextResponse.json(
        { error: 'Base management not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData = {
      baseManagerId: body.baseManagerId || null,
      additionalInfo: body.additionalInfo || null,
      facilities: body.facilities || [],
      operatingHours: body.operatingHours || null,
      emergencyContact: body.emergencyContact || null,
      notes: body.notes || null,
    };

    console.log('PUT /api/base-management/[id] - Update data:', updateData);

    // Update base management
    const updatedBaseManagement = await prisma.baseManagement.update({
      where: { id },
      data: updateData,
      include: {
        airfield: true,
        baseManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedBaseManagement);
  } catch (error) {
    console.error('Error updating base management:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/base-management/[id] - Delete base management
export async function DELETE(request: NextRequest) {
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
    
    // Only SUPER_ADMIN can delete base managements
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const pathSegments = request.nextUrl.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1]; // Get ID from URL

    // Check if base management exists
    const existingBaseManagement = await prisma.baseManagement.findUnique({
      where: { id },
      include: { airfield: true },
    });

    if (!existingBaseManagement) {
      return NextResponse.json(
        { error: 'Base management not found' },
        { status: 404 }
      );
    }

    // Delete base management
    await prisma.baseManagement.delete({
      where: { id },
    });

    // Update airfield to remove base designation
    await prisma.airfield.update({
      where: { id: existingBaseManagement.airfieldId },
      data: { isBase: false },
    });

    return NextResponse.json(
      { message: 'Base management deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting base management:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 