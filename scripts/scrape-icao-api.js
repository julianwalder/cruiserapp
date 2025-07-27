const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function scrapeIcaoApi() {
  console.log('🚁 Starting ICAO API scraper...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Intercept and capture API responses
    const apiResponses = [];
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      console.log(`🌐 Request: ${request.method()} ${request.url()}`);
      request.continue();
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('doc8643/External/AircraftTypes')) {
        console.log(`✅ Captured API response from: ${url}`);
        try {
          const responseBody = await response.text();
          apiResponses.push({
            url: url,
            status: response.status(),
            body: responseBody
          });
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

    console.log('🔍 Waiting for page to load and API calls...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Take screenshot
    await page.screenshot({ path: 'scripts/icao-api-page.png', fullPage: true });
    console.log('📸 Screenshot saved');

    if (apiResponses.length > 0) {
      console.log(`✅ Captured ${apiResponses.length} API responses`);
      
      for (let i = 0; i < apiResponses.length; i++) {
        const response = apiResponses[i];
        console.log(`\n📊 Processing API response ${i + 1}:`);
        console.log(`URL: ${response.url}`);
        console.log(`Status: ${response.status}`);
        console.log(`Body length: ${response.body.length}`);
        
        try {
          const aircraftData = parseAircraftApiResponse(response.body);
          if (aircraftData.length > 0) {
            console.log(`✅ Parsed ${aircraftData.length} aircraft types from API response ${i + 1}`);
            await saveAircraftData(aircraftData, `api-response-${i + 1}`);
          }
        } catch (e) {
          console.log(`❌ Error parsing API response ${i + 1}:`, e.message);
        }
      }
    } else {
      console.log('❌ No API responses captured');
      console.log('💡 Trying to trigger API calls manually...');
      
      // Try to trigger the API call manually
      await triggerApiCall(page);
    }

  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

async function triggerApiCall(page) {
  console.log('🔍 Trying to trigger API call manually...');
  
  try {
    // Try to execute JavaScript that might trigger the API call
    const result = await page.evaluate(() => {
      // Look for any JavaScript functions that might load aircraft data
      if (typeof window.loadAircraftData === 'function') {
        window.loadAircraftData();
        return 'loadAircraftData function found and called';
      }
      
      if (typeof window.searchAircraft === 'function') {
        window.searchAircraft();
        return 'searchAircraft function found and called';
      }
      
      if (typeof window.initializeData === 'function') {
        window.initializeData();
        return 'initializeData function found and called';
      }
      
      // Try to find and click any search or load buttons
      const buttons = document.querySelectorAll('button, input[type="submit"], a[onclick]');
      for (const button of buttons) {
        const text = button.textContent?.toLowerCase() || '';
        const onclick = button.getAttribute('onclick') || '';
        
        if (text.includes('search') || text.includes('load') || text.includes('browse') ||
            onclick.includes('search') || onclick.includes('load') || onclick.includes('aircraft')) {
          button.click();
          return `Clicked button: ${text || onclick}`;
        }
      }
      
      return 'No suitable functions or buttons found';
    });
    
    console.log(`🔍 JavaScript execution result: ${result}`);
    
    // Wait for any new API calls
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Error triggering API call:', error);
  }
}

function parseAircraftApiResponse(responseBody) {
  console.log('🔍 Parsing API response...');
  
  try {
    // Try to parse as JSON first
    if (responseBody.trim().startsWith('{') || responseBody.trim().startsWith('[')) {
      const jsonData = JSON.parse(responseBody);
      console.log('✅ Response is valid JSON');
      
      if (Array.isArray(jsonData)) {
        return parseAircraftArray(jsonData);
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        return parseAircraftArray(jsonData.data);
      } else if (jsonData.aircraft && Array.isArray(jsonData.aircraft)) {
        return parseAircraftArray(jsonData.aircraft);
      } else {
        console.log('📄 JSON structure:', Object.keys(jsonData));
        return [];
      }
    } else {
      // Try to parse as CSV or other format
      console.log('📄 Response is not JSON, trying other formats...');
      return parseNonJsonResponse(responseBody);
    }
  } catch (e) {
    console.log('❌ Error parsing JSON, trying other formats:', e.message);
    return parseNonJsonResponse(responseBody);
  }
}

function parseAircraftArray(data) {
  console.log(`📊 Parsing array with ${data.length} items`);
  
  const aircraftData = [];
  
  for (const item of data) {
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
      }
      
      if (aircraft && aircraft.icaoTypeDesignator) {
        aircraftData.push(aircraft);
      }
    } catch (e) {
      console.log(`⚠️ Error parsing item:`, e.message);
    }
  }
  
  return aircraftData;
}

function parseNonJsonResponse(responseBody) {
  console.log('📄 Parsing non-JSON response...');
  
  const aircraftData = [];
  
  // Try to find ICAO patterns in the response
  const lines = responseBody.split('\n');
  console.log(`📄 Response has ${lines.length} lines`);
  
  for (const line of lines) {
    try {
      // Look for ICAO patterns
      const icaoPattern = /([A-Z]{4})\s*[-\s]\s*([^\n]+)/;
      const match = line.match(icaoPattern);
      
      if (match) {
        const icaoCode = match[1];
        const description = match[2].trim();
        
        // Parse description
        const parts = description.split(/\s+/);
        const manufacturer = parts[0] || '';
        const model = parts.slice(1, 3).join(' ') || '';
        
        aircraftData.push({
          icaoTypeDesignator: icaoCode,
          manufacturer: manufacturer,
          model: model,
          description: description,
          engineType: 'UNKNOWN',
          engineCount: 1,
          wakeTurbulenceCategory: 'LIGHT'
        });
      }
    } catch (e) {
      // Continue with next line
    }
  }
  
  return aircraftData;
}

async function saveAircraftData(aircraftData, suffix = '') {
  try {
    const filename = suffix ? `icao-aircraft-${suffix}.json` : 'icao-aircraft-api.json';
    const outputPath = path.join(__dirname, filename);
    await fs.writeFile(outputPath, JSON.stringify(aircraftData, null, 2));
    console.log(`💾 Saved ${aircraftData.length} aircraft types to ${outputPath}`);
    
    // Create summary
    const summary = {
      totalAircraft: aircraftData.length,
      manufacturers: [...new Set(aircraftData.map(a => a.manufacturer))].length,
      engineTypes: [...new Set(aircraftData.map(a => a.engineType))],
      extractedAt: new Date().toISOString(),
      source: 'ICAO API Endpoint'
    };
    
    const summaryFilename = suffix ? `icao-aircraft-summary-${suffix}.json` : 'icao-aircraft-summary-api.json';
    const summaryPath = path.join(__dirname, summaryFilename);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to ${summaryPath}`);
    
    // Display sample data
    console.log('\n📋 Sample aircraft types:');
    aircraftData.slice(0, 10).forEach((aircraft, index) => {
      console.log(`${index + 1}. ${aircraft.icaoTypeDesignator} - ${aircraft.manufacturer} ${aircraft.model}`);
    });
    
  } catch (error) {
    console.error('❌ Error saving aircraft data:', error);
  }
}

// Run the scraper
if (require.main === module) {
  scrapeIcaoApi().catch(console.error);
}

module.exports = { scrapeIcaoApi }; 