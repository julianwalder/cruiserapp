const fs = require('fs');
const path = require('path');

function parseIcaoData() {
  console.log('🔍 Parsing ICAO aircraft data (v2) - capturing all manufacturers...');
  
  try {
    // Read the raw ICAO data
    const rawDataPath = path.join(__dirname, 'icao-aircraft-database-v2.json');
    if (!fs.existsSync(rawDataPath)) {
      console.log('❌ Raw ICAO data file not found. Please run the scraper first.');
      return;
    }
    
    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
    console.log(`📊 Loaded ${rawData.length} raw aircraft records`);
    
    // Group by ICAO type designator to capture all manufacturers
    const aircraftByDesignator = new Map();
    
    rawData.forEach((aircraft, index) => {
      try {
        const icaoTypeDesignator = aircraft.Designator?.trim();
        if (!icaoTypeDesignator || icaoTypeDesignator.length !== 4) {
          return; // Skip invalid ICAO codes
        }
        
        // Extract data from the new format
        const manufacturer = aircraft.ManufacturerCode?.trim() || '';
        const model = aircraft.ModelFullName?.trim() || '';
        const description = aircraft.AircraftDescription?.trim() || '';
        const engineType = aircraft.EngineType?.trim() || 'PISTON';
        const engineCount = aircraft.EngineCount || 1;
        const wtc = aircraft.WTC?.trim() || 'L';
        
        // Skip if manufacturer is too short
        if (manufacturer.length < 2 || manufacturer.length > 100) {
          return;
        }
        
        // Map engine types to our enum values
        let mappedEngineType = 'PISTON';
        switch (engineType.toLowerCase()) {
          case 'jet':
            mappedEngineType = 'TURBOFAN';
            break;
          case 'turboprop/turboshaft':
            mappedEngineType = 'TURBOPROP';
            break;
          case 'electric':
            mappedEngineType = 'ELECTRIC';
            break;
          case 'rocket':
            mappedEngineType = 'TURBOFAN'; // Map rocket to turbofan for now
            break;
          default:
            mappedEngineType = 'PISTON';
        }
        
        // Map WTC to our enum values
        let wakeTurbulenceCategory = 'LIGHT';
        switch (wtc) {
          case 'H':
            wakeTurbulenceCategory = 'HEAVY';
            break;
          case 'M':
            wakeTurbulenceCategory = 'MEDIUM';
            break;
          case 'L':
          default:
            wakeTurbulenceCategory = 'LIGHT';
        }
        
        // Create aircraft record
        const aircraftRecord = {
          icaoTypeDesignator,
          manufacturer,
          model,
          description: description.trim(),
          engineType: mappedEngineType,
          engineCount: parseInt(engineCount),
          wakeTurbulenceCategory,
          rawData: aircraft
        };
        
        // Add to map, grouping by ICAO designator
        if (!aircraftByDesignator.has(icaoTypeDesignator)) {
          aircraftByDesignator.set(icaoTypeDesignator, []);
        }
        
        // Check if this manufacturer already exists for this designator
        const existingManufacturers = aircraftByDesignator.get(icaoTypeDesignator);
        const existingManufacturer = existingManufacturers.find(
          existing => existing.manufacturer.toLowerCase() === manufacturer.toLowerCase()
        );
        
        if (!existingManufacturer) {
          existingManufacturers.push(aircraftRecord);
        }
        
      } catch (error) {
        console.log(`⚠️ Error parsing aircraft ${index}:`, error.message);
      }
    });
    
    // Convert map to array and create summary
    const parsedAircraft = [];
    const designatorStats = [];
    
    aircraftByDesignator.forEach((manufacturers, designator) => {
      designatorStats.push({
        icaoTypeDesignator: designator,
        manufacturerCount: manufacturers.length,
        manufacturers: manufacturers.map(m => m.manufacturer)
      });
      
      // Add all manufacturers for this designator
      manufacturers.forEach(aircraft => {
        parsedAircraft.push(aircraft);
      });
    });
    
    // Sort by ICAO designator
    parsedAircraft.sort((a, b) => a.icaoTypeDesignator.localeCompare(b.icaoTypeDesignator));
    designatorStats.sort((a, b) => a.icaoTypeDesignator.localeCompare(b.icaoTypeDesignator));
    
    // Generate statistics
    const stats = {
      totalRawRecords: rawData.length,
      totalParsedAircraft: parsedAircraft.length,
      uniqueDesignators: aircraftByDesignator.size,
      designatorsWithMultipleManufacturers: designatorStats.filter(d => d.manufacturerCount > 1).length,
      engineTypeDistribution: {},
      wakeTurbulenceDistribution: {},
      manufacturerCountDistribution: {}
    };
    
    // Calculate distributions
    parsedAircraft.forEach(aircraft => {
      stats.engineTypeDistribution[aircraft.engineType] = (stats.engineTypeDistribution[aircraft.engineType] || 0) + 1;
      stats.wakeTurbulenceDistribution[aircraft.wakeTurbulenceCategory] = (stats.wakeTurbulenceDistribution[aircraft.wakeTurbulenceCategory] || 0) + 1;
    });
    
    designatorStats.forEach(designator => {
      stats.manufacturerCountDistribution[designator.manufacturerCount] = (stats.manufacturerCountDistribution[designator.manufacturerCount] || 0) + 1;
    });
    
    // Save results
    const outputDir = path.join(__dirname, 'parsed-data-v2');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'parsed-aircraft.json'),
      JSON.stringify(parsedAircraft, null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'designator-stats.json'),
      JSON.stringify(designatorStats, null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'summary-stats.json'),
      JSON.stringify(stats, null, 2)
    );
    
    // Save sample data
    const sampleAircraft = parsedAircraft.slice(0, 20);
    fs.writeFileSync(
      path.join(outputDir, 'sample-aircraft.json'),
      JSON.stringify(sampleAircraft, null, 2)
    );
    
    // Display results
    console.log('\n📊 Parsing Results:');
    console.log(`✅ Total raw records: ${stats.totalRawRecords}`);
    console.log(`✅ Total parsed aircraft: ${stats.totalParsedAircraft}`);
    console.log(`✅ Unique ICAO designators: ${stats.uniqueDesignators}`);
    console.log(`✅ Designators with multiple manufacturers: ${stats.designatorsWithMultipleManufacturers}`);
    
    console.log('\n🔧 Engine Type Distribution:');
    Object.entries(stats.engineTypeDistribution).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n🌪️ Wake Turbulence Distribution:');
    Object.entries(stats.wakeTurbulenceDistribution).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
    console.log('\n🏭 Manufacturer Count Distribution:');
    Object.entries(stats.manufacturerCountDistribution).forEach(([count, designators]) => {
      console.log(`  ${count} manufacturer(s): ${designators} designators`);
    });
    
    console.log('\n📋 Sample Aircraft with Multiple Manufacturers:');
    const multiManufacturerDesignators = designatorStats
      .filter(d => d.manufacturerCount > 1)
      .slice(0, 10);
    
    multiManufacturerDesignators.forEach(designator => {
      console.log(`  ${designator.icaoTypeDesignator}: ${designator.manufacturers.join(', ')}`);
    });
    
    console.log(`\n💾 Results saved to: ${outputDir}/`);
    
  } catch (error) {
    console.error('❌ Error parsing ICAO data:', error);
  }
}

// Run the parser
if (require.main === module) {
  parseIcaoData();
}

module.exports = { parseIcaoData }; 