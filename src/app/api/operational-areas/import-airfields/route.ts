import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// POST /api/operational-areas/import-airfields - Import airfields from OurAirports
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
    if (!body.countries || !Array.isArray(body.countries) || body.countries.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate airfield types if provided - use OurAirports types
    const airfieldTypes = body.types || [
      'large_airport',
      'medium_airport', 
      'small_airport',
      'heliport',
      'seaplane_base',
      'balloonport'
    ];

    // Fetch airfields from OurAirports database
    const fetchedAirfields = await fetchAirfieldsFromOurAirports(body.countries, airfieldTypes);
    console.log(`Fetched ${fetchedAirfields.length} airfields from OurAirports for countries: ${body.countries.join(', ')} and types: ${airfieldTypes.join(', ')}`);

    // Save airfields to database
    const savedAirfields = await saveAirfieldsToDatabase(fetchedAirfields, user.id);

    return NextResponse.json({ 
      message: `Successfully imported ${savedAirfields.length} airfields`,
      airfields: savedAirfields 
    });
  } catch (error) {
    console.error('Error importing airfields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function saveAirfieldsToDatabase(fetchedAirfields: any[], userId: string): Promise<any[]> {
  console.log(`Starting to save ${fetchedAirfields.length} airfields to database...`);
  const savedAirfields: any[] = [];

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not initialized');
    return savedAirfields;
  }

  for (const airfieldData of fetchedAirfields) {
    try {
      // Determine the best code to use (prioritize ICAO > IATA > Local > Ident)
      const code = airfieldData.icao_code || airfieldData.iata_code || airfieldData.local_code || airfieldData.ident;
      
      if (!code) {
        console.log(`Skipping airfield ${airfieldData.name} - no valid code found`);
        continue;
      }
      
      console.log(`Processing airfield: ${airfieldData.name} (${code})`);
      
      // Check if airfield already exists by code
      const { data: existingAirfield, error: existingError } = await supabase
        .from('airfields')
        .select('id')
        .eq('code', code)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing airfield:', existingError);
        continue;
      }

      if (existingAirfield) {
        console.log(`Airfield ${code} already exists, skipping...`);
        // Airfield already exists, just add it to saved list
        savedAirfields.push(existingAirfield);
        continue;
      }

      console.log(`Creating new airfield: ${airfieldData.name} (${code})`);
      
      // Create new airfield
      const { data: newAirfield, error: createError } = await supabase
        .from('airfields')
        .insert({
          name: airfieldData.name,
          code: code,
          type: mapAirfieldType(airfieldData.type),
          status: 'ACTIVE',
          city: airfieldData.municipality || airfieldData.city || '',
          state: airfieldData.state || '',
          country: airfieldData.country,
          latitude: airfieldData.latitude,
          longitude: airfieldData.longitude,
          elevation: airfieldData.elevation,
          phone: '',
          email: '',
          website: airfieldData.home_link || '',
          createdById: userId,
        })
        .select('*')
        .single();

      if (createError) {
        console.error(`Error creating airfield ${code}:`, createError);
        continue;
      }

      savedAirfields.push(newAirfield);
      console.log(`Successfully created airfield: ${airfieldData.name} (${code})`);
      
    } catch (error) {
      console.error(`Error processing airfield ${airfieldData.name}:`, error);
      continue;
    }
  }

  console.log(`Completed saving airfields. Total saved: ${savedAirfields.length}`);
  return savedAirfields;
}

async function fetchAirfieldsFromOurAirports(countries: string[], types: string[]) {
  // This is a placeholder function - in a real implementation, you would fetch from OurAirports API
  // For now, return an empty array
  console.log(`Would fetch airfields for countries: ${countries.join(', ')} and types: ${types.join(', ')}`);
  return [];
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