import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

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

    // Get hour package data directly from database
    let hourSummary = {
      totalBought: 0,
      totalUsed: 0,
      totalRemaining: 0,
      packages: []
    };

    // First, get invoice IDs for this user from invoice_clients
    const { data: userInvoiceClients, error: clientError } = await supabase
      .from('invoice_clients')
      .select('invoice_id')
      .eq('user_id', user.id);

    if (clientError) {
      console.error('Error fetching invoice clients:', clientError);
    }

    const invoiceIds = userInvoiceClients?.map(ic => ic.invoice_id) || [];

    // Fetch invoices with their items for this user
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        issue_date,
        total_amount,
        currency,
        status,
        invoice_items (
          line_id,
          name,
          quantity,
          unit,
          unit_price,
          total_amount
        )
      `)
      .in('id', invoiceIds.length > 0 ? invoiceIds : [-1])
      .in('status', ['paid', 'imported'])
      .order('issue_date', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices for hour packages:', invoicesError);
    }

    // Calculate total purchased hours from invoices
    let totalPurchasedHours = 0;
    if (invoices) {
      for (const invoice of invoices) {
        const hourItems = invoice.invoice_items?.filter((item: any) =>
          item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
        ) || [];

        hourItems.forEach((item: any) => {
          totalPurchasedHours += item.quantity || 0;
        });
      }
    }

    console.log(`✅ Found ${totalPurchasedHours} purchased hours for user ${user.id}`);

    hourSummary.totalBought = totalPurchasedHours;

    // Fetch flight logs to get EASA currency data
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
        userId,
        departureAirfieldId,
        arrivalAirfieldId,
        flightType
      `)
      .eq('userId', user.id)
      .order('date', { ascending: false })
      .order('departureTime', { ascending: false });

    if (flightLogsError) {
      console.error('Error fetching flight logs:', flightLogsError);
    } else {
      console.log(`✅ Successfully fetched ${flightLogs?.length || 0} flight logs for user ${user.id}`);
    }

    // Calculate total used hours from flight logs (excluding ferry, demo, and charter flights)
    const calculateFlightHours = (departureTime: string, arrivalTime: string) => {
      const departure = new Date(`2000-01-01T${departureTime}`);
      const arrival = new Date(`2000-01-01T${arrivalTime}`);
      const diffMs = arrival.getTime() - departure.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHours);
    };

    // Filter out special flight types (ferry, demo, charter) for hour calculation
    const regularFlights = (flightLogs || []).filter(flight => {
      // Check if flight type indicates special flight types
      const flightType = flight.flightType?.toLowerCase() || '';
      const isFerryFlight = flightType.includes('ferry') || flightType.includes('ferry');
      const isDemoFlight = flightType.includes('demo') || flightType.includes('demonstration');
      const isCharterFlight = flightType.includes('charter') || flightType.includes('charter');
      
      return !isFerryFlight && !isDemoFlight && !isCharterFlight;
    });

    const totalUsedHours = regularFlights.reduce((sum, flight) => {
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

    const last90DaysFlights = regularFlights?.filter(flight => 
      new Date(flight.date) >= ninetyDaysAgo
    ) || [];

    const last12MonthsFlights = regularFlights?.filter(flight => 
      new Date(flight.date) >= twelveMonthsAgo
    ) || [];

    const last90DaysHours = last90DaysFlights.reduce((sum, flight) => sum + (flight.totalHours || 0), 0);
    const last12MonthsHours = last12MonthsFlights.reduce((sum, flight) => sum + (flight.totalHours || 0), 0);

    // Get last 3 takeoffs and landings (using dayLandings + nightLandings) - use all flights for physical counts
    const recentFlights = flightLogs?.slice(0, 3) || [];
    const totalTakeoffs = recentFlights.reduce((sum, flight) => sum + ((flight.dayLandings || 0) + (flight.nightLandings || 0)), 0);
    const totalLandings = recentFlights.reduce((sum, flight) => sum + ((flight.dayLandings || 0) + (flight.nightLandings || 0)), 0);

    // Find last night flight and instrument flight - use all flights
    const lastNightFlight = flightLogs?.find(flight => flight.night && flight.night > 0);
    const lastInstrumentFlight = flightLogs?.find(flight => flight.instrument && flight.instrument > 0);

    // Calculate monthly statistics
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // This month (current month) - only regular flights
    const thisMonthFlights = regularFlights?.filter(flight => {
      const flightDate = new Date(flight.date);
      return flightDate.getMonth() === currentMonth && flightDate.getFullYear() === currentYear;
    }) || [];
    
    const thisMonthHours = thisMonthFlights.reduce((sum, flight) => {
      if (flight.totalHours !== null && flight.totalHours !== undefined) {
        return sum + flight.totalHours;
      } else if (flight.departureTime && flight.arrivalTime) {
        return sum + calculateFlightHours(flight.departureTime, flight.arrivalTime);
      }
      return sum;
    }, 0);

    // Last month - only regular flights
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const lastMonthFlights = regularFlights?.filter(flight => {
      const flightDate = new Date(flight.date);
      return flightDate.getMonth() === lastMonth && flightDate.getFullYear() === lastMonthYear;
    }) || [];
    
    const lastMonthHours = lastMonthFlights.reduce((sum, flight) => {
      if (flight.totalHours !== null && flight.totalHours !== undefined) {
        return sum + flight.totalHours;
      } else if (flight.departureTime && flight.arrivalTime) {
        return sum + calculateFlightHours(flight.departureTime, flight.arrivalTime);
      }
      return sum;
    }, 0);

    // Calculate percentage change
    const flightsChange = lastMonthFlights.length > 0 
      ? Math.round(((thisMonthFlights.length - lastMonthFlights.length) / lastMonthFlights.length) * 100)
      : thisMonthFlights.length > 0 ? 100 : 0;
    
    const hoursChange = lastMonthHours > 0 
      ? Math.round(((thisMonthHours - lastMonthHours) / lastMonthHours) * 100)
      : thisMonthHours > 0 ? 100 : 0;

    const stats = {
      user: {
        id: user.id,
        totalFlightHours: hourSummary.totalBought, // Use correct hour package total
        licenseNumber: user.licenseNumber,
        medicalClass: user.medicalClass,
        instructorRating: user.instructorRating,
        roles: userRoles
      },
      flights: {
        total: regularFlights?.length || 0,
        thisMonth: thisMonthFlights.length,
        lastMonth: lastMonthFlights.length,
        change: flightsChange,
        recent: regularFlights?.slice(0, 5).map(flight => ({
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
        thisMonth: thisMonthHours,
        lastMonth: lastMonthHours,
        change: hoursChange
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
