import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

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

    // Get user to check permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        user_roles!user_roles_userId_fkey (
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
    const isInstructor = userRoles.includes('INSTRUCTOR');
    const isProspect = userRoles.includes('PROSPECT');

    // Determine what data the user can access
    let allowedClientEmails: string[] = [];
    
    if (isAdmin) {
      // Admins can see all client hours
      allowedClientEmails = [];
    } else if (isPilot || isStudent) {
      // Pilots and students can see their own hours
      allowedClientEmails = [user.email];
    } else if (isInstructor) {
      // Instructors can see hours of pilots/students they've flown with
      // We'll get this from flight logs where instructorId matches
      const { data: instructorFlights } = await supabase
        .from('flight_logs')
        .select('pilotId')
        .eq('instructorId', user.id);
      
      // Get pilot emails for instructor flights
      const instructorPilotIds = instructorFlights?.map(flight => flight.pilotId).filter(Boolean) || [];
      const { data: instructorPilots } = await supabase
        .from('users')
        .select('email')
        .in('id', instructorPilotIds);
      
      allowedClientEmails = instructorPilots?.map(pilot => pilot.email).filter(Boolean) || [];
    } else if (isProspect) {
      // Prospects can only access ordering (no viewing)
      return NextResponse.json({ error: 'Prospects can only order hours, not view them' }, { status: 403 });
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Fetch all imported invoices with hour packages
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
      .in('status', ['paid', 'imported']) // Include both paid and imported invoices
      .order('issue_date', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    // Fetch ALL flight logs without any limit - read hours directly from flight logs
    // Use chunked queries to bypass Supabase's 1000 record limit
    let allFlightLogs: any[] = [];
    let offset = 0;
    const chunkSize = 1000;
    let hasMore = true;

    console.log('🔍 Fetching all flight logs in chunks to bypass 1000 record limit...');

    while (hasMore) {
      const { data: flightLogsChunk, error: flightLogsError } = await supabase
        .from('flight_logs')
        .select(`
          id,
          pilotId,
          instructorId,
          totalHours,
          date,
          flightType
        `)
        .order('date', { ascending: false })
        .range(offset, offset + chunkSize - 1);

      if (flightLogsError) {
        console.error('Error fetching flight logs chunk:', flightLogsError);
        return NextResponse.json({ error: 'Failed to fetch flight logs' }, { status: 500 });
      }

      if (!flightLogsChunk || flightLogsChunk.length === 0) {
        hasMore = false;
      } else {
        allFlightLogs = allFlightLogs.concat(flightLogsChunk);
        offset += chunkSize;
        console.log(`   Chunk ${Math.floor(offset / chunkSize)}: ${flightLogsChunk.length} records (total: ${allFlightLogs.length})`);
      }
    }

    console.log(`✅ Total flight logs fetched: ${allFlightLogs.length}`);

    const flightLogs = allFlightLogs;

    // Get company information for invoices with company_id
    const companyIds = Array.from(new Set(
      invoices?.flatMap(invoice => 
        invoice.invoice_clients?.map(client => client.company_id).filter(Boolean) || []
      ) || []
    ));
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, vat_code, email')
      .in('id', companyIds);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      // Don't fail the entire request, just log the error
    }

    // Create company lookup map
    const companyMap = new Map(companies?.map((company: any) => [company.id, company]) || []);

    // Get all user IDs from invoice_clients to fetch user information
    const userIds = Array.from(new Set(
      invoices?.flatMap(invoice => 
        invoice.invoice_clients?.map(client => client.user_id).filter(Boolean) || []
      ) || []
    ));
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch user information' }, { status: 500 });
    }

    // Create user lookup map
    const userMap = new Map(users?.map((user: any) => [user.id, user]) || []);

    // Process invoices to extract hour packages
    const clientPackages = new Map<string, any[]>();
    const clientMap = new Map<string, any>();
    
    // Also include users with PPL courses who might not have hour packages
    console.log(`🔍 Checking for users with PPL courses...`);
    const { data: pplInvoices, error: pplError } = await supabase
      .from('invoices')
      .select(`
        is_ppl,
        ppl_hours_paid,
        invoice_clients!inner (
          user_id,
          email
        )
      `)
      .eq('is_ppl', true);
    
    if (pplError) {
      console.log('❌ Error fetching PPL invoices:', pplError.message);
    } else {
      console.log(`✅ Found ${pplInvoices?.length || 0} PPL course invoices`);
      
      // Get user IDs from PPL invoices
      const pplUserIds = pplInvoices?.map(invoice => invoice.invoice_clients?.[0]?.user_id).filter(Boolean) || [];
      
      // Fetch user data for PPL course users
      if (pplUserIds.length > 0) {
        const { data: pplUsers, error: pplUsersError } = await supabase
          .from('users')
          .select('id, email, firstName, lastName')
          .in('id', pplUserIds);
        
        if (pplUsersError) {
          console.log('❌ Error fetching PPL users:', pplUsersError.message);
        } else {
          // Create user lookup map
          const pplUserMap = new Map(pplUsers?.map(user => [user.id, user]) || []);
          
          // Log PPL course information
          pplInvoices?.forEach(invoice => {
            const client = invoice.invoice_clients?.[0];
            const user = client?.user_id ? pplUserMap.get(client.user_id) : null;
            if (user) {
              console.log(`   - ${user.email} (${user.firstName} ${user.lastName}): ${invoice.ppl_hours_paid} hours`);
            }
          });
          
          // Add PPL course users to client map if they're not already included
          pplInvoices?.forEach(invoice => {
            const client = invoice.invoice_clients?.[0];
            const user = client?.user_id ? pplUserMap.get(client.user_id) : null;
            if (user && !clientMap.has(user.email)) {
              clientMap.set(user.email, {
                id: user.email,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                user_id: user.id,
                company: null
              });
              console.log(`➕ Added PPL course user to client map: ${user.email}`);
            }
          });
        }
      }
    }

    for (const invoice of invoices || []) {
      try {
        // Get client information - filter out invoices with invalid client data
        const client = invoice.invoice_clients?.[0];
        if (!client || !client.email || client.email === 'undefined' || client.email === 'null') continue;
        
        // Create client data
        const clientId = client.email;
        if (!clientMap.has(clientId)) {
          const company = client.company_id ? companyMap.get(client.company_id) : null;
          
          // Get the actual user information if user_id is available
          let userInfo = null;
          if (client.user_id) {
            userInfo = userMap.get(client.user_id);
          }
          
          clientMap.set(clientId, {
            id: clientId,
            name: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : client.name,
            email: client.email,
            vatCode: client.vat_code,
            user_id: client.user_id,
            company: company ? {
              id: company.id,
              name: company.name,
              vatCode: company.vat_code,
              email: company.email
            } : null
          });
        }

        // Extract hour packages from invoice items
        const hourItems = invoice.invoice_items?.filter((item: any) => 
          item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
        ) || [];

        hourItems.forEach((item: any) => {
          const packageData = {
            id: `${invoice.id}-${item.name}`,
            clientId: clientId,
            invoiceId: invoice.smartbill_id,
            totalHours: item.quantity,
            usedHours: 0, // Will be calculated from flight logs
            remainingHours: item.quantity,
            purchaseDate: invoice.issue_date,
            status: 'active',
            price: item.total_amount,
            currency: invoice.currency
          };

          if (!clientPackages.has(clientId)) {
            clientPackages.set(clientId, []);
          }
          clientPackages.get(clientId)!.push(packageData);
        });
      } catch (error) {
        console.error('Error processing invoice:', error);
      }
    }

    // Get pilot and instructor information for flight logs
    const pilotIds = Array.from(new Set(flightLogs?.map((log: any) => log.pilotId).filter(Boolean) || []));
    const instructorIds = Array.from(new Set(flightLogs?.map((log: any) => log.instructorId).filter(Boolean) || []));
    const allUserIds = Array.from(new Set([...pilotIds, ...instructorIds]));
    
    // Fetch additional users for flight logs if not already fetched
    const additionalUserIds = allUserIds.filter(id => !userMap.has(id));
    if (additionalUserIds.length > 0) {
      const { data: additionalUsers, error: additionalUsersError } = await supabase
        .from('users')
        .select('id, email, firstName, lastName')
        .in('id', additionalUserIds);

      if (additionalUsersError) {
        console.error('Error fetching additional users:', additionalUsersError);
      } else {
        // Add additional users to the existing userMap
        additionalUsers?.forEach((user: any) => {
          userMap.set(user.id, user);
        });
      }
    }

    // Process flight logs to calculate used hours for each client
    // Consider all records where the client is involved (as pilot or receiving dual training)
    // Exclude FERRY flights from hour calculations
    const clientFlightHours = new Map<string, number>();
    const clientFlightLogs = new Map<string, any[]>();

    flightLogs?.forEach((log: any) => {
      const pilot = userMap.get(log.pilotId) as any;
      const instructor = log.instructorId ? userMap.get(log.instructorId) as any : null;
      
      // Skip FERRY and DEMO flights when calculating used hours
      const isFerryFlight = log.flightType && log.flightType.toUpperCase().includes('FERRY');
      const isDemoFlight = log.flightType && log.flightType.toUpperCase().includes('DEMO');
      
      // If there's a pilot, count their hours (excluding FERRY and DEMO flights)
      if (pilot?.email) {
        if (!isFerryFlight && !isDemoFlight) {
          const currentHours = clientFlightHours.get(pilot.email) || 0;
          clientFlightHours.set(pilot.email, currentHours + log.totalHours);
        }
        
        // Store flight log for this client (including FERRY and DEMO flights for display purposes)
        if (!clientFlightLogs.has(pilot.email)) {
          clientFlightLogs.set(pilot.email, []);
        }
        clientFlightLogs.get(pilot.email)!.push({
          id: log.id,
          pilotId: log.pilotId,
          totalHours: log.totalHours,
          date: log.date,
          flightType: log.flightType,
          role: 'PIC',
          isFerryFlight: isFerryFlight,
          isDemoFlight: isDemoFlight
        });
      }
      
      // If there's an instructor and it's dual training, count hours for the student/pilot
      if (instructor?.email && log.instructorId) {
        // This is dual training - the pilot is receiving instruction
        // The pilot's hours are already counted above, but we can track this as dual training
        if (pilot?.email) {
          // Update the flight log to indicate dual training
          const existingLogs = clientFlightLogs.get(pilot.email) || [];
          const existingLog = existingLogs.find(fl => fl.id === log.id);
          if (existingLog) {
            existingLog.role = 'Dual Training';
            existingLog.instructorId = log.instructorId;
          }
        }
      }
    });

    // Build final response
    const filteredClients = Array.from(clientMap.values())
      .filter(client => {
        // Filter based on user's access level
        if (isAdmin) return true; // Admins can see all
        return allowedClientEmails.includes(client.email);
      });
    
    console.log(`🔍 Processing ${filteredClients.length} clients for API response`);
    filteredClients.forEach(client => {
      console.log(`   - ${client.email} (user_id: ${client.user_id})`);
    });
    
    const clientsData = await Promise.all(
      filteredClients.map(async client => {
          const packages = clientPackages.get(client.id) || [];
          const totalUsedHours = clientFlightHours.get(client.id) || 0;
          
          // Calculate remaining hours for each package using FIFO method
          let totalBoughtHours = 0;
          let totalRemainingHours = 0;

          packages.forEach(pkg => {
            totalBoughtHours += pkg.totalHours;
          });

          // Get PPL course data for this client
          let pplCourseData = null;
          let pplBoughtHours = 0;
          if (client.user_id) {
            try {
              console.log(`🔍 Fetching PPL course data for ${client.email} (user_id: ${client.user_id})`);
              const { data: pplInvoices, error: pplError } = await supabase
                .from('invoices')
                .select('is_ppl, ppl_hours_paid, smartbill_id, issue_date')
                .eq('is_ppl', true)
                .eq('invoice_clients.user_id', client.user_id);
              
              if (pplError) {
                console.error(`❌ Error fetching PPL invoices for ${client.email}:`, pplError.message);
              } else if (pplInvoices && pplInvoices.length > 0) {
                console.log(`📊 Found ${pplInvoices.length} PPL course invoices for ${client.email}`);
                
                const totalPPLHours = pplInvoices.reduce((sum, invoice) => sum + (invoice.ppl_hours_paid || 0), 0);
                pplBoughtHours = totalPPLHours;
                
                pplCourseData = {
                  invoices: pplInvoices,
                  totalHoursPaid: totalPPLHours,
                  totalHours: 45, // Standard PPL course is 45 hours
                  remainingHours: Math.max(0, 45 - totalPPLHours)
                };
                
                console.log(`✅ PPL course data created for ${client.email}:`, {
                  invoices: pplInvoices.length,
                  totalHoursPaid: totalPPLHours,
                  pplBoughtHours
                });
              } else {
                console.log(`⚠️  No PPL course invoices found for ${client.email}`);
              }
            } catch (error) {
              console.error(`❌ Error fetching PPL course data for ${client.email}:`, error);
            }
          } else {
            console.log(`⚠️  No user_id for client ${client.email}`);
          }

          // Add PPL course hours to total bought hours
          totalBoughtHours += pplBoughtHours;

          // FIFO calculation: consume packages in chronological order
          let remainingUsedHours = totalUsedHours;
          
          // Sort packages by purchase date (oldest first for FIFO)
          const sortedPackages = [...packages].sort((a, b) => 
            new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
          );

          // Apply FIFO logic to each package
          sortedPackages.forEach(pkg => {
            if (remainingUsedHours <= 0) {
              // No more hours to consume
              pkg.usedHours = 0;
              pkg.remainingHours = pkg.totalHours;
            } else if (remainingUsedHours >= pkg.totalHours) {
              // Consume entire package
              pkg.usedHours = pkg.totalHours;
              pkg.remainingHours = 0;
              remainingUsedHours -= pkg.totalHours;
            } else {
              // Partially consume package
              pkg.usedHours = remainingUsedHours;
              pkg.remainingHours = pkg.totalHours - remainingUsedHours;
              remainingUsedHours = 0;
            }
            
            // Update package status based on remaining hours
            if (pkg.remainingHours <= 0) {
              pkg.status = 'overdrawn';
            } else if (pkg.remainingHours <= 1) {
              pkg.status = 'low hours';
            } else {
              pkg.status = 'in progress';
            }
          });

          // Calculate total remaining hours
          totalRemainingHours = totalBoughtHours - totalUsedHours;



          // Get recent flights for this client (all records where they were involved)
          const recentFlights = clientFlightLogs.get(client.id) || [];

          return {
            client,
            packages,
            pplCourse: pplCourseData,
            totalBoughtHours,
            totalUsedHours,
            totalRemainingHours,
            recentFlights: recentFlights.slice(0, 5) // Show last 5 flights
          };
        })
    );

    return NextResponse.json({
      clients: clientsData,
      totalClients: clientsData.length,
      totalBoughtHours: clientsData.reduce((sum, c) => sum + c.totalBoughtHours, 0),
      totalUsedHours: clientsData.reduce((sum, c) => sum + c.totalUsedHours, 0),
      totalRemainingHours: clientsData.reduce((sum, c) => sum + c.totalRemainingHours, 0)
    });

  } catch (error) {
    console.error('Error in client hours API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 