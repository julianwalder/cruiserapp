import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'overview';
    const timeframe = searchParams.get('timeframe') || 'month';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    switch (timeframe) {
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
    }

    let csvContent = '';

    switch (reportType) {
      case 'flights':
        csvContent = await generateFlightCSV(startDate, endDate);
        break;
      case 'users':
        csvContent = await generateUserCSV(startDate, endDate);
        break;
      case 'aircraft':
        csvContent = await generateAircraftCSV(startDate, endDate);
        break;
      case 'financial':
        csvContent = await generateFinancialCSV(startDate, endDate);
        break;
      default:
        csvContent = await generateOverviewCSV(startDate, endDate);
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateFlightCSV(startDate: Date, endDate: Date) {
  const flights = await prisma.flightLog.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      aircraft: { select: { callSign: true } },
      pilot: { select: { firstName: true, lastName: true } },
      instructor: { select: { firstName: true, lastName: true } },
      departureAirfield: { select: { code: true, name: true } },
      arrivalAirfield: { select: { code: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });

  const headers = [
    'Date',
    'Aircraft',
    'Pilot',
    'Instructor',
    'Departure',
    'Arrival',
    'Flight Type',
    'Total Hours',
    'Purpose',
    'Remarks',
  ];

  const rows = flights.map(flight => [
    flight.date.toISOString().split('T')[0],
    flight.aircraft.callSign,
    `${flight.pilot.firstName} ${flight.pilot.lastName}`,
    flight.instructor ? `${flight.instructor.firstName} ${flight.instructor.lastName}` : '',
    `${flight.departureAirfield.code} - ${flight.departureAirfield.name}`,
    `${flight.arrivalAirfield.code} - ${flight.arrivalAirfield.name}`,
    flight.flightType,
    flight.totalHours.toString(),
    flight.purpose || '',
    flight.remarks || '',
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

async function generateUserCSV(startDate: Date, endDate: Date) {
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: { select: { name: true } },
        },
      },
      pilotFlightLogs: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { totalHours: true },
      },
    },
  });

  const headers = [
    'Name',
    'Email',
    'Roles',
    'Status',
    'Total Flight Hours',
    'Hours This Period',
    'License Number',
    'Medical Class',
    'Created Date',
  ];

  const rows = users.map(user => [
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.userRoles.map(ur => ur.role.name).join(', '),
    user.status,
    user.totalFlightHours.toString(),
    user.pilotFlightLogs.reduce((sum, log) => sum + log.totalHours, 0).toString(),
    user.licenseNumber || '',
    user.medicalClass || '',
    user.createdAt.toISOString().split('T')[0],
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

async function generateAircraftCSV(startDate: Date, endDate: Date) {
  const aircraft = await prisma.aircraft.findMany({
    include: {
      flightLogs: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { totalHours: true },
      },
    },
  });

  const headers = [
    'Call Sign',
    'Serial Number',
    'Status',
    'Total Hours This Period',
    'Flights This Period',
    'Year of Manufacture',
  ];

  const rows = aircraft.map(ac => [
    ac.callSign,
    ac.serialNumber || '',
    ac.status,
    ac.flightLogs.reduce((sum, log) => sum + log.totalHours, 0).toString(),
    ac.flightLogs.length.toString(),
    ac.yearOfManufacture.toString(),
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

async function generateFinancialCSV(startDate: Date, endDate: Date) {
  const flights = await prisma.flightLog.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    select: {
      totalHours: true,
      flightType: true,
      date: true,
      aircraft: { select: { callSign: true } },
    },
  });

  const rates = {
    INVOICED: 250,
    SCHOOL: 200,
    FERRY: 150,
    CHARTER: 300,
    DEMO: 180,
  };

  const headers = [
    'Date',
    'Aircraft',
    'Flight Type',
    'Hours',
    'Rate per Hour',
    'Revenue',
  ];

  const rows = flights.map(flight => {
    const rate = rates[flight.flightType as keyof typeof rates] || 200;
    const revenue = flight.totalHours * rate;
    return [
      flight.date.toISOString().split('T')[0],
      flight.aircraft.callSign,
      flight.flightType,
      flight.totalHours.toString(),
      rate.toString(),
      revenue.toString(),
    ];
  });

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

async function generateOverviewCSV(startDate: Date, endDate: Date) {
  // Generate a summary CSV with key metrics
  const [
    totalFlights,
    totalHours,
    totalUsers,
    totalAircraft,
    revenue
  ] = await Promise.all([
    prisma.flightLog.count({ where: { date: { gte: startDate, lte: endDate } } }),
    prisma.flightLog.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { totalHours: true },
    }),
    prisma.user.count(),
    prisma.aircraft.count(),
    prisma.flightLog.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { totalHours: true, flightType: true },
    }),
  ]);

  const rates = { INVOICED: 250, SCHOOL: 200, FERRY: 150, CHARTER: 300, DEMO: 180 };
  const totalRevenue = revenue.reduce((sum, flight) => {
    const rate = rates[flight.flightType as keyof typeof rates] || 200;
    return sum + (flight.totalHours * rate);
  }, 0);

  const headers = ['Metric', 'Value', 'Period'];
  const rows = [
    ['Total Flights', totalFlights.toString(), `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`],
    ['Total Hours', (totalHours._sum.totalHours || 0).toString(), `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`],
    ['Total Users', totalUsers.toString(), 'All Time'],
    ['Total Aircraft', totalAircraft.toString(), 'All Time'],
    ['Total Revenue', totalRevenue.toString(), `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`],
  ];

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
} 