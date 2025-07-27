const fs = require('fs').promises;
const path = require('path');

async function parseIcaoData() {
  console.log('🔍 Parsing ICAO aircraft data...');
  
  try {
    // Read the complete ICAO data
    const dataPath = path.join(__dirname, 'icao-aircraft-complete.json');
    const rawData = await fs.readFile(dataPath, 'utf8');
    const aircraftData = JSON.parse(rawData);
    
    console.log(`📊 Processing ${aircraftData.length} aircraft types...`);
    
    const parsedAircraft = [];
    
    for (const aircraft of aircraftData) {
      try {
        const parsed = parseAircraftDetails(aircraft);
        if (parsed) {
          parsedAircraft.push(parsed);
        }
      } catch (e) {
        // Skip problematic entries
      }
    }
    
    console.log(`✅ Successfully parsed ${parsedAircraft.length} aircraft types`);
    
    // Save the parsed data
    await saveParsedData(parsedAircraft);
    
  } catch (error) {
    console.error('❌ Error parsing ICAO data:', error);
  }
}

function parseAircraftDetails(aircraft) {
  try {
    // Parse the JSON description
    const description = aircraft.description;
    if (!description || typeof description !== 'string') {
      return null;
    }
    
    let details;
    try {
      details = JSON.parse(description);
    } catch (e) {
      // If it's not valid JSON, try to extract basic info
      return {
        icaoTypeDesignator: aircraft.icaoTypeDesignator,
        manufacturer: aircraft.manufacturer || '',
        model: aircraft.model || '',
        description: description,
        engineType: aircraft.engineType || 'UNKNOWN',
        engineCount: aircraft.engineCount || 1,
        wakeTurbulenceCategory: aircraft.wakeTurbulenceCategory || 'LIGHT'
      };
    }
    
    // Extract detailed information
    const parsedAircraft = {
      icaoTypeDesignator: details.Designator || aircraft.icaoTypeDesignator,
      manufacturer: details.ManufacturerCode || aircraft.manufacturer || '',
      model: details.ModelFullName || aircraft.model || '',
      description: details.Description || '',
      engineType: mapEngineType(details.EngineType),
      engineCount: parseInt(details.EngineCount) || aircraft.engineCount || 1,
      wakeTurbulenceCategory: mapWakeTurbulence(details.WTC),
      aircraftType: details.AircraftDescription || '',
      manufacturerCode: details.ManufacturerCode || '',
      showInPart3Only: details.ShowInPart3Only || false,
      wtg: details.WTG || ''
    };
    
    return parsedAircraft;
    
  } catch (e) {
    return null;
  }
}

function mapEngineType(engineType) {
  if (!engineType) return 'UNKNOWN';
  
  const engineTypeMap = {
    'Piston': 'PISTON',
    'Turboprop/Turboshaft': 'TURBOPROP',
    'Turbofan': 'TURBOFAN',
    'Turboshaft': 'TURBOSHAFT',
    'Electric': 'ELECTRIC',
    'Hybrid': 'HYBRID',
    'Jet': 'TURBOFAN',
    'Turbojet': 'TURBOFAN'
  };
  
  return engineTypeMap[engineType] || 'UNKNOWN';
}

function mapWakeTurbulence(wtc) {
  if (!wtc) return 'LIGHT';
  
  const wtcMap = {
    'L': 'LIGHT',
    'M': 'MEDIUM',
    'H': 'HEAVY',
    'S': 'SUPER'
  };
  
  return wtcMap[wtc] || 'LIGHT';
}

async function saveParsedData(parsedAircraft) {
  try {
    // Save complete parsed data
    const outputPath = path.join(__dirname, 'icao-aircraft-parsed.json');
    await fs.writeFile(outputPath, JSON.stringify(parsedAircraft, null, 2));
    console.log(`💾 Saved ${parsedAircraft.length} parsed aircraft types to ${outputPath}`);
    
    // Create summary
    const summary = {
      totalAircraft: parsedAircraft.length,
      manufacturers: [...new Set(parsedAircraft.map(a => a.manufacturer))].length,
      engineTypes: [...new Set(parsedAircraft.map(a => a.engineType))],
      aircraftTypes: [...new Set(parsedAircraft.map(a => a.aircraftType))],
      wakeTurbulenceCategories: [...new Set(parsedAircraft.map(a => a.wakeTurbulenceCategory))],
      parsedAt: new Date().toISOString(),
      source: 'ICAO DOC 8643 API (Parsed)'
    };
    
    const summaryPath = path.join(__dirname, 'icao-aircraft-parsed-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to ${summaryPath}`);
    
    // Save a sample for testing
    const sampleData = parsedAircraft.slice(0, 50);
    const samplePath = path.join(__dirname, 'icao-aircraft-parsed-sample.json');
    await fs.writeFile(samplePath, JSON.stringify(sampleData, null, 2));
    console.log(`📋 Sample of 50 parsed aircraft types saved to ${samplePath}`);
    
    // Display sample data
    console.log('\n📋 Sample parsed aircraft types:');
    sampleData.slice(0, 10).forEach((aircraft, index) => {
      console.log(`${index + 1}. ${aircraft.icaoTypeDesignator} - ${aircraft.manufacturer} ${aircraft.model} (${aircraft.engineType})`);
    });
    
    // Create statistics
    const stats = createStatistics(parsedAircraft);
    const statsPath = path.join(__dirname, 'icao-aircraft-statistics.json');
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    console.log(`📈 Statistics saved to ${statsPath}`);
    
  } catch (error) {
    console.error('❌ Error saving parsed data:', error);
  }
}

function createStatistics(aircraft) {
  const stats = {
    totalAircraft: aircraft.length,
    engineTypeBreakdown: {},
    wakeTurbulenceBreakdown: {},
    aircraftTypeBreakdown: {},
    topManufacturers: {},
    topModels: {}
  };
  
  // Count engine types
  aircraft.forEach(a => {
    stats.engineTypeBreakdown[a.engineType] = (stats.engineTypeBreakdown[a.engineType] || 0) + 1;
  });
  
  // Count wake turbulence categories
  aircraft.forEach(a => {
    stats.wakeTurbulenceBreakdown[a.wakeTurbulenceCategory] = (stats.wakeTurbulenceBreakdown[a.wakeTurbulenceCategory] || 0) + 1;
  });
  
  // Count aircraft types
  aircraft.forEach(a => {
    stats.aircraftTypeBreakdown[a.aircraftType] = (stats.aircraftTypeBreakdown[a.aircraftType] || 0) + 1;
  });
  
  // Count manufacturers
  aircraft.forEach(a => {
    if (a.manufacturer) {
      stats.topManufacturers[a.manufacturer] = (stats.topManufacturers[a.manufacturer] || 0) + 1;
    }
  });
  
  // Count models
  aircraft.forEach(a => {
    if (a.model) {
      stats.topModels[a.model] = (stats.topModels[a.model] || 0) + 1;
    }
  });
  
  // Sort and limit top entries
  stats.topManufacturers = Object.entries(stats.topManufacturers)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    
  stats.topModels = Object.entries(stats.topModels)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  
  return stats;
}

// Run the parser
if (require.main === module) {
  parseIcaoData().catch(console.error);
}

module.exports = { parseIcaoData }; 