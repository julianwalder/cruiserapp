import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/usage/[userId]/ledger
 *
 * Returns chronological settlement ledger for a specific user.
 * Combines invoices (hour packages) and flights in chronological order.
 */

export interface LedgerEntry {
  date: string;
  eventType: 'invoice' | 'flight';
  reference: string;
  description: string;
  hoursAdded: number;
  hoursDeducted: number;
  balanceDue: number;
  flightType?: string;
  role?: string;
  invoiceAmount?: number;
  currency?: string;
  flightId?: string;
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

    // Get invoices for this user to extract hour packages
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
          user_id
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

    // Get all flights for this user
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

    // Build ledger entries
    const ledgerEntries: LedgerEntry[] = [];

    // Add invoice entries (hour packages)
    for (const invoice of invoices || []) {
      const client = invoice.invoice_clients?.[0];
      if (!client || client.user_id !== userId) continue;

      // Extract hour packages from invoice items
      const hourItems = invoice.invoice_items?.filter((item: any) =>
        item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
      ) || [];

      hourItems.forEach((item: any) => {
        ledgerEntries.push({
          date: invoice.issue_date,
          eventType: 'invoice',
          reference: invoice.smartbill_id || `INV-${invoice.id}`,
          description: `Invoice (${item.quantity}h package)${item.name ? ` - ${item.name}` : ''}`,
          hoursAdded: item.quantity,
          hoursDeducted: 0,
          balanceDue: 0, // Will be calculated later
          invoiceAmount: item.total_amount,
          currency: invoice.currency || 'RON'
        });
      });
    }

    // Add flight entries
    for (const flight of flights || []) {
      const flightHours = flight.totalHours || 0;

      // Determine who pays for this flight
      const payerId = flight.payer_id || flight.userId; // If no payer_id, pilot pays

      // Determine if this is a chartered flight (paid by user but flown by another pilot)
      const isCharteredFlight = flight.payer_id === userId && flight.userId !== userId;

      // Determine if user is flying a chartered flight (someone else is paying)
      const isPilotOnCharteredFlight = flight.userId === userId && flight.payer_id && flight.payer_id !== userId;

      // Determine role
      let role = 'PILOT';
      if (flight.instructorId === userId) {
        role = 'INSTRUCTOR';
      } else if (isCharteredFlight) {
        role = 'PAYER';
      }

      // Determine flight type label
      let flightTypeLabel = flight.flightType || 'SCHOOL';

      // Map flight types to readable labels
      const flightTypeMap: { [key: string]: string } = {
        'FERRY': 'Ferry',
        'DEMO': 'Demo',
        'CHARTER': 'Charter',
        'SCHOOL': 'School',
        'INVOICED': 'Invoiced',
        'PROMO': 'Promo'
      };

      flightTypeLabel = flightTypeMap[flight.flightType] || flight.flightType;

      // Deduct hours only if:
      // 1. This user is the one who pays (payer_id === userId OR (no payer_id AND userId === pilot))
      // 2. User is not the instructor
      // 3. Flight type is not FERRY or DEMO
      // 4. User is not a pilot on someone else's chartered flight
      const shouldDeduct =
        payerId === userId &&  // This user is paying
        role !== 'INSTRUCTOR' &&  // User is not instructor
        flight.flightType !== 'FERRY' &&  // Not a ferry flight
        flight.flightType !== 'DEMO' &&  // Not a demo flight
        !isPilotOnCharteredFlight;  // Not flying someone else's chartered flight

      ledgerEntries.push({
        date: flight.date,
        eventType: 'flight',
        reference: `F-${flight.id.substring(0, 8)}`,
        description: flightTypeLabel,
        hoursAdded: 0,
        hoursDeducted: shouldDeduct ? flightHours : 0,
        balanceDue: 0, // Will be calculated later
        flightType: flight.flightType,
        role,
        flightId: flight.id
      });
    }

    // Sort all entries chronologically
    ledgerEntries.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    // Calculate running balance
    let runningBalance = 0;
    ledgerEntries.forEach(entry => {
      runningBalance += entry.hoursAdded;
      runningBalance -= entry.hoursDeducted;
      entry.balanceDue = runningBalance;
    });

    // Calculate flight type breakdowns
    // For invoices, we sum hoursAdded from invoice entries (hours purchased)
    const invoiceEntries = ledgerEntries.filter(e => e.eventType === 'invoice');

    // For flights, we sum total hours from the original flights data
    // because hoursDeducted only reflects what was charged to the user
    // We sum ALL flights of each type where the user was involved
    const invoicedFlights = flights?.filter(f =>
      f.flightType === 'INVOICED' && (f.userId === userId || f.payer_id === userId)
    ) || [];

    const schoolFlights = flights?.filter(f =>
      f.flightType === 'SCHOOL' && (f.userId === userId || f.payer_id === userId)
    ) || [];

    const charterFlights = flights?.filter(f =>
      f.flightType === 'CHARTER' && (f.userId === userId || f.payer_id === userId)
    ) || [];

    const demoFlights = flights?.filter(f =>
      f.flightType === 'DEMO' && (f.userId === userId || f.payer_id === userId)
    ) || [];

    const ferryFlights = flights?.filter(f =>
      f.flightType === 'FERRY' && (f.userId === userId || f.payer_id === userId)
    ) || [];

    const hoursByType = {
      invoiced: {
        // Invoiced Hours = only hours from INVOICED flight logs
        hours: invoicedFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0),
        count: invoicedFlights.length
      },
      school: {
        hours: schoolFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0),
        count: schoolFlights.length
      },
      charter: {
        hours: charterFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0),
        count: charterFlights.length
      },
      demo: {
        hours: demoFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0),
        count: demoFlights.length
      },
      ferry: {
        hours: ferryFlights.reduce((sum, f) => sum + (f.totalHours || 0), 0),
        count: ferryFlights.length
      }
    };

    return NextResponse.json({
      userId,
      ledgerEntries,
      summary: {
        totalHoursAdded: ledgerEntries.reduce((sum, e) => sum + e.hoursAdded, 0),
        totalHoursDeducted: ledgerEntries.reduce((sum, e) => sum + e.hoursDeducted, 0),
        finalBalance: runningBalance,
        entryCount: ledgerEntries.length,
        invoiceCount: ledgerEntries.filter(e => e.eventType === 'invoice').length,
        flightCount: ledgerEntries.filter(e => e.eventType === 'flight').length,
        hoursByType
      }
    });

  } catch (error) {
    console.error(`Error in /api/usage/[userId]/ledger:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
