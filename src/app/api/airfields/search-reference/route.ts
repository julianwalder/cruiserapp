import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { searchQuery } = await request.json();

    if (!searchQuery || searchQuery.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Search in reference_airports table by name, ICAO code, IATA code, or GPS code
    // Use unaccent for diacritic-insensitive search on text fields
    let airports, error;
    
    try {
      // Try to use the diacritic-insensitive search function
      const result = await supabase
        .rpc('search_airports_diacritic_insensitive', {
          search_query: searchQuery,
          max_results: 50
        });
      airports = result.data;
      error = result.error;
    } catch (rpcError) {
      // Fallback to regular search if the function doesn't exist
      console.log('Diacritic-insensitive search function not available, using fallback search');
      const result = await supabase
        .from('reference_airports')
        .select(`
          id,
          name,
          icao_code,
          iata_code,
          gps_code,
          local_code,
          municipality,
          iso_country,
          iso_region,
          latitude_deg,
          longitude_deg,
          elevation_ft,
          type
        `)
        .or(`name.ilike.%${searchQuery}%,icao_code.ilike.%${searchQuery}%,iata_code.ilike.%${searchQuery}%,gps_code.ilike.%${searchQuery}%,local_code.ilike.%${searchQuery}%,municipality.ilike.%${searchQuery}%`)
        .limit(50);
      airports = result.data;
      error = result.error;
    }

    // Get country names for the airports
    if (airports && airports.length > 0) {
      const countryCodes = [...new Set(airports.map(a => a.iso_country).filter(Boolean))];
      if (countryCodes.length > 0) {
        const { data: countries } = await supabase
          .from('reference_countries')
          .select('code, name')
          .in('code', countryCodes);
        
        // Create a map for quick lookup
        const countryMap = new Map(countries?.map(c => [c.code, c.name]) || []);
        
        // Add country names to airports
        airports.forEach(airport => {
          if (airport.iso_country) {
            airport.country_name = countryMap.get(airport.iso_country);
          }
        });
      }
    }

    // Get region names for the airports
    if (airports && airports.length > 0) {
      const regionCodes = [...new Set(airports.map(a => a.iso_region).filter(Boolean))];
      if (regionCodes.length > 0) {
        const { data: regions } = await supabase
          .from('reference_regions')
          .select('code, name')
          .in('code', regionCodes);
        
        // Create a map for quick lookup
        const regionMap = new Map(regions?.map(r => [r.code, r.name]) || []);
        
        // Add region names to airports
        airports.forEach(airport => {
          if (airport.iso_region) {
            airport.region_name = regionMap.get(airport.iso_region);
          }
        });
      }
    }

    if (error) {
      console.error('Error searching airports:', error);
      return NextResponse.json(
        { error: 'Failed to search airports' },
        { status: 500 }
      );
    }

    return NextResponse.json({ airports: airports || [] });
  } catch (error) {
    console.error('Error in search-reference route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
