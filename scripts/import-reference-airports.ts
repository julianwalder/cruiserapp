import { getSupabaseClient } from '../src/lib/supabase';

interface AirportCSV {
  id: number;
  ident: string;
  type: string;
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft: number;
  continent: string;
  iso_country: string;
  iso_region: string;
  municipality: string;
  scheduled_service: string;
  icao_code: string;
  iata_code: string;
  gps_code: string;
  local_code: string;
  home_link: string;
  wikipedia_link: string;
  keywords: string;
}

async function importReferenceAirports() {
  console.log('Starting reference airports import...');
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Database connection failed');
  }

  try {
    // Fetch CSV from GitHub
    console.log('Fetching CSV from GitHub...');
    const response = await fetch('https://raw.githubusercontent.com/davidmegginson/ourairports-data/refs/heads/main/airports.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();
    const airports = parseCSV(csvText);
    
    console.log(`Processing ${airports.length} airports...`);
    
    // Clear existing reference data
    console.log('Clearing existing reference data...');
    const { error: deleteError } = await supabase
      .from('reference_airports')
      .delete()
      .neq('id', 0);
    
    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      throw deleteError;
    }
    
    // Import in batches
    const batchSize = 500;
    let imported = 0;
    
    for (let i = 0; i < airports.length; i += batchSize) {
      const batch = airports.slice(i, i + batchSize);
      
      console.log(`Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(airports.length / batchSize)}...`);
      
      const { error } = await supabase
        .from('reference_airports')
        .insert(batch);
      
      if (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
        throw error;
      }
      
      imported += batch.length;
      console.log(`Imported ${imported}/${airports.length} airports...`);
      
      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < airports.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Successfully imported ${imported} reference airports!`);
    
    // Update last_updated timestamp
    const { error: updateError } = await supabase
      .from('reference_airports')
      .update({ last_updated: new Date().toISOString() });
    
    if (updateError) {
      console.warn('Warning: Could not update last_updated timestamp:', updateError);
    }
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

function parseCSV(csvText: string): AirportCSV[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      const airport: any = {};
      
      headers.forEach((header, index) => {
        let value = values[index];
        
        // Convert numeric fields
        if (header === 'id') {
          value = value ? parseInt(value) : null;
        } else if (header === 'latitude_deg' || header === 'longitude_deg') {
          value = value ? parseFloat(value) : null;
        } else if (header === 'elevation_ft') {
          value = value ? parseInt(value) : null;
        }
        
        airport[header] = value;
      });
      
      return airport;
    });
}

// Run the import
console.log('Starting airports import process...');
importReferenceAirports()
  .then(() => {
    console.log('Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
