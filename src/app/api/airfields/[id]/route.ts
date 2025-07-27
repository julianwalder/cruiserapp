import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/airfields/[id] - Get airfield by ID
export async function GET(
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

    const { id } = await params;
    const airfield = await prisma.airfield.findUnique({
      where: { id },
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

    if (!airfield) {
      return NextResponse.json({ error: 'Airfield not found' }, { status: 404 });
    }

    return NextResponse.json(airfield);
  } catch (error) {
    console.error('Error fetching airfield:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/airfields/[id] - Update airfield
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

    // Check if user has permission to update airfields
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    if (!userRoles.some(role => ['ADMIN', 'SUPER_ADMIN', 'BASE_MANAGER'].includes(role))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    // Check if airfield exists
    const existingAirfield = await prisma.airfield.findUnique({
      where: { id },
    });

    if (!existingAirfield) {
      return NextResponse.json({ error: 'Airfield not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.code || !body.city || !body.country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if airfield code already exists (excluding current airfield)
    if (body.code !== existingAirfield.code) {
      const codeExists = await prisma.airfield.findUnique({
        where: { code: body.code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: 'Airfield code already exists' },
          { status: 400 }
        );
      }
    }

    // Update airfield
    const airfield = await prisma.airfield.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        type: body.type,
        status: body.status,
        city: body.city,
        state: body.state,
        country: body.country,
        latitude: body.latitude,
        longitude: body.longitude,
        elevation: body.elevation,
        phone: body.phone,
        email: body.email,
        website: body.website,
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

    return NextResponse.json(airfield);
  } catch (error) {
    console.error('Error updating airfield:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/airfields/[id] - Delete airfield
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

    // Check if user has permission to delete airfields
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    if (!userRoles.some(role => ['ADMIN', 'SUPER_ADMIN'].includes(role))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    // Check if airfield exists
    const existingAirfield = await prisma.airfield.findUnique({
      where: { id },
    });

    if (!existingAirfield) {
      return NextResponse.json({ error: 'Airfield not found' }, { status: 404 });
    }

    // Delete airfield
    await prisma.airfield.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Airfield deleted successfully' });
  } catch (error) {
    console.error('Error deleting airfield:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/airfields/[id] - Update airfield (toggle base status)
export async function PATCH(
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

    // Check if user is super admin
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isBase } = body;

    // Validate the airfield exists
    const existingAirfield = await prisma.airfield.findUnique({
      where: { id: params.id },
    });

    if (!existingAirfield) {
      return NextResponse.json(
        { error: 'Airfield not found' },
        { status: 404 }
      );
    }

    // Update the airfield
    const updatedAirfield = await prisma.airfield.update({
      where: { id: params.id },
      data: {
        isBase: isBase,
      },
    });

    return NextResponse.json(updatedAirfield);
  } catch (error) {
    console.error('Error updating airfield:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 