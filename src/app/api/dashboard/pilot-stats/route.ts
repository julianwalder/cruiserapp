import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { HourPackageService } from '@/lib/hour-package-service';

export async function GET(request: NextRequest) {
  console.log('🚀 Pilot stats API called');
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get user to check permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        "totalFlightHours",
        "licenseNumber",
        "medicalClass",
        "instructorRating",
        "lastLoginAt",
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a pilot or student
    const userRoles = user.user_roles?.map((ur: any) => ur.roles.name) || [];
    const isPilotOrStudent = userRoles.includes('PILOT') || userRoles.includes('STUDENT');
    
    if (!isPilotOrStudent) {
      return NextResponse.json({ error: 'Access denied - pilot/student only' }, { status: 403 });
    }

    // Get hour package summary
    let hourSummary;
    try {
      hourSummary = await HourPackageService.getUserHourSummary(user.id);
    } catch (error) {
      console.error('Error fetching hour summary:', error);
      // Fallback to old system if hour packages table doesn't exist
      hourSummary = {
        totalBought: user.totalFlightHours || 0,
        totalUsed: 0,
        totalRemaining: user.totalFlightHours || 0,
        packages: []
      };
    }

    // Fetch flight logs to get actual used hours and EASA currency data
    const { data: flightLogs, error: flightLogsError } = await supabase
      .from('flight_logs')
      .select(`
        id,
        totalHours,
        departureTime,
        arrivalTime,
        dayLandings,
        nightLandings,
        night,
        instrument,
        date,
        pilotId,
        departureAirfieldId,
        arrivalAirfieldId
      `)
      .eq('pilotId', user.id)
      .order('date', { ascending: false })
      .order('departureTime', { ascending: false });



    if (flightLogsError) {
      console.error('Error fetching flight logs:', flightLogsError);
    }

    // Calculate total used hours from flight logs
    const calculateFlightHours = (departureTime: string, arrivalTime: string) => {
      const departure = new Date(`2000-01-01T${departureTime}`);
      const arrival = new Date(`2000-01-01T${arrivalTime}`);
      const diffMs = arrival.getTime() - departure.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHours);
    };

    const totalUsedHours = (flightLogs || []).reduce((sum, flight) => {
      // Use stored totalHours if available, otherwise calculate from departure/arrival times
      if (flight.totalHours !== null && flight.totalHours !== undefined) {
        return sum + flight.totalHours;
      } else if (flight.departureTime && flight.arrivalTime) {
        return sum + calculateFlightHours(flight.departureTime, flight.arrivalTime);
      }
      return sum;
    }, 0);

    // Fetch airfield data for recent flights
    const airfieldIds = new Set();
    flightLogs?.forEach(flight => {
      if (flight.departureAirfieldId) airfieldIds.add(flight.departureAirfieldId);
      if (flight.arrivalAirfieldId) airfieldIds.add(flight.arrivalAirfieldId);
    });

    const { data: airfields, error: airfieldsError } = await supabase
      .from('airfields')
      .select('id, name, code')
      .in('id', Array.from(airfieldIds));

    const airfieldMap = new Map();
    airfields?.forEach(airfield => {
      airfieldMap.set(airfield.id, airfield);
    });



    // Calculate EASA currency
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const last90DaysFlights = flightLogs?.filter(flight => 
      new Date(flight.date) >= ninetyDaysAgo
    ) || [];

    const last12MonthsFlights = flightLogs?.filter(flight => 
      new Date(flight.date) >= twelveMonthsAgo
    ) || [];

    const last90DaysHours = last90DaysFlights.reduce((sum, flight) => sum + (flight.totalHours || 0), 0);
    const last12MonthsHours = last12MonthsFlights.reduce((sum, flight) => sum + (flight.totalHours || 0), 0);

    // Get last 3 takeoffs and landings (using dayLandings + nightLandings)
    const recentFlights = flightLogs?.slice(0, 3) || [];
    const totalTakeoffs = recentFlights.reduce((sum, flight) => sum + ((flight.dayLandings || 0) + (flight.nightLandings || 0)), 0);
    const totalLandings = recentFlights.reduce((sum, flight) => sum + ((flight.dayLandings || 0) + (flight.nightLandings || 0)), 0);

    // Find last night flight and instrument flight
    const lastNightFlight = flightLogs?.find(flight => flight.night && flight.night > 0);
    const lastInstrumentFlight = flightLogs?.find(flight => flight.instrument && flight.instrument > 0);



    const stats = {
      user: {
        id: user.id,
        totalFlightHours: hourSummary.totalBought, // Use hour package total
        licenseNumber: user.licenseNumber,
        medicalClass: user.medicalClass,
        instructorRating: user.instructorRating,
        roles: userRoles
      },
      flights: {
        total: flightLogs?.length || 0,
        thisMonth: 0,
        lastMonth: 0,
        change: 0,
        recent: flightLogs?.slice(0, 5).map(flight => ({
          id: flight.id,
          date: flight.date,
          totalHours: flight.totalHours,
          aircraft: null, // We'll need to fetch this separately if needed
          departure_airfield: airfieldMap.get(flight.departureAirfieldId) || null,
          arrival_airfield: airfieldMap.get(flight.arrivalAirfieldId) || null
        })) || []
      },
      hours: {
        total: totalUsedHours,
        thisMonth: 0,
        lastMonth: 0,
        change: 0
      },
      billing: {
        pending: 0,
        total: 0,
        recent: []
      },
      easaCurrency: {
        last90Days: {
          flights: last90DaysFlights.length,
          hours: last90DaysHours,
          required: { flights: 3, hours: 2 }
        },
        last12Months: {
          flights: last12MonthsFlights.length,
          hours: last12MonthsHours,
          required: { flights: 12, hours: 12 }
        },
        takeoffs: {
          total: totalTakeoffs,
          required: 3
        },
        landings: {
          total: totalLandings,
          required: 3
        },
        lastNightFlight: lastNightFlight ? new Date(lastNightFlight.date) : null,
        lastInstrumentFlight: lastInstrumentFlight ? new Date(lastInstrumentFlight.date) : null
      },
      hourPackages: {
        totalBought: hourSummary.totalBought,
        totalUsed: hourSummary.totalUsed,
        totalRemaining: hourSummary.totalRemaining,
        packages: hourSummary.packages
      }
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching pilot stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch pilot statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 