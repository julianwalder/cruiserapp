import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/operational-areas - List operational areas
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const operationalAreas = await prisma.operationalArea.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(operationalAreas);
  } catch (error) {
    console.error('Error fetching operational areas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/operational-areas - Create new operational area
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.continent || !body.countries || !Array.isArray(body.countries) || body.countries.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if operational area already exists for this user
    // We need to check for exact array match, so we'll get all areas and filter in code
    const existingOperationalAreas = await prisma.operationalArea.findMany({
      where: {
        continent: body.continent,
        createdById: user.id,
      },
    });

    const existingOperationalArea = existingOperationalAreas.find((area: any) => 
      JSON.stringify(area.countries.sort()) === JSON.stringify(body.countries.sort())
    );

    if (existingOperationalArea) {
      return NextResponse.json(
        { error: 'Operational area already exists for this continent and countries combination' },
        { status: 409 }
      );
    }

    // Create operational area
    const operationalArea = await prisma.operationalArea.create({
      data: {
        continent: body.continent,
        countries: body.countries,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(operationalArea, { status: 201 });
  } catch (error) {
    console.error('Error creating operational area:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/operational-areas - Delete operational area
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Operational area ID is required' },
        { status: 400 }
      );
    }

    // Check if operational area exists and belongs to the user
    const operationalArea = await prisma.operationalArea.findFirst({
      where: {
        id: id,
        createdById: user.id,
      },
    });

    if (!operationalArea) {
      return NextResponse.json(
        { error: 'Operational area not found' },
        { status: 404 }
      );
    }

    // Delete the operational area
    await prisma.operationalArea.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json(
      { message: 'Operational area deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting operational area:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 