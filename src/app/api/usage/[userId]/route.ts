import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/usage/[userId]
 *
 * Returns detailed FIFO allocation for a specific user.
 * This endpoint calculates package consumption on-demand for ONE user only.
 */

interface FlightAllocation {
  flightId: string;
  date: string;
  hours: number;
  totalFlightHours: number;
  flightType: string;
  role?: string;
}

interface PackageWithAllocations {
  id: string;
  user_id: string;
  invoiceId: string;
  totalHours: number;
  usedHours: number;
  charteredHours: number;
  remainingHours: number;
  purchaseDate: string;
  expiryDate?: string;
  status: string;
  price: number;
  currency: string;
  allocatedFlights: FlightAllocation[];
  allocatedCharteredFlights: FlightAllocation[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { userId } = await params;

    // Get requesting user to check permissions
    const { data: requestingUser, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const userRoles = requestingUser.user_roles.map((userRole: any) => userRole.roles.name);
    const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'].includes(role));
    const isOwnData = decoded.userId === userId;

    if (!isAdmin && !isOwnData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get target user info
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Get invoices for this user to build hour packages
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        issue_date,
        total_amount,
        currency,
        status,
        invoice_clients (
          name,
          email,
          phone,
          vat_code,
          address,
          city,
          country,
          user_id,
          company_id
        ),
        invoice_items (
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount,
          vat_rate
        )
      `)
      .in('status', ['paid', 'imported'])
      .order('issue_date', { ascending: true });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    // Build hour packages from invoices
    const packages: any[] = [];

    for (const invoice of invoices || []) {
      try {
        const client = invoice.invoice_clients?.[0];
        if (!client || client.user_id !== userId) continue;

        // Extract hour packages from invoice items (unit = 'HUR', 'HOUR', or 'H')
        const hourItems = invoice.invoice_items?.filter((item: any) =>
          item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
        ) || [];

        hourItems.forEach((item: any) => {
          packages.push({
            id: `${invoice.id}-${item.line_id}`,
            user_id: userId,
            invoiceId: invoice.smartbill_id,
            totalHours: item.quantity,
            purchaseDate: invoice.issue_date,
            expiryDate: null,
            price: item.total_amount,
            currency: invoice.currency || 'RON'
          });
        });
      } catch (error) {
        console.error('Error processing invoice:', error);
      }
    }

    if (packages.length === 0) {
      return NextResponse.json({
        user: targetUser,
        packages: [],
        totalPurchasedHours: 0,
        totalUsedHours: 0,
        totalCharteredHours: 0,
        remainingHours: 0,
        flightCount: 0,
        statistics: {
          flownHours: { regular: 0, regularCount: 0 },
          charteredHours: { total: 0, count: 0 },
          demoHours: { total: 0, count: 0 },
          ferryHours: { total: 0, count: 0 },
          pilotCharterHours: { total: 0, count: 0 }
        }
      });
    }

    // Get all flights for this user (both as pilot and as payer for chartered flights)
    const { data: flights, error: flightsError } = await supabase
      .from('flight_logs')
      .select(`
        id,
        userId,
        instructorId,
        payer_id,
        totalHours,
        date,
        flightType
      `)
      .or(`userId.eq.${userId},payer_id.eq.${userId}`)
      .order('date', { ascending: true });

    if (flightsError) {
      console.error('Error fetching flights:', flightsError);
      return NextResponse.json({ error: 'Failed to fetch flights' }, { status: 500 });
    }

    // Initialize package tracking
    const MAX_ALLOCATIONS_PER_PACKAGE = 100;
    const packagesWithAllocations: PackageWithAllocations[] = packages.map(pkg => ({
      ...pkg,
      usedHours: 0,
      charteredHours: 0,
      remainingHours: pkg.totalHours,
      status: 'in progress',
      allocatedFlights: [],
      allocatedCharteredFlights: []
    }));

    // Process each flight using FIFO
    flights?.forEach(flight => {
      const flightHours = flight.totalHours || 0;
      if (flightHours <= 0) return;

      // Determine if this is a chartered flight
      const isCharteredFlight = flight.payer_id === userId && flight.userId !== userId;

      // Determine role
      let role = 'PILOT';
      if (flight.instructorId === userId) {
        role = 'INSTRUCTOR';
      } else if (isCharteredFlight) {
        role = 'PAYER';
      }

      let remainingFlightHours = flightHours;

      // Allocate to packages in FIFO order
      for (const pkg of packagesWithAllocations) {
        if (remainingFlightHours <= 0) break;

        const availableHours = pkg.totalHours - (pkg.usedHours + pkg.charteredHours);
        if (availableHours <= 0) continue;

        const deduction = Math.min(remainingFlightHours, availableHours);
        remainingFlightHours -= deduction;

        if (isCharteredFlight) {
          pkg.charteredHours += deduction;
          if (pkg.allocatedCharteredFlights.length < MAX_ALLOCATIONS_PER_PACKAGE) {
            pkg.allocatedCharteredFlights.push({
              flightId: flight.id,
              date: flight.date,
              hours: deduction,
              totalFlightHours: flightHours,
              flightType: flight.flightType,
              role
            });
          }
        } else {
          pkg.usedHours += deduction;
          if (pkg.allocatedFlights.length < MAX_ALLOCATIONS_PER_PACKAGE) {
            pkg.allocatedFlights.push({
              flightId: flight.id,
              date: flight.date,
              hours: deduction,
              totalFlightHours: flightHours,
              flightType: flight.flightType,
              role
            });
          }
        }
      }

      // If still remaining hours, apply to last package (can go negative)
      if (remainingFlightHours > 0 && packagesWithAllocations.length > 0) {
        const lastPackage = packagesWithAllocations[packagesWithAllocations.length - 1];
        if (isCharteredFlight) {
          lastPackage.charteredHours += remainingFlightHours;
          if (lastPackage.allocatedCharteredFlights.length < MAX_ALLOCATIONS_PER_PACKAGE) {
            lastPackage.allocatedCharteredFlights.push({
              flightId: flight.id,
              date: flight.date,
              hours: remainingFlightHours,
              totalFlightHours: flightHours,
              flightType: flight.flightType,
              role
            });
          }
        } else {
          lastPackage.usedHours += remainingFlightHours;
          if (lastPackage.allocatedFlights.length < MAX_ALLOCATIONS_PER_PACKAGE) {
            lastPackage.allocatedFlights.push({
              flightId: flight.id,
              date: flight.date,
              hours: remainingFlightHours,
              totalFlightHours: flightHours,
              flightType: flight.flightType,
              role
            });
          }
        }
      }
    });

    // Calculate remaining hours and status for each package
    packagesWithAllocations.forEach(pkg => {
      pkg.remainingHours = pkg.totalHours - (pkg.usedHours + pkg.charteredHours);

      const now = new Date();
      const isExpired = pkg.expiryDate && new Date(pkg.expiryDate) < now;
      const isOverdrawn = pkg.remainingHours < 0;
      const isLowHours = pkg.remainingHours >= 0 && pkg.remainingHours < 5;

      if (isExpired) {
        pkg.status = 'expired';
      } else if (isOverdrawn) {
        pkg.status = 'overdrawn';
      } else if (isLowHours) {
        pkg.status = 'low hours';
      } else {
        pkg.status = 'in progress';
      }
    });

    // Calculate totals
    const totalPurchasedHours = packagesWithAllocations.reduce((sum, pkg) => sum + pkg.totalHours, 0);
    const totalUsedHours = packagesWithAllocations.reduce((sum, pkg) => sum + pkg.usedHours, 0);
    const totalCharteredHours = packagesWithAllocations.reduce((sum, pkg) => sum + pkg.charteredHours, 0);
    const remainingHours = totalPurchasedHours - totalUsedHours - totalCharteredHours;

    // Calculate flight type statistics
    const regularFlights = flights?.filter(f =>
      f.userId === userId &&
      f.flightType !== 'FERRY' &&
      f.flightType !== 'DEMO' &&
      f.flightType !== 'CHARTER'
    ) || [];

    const ferryFlights = flights?.filter(f =>
      f.userId === userId &&
      f.flightType === 'FERRY'
    ) || [];

    const demoFlights = flights?.filter(f =>
      f.userId === userId &&
      f.flightType === 'DEMO'
    ) || [];

    const charteredFlights = flights?.filter(f =>
      f.payer_id === userId &&
      f.userId !== userId
    ) || [];

    const pilotCharterFlights = flights?.filter(f =>
      f.userId === userId &&
      f.flightType === 'CHARTER'
    ) || [];

    const regularHours = regularFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0);
    const ferryHours = ferryFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0);
    const demoHours = demoFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0);
    const charteredHoursTotal = charteredFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0);
    const pilotCharterHours = pilotCharterFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0);

    return NextResponse.json({
      user: targetUser,
      packages: packagesWithAllocations,
      totalPurchasedHours,
      totalUsedHours,
      totalCharteredHours,
      remainingHours,
      flightCount: flights?.length || 0,
      statistics: {
        flownHours: {
          regular: regularHours,
          regularCount: regularFlights.length,
        },
        charteredHours: {
          total: charteredHoursTotal,
          count: charteredFlights.length,
        },
        demoHours: {
          total: demoHours,
          count: demoFlights.length,
        },
        ferryHours: {
          total: ferryHours,
          count: ferryFlights.length,
        },
        pilotCharterHours: {
          total: pilotCharterHours,
          count: pilotCharterFlights.length,
        }
      }
    });

  } catch (error) {
    console.error(`Error in /api/usage/[userId]:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
