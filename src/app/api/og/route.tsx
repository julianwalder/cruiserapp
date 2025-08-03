import { ImageResponse } from '@vercel/og';
import { getSupabaseClient } from '@/lib/supabase';

// export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Cruiser Aviation';
    const subtitle = searchParams.get('subtitle') || 'Flight Management System';

    // Fetch complete statistics from the stats API
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    // Fetch all required statistics
    // Fetch all flight hours with pagination
    let allFlightHoursData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('flight_logs')
        .select('totalHours')
        .not('totalHours', 'is', null)
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Error fetching flight hours: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allFlightHoursData = allFlightHoursData.concat(data);
      from += pageSize;
      
      if (data.length < pageSize) {
        break;
      }
    }

    // Fetch all landings with pagination
    let allLandingsData: any[] = [];
    let landingsFrom = 0;
    const landingsPageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('flight_logs')
        .select('dayLandings, nightLandings')
        .not('dayLandings', 'is', null)
        .range(landingsFrom, landingsFrom + landingsPageSize - 1);

      if (error) {
        throw new Error(`Error fetching landings: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allLandingsData = allLandingsData.concat(data);
      landingsFrom += landingsPageSize;
      
      if (data.length < landingsPageSize) {
        break;
      }
    }

    const [
      totalPilotsResult,
      totalStudentsResult,
      totalUsersResult,
      totalAircraftResult
    ] = await Promise.all([
      
      // Total pilots (users with PILOT role)
      supabase
        .from('users')
        .select(`
          id,
          user_roles (
            roles (
              name
            )
          )
        `)
        .eq('status', 'ACTIVE'),
      
      // Total students (users with STUDENT role)
      supabase
        .from('users')
        .select(`
          id,
          user_roles (
            roles (
              name
            )
          )
        `)
        .eq('status', 'ACTIVE'),
      
      // Total users
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE'),
      
      // Total aircraft
      supabase
        .from('aircraft')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')
    ]);

    // Calculate total flight hours (sum of totalHours) - rounded to integer
    const totalFlightHours = Math.round(allFlightHoursData.reduce((sum: number, log: any) => {
      return sum + (log.totalHours || 0);
    }, 0));

    // Calculate total landings
    const totalLandings = allLandingsData.reduce((sum: number, log: any) => {
      return sum + (log.dayLandings || 0) + (log.nightLandings || 0);
    }, 0);

    // Count pilots and students
    const totalPilots = totalPilotsResult.data?.filter(user => 
      user.user_roles?.some((ur: any) => ur.roles.name === 'PILOT')
    ).length || 0;

    const totalStudents = totalStudentsResult.data?.filter(user => 
      user.user_roles?.some((ur: any) => ur.roles.name === 'STUDENT')
    ).length || 0;

    const totalUsers = totalUsersResult.count || 0;
    const totalAircraft = totalAircraftResult.count || 0;

    // Format statistics for display
    const stats = [
      { label: 'Flight Hours', value: `${Math.round(totalFlightHours * 10) / 10}` },
      { label: 'Landings', value: `${totalLandings}` },
      { label: 'Pilots', value: `${totalPilots}` },
      { label: 'Students', value: `${totalStudents}` }
    ];

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#000000',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              maxWidth: '1000px',
              flex: '1',
            }}
          >
            {/* Cruiser Aviation Logo - 50% width */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '600px', // 50% of 1200px
                height: '200px',
                marginBottom: '20px',
              }}
            >
              {/* Cruiser Aviation Logo - Local SVG */}
              <img
                src="https://app.cruiseraviation.com/logo_ca_white.svg"
                alt="Cruiser Aviation"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Thin Line Separator */}
            <div
              style={{
                width: '600px',
                height: '1px',
                backgroundColor: '#374151',
                marginBottom: '20px',
              }}
            />

            {/* Aircraft Sharing Text */}
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ffffff',
                margin: '0',
                lineHeight: '1.1',
              }}
            >
              Aircraft Sharing
            </h1>

            {/* Stats Grid */}
                         <div
               style={{
                 display: 'flex',
                 flexWrap: 'wrap',
                 gap: '20px',
                 marginTop: '40px',
                 maxWidth: '800px',
                 justifyContent: 'center',
                 alignItems: 'center',
                 width: '100%',
               }}
             >
              {stats.map((stat, index) => (
                                 <div
                   key={index}
                   style={{
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: 'center',
                     justifyContent: 'center',
                     textAlign: 'center',
                     padding: '16px 20px',
                     backgroundColor: '#1f2937',
                     borderRadius: '12px',
                     border: '1px solid #374151',
                     minWidth: '120px',
                     flex: '0 1 auto',
                   }}
                 >
                   <div
                     style={{
                       fontSize: '28px',
                       fontWeight: 'bold',
                       color: '#ffffff',
                       marginBottom: '4px',
                       textAlign: 'center',
                       width: '100%',
                     }}
                   >
                     {stat.value}
                   </div>
                   <div
                     style={{
                       fontSize: '14px',
                       color: '#9ca3af',
                       textAlign: 'center',
                       width: '100%',
                     }}
                   >
                     {stat.label}
                   </div>
                 </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '18px',
              color: '#6b7280',
              width: '100%',
              marginTop: '40px',
            }}
          >
            <span>app.cruiseraviation.com</span>
            <span>Flight Management System</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.log(`${e instanceof Error ? e.message : 'Unknown error'}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
} 