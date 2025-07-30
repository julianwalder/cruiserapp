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
    
    // Check if user has appropriate permissions for reports
    const hasReportsAccess = userRoles.some(role => 
      role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'BASE_MANAGER'
    );
    
    if (!hasReportsAccess) {
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
    let csvContent = '';

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

        const { data: flights } = await flightsQuery;
        data = flights || [];
        
        // Generate CSV for flights
        const flightHeaders = [
          'ID',
          'Date',
          'Type',
          'Departure Time',
          'Arrival Time',
          'Flight Duration (hours)',
          'Departure Airfield',
          'Destination Airfield',
          'Pilot ID',
          'Instructor ID',
          'Aircraft ID',
          'Purpose',
          'Remarks',
          'Created At',
          'Updated At'
        ];
        
        csvContent = flightHeaders.join(',') + '\n';
        data.forEach((flight: any) => {
          const row = [
            flight.id,
            flight.date,
            flight.type,
            flight.departureTime,
            flight.arrivalTime,
            flight.flightDuration,
            flight.departureAirfield,
            flight.destinationAirfield,
            flight.pilotId,
            flight.instructorId,
            flight.aircraftId,
            flight.purpose,
            flight.remarks,
            flight.createdAt,
            flight.updatedAt
          ].map(field => `"${field || ''}"`).join(',');
          csvContent += row + '\n';
        });
        break;

      case 'users':
        // Export users
        const { data: users } = await supabase
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
        
        // Generate CSV for users
        const userHeaders = [
          'ID',
          'Email',
          'First Name',
          'Last Name',
          'Personal Number',
          'Phone',
          'Date of Birth',
          'Address',
          'City',
          'State',
          'Zip Code',
          'Country',
          'Status',
          'Total Flight Hours',
          'License Number',
          'Medical Class',
          'Instructor Rating',
          'Last Login At',
          'Created At',
          'Updated At'
        ];
        
        csvContent = userHeaders.join(',') + '\n';
        data.forEach((user: any) => {
          const row = [
            user.id,
            user.email,
            user.firstName,
            user.lastName,
            user.personalNumber,
            user.phone,
            user.dateOfBirth,
            user.address,
            user.city,
            user.state,
            user.zipCode,
            user.country,
            user.status,
            user.totalFlightHours,
            user.licenseNumber,
            user.medicalClass,
            user.instructorRating,
            user.lastLoginAt,
            user.createdAt,
            user.updatedAt
          ].map(field => `"${field || ''}"`).join(',');
          csvContent += row + '\n';
        });
        break;

      case 'aircraft':
        // Export aircraft
        const { data: aircraft } = await supabase
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
        
        // Generate CSV for aircraft
        const aircraftHeaders = [
          'ID',
          'Registration Number',
          'ICAO Type',
          'Manufacturer',
          'Model',
          'Type',
          'Status',
          'Year of Manufacture',
          'Total Flight Hours',
          'Last Maintenance Date',
          'Next Maintenance Date',
          'Insurance Expiry Date',
          'Registration Expiry Date',
          'Created At',
          'Updated At'
        ];
        
        csvContent = aircraftHeaders.join(',') + '\n';
        data.forEach((aircraft: any) => {
          const row = [
            aircraft.id,
            aircraft.registrationNumber,
            aircraft.icaoType,
            aircraft.manufacturer,
            aircraft.model,
            aircraft.type,
            aircraft.status,
            aircraft.yearOfManufacture,
            aircraft.totalFlightHours,
            aircraft.lastMaintenanceDate,
            aircraft.nextMaintenanceDate,
            aircraft.insuranceExpiryDate,
            aircraft.registrationExpiryDate,
            aircraft.createdAt,
            aircraft.updatedAt
          ].map(field => `"${field || ''}"`).join(',');
          csvContent += row + '\n';
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid export type. Must be flights, users, or aircraft' },
          { status: 400 }
        );
    }

    // Return CSV file
    const filename = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 