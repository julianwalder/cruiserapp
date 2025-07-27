import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/base-management - List base managements
export async function GET(request: NextRequest) {
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
        !AuthService.hasRole(userRoles, 'BASE_MANAGER') &&
        !AuthService.hasRole(userRoles, 'PILOT')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const baseManagements = await prisma.baseManagement.findMany({
      include: {
        airfield: true,
        baseManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(baseManagements);
  } catch (error) {
    console.error('Error fetching base managements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/base-management - Create new base management
export async function POST(request: NextRequest) {
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
    
    // Only SUPER_ADMIN can create base managements
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.airfieldId) {
      return NextResponse.json(
        { error: 'Airfield ID is required' },
        { status: 400 }
      );
    }

    // Check if airfield exists and is not already a base
    const airfield = await prisma.airfield.findUnique({
      where: { id: body.airfieldId },
    });

    if (!airfield) {
      return NextResponse.json(
        { error: 'Airfield not found' },
        { status: 404 }
      );
    }

    if (airfield.isBase) {
      return NextResponse.json(
        { error: 'Airfield is already designated as a base' },
        { status: 409 }
      );
    }

    // Check if base management already exists for this airfield
    const existingBaseManagement = await prisma.baseManagement.findUnique({
      where: { airfieldId: body.airfieldId },
    });

    if (existingBaseManagement) {
      return NextResponse.json(
        { error: 'Base management already exists for this airfield' },
        { status: 409 }
      );
    }

    // Create base management
    const baseManagement = await prisma.baseManagement.create({
      data: {
        airfieldId: body.airfieldId,
        baseManagerId: body.baseManagerId || null,
        additionalInfo: body.additionalInfo || null,
        facilities: body.facilities || [],
        operatingHours: body.operatingHours || null,
        emergencyContact: body.emergencyContact || null,
        notes: body.notes || null,
      },
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

    // Update airfield to mark it as a base
    await prisma.airfield.update({
      where: { id: body.airfieldId },
      data: { isBase: true },
    });

    return NextResponse.json(baseManagement, { status: 201 });
  } catch (error) {
    console.error('Error creating base management:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 