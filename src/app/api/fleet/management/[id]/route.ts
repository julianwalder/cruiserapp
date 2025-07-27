import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user has admin or super admin role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasAccess = user.userRoles.some(
      (userRole) => userRole.role.name === 'SUPER_ADMIN' || userRole.role.name === 'ADMIN'
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const iCAOtypeId = params.id;
    const body = await request.json();
    const {
      assignedPilotId,
      maintenanceSchedule,
      operationalHours,
      fuelType,
      fuelCapacity,
      range,
      maxPassengers,
      maxPayload,
      specialEquipment,
      operationalNotes,
    } = body;

    // Check if iCAOtype exists
    const iCAOtype = await prisma.iCAOtype.findUnique({
      where: { id: iCAOtypeId },
    });

    if (!iCAOtype) {
      return NextResponse.json({ error: 'iCAOtype not found' }, { status: 404 });
    }

    // Check if assigned pilot exists and has PILOT role
    if (assignedPilotId) {
      const pilot = await prisma.user.findUnique({
        where: { id: assignedPilotId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!pilot) {
        return NextResponse.json({ error: 'Assigned pilot not found' }, { status: 404 });
      }

      const isPilot = pilot.userRoles.some(
        (userRole) => userRole.role.name === 'PILOT' || userRole.role.name === 'INSTRUCTOR'
      );

      if (!isPilot) {
        return NextResponse.json({ error: 'Assigned user must be a pilot or instructor' }, { status: 400 });
      }
    }

    // Upsert fleet management (create or update)
    const fleetManagement = await prisma.fleetManagement.upsert({
      where: { iCAOtypeId },
      update: {
        assignedPilotId: assignedPilotId || null,
        maintenanceSchedule: maintenanceSchedule || null,
        operationalHours: operationalHours || null,
        fuelType: fuelType || null,
        fuelCapacity: fuelCapacity ? parseFloat(fuelCapacity) : null,
        range: range ? parseFloat(range) : null,
        maxPassengers: maxPassengers ? parseInt(maxPassengers) : null,
        maxPayload: maxPayload ? parseFloat(maxPayload) : null,
        specialEquipment: specialEquipment || [],
        operationalNotes: operationalNotes || null,
      },
      create: {
        iCAOtypeId,
        assignedPilotId: assignedPilotId || null,
        maintenanceSchedule: maintenanceSchedule || null,
        operationalHours: operationalHours || null,
        fuelType: fuelType || null,
        fuelCapacity: fuelCapacity ? parseFloat(fuelCapacity) : null,
        range: range ? parseFloat(range) : null,
        maxPassengers: maxPassengers ? parseInt(maxPassengers) : null,
        maxPayload: maxPayload ? parseFloat(maxPayload) : null,
        specialEquipment: specialEquipment || [],
        operationalNotes: operationalNotes || null,
      },
      include: {
        assignedPilot: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ fleetManagement });
  } catch (error) {
    console.error('Error updating fleet management:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 