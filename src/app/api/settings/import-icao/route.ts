import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
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
    if (!decoded.roles.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('🚀 Starting ICAO database seeding...');
    
    // Try to use the comprehensive ICAO data first
    let dataPath = path.join(process.cwd(), 'scripts', 'icao-aircraft-complete.json');
    let dataSource = 'comprehensive';
    
    if (!fs.existsSync(dataPath)) {
      // Fallback to extracted data
      dataPath = path.join(process.cwd(), 'scripts', 'icao-aircraft-extracted-v8.json');
      dataSource = 'extracted';
      
      if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ 
          error: 'No ICAO data files found. Please ensure icao-aircraft-complete.json or icao-aircraft-extracted-v8.json exists in the scripts directory.' 
        }, { status: 404 });
      }
    }

    const raw = fs.readFileSync(dataPath, 'utf-8');
    const icaoTypes = JSON.parse(raw);

    console.log(`📊 Processing ${icaoTypes.length} aircraft types from ${dataSource} data...`);

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    // Process in batches to avoid memory issues
    const batchSize = 100;
    const totalBatches = Math.ceil(icaoTypes.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, icaoTypes.length);
      const batch = icaoTypes.slice(start, end);

      console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} items)`);

      for (const entry of batch) {
        try {
          // Handle different data formats
          let aircraftData;
          
          if (dataSource === 'comprehensive') {
            // Parse the description JSON to extract model name
            let modelName = entry.model || 'Unknown';
            let manufacturerName = entry.manufacturer || 'Unknown';
            
            if (entry.description && entry.description.startsWith('{')) {
              try {
                const descData = JSON.parse(entry.description);
                if (descData.ModelFullName) {
                  modelName = descData.ModelFullName;
                }
                if (descData.ManufacturerCode) {
                  manufacturerName = descData.ManufacturerCode;
                }
              } catch (parseError) {
                // Use fallback values if JSON parsing fails
              }
            }
            
            // Map engine types
            let engineType = 'PISTON';
            if (entry.engineType === 'TURBOFAN') engineType = 'TURBOFAN';
            else if (entry.engineType === 'TURBOPROP') engineType = 'TURBOPROP';
            else if (entry.engineType === 'TURBOSHAFT') engineType = 'TURBOSHAFT';
            else if (entry.engineType === 'ELECTRIC') engineType = 'ELECTRIC';
            else if (entry.engineType === 'HYBRID') engineType = 'HYBRID';
            
            // Map wake turbulence categories
            let wtc = 'LIGHT';
            if (entry.wakeTurbulenceCategory === 'MEDIUM') wtc = 'MEDIUM';
            else if (entry.wakeTurbulenceCategory === 'HEAVY') wtc = 'HEAVY';
            else if (entry.wakeTurbulenceCategory === 'SUPER') wtc = 'SUPER';
            
            aircraftData = {
              typeDesignator: entry.icaoTypeDesignator,
              manufacturer: manufacturerName,
              model: modelName,
              description: entry.description || '',
              engineType: engineType,
              engineCount: entry.engineCount || 1,
              wtc: wtc
            };
          } else {
            // Extracted data format
            aircraftData = {
              typeDesignator: entry.typeDesignator,
              manufacturer: entry.manufacturer,
              model: entry.model,
              description: entry.description || '',
              engineType: entry.engineType,
              engineCount: parseInt(entry.engineCount, 10) || 1,
              wtc: entry.wtc
            };
          }

          // Check if entry already exists using the unique constraint
          const { data: existing } = await supabase
            .from('icao_reference_type')
            .select('id, description, engineType, engineCount, wtc')
            .eq('manufacturer', aircraftData.manufacturer)
            .eq('model', aircraftData.model)
            .eq('typeDesignator', aircraftData.typeDesignator)
            .single();

          if (!existing) {
            const { error: insertError } = await supabase
              .from('icao_reference_type')
              .insert(aircraftData);

            if (insertError) {
              errors++;
              console.error(`Error inserting aircraft ${entry.icaoTypeDesignator || entry.typeDesignator}:`, insertError);
            } else {
              inserted++;
            }
          } else {
            const needsUpdate = 
              existing.description !== aircraftData.description ||
              existing.engineType !== aircraftData.engineType ||
              existing.engineCount !== aircraftData.engineCount ||
              existing.wtc !== aircraftData.wtc;

            if (needsUpdate) {
              const { error: updateError } = await supabase
                .from('icao_reference_type')
                .update({
                  description: aircraftData.description,
                  engineType: aircraftData.engineType,
                  engineCount: aircraftData.engineCount,
                  wtc: aircraftData.wtc,
                })
                .eq('id', existing.id);

              if (updateError) {
                errors++;
                console.error(`Error updating aircraft ${entry.icaoTypeDesignator || entry.typeDesignator}:`, updateError);
              } else {
                updated++;
              }
            } else {
              unchanged++;
            }
          }
        } catch (error) {
          errors++;
          console.error(`Error processing aircraft ${entry.icaoTypeDesignator || entry.typeDesignator}:`, error);
        }
      }
    }

    const summary = {
      inserted,
      updated,
      unchanged,
      errors,
      total: inserted + updated + unchanged,
      timestamp: new Date().toISOString(),
      success: true,
      dataSource
    };

    // Save summary to file
    const summaryPath = path.join(process.cwd(), 'scripts', 'icao-seeding-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`✅ ICAO database seeding completed:`, summary);

    return NextResponse.json({ 
      success: true, 
      summary,
      message: `ICAO database seeded successfully from ${dataSource} data. Inserted: ${inserted}, Updated: ${updated}, Unchanged: ${unchanged}, Errors: ${errors}`
    });
  } catch (error: any) {
    console.error('❌ ICAO seeding error:', error);
    
    // Write a failed summary
    const summary = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: 1,
      total: 0,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message || 'Database seeding failed'
    };
    const summaryPath = path.join(process.cwd(), 'scripts', 'icao-seeding-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    return NextResponse.json({ error: error.message || 'Seeding failed' }, { status: 500 });
  }
}

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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get current database stats
    const { count: totalAircraft } = await supabase
      .from('icao_reference_type')
      .select('*', { count: 'exact', head: true });

    // Get manufacturer count
    const { data: manufacturers } = await supabase
      .from('icao_reference_type')
      .select('manufacturer');

    const manufacturerCount = manufacturers ? new Set(manufacturers.map(m => m.manufacturer)).size : 0;

    // Read import summary if it exists
    const summaryPath = path.join(process.cwd(), 'scripts', 'icao-seeding-summary.json');

    let importSummary = null;
    let statsData = null;

    try {
      if (fs.existsSync(summaryPath)) {
        importSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        
        // Create stats data from summary
        statsData = {
          LastUpdated: importSummary.timestamp ? new Date(importSummary.timestamp).toLocaleString() : 'Never',
          NextUpdate: 'Manual',
          AircraftTypeCount: totalAircraft || 0,
          ManufacturerCount: manufacturerCount
        };
      }
    } catch (error) {
      console.error('Error reading import files:', error);
    }

    // If no summary exists, create basic stats
    if (!statsData) {
      statsData = {
        LastUpdated: 'Never',
        NextUpdate: 'Manual',
        AircraftTypeCount: totalAircraft || 0,
        ManufacturerCount: manufacturerCount
      };
    }

    return NextResponse.json({
      success: true,
      importSummary,
      statsData
    });

  } catch (error) {
    console.error('❌ Error fetching import status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import status' },
      { status: 500 }
    );
  }
} 