const fs = require('fs');
const path = require('path');

async function fetchIcaoData() {
  console.log('🚀 Starting Direct ICAO Data Fetch...');
  console.log('🎯 Goal: Fetch all 7,388 aircraft entries directly from API');
  
  try {
    // Fetch the aircraft data directly from the API
    console.log('📡 Fetching aircraft data from ICAO API...');
    
    const response = await fetch('https://www4.icao.int/doc8643/External/AircraftTypes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const aircraftData = await response.json();
    console.log(`✅ Successfully fetched ${aircraftData.length} aircraft entries`);

    // Fetch the stats data to get update information
    console.log('📡 Fetching update information...');
    const statsResponse = await fetch('https://www4.icao.int/doc8643/External/Stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    let statsData = null;
    if (statsResponse.ok) {
      statsData = await statsResponse.json();
      console.log('✅ Successfully fetched update information');
    } else {
      console.log('⚠️ Could not fetch update information');
    }

    // Transform the data to match our required structure
    console.log('🔄 Transforming data to required structure...');
    const transformedData = aircraftData.map(aircraft => ({
      manufacturer: aircraft.ManufacturerCode || '',
      model: aircraft.ModelFullName || '',
      typeDesignator: aircraft.Designator || '',
      description: aircraft.AircraftDescription || '',
      engineType: aircraft.EngineType || '',
      engineCount: aircraft.EngineCount || '',
      wtc: aircraft.WTC || ''
    }));

    // Create summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalAircraftEntries: transformedData.length,
      lastUpdatedDate: statsData?.LastUpdated || 'Not available',
      nextScheduledUpdate: statsData?.NextUpdate || 'Not available',
      extractionMethod: 'direct_api_fetch',
      notes: 'Direct fetch from ICAO API endpoint'
    };

    // Save the raw data
    fs.writeFileSync(
      path.join(__dirname, 'icao-raw-data.json'),
      JSON.stringify(aircraftData, null, 2)
    );
    console.log('✅ Saved raw data to icao-raw-data.json');

    // Save the transformed data
    fs.writeFileSync(
      path.join(__dirname, 'icao-transformed-data.json'),
      JSON.stringify(transformedData, null, 2)
    );
    console.log('✅ Saved transformed data to icao-transformed-data.json');

    // Save the summary
    fs.writeFileSync(
      path.join(__dirname, 'icao-fetch-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    console.log('✅ Saved fetch summary to icao-fetch-summary.json');

    // Save stats data if available
    if (statsData) {
      fs.writeFileSync(
        path.join(__dirname, 'icao-stats-data.json'),
        JSON.stringify(statsData, null, 2)
      );
      console.log('✅ Saved stats data to icao-stats-data.json');
    }

    // Create a sample of the data for verification
    const sampleData = transformedData.slice(0, 10);
    fs.writeFileSync(
      path.join(__dirname, 'icao-sample-data.json'),
      JSON.stringify(sampleData, null, 2)
    );
    console.log('✅ Saved sample data to icao-sample-data.json');

    console.log('🎉 Direct ICAO data fetch completed!');
    console.log(`📊 Total aircraft entries: ${transformedData.length}`);
    console.log(`📅 Last Updated: ${summary.lastUpdatedDate}`);
    console.log(`📅 Next Scheduled Update: ${summary.nextScheduledUpdate}`);

    // Show some sample entries
    console.log('\n📋 Sample entries:');
    sampleData.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.typeDesignator} - ${entry.manufacturer} ${entry.model}`);
    });

  } catch (error) {
    console.error('❌ Error during direct fetch:', error);
  }
}

fetchIcaoData().catch(console.error); 