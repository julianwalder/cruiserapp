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

    // Calculate date range based on timeframe
    let startDate: Date;
    let endDate: Date = new Date();

    switch (timeframe) {
      case 'week':
        // Current week (Monday to Sunday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so Monday = 1
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        // Current month (1st to last day)
        startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter':
        // Current quarter
        const currentMonth = new Date().getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        startDate = new Date(new Date().getFullYear(), quarterStartMonth, 1);
        endDate = new Date(new Date().getFullYear(), quarterStartMonth + 3, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        // Current year (Jan 1 to Dec 31)
        startDate = new Date(new Date().getFullYear(), 0, 1);
        endDate = new Date(new Date().getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Use custom date range if provided, otherwise use the calculated timeframe dates
    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
    }
    


    switch (reportType) {
      case 'flight-stats':
        return await getFlightStats(startDate, endDate);
      case 'user-stats':
        return await getUserStats(startDate, endDate);
      case 'aircraft-stats':
        return await getAircraftStats(startDate, endDate);
      case 'financial-stats':
        return await getFinancialStats(startDate, endDate);
      case 'overview':
      default:
        return await getOverviewStats(startDate, endDate, timeframe);
    }
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getFlightStats(startDate: Date, endDate: Date) {
  // Get flight statistics
  const [
    totalFlights,
    flightsInPeriod,
    totalHours,
    hoursInPeriod,
    averageFlightDuration,
    mostActiveAircraft,
    mostActivePilot,
    topDestination,
    flightTypes
  ] = await Promise.all([
    // Total flights
    prisma.flightLog.count(),
    
    // Flights in period
    prisma.flightLog.count({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    
    // Total hours
    prisma.flightLog.aggregate({
      _sum: {
        totalHours: true,
      },
    }),
    
    // Hours in period
    prisma.flightLog.aggregate({
      _sum: {
        totalHours: true,
      },
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    
    // Average flight duration in period
    prisma.flightLog.aggregate({
      _avg: {
        totalHours: true,
      },
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    
    // Most active aircraft in period
    prisma.flightLog.groupBy({
      by: ['aircraftId'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 1,
    }),
    
    // Most active pilot in period
    prisma.flightLog.groupBy({
      by: ['pilotId'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 1,
    }),
    
    // Top destination in period
    prisma.flightLog.groupBy({
      by: ['arrivalAirfieldId'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 1,
    }),
    
    // Flight types distribution in period
    prisma.flightLog.groupBy({
      by: ['flightType'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    }),
  ]);

  // Get aircraft and pilot details
  const aircraftDetails = mostActiveAircraft[0] ? await prisma.aircraft.findUnique({
    where: { id: mostActiveAircraft[0].aircraftId },
    select: { callSign: true },
  }) : null;

  const pilotDetails = mostActivePilot[0] ? await prisma.user.findUnique({
    where: { id: mostActivePilot[0].pilotId },
    select: { firstName: true, lastName: true },
  }) : null;

  const destinationDetails = topDestination[0] ? await prisma.airfield.findUnique({
    where: { id: topDestination[0].arrivalAirfieldId },
    select: { code: true },
  }) : null;

  return NextResponse.json({
    totalFlights: flightsInPeriod, // Use period-specific data
    flightsThisMonth: flightsInPeriod, // Rename for clarity
    totalHours: hoursInPeriod._sum.totalHours || 0, // Use period-specific data
    hoursThisMonth: hoursInPeriod._sum.totalHours || 0, // Rename for clarity
    averageFlightDuration: averageFlightDuration._avg.totalHours || 0,
    mostActiveAircraft: aircraftDetails?.callSign || 'N/A',
    mostActivePilot: pilotDetails ? `${pilotDetails.firstName} ${pilotDetails.lastName}` : 'N/A',
    topDestination: destinationDetails?.code || 'N/A',
    flightTypes: flightTypes.map(ft => ({
      type: ft.flightType,
      count: ft._count.id,
    })),
  });
}

async function getUserStats(startDate: Date, endDate: Date) {
  const [
    totalUsers,
    activeUsers,
    newUsersInPeriod,
    usersByRole,
    topInstructors,
    userActivity
  ] = await Promise.all([
    // Total users
    prisma.user.count(),
    
    // Active users (users with recent activity)
    prisma.user.count({
      where: {
        OR: [
          { lastLoginAt: { gte: startDate } },
          { createdFlightLogs: { some: { date: { gte: startDate } } } },
          { pilotFlightLogs: { some: { date: { gte: startDate } } } },
        ],
      },
    }),
    
    // New users in period
    prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    
    // Users by role
    prisma.userRole.groupBy({
      by: ['roleId'],
      _count: {
        userId: true,
      },
    }),
    
    // Top instructors
    prisma.flightLog.groupBy({
      by: ['instructorId'],
      where: {
        instructorId: { not: null },
        date: { gte: startDate, lte: endDate },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalHours: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    }),
    
    // User activity
    prisma.flightLog.groupBy({
      by: ['pilotId'],
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalHours: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    }),
  ]);

  // Get role names
  const roleDetails = await prisma.role.findMany({
    where: {
      id: { in: usersByRole.map(ur => ur.roleId) },
    },
    select: { id: true, name: true },
  });

  // Get instructor details
  const instructorDetails = await Promise.all(
    topInstructors.map(async (instructor) => {
      const user = await prisma.user.findUnique({
        where: { id: instructor.instructorId! },
        select: { firstName: true, lastName: true },
      });
      return {
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        flights: instructor._count.id,
        hours: instructor._sum.totalHours || 0,
      };
    })
  );

  return NextResponse.json({
    totalUsers,
    activeUsers,
    newUsersInPeriod,
    usersByRole: usersByRole.map(ur => {
      const role = roleDetails.find(r => r.id === ur.roleId);
      return {
        role: role?.name || 'Unknown',
        count: ur._count.userId,
      };
    }),
    topInstructors: instructorDetails,
    userActivity: userActivity.map(ua => ({
      pilotId: ua.pilotId,
      flights: ua._count.id,
      hours: ua._sum.totalHours || 0,
    })),
  });
}

async function getAircraftStats(startDate: Date, endDate: Date) {
  const [
    totalAircraft,
    activeAircraft,
    maintenanceDue,
    aircraftUtilization,
    topUtilized
  ] = await Promise.all([
    // Total aircraft
    prisma.aircraft.count(),
    
    // Active aircraft
    prisma.aircraft.count({
      where: {
        status: 'ACTIVE',
      },
    }),
    
    // Aircraft due for maintenance (simplified - you might want to add maintenance tracking)
    prisma.aircraft.count({
      where: {
        status: 'MAINTENANCE',
      },
    }),
    
    // Aircraft utilization
    prisma.flightLog.groupBy({
      by: ['aircraftId'],
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalHours: true,
      },
      _count: {
        id: true,
      },
    }),
    
    // Top utilized aircraft
    prisma.flightLog.groupBy({
      by: ['aircraftId'],
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalHours: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalHours: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  // Get aircraft details
  const aircraftDetails = await Promise.all(
    topUtilized.map(async (aircraft) => {
      const details = await prisma.aircraft.findUnique({
        where: { id: aircraft.aircraftId },
        select: { callSign: true, serialNumber: true },
      });
      return {
        aircraft: details?.callSign || 'Unknown',
        model: details?.serialNumber || 'Unknown',
        hours: aircraft._sum.totalHours || 0,
        flights: aircraft._count.id,
      };
    })
  );

  // Calculate utilization rate
  const totalHours = aircraftUtilization.reduce((sum, a) => sum + (a._sum.totalHours || 0), 0);
  const utilizationRate = totalAircraft > 0 ? (totalHours / (totalAircraft * 30 * 8)) * 100 : 0; // Assuming 30 days, 8 hours per day

  return NextResponse.json({
    totalAircraft,
    activeAircraft,
    maintenanceDue,
    utilizationRate: Math.min(utilizationRate, 100), // Cap at 100%
    topUtilized: aircraftDetails,
  });
}

async function getFinancialStats(startDate: Date, endDate: Date) {
  // For now, we'll simulate financial data since we don't have a financial model
  // In a real implementation, you'd have billing, payments, etc.
  
  // Calculate revenue based on flight hours and estimated rates
  const flightData = await prisma.flightLog.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    select: {
      totalHours: true,
      flightType: true,
    },
  });

  // Simulate revenue calculation
  const rates = {
    INVOICED: 250, // $250/hour for invoiced flights
    SCHOOL: 200,   // $200/hour for school flights
    FERRY: 150,    // $150/hour for ferry flights
    CHARTER: 300,  // $300/hour for charter flights
    DEMO: 180,     // $180/hour for demo flights
  };

  const totalRevenue = flightData.reduce((sum, flight) => {
    const rate = rates[flight.flightType as keyof typeof rates] || 200;
    return sum + (flight.totalHours * rate);
  }, 0);

  const totalFlights = flightData.length;
  const averageRevenuePerFlight = totalFlights > 0 ? totalRevenue / totalFlights : 0;

  // Calculate revenue by source (flight type)
  const revenueBySource = Object.entries(rates).map(([type, rate]) => {
    const flightsOfType = flightData.filter(f => f.flightType === type);
    const revenue = flightsOfType.reduce((sum, flight) => sum + (flight.totalHours * rate), 0);
    return {
      source: type.replace('_', ' '),
      amount: revenue,
      flights: flightsOfType.length,
    };
  }).filter(source => source.amount > 0);

  return NextResponse.json({
    totalRevenue,
    revenueThisMonth: totalRevenue, // Same as total for the period
    averageRevenuePerFlight,
    topRevenueSources: revenueBySource.sort((a, b) => b.amount - a.amount),
  });
}

async function getOverviewStats(startDate: Date, endDate: Date, timeframe: string) {
  // Calculate previous period dates for YTD/MTD/WTD comparison
  const getPreviousPeriodDates = (startDate: Date, endDate: Date, timeframe: string) => {
    const now = new Date();
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (timeframe) {
      case 'week':
        // WTD: Previous year same week-to-date
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - daysToMonday);
        
        // Previous year same week start
        previousStartDate = new Date(currentWeekStart.getFullYear() - 1, currentWeekStart.getMonth(), currentWeekStart.getDate());
        
        // Previous year same day of week (WTD)
        const daysFromStartToToday = Math.floor((now.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24));
        previousEndDate = new Date(previousStartDate);
        previousEndDate.setDate(previousStartDate.getDate() + daysFromStartToToday);
        break;
        
      case 'month':
        // MTD: Previous year same month-to-date
        previousStartDate = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate());
        
        // Previous year same day of month (MTD)
        const currentDayOfMonth = now.getDate();
        previousEndDate = new Date(startDate.getFullYear() - 1, startDate.getMonth(), currentDayOfMonth);
        break;
        
      case 'quarter':
        // Previous year same quarter (e.g., Q3 2025 vs Q3 2024)
        previousStartDate = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate());
        previousEndDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        break;
        
      case 'year':
        // Previous year same period (e.g., Jan 1 - Jul 27, 2025 vs Jan 1 - Jul 27, 2024)
        previousStartDate = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate());
        previousEndDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        break;
        
      default:
        // Fallback to simple previous period
        const periodDuration = endDate.getTime() - startDate.getTime();
        previousEndDate = new Date(startDate.getTime() - 1);
        previousStartDate = new Date(previousEndDate.getTime() - periodDuration);
    }

    return { previousStartDate, previousEndDate };
  };

  const { previousStartDate, previousEndDate } = getPreviousPeriodDates(startDate, endDate, timeframe);

  // Calculate all stats directly for better performance
  const [
    flightsInPeriod,
    hoursInPeriod,
    averageFlightDuration,
    mostActiveAircraft,
    mostActivePilot,
    topDestination,
    totalUsers,
    activeUsers,
    newUsersInPeriod,
    usersByRole,
    topInstructors,
    totalAircraft,
    activeAircraft,
    maintenanceDue,
    aircraftUtilization,
    flightData,
    previousFlights,
    previousHours,
    previousFlightData
  ] = await Promise.all([
    // Flight stats
    prisma.flightLog.count({
      where: { date: { gte: startDate, lte: endDate } },
    }),
    prisma.flightLog.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { totalHours: true },
    }),
    prisma.flightLog.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _avg: { totalHours: true },
    }),
    prisma.flightLog.groupBy({
      by: ['aircraftId'],
      where: { date: { gte: startDate, lte: endDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
    prisma.flightLog.groupBy({
      by: ['pilotId'],
      where: { date: { gte: startDate, lte: endDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
    prisma.flightLog.groupBy({
      by: ['arrivalAirfieldId'],
      where: { date: { gte: startDate, lte: endDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
    // User stats
    prisma.user.count(),
    prisma.user.count({
      where: {
        OR: [
          { lastLoginAt: { gte: startDate } },
          { createdFlightLogs: { some: { date: { gte: startDate } } } },
          { pilotFlightLogs: { some: { date: { gte: startDate } } } },
        ],
      },
    }),
    prisma.user.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.userRole.groupBy({
      by: ['roleId'],
      _count: { userId: true },
    }),
    prisma.flightLog.groupBy({
      by: ['instructorId'],
      where: {
        instructorId: { not: null },
        date: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      _sum: { totalHours: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    // Aircraft stats
    prisma.aircraft.count(),
    prisma.aircraft.count({ where: { status: 'ACTIVE' } }),
    prisma.aircraft.count({ where: { status: 'MAINTENANCE' } }),
    prisma.flightLog.groupBy({
      by: ['aircraftId'],
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { totalHours: true },
      _count: { id: true },
      orderBy: { _sum: { totalHours: 'desc' } },
      take: 5,
    }),
    // Financial data
    prisma.flightLog.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { totalHours: true, flightType: true },
    }),
    // Previous period data for comparison
    prisma.flightLog.count({
      where: { date: { gte: previousStartDate, lte: previousEndDate } },
    }),
    prisma.flightLog.aggregate({
      where: { date: { gte: previousStartDate, lte: previousEndDate } },
      _sum: { totalHours: true },
    }),
    prisma.flightLog.findMany({
      where: { date: { gte: previousStartDate, lte: previousEndDate } },
      select: { totalHours: true, flightType: true },
    }),
  ]);

  // Get details for most active aircraft, pilot, and destination
  const aircraftDetails = mostActiveAircraft[0] ? await prisma.aircraft.findUnique({
    where: { id: mostActiveAircraft[0].aircraftId },
    select: { callSign: true },
  }) : null;

  const pilotDetails = mostActivePilot[0] ? await prisma.user.findUnique({
    where: { id: mostActivePilot[0].pilotId },
    select: { firstName: true, lastName: true },
  }) : null;

  const destinationDetails = topDestination[0] ? await prisma.airfield.findUnique({
    where: { id: topDestination[0].arrivalAirfieldId },
    select: { code: true },
  }) : null;

  // Get role names
  const roleDetails = await prisma.role.findMany({
    where: { id: { in: usersByRole.map(ur => ur.roleId) } },
    select: { id: true, name: true },
  });

  // Get instructor details
  const instructorDetails = await Promise.all(
    topInstructors.map(async (instructor) => {
      const user = await prisma.user.findUnique({
        where: { id: instructor.instructorId! },
        select: { firstName: true, lastName: true },
      });
      return {
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        flights: instructor._count.id,
        hours: instructor._sum.totalHours || 0,
      };
    })
  );

  // Get aircraft utilization details
  const aircraftUtilizationDetails = await Promise.all(
    aircraftUtilization.map(async (aircraft) => {
      const details = await prisma.aircraft.findUnique({
        where: { id: aircraft.aircraftId },
        select: { callSign: true, serialNumber: true },
      });
      return {
        aircraft: details?.callSign || 'Unknown',
        model: details?.serialNumber || 'Unknown',
        hours: aircraft._sum.totalHours || 0,
        flights: aircraft._count.id,
      };
    })
  );

  // Calculate financial stats
  const rates = { INVOICED: 250, SCHOOL: 200, FERRY: 150, CHARTER: 300, DEMO: 180 };
  const totalRevenue = flightData.reduce((sum, flight) => {
    const rate = rates[flight.flightType as keyof typeof rates] || 200;
    return sum + (flight.totalHours * rate);
  }, 0);

  const averageRevenuePerFlight = flightsInPeriod > 0 ? totalRevenue / flightsInPeriod : 0;

  // Calculate previous period financial stats
  const previousRevenue = previousFlightData.reduce((sum, flight) => {
    const rate = rates[flight.flightType as keyof typeof rates] || 200;
    return sum + (flight.totalHours * rate);
  }, 0);

  // Calculate percentage changes
  const flightsChange = previousFlights > 0 ? ((flightsInPeriod - previousFlights) / previousFlights) * 100 : 0;
  const hoursChange = (previousHours._sum.totalHours || 0) > 0 ? ((hoursInPeriod._sum.totalHours || 0) - (previousHours._sum.totalHours || 0)) / (previousHours._sum.totalHours || 0) * 100 : 0;
  const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  const revenueBySource = Object.entries(rates).map(([type, rate]) => {
    const flightsOfType = flightData.filter(f => f.flightType === type);
    const revenue = flightsOfType.reduce((sum, flight) => sum + (flight.totalHours * rate), 0);
    return {
      source: type.replace('_', ' '),
      amount: revenue,
      flights: flightsOfType.length,
    };
  }).filter(source => source.amount > 0);

  // Calculate utilization rate
  const totalHours = aircraftUtilization.reduce((sum, a) => sum + (a._sum.totalHours || 0), 0);
  const utilizationRate = totalAircraft > 0 ? (totalHours / (totalAircraft * 30 * 8)) * 100 : 0;

  return NextResponse.json({
    flightStats: {
      totalFlights: flightsInPeriod,
      flightsThisMonth: flightsInPeriod,
      totalHours: hoursInPeriod._sum.totalHours || 0,
      hoursThisMonth: hoursInPeriod._sum.totalHours || 0,
      averageFlightDuration: averageFlightDuration._avg.totalHours || 0,
      mostActiveAircraft: aircraftDetails?.callSign || 'N/A',
      mostActivePilot: pilotDetails ? `${pilotDetails.firstName} ${pilotDetails.lastName}` : 'N/A',
      topDestination: destinationDetails?.code || 'N/A',
      previousFlights,
      previousHours: previousHours._sum.totalHours || 0,
      flightsChange,
      hoursChange,
    },
    userStats: {
      totalUsers,
      activeUsers,
      newUsersThisMonth: newUsersInPeriod,
      usersByRole: usersByRole.map(ur => {
        const role = roleDetails.find(r => r.id === ur.roleId);
        return { role: role?.name || 'Unknown', count: ur._count.userId };
      }),
      topInstructors: instructorDetails,
    },
    aircraftStats: {
      totalAircraft,
      activeAircraft,
      maintenanceDue,
      utilizationRate: Math.min(utilizationRate, 100),
      topUtilized: aircraftUtilizationDetails,
    },
    financialStats: {
      totalRevenue,
      revenueThisMonth: totalRevenue,
      averageRevenuePerFlight,
      topRevenueSources: revenueBySource.sort((a, b) => b.amount - a.amount),
      previousRevenue,
      revenueChange,
    },
  });
} 