import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

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
          user_roles!user_roles_userId_fkey (
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
          user_roles!user_roles_userId_fkey (
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

    const stats = {
      totalFlightHours: Math.round(totalFlightHours * 10) / 10, // Round to 1 decimal place
      totalLandings,
      totalPilots,
      totalStudents,
      totalUsers,
      totalAircraft
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching OG stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 