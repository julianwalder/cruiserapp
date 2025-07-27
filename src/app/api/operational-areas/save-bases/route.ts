import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// POST /api/operational-areas/save-bases - Save base airfields
export async function POST(request: NextRequest) {
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.baseAirfields || !Array.isArray(body.baseAirfields)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Clear existing base airfields by updating isBase flag
    await prisma.airfield.updateMany({
      where: {
        createdById: user.id,
        isBase: true,
      },
      data: {
        isBase: false,
      },
    });

    // Save new base airfields
    const savedBases = [];
    for (const airfield of body.baseAirfields) {
      if (airfield.isBase) {
        // First, create or update the airfield in our database
        const savedAirfield = await prisma.airfield.upsert({
          where: { code: airfield.code },
          update: {
            name: airfield.name,
            type: mapAirfieldType(airfield.type),
            status: 'ACTIVE',
            city: airfield.municipality || airfield.city || '',
            country: airfield.country,
            latitude: airfield.latitude,
            longitude: airfield.longitude,
            elevation: airfield.elevation,
            phone: '',
            email: '',
            website: airfield.home_link || '',
          },
          create: {
            name: airfield.name,
            code: airfield.code,
            type: mapAirfieldType(airfield.type),
            status: 'ACTIVE',
            city: airfield.municipality || airfield.city || '',
            country: airfield.country,
            latitude: airfield.latitude,
            longitude: airfield.longitude,
            elevation: airfield.elevation,
            phone: '',
            email: '',
            website: airfield.home_link || '',
            createdById: user.id,
          },
        });

        // Update the airfield to mark it as a base
        const updatedAirfield = await prisma.airfield.update({
          where: { id: savedAirfield.id },
          data: {
            isBase: true,
          },
        });

        savedBases.push(updatedAirfield);
      }
    }

    return NextResponse.json({ 
      message: `Successfully saved ${savedBases.length} base airfields`,
      savedBases 
    });
  } catch (error) {
    console.error('Error saving base airfields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function mapAirfieldType(ourAirportsType: string): 'AIRPORT' | 'AIRSTRIP' | 'HELIPORT' | 'SEAPLANE_BASE' {
  switch (ourAirportsType) {
    case 'large_airport':
      return 'AIRPORT';
    case 'medium_airport':
      return 'AIRPORT';
    case 'small_airport':
      return 'AIRSTRIP';
    case 'heliport':
      return 'HELIPORT';
    case 'seaplane_base':
      return 'SEAPLANE_BASE';
    default:
      return 'AIRPORT';
  }
} 