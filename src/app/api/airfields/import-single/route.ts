import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '@/lib/auth';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { airportId } = await request.json();

    if (!airportId) {
      return NextResponse.json(
        { error: 'Airport ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the createdBy and source columns exist in the airfields table
    const { data: tableInfo } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'airfields')
      .in('column_name', ['createdBy', 'source']);
    
    const hasCreatedBy = tableInfo?.some(col => col.column_name === 'createdBy');
    const hasSource = tableInfo?.some(col => col.column_name === 'source');
    
    // Get a valid user ID from the users table if createdBy column exists
    let validUserId = null;
    if (hasCreatedBy) {
      const { data: validUser } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      validUserId = validUser?.[0]?.id || null;
    }

    // Get the airport data from reference table
    const { data: airport, error: airportError } = await supabase
      .from('reference_airports')
      .select('*')
      .eq('id', airportId)
      .single();

    if (airportError || !airport) {
      return NextResponse.json(
        { error: 'Airport not found in reference database' },
        { status: 404 }
      );
    }

    // Check if airport already exists in the main airfields table
    const codes = [airport.icao_code, airport.iata_code, airport.gps_code, airport.local_code].filter(Boolean);
    if (codes.length > 0) {
      const { data: existingAirfields } = await supabase
        .from('airfields')
        .select('id, code, name')
        .in('code', codes);

      if (existingAirfields && existingAirfields.length > 0) {
        const existingCodes = existingAirfields.map(af => af.code).join(', ');
        const existingNames = existingAirfields.map(af => af.name).join(', ');
        
        return NextResponse.json(
          { 
            error: 'An airfield with this code already exists',
            details: {
              existingCodes,
              existingNames,
              message: `Airfield(s) with code(s): ${existingCodes} already exist(s) in your database.`
            }
          },
          { status: 409 }
        );
      }
    }

    // Map the reference airport data to the main airfields table structure
    const airfieldData: any = {
      name: airport.name,
      code: airport.icao_code || airport.iata_code || airport.gps_code || airport.local_code || `REF-${airport.id}`,
      type: mapAirportType(airport.type),
      city: airport.municipality || '',
      state: airport.iso_region || '',
      country: airport.iso_country || '',
      latitude: airport.latitude_deg?.toString() || '',
      longitude: airport.longitude_deg?.toString() || '',
      elevation: airport.elevation_ft?.toString() || '',
      status: 'ACTIVE' as const,
      isBase: false,
      updatedAt: new Date().toISOString()
    };
    
    // Only add these fields if the columns exist
    if (hasCreatedBy) {
      airfieldData.createdBy = validUserId;
    }
    if (hasSource) {
      airfieldData.source = 'imported' as const;
    }

    // Insert the airfield
    const { data: newAirfield, error: insertError } = await supabase
      .from('airfields')
      .insert(airfieldData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting airfield:', insertError);
      return NextResponse.json(
        { error: 'Failed to import airfield' },
        { status: 500 }
      );
    }

    // Get additional data (runways, frequencies, navaids) if available
    const additionalData = await getAdditionalAirportData(supabase, airport.id, airport);

    return NextResponse.json({
      success: true,
      airfield: newAirfield,
      additionalData
    });
  } catch (error) {
    console.error('Error in import-single route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to map airport types from OurAirports to our system
function mapAirportType(ourAirportsType: string | null): string {
  if (!ourAirportsType) return 'AIRPORT';
  
  const type = ourAirportsType.toLowerCase();
  
  // Log the original type for debugging
  console.log('Mapping airport type:', ourAirportsType, 'to lowercase:', type);
  
  if (type.includes('heliport')) return 'HELIPORT';
  if (type.includes('seaplane')) return 'SEAPLANE_BASE';
  if (type.includes('balloon')) return 'BALLOON_PORT';
  if (type.includes('glider')) return 'GLIDER_PORT';
  if (type.includes('ultralight')) return 'ULTRALIGHT_FIELD';
  if (type.includes('closed') || type.includes('strip')) return 'AIRSTRIP';
  
  // Check for size-based types
  if (type.includes('small')) return 'SMALL_AIRPORT';
  if (type.includes('medium')) return 'MEDIUM_AIRPORT';
  if (type.includes('large')) return 'LARGE_AIRPORT';
  
  // Check for specific OurAirports types
  if (type === 'small_airport') return 'SMALL_AIRPORT';
  if (type === 'medium_airport') return 'MEDIUM_AIRPORT';
  if (type === 'large_airport') return 'LARGE_AIRPORT';
  
  return 'AIRPORT';
}

// Helper function to get additional airport data
async function getAdditionalAirportData(supabase: any, airportId: number, airport: any) {
  const additionalData: any = {};

  // Get runways
  const { data: runways } = await supabase
    .from('reference_runways')
    .select('*')
    .eq('airport_ref', airportId);
  
  if (runways && runways.length > 0) {
    additionalData.runways = runways;
  }

  // Get frequencies
  const { data: frequencies } = await supabase
    .from('reference_airport_frequencies')
    .select('*')
    .eq('airport_ref', airportId);
  
  if (frequencies && frequencies.length > 0) {
    additionalData.frequencies = frequencies;
  }

  // Get navaids by associated airport code
  if (airport.icao_code || airport.iata_code) {
    const { data: navaids } = await supabase
      .from('reference_navaids')
      .select('*')
      .eq('associated_airport', airport.icao_code || airport.iata_code)
      .limit(10);
    
    if (navaids && navaids.length > 0) {
      additionalData.navaids = navaids;
    }
  }

  // Get airport comments
  const { data: comments } = await supabase
    .from('reference_airport_comments')
    .select('*')
    .eq('airportRef', airportId)
    .order('date', { ascending: false })
    .limit(5);
  
  if (comments && comments.length > 0) {
    additionalData.comments = comments;
  }

  return additionalData;
}
