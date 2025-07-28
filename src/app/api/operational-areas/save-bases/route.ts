import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Clear existing base airfields by updating isBase flag
    const { error: clearError } = await supabase
      .from('airfields')
      .update({ isBase: false })
      .eq('createdById', user.id)
      .eq('isBase', true);

    if (clearError) {
      console.error('Error clearing existing base airfields:', clearError);
      return NextResponse.json(
        { error: 'Failed to clear existing base airfields' },
        { status: 500 }
      );
    }

    // Save new base airfields
    const savedBases = [];
    for (const airfield of body.baseAirfields) {
      if (airfield.isBase) {
        // First, create or update the airfield in our database
        const { data: savedAirfield, error: upsertError } = await supabase
          .from('airfields')
          .upsert({
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
          }, {
            onConflict: 'code'
          })
          .select('*')
          .single();

        if (upsertError) {
          console.error('Error upserting airfield:', upsertError);
          continue;
        }

        // Update the airfield to mark it as a base
        const { data: updatedAirfield, error: updateError } = await supabase
          .from('airfields')
          .update({ isBase: true })
          .eq('id', savedAirfield.id)
          .select('*')
          .single();

        if (updateError) {
          console.error('Error updating airfield base status:', updateError);
          continue;
        }

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

// Helper function to map airfield types
function mapAirfieldType(ourAirportsType: string): string {
  const typeMapping: { [key: string]: string } = {
    'large_airport': 'LARGE_AIRPORT',
    'medium_airport': 'MEDIUM_AIRPORT',
    'small_airport': 'SMALL_AIRPORT',
    'heliport': 'HELIPORT',
    'seaplane_base': 'SEAPLANE_BASE',
    'balloonport': 'BALLOONPORT',
  };
  
  return typeMapping[ourAirportsType] || 'UNKNOWN';
} 