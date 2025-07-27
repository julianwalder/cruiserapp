import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 PUT request received for flight log update');
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      console.log('❌ Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('✅ Token verified, user ID:', decoded.userId);

    const { id } = await params;
    console.log('📝 Flight log ID to update:', id);

    // Check if user has permission to update flight logs
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
      console.log('❌ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('👤 User found:', user.email);
    console.log('🔑 User roles:', user.userRoles.map(ur => ur.role.name));

    const hasPermission = user.userRoles.some(
      (userRole) =>
        userRole.role.name === 'SUPER_ADMIN' ||
        userRole.role.name === 'ADMIN' ||
        userRole.role.name === 'BASE_MANAGER' ||
        userRole.role.name === 'INSTRUCTOR'
    );

    console.log('🔐 Has permission:', hasPermission);

    if (!hasPermission) {
      console.log('❌ Insufficient permissions');
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if flight log exists
    const existingFlightLog = await prisma.flightLog.findUnique({
      where: { id },
      include: {
        pilot: true,
      },
    });

    if (!existingFlightLog) {
      return NextResponse.json(
        { error: 'Flight log not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    console.log('📦 Request body received:', body);
    
    const {
      aircraftId,
      pilotId,
      instructorId,
      date,
      departureTime,
      arrivalTime,
      departureAirfieldId,
      arrivalAirfieldId,
      flightType,
      purpose,
      remarks,
      pilotInCommand,
      secondInCommand,
      dualReceived,
      dualGiven,
      solo,
      crossCountry,
      night,
      instrument,
      actualInstrument,
      simulatedInstrument,
      dayLandings,
      nightLandings,
      oilAdded,
      fuelAdded,
    } = body;

    // Validate required fields
    if (!aircraftId || !pilotId || !date || !departureTime || !arrivalTime || !departureAirfieldId || !arrivalAirfieldId || !flightType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate aircraft exists
    const aircraft = await prisma.aircraft.findUnique({
      where: { id: aircraftId },
    });

    if (!aircraft) {
      return NextResponse.json(
        { error: 'Aircraft not found' },
        { status: 404 }
      );
    }

    // Validate pilot exists
    const pilot = await prisma.user.findUnique({
      where: { id: pilotId },
    });

    if (!pilot) {
      return NextResponse.json(
        { error: 'Pilot not found' },
        { status: 404 }
      );
    }

    // Validate instructor if provided
    if (instructorId) {
      const instructor = await prisma.user.findUnique({
        where: { id: instructorId },
      });

      if (!instructor) {
        return NextResponse.json(
          { error: 'Instructor not found' },
          { status: 404 }
        );
      }
    }

    // Validate airfields exist
    const departureAirfield = await prisma.airfield.findUnique({
      where: { id: departureAirfieldId },
    });

    if (!departureAirfield) {
      return NextResponse.json(
        { error: 'Departure airfield not found' },
        { status: 404 }
      );
    }

    const arrivalAirfield = await prisma.airfield.findUnique({
      where: { id: arrivalAirfieldId },
    });

    if (!arrivalAirfield) {
      return NextResponse.json(
        { error: 'Arrival airfield not found' },
        { status: 404 }
      );
    }

    // Calculate total flight hours
    const calculateFlightHours = (departureTime: string, arrivalTime: string) => {
      const departure = new Date(`2000-01-01T${departureTime}`);
      const arrival = new Date(`2000-01-01T${arrivalTime}`);
      const diffMs = arrival.getTime() - departure.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHours);
    };

    const newTotalHours = calculateFlightHours(departureTime, arrivalTime);
    const hoursDifference = newTotalHours - existingFlightLog.totalHours;

    // Update flight log
    const flightLog = await prisma.flightLog.update({
      where: { id },
      data: {
        aircraftId,
        pilotId,
        instructorId,
        date: new Date(date),
        departureTime,
        arrivalTime,
        departureAirfieldId,
        arrivalAirfieldId,
        flightType,
        purpose,
        remarks,
        totalHours: newTotalHours,
        pilotInCommand,
        secondInCommand,
        dualReceived,
        dualGiven,
        solo,
        crossCountry,
        night,
        instrument,
        actualInstrument,
        simulatedInstrument,
        dayLandings,
        nightLandings,
        oilAdded,
        fuelAdded,
      },
      include: {
        aircraft: {
          include: {
            icaoReferenceType: true,
          },
        },
        pilot: true,
        instructor: true,
        departureAirfield: true,
        arrivalAirfield: true,
        createdBy: true,
      },
    });

    // Update pilot's total flight hours if pilot changed or hours changed
    if (pilotId !== existingFlightLog.pilotId) {
      // Remove hours from old pilot
      await prisma.user.update({
        where: { id: existingFlightLog.pilotId },
        data: {
          totalFlightHours: {
            decrement: existingFlightLog.totalHours,
          },
        },
      });

      // Add hours to new pilot
      await prisma.user.update({
        where: { id: pilotId },
        data: {
          totalFlightHours: {
            increment: newTotalHours,
          },
        },
      });
    } else if (hoursDifference !== 0) {
      // Update hours for same pilot
      await prisma.user.update({
        where: { id: pilotId },
        data: {
          totalFlightHours: {
            increment: hoursDifference,
          },
        },
      });
    }

    return NextResponse.json({ flightLog });
  } catch (error) {
    console.error('Error updating flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has permission to delete flight logs
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

    const hasPermission = user.userRoles.some(
      (userRole) =>
        userRole.role.name === 'SUPER_ADMIN' ||
        userRole.role.name === 'ADMIN'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if flight log exists
    const existingFlightLog = await prisma.flightLog.findUnique({
      where: { id },
      include: {
        pilot: true,
      },
    });

    if (!existingFlightLog) {
      return NextResponse.json(
        { error: 'Flight log not found' },
        { status: 404 }
      );
    }

    // Remove flight hours from pilot's total
    await prisma.user.update({
      where: { id: existingFlightLog.pilotId },
      data: {
        totalFlightHours: {
          decrement: existingFlightLog.totalHours,
        },
      },
    });

    // Delete flight log
    await prisma.flightLog.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Flight log deleted successfully' });
  } catch (error) {
    console.error('Error deleting flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 