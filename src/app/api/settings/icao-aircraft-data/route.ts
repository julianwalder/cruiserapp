import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user has admin privileges
    if (!decoded.roles.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Fetch all ICAO reference types from Prisma
    const icaoTypes = await prisma.iCAOReferenceType.findMany();

    // Function to format aircraft description from JSON
    const formatAircraftDescription = (description: string | null): string => {
      if (!description) return '';
      
      try {
        // Check if it's JSON
        if (description.startsWith('{')) {
          const descData = JSON.parse(description);
          if (descData.AircraftDescription) {
            // Format the aircraft description properly
            const aircraftDesc = descData.AircraftDescription;
            switch (aircraftDesc.toLowerCase()) {
              case 'landplane':
                return 'Landplane';
              case 'seaplane':
                return 'Seaplane';
              case 'amphibian':
                return 'Amphibian';
              case 'helicopter':
                return 'Helicopter';
              case 'gyrocopter':
                return 'Gyrocopter';
              case 'glider':
                return 'Glider';
              case 'poweredglider':
                return 'Powered Glider';
              case 'airship':
                return 'Airship';
              case 'balloon':
                return 'Balloon';
              case 'ultralight':
                return 'Ultralight';
              default:
                return aircraftDesc;
            }
          }
          // If no AircraftDescription, try to use Description field
          if (descData.Description) {
            return descData.Description;
          }
        }
        
        // If not JSON, return as is
        return description;
      } catch (error) {
        // If JSON parsing fails, return original description
        return description;
      }
    };

    // Format the descriptions before returning
    const formattedIcaoTypes = icaoTypes.map(type => ({
      ...type,
      description: formatAircraftDescription(type.description)
    }));

    return NextResponse.json(formattedIcaoTypes);
  } catch (error) {
    console.error('❌ Error fetching ICAO reference types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ICAO reference types' },
      { status: 500 }
    );
  }
} 