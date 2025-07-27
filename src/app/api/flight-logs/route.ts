import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user with roles to check permissions
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

    const userRoles = user.userRoles.map(ur => ur.role.name);
    const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
    const isBaseManager = userRoles.includes('BASE_MANAGER');
    const isInstructor = userRoles.includes('INSTRUCTOR');
    const isPilot = userRoles.includes('PILOT');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const flightType = searchParams.get('flightType') || '';
    const pilotId = searchParams.get('pilotId') || '';
    const aircraftId = searchParams.get('aircraftId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const viewMode = searchParams.get('viewMode') || 'personal';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Apply permission-based filtering based on viewMode
    if (viewMode === 'personal') {
      if (isPilot && !isInstructor && !isAdmin && !isBaseManager) {
        // Regular pilots can only see their own flight logs
        where.pilotId = user.id;
      } else if (isInstructor && !isAdmin && !isBaseManager) {
        // Instructors can see logs where they are the instructor OR their own logs
        where.OR = [
          { instructorId: user.id },
          { pilotId: user.id }
        ];
      } else if (isBaseManager && !isAdmin) {
        // Base managers see their own logs in personal view
        where.pilotId = user.id;
      }
      // Admins see their own logs in personal view
      else if (isAdmin) {
        where.pilotId = user.id;
      }
    }
    // In company view, admins, base managers, and instructors can see all logs
    // Regular pilots still only see their own logs
    else if (viewMode === 'company') {
      if (isPilot && !isInstructor && !isAdmin && !isBaseManager) {
        // Regular pilots can only see their own flight logs even in company view
        where.pilotId = user.id;
      }
      // Admins, base managers, and instructors can see all logs in company view
    }

    if (search) {
      where.OR = [
        { pilot: { firstName: { contains: search, mode: 'insensitive' } } },
        { pilot: { lastName: { contains: search, mode: 'insensitive' } } },
        { aircraft: { callSign: { contains: search, mode: 'insensitive' } } },
        { purpose: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (flightType) {
      where.flightType = flightType;
    }

    if (pilotId) {
      where.pilotId = pilotId;
    }

    if (aircraftId) {
      where.aircraftId = aircraftId;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    // Get flight logs with related data, sorted by date (descending) then by departure time (descending)
    const flightLogs = await prisma.flightLog.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { departureTime: 'desc' }
      ],
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
      skip,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.flightLog.count({ where });

    return NextResponse.json({
      flightLogs,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      currentPage: page,
      pageSize: limit,
    });
  } catch (error) {
    console.error('Error fetching flight logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user has permission to create flight logs
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

    const userRoles = user.userRoles.map(ur => ur.role.name);
    const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
    const isBaseManager = userRoles.includes('BASE_MANAGER');
    const isInstructor = userRoles.includes('INSTRUCTOR');
    const isPilot = userRoles.includes('PILOT');
    const isStudent = userRoles.includes('STUDENT');

    const hasPermission = isAdmin || isBaseManager || isInstructor || isPilot || isStudent;

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Additional validation for pilots and students
    const body = await request.json();
    
    if ((isPilot || isStudent) && !isInstructor && !isAdmin && !isBaseManager) {
      // Regular pilots and students can only create flight logs for themselves
      if (body.pilotId !== user.id) {
        return NextResponse.json(
          { error: 'Pilots and students can only create flight logs for themselves' },
          { status: 403 }
        );
      }
    }

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
      route,
      conditions,
      // Jeppesen time breakdown
      pilotInCommand = 0,
      secondInCommand = 0,
      dualReceived = 0,
      dualGiven = 0,
      solo = 0,
      crossCountry = 0,
      night = 0,
      instrument = 0,
      actualInstrument = 0,
      simulatedInstrument = 0,
      // Landings
      dayLandings = 0,
      nightLandings = 0,
      // Hobbs readings
      departureHobbs,
      arrivalHobbs,
      // Fuel and oil information
      oilAdded = 0,
      fuelAdded = 0,
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

    const totalHours = calculateFlightHours(departureTime, arrivalTime);

    // Create flight log
    const flightLog = await prisma.flightLog.create({
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
        purpose: purpose || null, // Handle undefined/null purpose
        remarks: remarks || null,
        totalHours,
        // Jeppesen time breakdown
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
        // Landings
        dayLandings,
        nightLandings,
        // Hobbs readings
        departureHobbs,
        arrivalHobbs,
        // Fuel and oil information
        oilAdded,
        fuelAdded,
        // Additional information
        route: route || null,
        conditions: conditions || null,
        createdById: user.id,
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

    // Update pilot's total flight hours
    await prisma.user.update({
      where: { id: pilotId },
      data: {
        totalFlightHours: {
          increment: totalHours,
        },
      },
    });

    return NextResponse.json({ flightLog }, { status: 201 });
  } catch (error) {
    console.error('Error creating flight log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 