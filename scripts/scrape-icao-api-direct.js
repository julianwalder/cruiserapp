const fs = require('fs');
const path = require('path');

async function scrapeIcaoApiDirect() {
  console.log('🚀 Directly calling ICAO API endpoint...');
  
  try {
    // The ICAO API endpoint from the page source
    const apiUrl = 'https://www4.icao.int/doc8643/External/AircraftTypes';
    
    console.log(`📡 Calling API: ${apiUrl}`);
    
    // Make the API call
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Received ${data.length} aircraft records`);
    
    // Save the raw data
    const outputPath = path.join(__dirname, 'icao-aircraft-database-v2.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved raw data to: ${outputPath}`);
    
    // Display sample data
    console.log('\n📋 Sample aircraft records:');
    data.slice(0, 5).forEach((aircraft, index) => {
      console.log(`${index + 1}. ${aircraft.Designator} - ${aircraft.ManufacturerCode} ${aircraft.ModelFullName}`);
    });
    
    // Get statistics
    const stats = {
      totalRecords: data.length,
      uniqueDesignators: new Set(data.map(a => a.Designator)).size,
      uniqueManufacturers: new Set(data.map(a => a.ManufacturerCode)).size,
      engineTypeDistribution: {},
      engineCountDistribution: {},
      wtcDistribution: {}
    };
    
    data.forEach(aircraft => {
      // Engine type distribution
      const engineType = aircraft.EngineType || 'Unknown';
      stats.engineTypeDistribution[engineType] = (stats.engineTypeDistribution[engineType] || 0) + 1;
      
      // Engine count distribution
      const engineCount = aircraft.EngineCount || 'Unknown';
      stats.engineCountDistribution[engineCount] = (stats.engineCountDistribution[engineCount] || 0) + 1;
      
      // WTC distribution
      const wtc = aircraft.WTC || 'Unknown';
      stats.wtcDistribution[wtc] = (stats.wtcDistribution[wtc] || 0) + 1;
    });
    
    console.log('\n📊 Statistics:');
    console.log(`Total records: ${stats.totalRecords}`);
    console.log(`Unique designators: ${stats.uniqueDesignators}`);
    console.log(`Unique manufacturers: ${stats.uniqueManufacturers}`);
    
    console.log('\n🔧 Engine Type Distribution:');
    Object.entries(stats.engineTypeDistribution)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    
    console.log('\n🌪️ WTC Distribution:');
    Object.entries(stats.wtcDistribution)
      .sort(([,a], [,b]) => b - a)
      .forEach(([wtc, count]) => {
        console.log(`  ${wtc}: ${count}`);
      });
    
    // Save statistics
    const statsPath = path.join(__dirname, 'icao-stats-v2.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`💾 Saved statistics to: ${statsPath}`);
    
    console.log('\n🎉 ICAO API scraping completed successfully!');
    
  } catch (error) {
    console.error('❌ Error scraping ICAO API:', error);
  }
}

// Run the scraper
if (require.main === module) {
  scrapeIcaoApiDirect().catch(console.error);
}

module.exports = { scrapeIcaoApiDirect }; 