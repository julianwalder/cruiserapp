import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/reports/export - Export data for reports
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user has appropriate permissions
    if (!AuthService.hasPermission(userRoles, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'flights';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let data: any[] = [];
    let count = 0;

    switch (type) {
      case 'flights':
        // Export flight logs
        let flightsQuery = supabase
          .from('flight_logs')
          .select(`
            id,
            date,
            type,
            "departureTime",
            "arrivalTime",
            "flightDuration",
            "departureAirfield",
            "destinationAirfield",
            "pilotId",
            "instructorId",
            "aircraftId",
            "purpose",
            "remarks",
            "createdAt",
            "updatedAt"
          `);

        if (startDate && endDate) {
          flightsQuery = flightsQuery.gte('date', startDate).lte('date', endDate);
        }

        const { data: flights, count: flightsCount } = await flightsQuery;
        data = flights || [];
        count = flightsCount || 0;
        break;

      case 'users':
        // Export users
        const { data: users, count: usersCount } = await supabase
          .from('users')
          .select(`
            id,
            email,
            "firstName",
            "lastName",
            "personalNumber",
            phone,
            "dateOfBirth",
            address,
            city,
            state,
            "zipCode",
            country,
            status,
            "totalFlightHours",
            "licenseNumber",
            "medicalClass",
            "instructorRating",
            "lastLoginAt",
            "createdAt",
            "updatedAt"
          `);
        data = users || [];
        count = usersCount || 0;
        break;

      case 'aircraft':
        // Export aircraft
        const { data: aircraft, count: aircraftCount } = await supabase
          .from('aircraft')
          .select(`
            id,
            "registrationNumber",
            "icaoType",
            "manufacturer",
            model,
            type,
            status,
            "yearOfManufacture",
            "totalFlightHours",
            "lastMaintenanceDate",
            "nextMaintenanceDate",
            "insuranceExpiryDate",
            "registrationExpiryDate",
            "createdAt",
            "updatedAt"
          `);
        data = aircraft || [];
        count = aircraftCount || 0;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid export type. Must be flights, users, or aircraft' },
          { status: 400 }
        );
    }

    // Get additional statistics for the export
    const [
      totalFlightsResult,
      totalUsersResult,
      totalAircraftResult
    ] = await Promise.all([
      supabase.from('flight_logs').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('aircraft').select('id', { count: 'exact', head: true })
    ]);

    const exportData = {
      type,
      data,
      count,
      totalRecords: count,
      statistics: {
        totalFlights: totalFlightsResult.count || 0,
        totalUsers: totalUsersResult.count || 0,
        totalAircraft: totalAircraftResult.count || 0,
      },
      exportDate: new Date().toISOString(),
      exportedBy: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 