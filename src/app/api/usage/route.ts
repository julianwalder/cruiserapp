import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * NEW LIGHTWEIGHT ARCHITECTURE
 *
 * This endpoint returns ONLY a paginated list of users with basic summary stats.
 * NO FIFO calculation, NO package details, NO flight allocations.
 *
 * For detailed FIFO data, use: /api/usage/[userId]/details
 * For flight allocations, use: /api/usage/[userId]/packages/[packageId]/flights
 */

export async function GET(request: NextRequest) {
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

    // Parse query parameters for pagination and search
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'email';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const offset = (page - 1) * limit;

    // Get user to check permissions
    const { data: user, error: userError } = await supabase
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

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check user roles and determine access level
    const userRoles = user.user_roles.map((userRole: any) => userRole.roles.name);
    const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'].includes(role));
    const isPilot = userRoles.includes('PILOT');
    const isStudent = userRoles.includes('STUDENT');

    // Get distinct user IDs from BOTH flight logs AND invoices
    // We want to show all users who either:
    // 1. Have flight activity (userId or payer_id in flight_logs)
    // 2. Have purchased hour packages (invoices with hour items)

    const { data: flightUserIds, error: flightUserIdsError } = await supabase
      .from('flight_logs')
      .select('userId, payer_id');

    if (flightUserIdsError) {
      console.error('Error fetching flight user IDs:', flightUserIdsError);
      return NextResponse.json({ error: 'Failed to fetch flight logs' }, { status: 500 });
    }

    // Extract unique user IDs from flight logs
    const flightBasedUserIds = [
      ...flightUserIds?.map((f: any) => f.userId).filter(Boolean) || [],
      ...flightUserIds?.map((f: any) => f.payer_id).filter(Boolean) || []
    ];

    // Get user IDs from invoices with hour packages
    const { data: invoicesForUserIds, error: invoicesForUserIdsError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_clients (
          user_id
        ),
        invoice_items (
          unit
        )
      `)
      .in('status', ['paid', 'imported']);

    if (invoicesForUserIdsError) {
      console.error('Error fetching invoices for user IDs:', invoicesForUserIdsError);
    }

    // Extract user IDs from invoices that have hour packages
    const invoiceBasedUserIds: string[] = [];
    for (const invoice of invoicesForUserIds || []) {
      const client = invoice.invoice_clients?.[0];
      if (!client?.user_id) continue;

      // Check if invoice has hour items
      const hasHourItems = invoice.invoice_items?.some((item: any) =>
        item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
      );

      if (hasHourItems) {
        invoiceBasedUserIds.push(client.user_id);
      }
    }

    // Combine both sources and deduplicate
    const allUserIds = [...flightBasedUserIds, ...invoiceBasedUserIds];
    const uniqueClientIds = [...new Set(allUserIds)];

    if (uniqueClientIds.length === 0) {
      return NextResponse.json({
        clients: [],
        pagination: { total: 0, page, limit, totalPages: 0 }
      });
    }

    // Fetch client details from users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .in('id', uniqueClientIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    let clientsList = usersData || [];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      clientsList = clientsList.filter((client: any) => {
        const email = client.email?.toLowerCase() || '';
        const firstName = client.firstName?.toLowerCase() || '';
        const lastName = client.lastName?.toLowerCase() || '';
        return email.includes(searchLower) ||
               firstName.includes(searchLower) ||
               lastName.includes(searchLower);
      });
    }

    // Sort clients
    clientsList.sort((a: any, b: any) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      if (sortOrder === 'desc') {
        [aVal, bVal] = [bVal, aVal];
      }
      return aVal > bVal ? 1 : -1;
    });

    // Apply pagination
    const paginatedClients = clientsList.slice(offset, offset + limit);
    const clientIds = paginatedClients.map((c: any) => c.id);

    if (clientIds.length === 0) {
      return NextResponse.json({
        clients: [],
        pagination: {
          total: clientsList.length,
          page,
          limit,
          totalPages: Math.ceil(clientsList.length / limit)
        }
      });
    }

    // Fetch aggregated flight data (for all users, then filter in memory)
    const { data: allFlightAggs, error: flightAggsError } = await supabase
      .rpc('get_flight_aggregations');

    if (flightAggsError) {
      console.error('Error fetching flight aggregations:', flightAggsError);
    }

    // IMPORTANT: get_flight_aggregations returns MULTIPLE rows per user (UNION ALL)
    // One row for piloted flights, another for chartered flights (payer_id)
    // We need to MERGE these rows by user_id to get correct totals
    const mergedFlightAggs = new Map<string, any>();

    allFlightAggs?.forEach((agg: any) => {
      const userId = agg.user_id;
      if (!mergedFlightAggs.has(userId)) {
        mergedFlightAggs.set(userId, {
          user_id: userId,
          regular_hours: 0,
          regular_hours_current_year: 0,
          regular_hours_previous_year: 0,
          ferry_hours_total: 0,
          ferry_hours_current_year: 0,
          ferry_hours_previous_year: 0,
          charter_hours_total: 0,
          charter_hours_current_year: 0,
          charter_hours_previous_year: 0,
          chartered_hours_total: 0,
          chartered_hours_current_year: 0,
          chartered_hours_previous_year: 0,
          demo_hours_total: 0,
          demo_hours_current_year: 0,
          demo_hours_previous_year: 0,
          flights_12_months: 0,
          flights_90_days: 0,
        });
      }

      const merged = mergedFlightAggs.get(userId);
      merged.regular_hours += Number(agg.regular_hours || 0);
      merged.regular_hours_current_year += Number(agg.regular_hours_current_year || 0);
      merged.regular_hours_previous_year += Number(agg.regular_hours_previous_year || 0);
      merged.ferry_hours_total += Number(agg.ferry_hours_total || 0);
      merged.ferry_hours_current_year += Number(agg.ferry_hours_current_year || 0);
      merged.ferry_hours_previous_year += Number(agg.ferry_hours_previous_year || 0);
      merged.charter_hours_total += Number(agg.charter_hours_total || 0);
      merged.charter_hours_current_year += Number(agg.charter_hours_current_year || 0);
      merged.charter_hours_previous_year += Number(agg.charter_hours_previous_year || 0);
      merged.chartered_hours_total += Number(agg.chartered_hours_total || 0);
      merged.chartered_hours_current_year += Number(agg.chartered_hours_current_year || 0);
      merged.chartered_hours_previous_year += Number(agg.chartered_hours_previous_year || 0);
      merged.demo_hours_total += Number(agg.demo_hours_total || 0);
      merged.demo_hours_current_year += Number(agg.demo_hours_current_year || 0);
      merged.demo_hours_previous_year += Number(agg.demo_hours_previous_year || 0);
      merged.flights_12_months += Number(agg.flights_12_months || 0);
      merged.flights_90_days += Number(agg.flights_90_days || 0);
    });

    // Filter to only the clients we're paginating
    const flightAggs = clientIds.map(id => mergedFlightAggs.get(id)).filter(Boolean);

    // Fetch invoices to calculate purchased hours
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
      .order('issue_date', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
    }

    // Process invoices to extract hour packages per client
    const clientPackagesMap = new Map<string, { packages: any[], totalHours: number, totalValue: number, currency: string }>();

    console.log(`📦 Fetched ${invoices?.length || 0} invoices for ${clientIds.length} clients`);

    for (const invoice of invoices || []) {
      try {
        const client = invoice.invoice_clients?.[0];
        if (!client || !client.user_id) continue;

        // Extract hour packages from invoice items (unit = 'HUR', 'HOUR', or 'H')
        const hourItems = invoice.invoice_items?.filter((item: any) =>
          item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
        ) || [];

        hourItems.forEach((item: any) => {
          const userId = client.user_id;

          if (!clientPackagesMap.has(userId)) {
            clientPackagesMap.set(userId, {
              packages: [],
              totalHours: 0,
              totalValue: 0,
              currency: invoice.currency || 'RON'
            });
          }

          const clientData = clientPackagesMap.get(userId)!;
          clientData.packages.push({
            id: `${invoice.id}-${item.line_id}`,
            invoiceId: invoice.smartbill_id,
            totalHours: item.quantity,
            purchaseDate: invoice.issue_date,
            price: item.total_amount,
            currency: invoice.currency
          });
          clientData.totalHours += item.quantity;
          clientData.totalValue += item.total_amount;
        });
      } catch (error) {
        console.error('Error processing invoice:', error);
      }
    }

    console.log(`💰 Processed packages for ${clientPackagesMap.size} clients with hour packages`);

    // Build response with lightweight summary data
    const clientsWithSummary = paginatedClients.map((client: any) => {
      const agg = flightAggs?.find((a: any) => a.user_id === client.id);
      const packageData = clientPackagesMap.get(client.id);

      // Get purchased hours data
      const totalPurchasedHours = packageData?.totalHours || 0;
      const totalValue = packageData?.totalValue || 0;
      const packageCount = packageData?.packages.length || 0;
      const currency = packageData?.currency || 'RON';

      // Get flight hours from aggregation
      const regularHours = agg?.regular_hours || 0;
      const ferryHours = agg?.ferry_hours_total || 0;
      const charteredHours = agg?.chartered_hours_total || 0;
      const demoHours = agg?.demo_hours_total || 0;

      return {
        id: client.id,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        summary: {
          totalPurchasedHours,
          totalFlownHours: regularHours,
          totalFerryHours: ferryHours,
          totalCharteredHours: charteredHours,
          totalDemoHours: demoHours,
          packageCount,
          totalValue,
          currency,
          flights12Months: agg?.flights_12_months || 0,
          flights90Days: agg?.flights_90_days || 0,
        }
      };
    });

    // Calculate aggregate statistics for ALL clients (not just paginated ones)
    const aggregateStats = {
      totalPurchasedHours: 0,
      totalFlownHours: 0,
      totalFerryHours: 0,
      totalCharteredHours: 0,
      totalDemoHours: 0,
      totalRemainingHours: 0,
    };

    // Calculate aggregates from ALL clients (before pagination)
    clientsList.forEach((client: any) => {
      const agg = mergedFlightAggs.get(client.id);
      const packageData = clientPackagesMap.get(client.id);

      const purchasedHours = packageData?.totalHours || 0;
      const regularHours = agg?.regular_hours || 0;
      const ferryHours = agg?.ferry_hours_total || 0;
      const charteredHours = agg?.chartered_hours_total || 0;
      const demoHours = agg?.demo_hours_total || 0;

      aggregateStats.totalPurchasedHours += purchasedHours;
      aggregateStats.totalFlownHours += regularHours;
      aggregateStats.totalFerryHours += ferryHours;
      aggregateStats.totalCharteredHours += charteredHours;
      aggregateStats.totalDemoHours += demoHours;
      // IMPORTANT: Remaining hours = purchased - flown - chartered
      // Chartered hours are flights paid by client but flown by another pilot
      aggregateStats.totalRemainingHours += (purchasedHours - regularHours - charteredHours);
    });

    console.log(`📊 Aggregate stats for ALL ${clientsList.length} clients:`, aggregateStats);

    return NextResponse.json({
      clients: clientsWithSummary,
      pagination: {
        total: clientsList.length,
        page,
        limit,
        totalPages: Math.ceil(clientsList.length / limit)
      },
      aggregateStats
    });

  } catch (error) {
    console.error('Error in /api/usage:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
