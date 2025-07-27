import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

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

async function saveAirfieldsToDatabase(fetchedAirfields: any[], userId: string) {
  console.log(`Starting to save ${fetchedAirfields.length} airfields to database...`);
  const savedAirfields = [];

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
      const existingAirfield = await prisma.airfield.findUnique({
        where: { code: code }
      });

      if (existingAirfield) {
        console.log(`Airfield ${code} already exists, skipping...`);
        // Airfield already exists, just add it to saved list
        savedAirfields.push(existingAirfield);
        continue;
      }

      console.log(`Creating new airfield: ${airfieldData.name} (${code})`);
      
      // Create new airfield
      const newAirfield = await prisma.airfield.create({
        data: {
          name: airfieldData.name,
          code: code,
          type: airfieldData.type, // Store the original OurAirports type directly
          city: airfieldData.municipality || null,
          state: airfieldData.region || null,
          country: airfieldData.country,
          latitude: airfieldData.latitude ? parseFloat(airfieldData.latitude) : null,
          longitude: airfieldData.longitude ? parseFloat(airfieldData.longitude) : null,
          elevation: airfieldData.elevation ? parseInt(airfieldData.elevation) : null,
          phone: null,
          email: null,
          website: airfieldData.home_link || null,
          status: airfieldData.type === 'closed' ? 'CLOSED' : 'ACTIVE',
          isBase: false, // Default to false, super admin will set this later
          createdById: userId,
        }
      });

      console.log(`Successfully created airfield: ${newAirfield.name} (${newAirfield.code})`);
      savedAirfields.push(newAirfield);
    } catch (error) {
      console.error(`Error saving airfield ${airfieldData.name}:`, error);
      // Continue with other airfields even if one fails
    }
  }

  console.log(`Finished saving airfields. Total saved: ${savedAirfields.length}`);
  return savedAirfields;
}



async function fetchAirfieldsFromOurAirports(countries: string[], types: string[] = []) {
  try {
    console.log(`Fetching airfields for countries: ${countries.join(', ')} and types: ${types.join(', ')}`);
    
    // Fetch airports.csv from OurAirports GitHub repository
    const response = await fetch('https://raw.githubusercontent.com/davidmegginson/ourairports-data/master/airports.csv');
    
    if (!response.ok) {
      throw new Error('Failed to fetch airports data');
    }

    const csvText = await response.text();
    console.log(`Fetched CSV data, length: ${csvText.length} characters`);
    
    const lines = csvText.split('\n');
    console.log(`Total lines in CSV: ${lines.length}`);
    
    // Show first few lines for debugging
    console.log('First 3 lines of CSV:');
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      console.log(`Line ${i}: ${lines[i]}`);
    }
    
    // Skip header line
    const dataLines = lines.slice(1);
    console.log(`Data lines (excluding header): ${dataLines.length}`);
    
    // Show what countries and types we're looking for
    console.log(`Looking for countries: ${countries.join(', ')}`);
    console.log(`Looking for types: ${types.join(', ')}`);
    
    const airfields: any[] = [];
    let processedLines = 0;
    let matchingCountries = 0;
    let matchingTypes = 0;
    let countryCounts: { [key: string]: number } = {};
    let typeCounts: { [key: string]: number } = {};
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      processedLines++;
      if (processedLines % 1000 === 0) {
        console.log(`Processed ${processedLines} lines...`);
      }
      
      // Parse CSV line (handle commas within quotes)
      const fields = parseCSVLine(line);
      
      if (fields.length < 19) continue;
      
      const [
        id, ident, type, name, latitude_deg, longitude_deg, elevation_ft, 
        continent, iso_country, iso_region, municipality, scheduled_service, 
        icao_code, iata_code, gps_code, local_code, home_link, wikipedia_link, keywords
      ] = fields;
      
      // Count all countries and types for debugging
      if (iso_country && iso_country.trim()) {
        countryCounts[iso_country] = (countryCounts[iso_country] || 0) + 1;
      }
      if (type && type.trim()) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
      
      // Show first few parsed records for debugging
      if (processedLines <= 5) {
        console.log(`Line ${processedLines} parsed: iso_country="${iso_country}", type="${type}", name="${name}", icao="${icao_code}"`);
      }
      
            // Check if this airfield is in one of our selected countries AND matches selected types
      if (countries.includes(iso_country) && types.includes(type)) {
        matchingCountries++;
        matchingTypes++;
        console.log(`Found matching airfield: ${iso_country} - ${type} - ${name} (${icao_code || iata_code})`);
        
        airfields.push({
          id: id,
          name: name || 'Unknown',
          icao_code: icao_code || '',
          iata_code: iata_code || '',
          local_code: local_code || '',
          ident: ident || '',
          type: type,
          latitude: latitude_deg || '',
          longitude: longitude_deg || '',
          elevation: elevation_ft || '',
          continent: continent || '',
          country: iso_country || '',
          region: iso_region || '',
          municipality: municipality || '',
          scheduled_service: scheduled_service || '',
          gps_code: gps_code || '',
          home_link: home_link || '',
          wikipedia_link: wikipedia_link || '',
          keywords: keywords || '',
        });
      } else if (countries.includes(iso_country) && !types.includes(type)) {
        console.log(`Skipping airfield due to type filter: ${iso_country} - ${type} - ${name} (${icao_code || iata_code}) - Type not in selected types: ${types.join(', ')}`);
      } else if (!countries.includes(iso_country) && types.includes(type)) {
        console.log(`Skipping airfield due to country filter: ${iso_country} - ${type} - ${name} (${icao_code || iata_code}) - Country not in selected countries: ${countries.join(', ')}`);
      }
    }
    
    console.log(`Total processed lines: ${processedLines}`);
    console.log(`Matching countries found: ${matchingCountries}`);
    console.log(`Matching types found: ${matchingTypes}`);
    console.log(`Airfields collected: ${airfields.length}`);
    
    // Show country counts for debugging
    console.log('Countries found in CSV (top 10):');
    const sortedCountries = Object.entries(countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    sortedCountries.forEach(([country, count]) => {
      console.log(`  ${country}: ${count} airfields`);
    });

    // Show type counts for debugging
    console.log('Types found in CSV:');
    const sortedTypes = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a);
    sortedTypes.forEach(([type, count]) => {
      console.log(`  ${type}: ${count} airfields`);
    });
    
    // Sort by name and limit to reasonable number
    const result = airfields
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 1000); // Limit to 1000 airfields to avoid overwhelming the UI
      
    console.log(`Final result: ${result.length} airfields`);
    return result;
      
  } catch (error) {
    console.error('Error fetching from OurAirports:', error);
    throw new Error('Failed to fetch airfields from OurAirports database');
  }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  fields.push(currentField);
  return fields;
} 