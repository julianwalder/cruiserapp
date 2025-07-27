const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function scrapeIcaoSimple() {
  console.log('🚁 Starting simple ICAO scraper...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Capture API response
    let apiResponse = null;
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      request.continue();
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('doc8643/External/AircraftTypes')) {
        console.log(`✅ Captured API response from: ${url}`);
        try {
          const responseBody = await response.text();
          apiResponse = {
            url: url,
            status: response.status(),
            body: responseBody
          };
          console.log(`📄 Response body length: ${responseBody.length}`);
        } catch (e) {
          console.log(`⚠️ Error reading response: ${e.message}`);
        }
      }
    });

    console.log('📡 Navigating to ICAO DOC 8643 website...');
    await page.goto('https://www.icao.int/publications/DOC8643/Pages/Search.aspx', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('🔍 Waiting for API call...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    if (apiResponse) {
      console.log('✅ Processing API response...');
      await processApiResponse(apiResponse);
    } else {
      console.log('❌ No API response captured');
    }

  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

async function processApiResponse(apiResponse) {
  try {
    console.log('🔍 Parsing API response...');
    
    // Parse JSON
    const data = JSON.parse(apiResponse.body);
    console.log(`📊 Found ${data.length} aircraft types`);
    
    // Process in batches to avoid memory issues
    const batchSize = 1000;
    const aircraftData = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      console.log(`📊 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} (${batch.length} items)`);
      
      for (const item of batch) {
        try {
          // Extract aircraft data from the item
          const aircraft = extractAircraftData(item);
          if (aircraft) {
            aircraftData.push(aircraft);
          }
        } catch (e) {
          // Skip problematic items
        }
      }
    }
    
    console.log(`✅ Successfully processed ${aircraftData.length} aircraft types`);
    
    // Save the data
    await saveAircraftData(aircraftData);
    
  } catch (error) {
    console.error('❌ Error processing API response:', error);
  }
}

function extractAircraftData(item) {
  try {
    // Handle different possible data structures
    let aircraft = null;
    
    if (item.icaoTypeDesignator || item.icao || item.type) {
      aircraft = {
        icaoTypeDesignator: item.icaoTypeDesignator || item.icao || item.type,
        manufacturer: item.manufacturer || item.manufacturerName || '',
        model: item.model || item.modelName || '',
        description: item.description || item.name || '',
        engineType: item.engineType || item.engine || 'UNKNOWN',
        engineCount: parseInt(item.engineCount) || parseInt(item.engines) || 1,
        wakeTurbulenceCategory: item.wakeTurbulenceCategory || item.wtc || 'LIGHT'
      };
    } else if (typeof item === 'string' && /^[A-Z]{4}/.test(item)) {
      // Handle string format
      const parts = item.split(/\s+/);
      aircraft = {
        icaoTypeDesignator: parts[0],
        manufacturer: parts[1] || '',
        model: parts.slice(2, 4).join(' ') || '',
        description: item,
        engineType: 'UNKNOWN',
        engineCount: 1,
        wakeTurbulenceCategory: 'LIGHT'
      };
    } else if (item && typeof item === 'object') {
      // Try to extract from object properties
      const keys = Object.keys(item);
      if (keys.length > 0) {
        // Look for ICAO code in any property
        let icaoCode = null;
        for (const key of keys) {
          const value = item[key];
          if (typeof value === 'string' && /^[A-Z]{4}$/.test(value)) {
            icaoCode = value;
            break;
          }
        }
        
        if (icaoCode) {
          aircraft = {
            icaoTypeDesignator: icaoCode,
            manufacturer: item.manufacturer || item.manufacturerName || '',
            model: item.model || item.modelName || '',
            description: item.description || item.name || JSON.stringify(item),
            engineType: item.engineType || item.engine || 'UNKNOWN',
            engineCount: parseInt(item.engineCount) || parseInt(item.engines) || 1,
            wakeTurbulenceCategory: item.wakeTurbulenceCategory || item.wtc || 'LIGHT'
          };
        }
      }
    }
    
    return aircraft;
  } catch (e) {
    return null;
  }
}

async function saveAircraftData(aircraftData) {
  try {
    const outputPath = path.join(__dirname, 'icao-aircraft-complete.json');
    await fs.writeFile(outputPath, JSON.stringify(aircraftData, null, 2));
    console.log(`💾 Saved ${aircraftData.length} aircraft types to ${outputPath}`);
    
    // Create summary
    const summary = {
      totalAircraft: aircraftData.length,
      manufacturers: [...new Set(aircraftData.map(a => a.manufacturer))].length,
      engineTypes: [...new Set(aircraftData.map(a => a.engineType))],
      extractedAt: new Date().toISOString(),
      source: 'ICAO DOC 8643 API'
    };
    
    const summaryPath = path.join(__dirname, 'icao-aircraft-complete-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to ${summaryPath}`);
    
    // Display sample data
    console.log('\n📋 Sample aircraft types:');
    aircraftData.slice(0, 10).forEach((aircraft, index) => {
      console.log(`${index + 1}. ${aircraft.icaoTypeDesignator} - ${aircraft.manufacturer} ${aircraft.model}`);
    });
    
    // Also save a smaller sample for testing
    const sampleData = aircraftData.slice(0, 100);
    const samplePath = path.join(__dirname, 'icao-aircraft-sample.json');
    await fs.writeFile(samplePath, JSON.stringify(sampleData, null, 2));
    console.log(`📋 Sample of 100 aircraft types saved to ${samplePath}`);
    
  } catch (error) {
    console.error('❌ Error saving aircraft data:', error);
  }
}

// Run the scraper
if (require.main === module) {
  scrapeIcaoSimple().catch(console.error);
}

module.exports = { scrapeIcaoSimple }; 