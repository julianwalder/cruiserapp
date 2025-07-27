const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeIcaoAircraftTypes() {
  console.log('🚀 Starting Comprehensive ICAO Aircraft Scraper (v6)...');
  console.log('🎯 Goal: Extract all aircraft data with multiple manufacturers per ICAO type');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Enable request interception to capture API calls
    await page.setRequestInterception(true);
    
    const apiResponses = [];
    const aircraftData = [];
    
    page.on('request', request => {
      request.continue();
    });
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('www4.icao.int/doc8643/External/AircraftTypes')) {
        try {
          const responseBody = await response.text();
          if (responseBody && responseBody.length > 100) {
            apiResponses.push({
              url,
              body: responseBody,
              timestamp: new Date().toISOString()
            });
            console.log(`📡 Captured aircraft data API response: ${url}`);
            
            // Parse the aircraft data
            try {
              const data = JSON.parse(responseBody);
              if (Array.isArray(data)) {
                aircraftData.push(...data);
                console.log(`📊 Added ${data.length} aircraft items from API`);
              }
            } catch (parseError) {
              console.log(`⚠️ Error parsing aircraft data: ${parseError.message}`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Error capturing response from ${url}:`, error.message);
        }
      }
    });

    console.log('🌐 Navigating to ICAO DOC 8643 search page...');
    await page.goto('https://www.icao.int/publications/DOC8643/Pages/Search.aspx', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Wait for the DataTable to load and trigger the API call
    console.log('🔍 Waiting for DataTable to load aircraft data...');
    await page.waitForFunction(() => {
      return window.jQuery && $('#atd-table').DataTable;
    }, { timeout: 30000 });

    // Wait for the table to be populated
    console.log('⏳ Waiting for table data to load...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Try to trigger a search or refresh to ensure we get all data
    console.log('🔄 Triggering data refresh...');
    await page.evaluate(() => {
      if (window.jQuery && $('#atd-table').DataTable) {
        const table = $('#atd-table').DataTable();
        table.ajax.reload();
      }
    });

    // Wait for additional network activity
    console.log('⏳ Waiting for final network activity...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Save captured API responses
    if (apiResponses.length > 0) {
      const outputPath = path.join(__dirname, 'icao-api-responses-v6.json');
      fs.writeFileSync(outputPath, JSON.stringify(apiResponses, null, 2));
      console.log(`💾 Saved ${apiResponses.length} API responses to ${outputPath}`);
    }

    // Save extracted aircraft data
    if (aircraftData.length > 0) {
      const outputPath = path.join(__dirname, 'icao-aircraft-extracted-v6.json');
      fs.writeFileSync(outputPath, JSON.stringify(aircraftData, null, 2));
      console.log(`💾 Saved ${aircraftData.length} aircraft items to ${outputPath}`);
      
      // Create a summary
      const summary = {
        totalAircraft: aircraftData.length,
        uniqueIcaoTypes: new Set(aircraftData.map(a => a.Designator)).size,
        uniqueManufacturers: new Set(aircraftData.map(a => a.ManufacturerCode)).size,
        uniqueModels: new Set(aircraftData.map(a => a.ModelFullName)).size,
        extractionDate: new Date().toISOString(),
        sampleData: aircraftData.slice(0, 5)
      };
      
      const summaryPath = path.join(__dirname, 'icao-extraction-summary-v6.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`📊 Extraction summary saved to ${summaryPath}`);
    }

    // Try to get the page source to analyze the structure
    console.log('📄 Capturing page source for analysis...');
    const pageSource = await page.content();
    const sourcePath = path.join(__dirname, 'icao-page-source-v6.html');
    fs.writeFileSync(sourcePath, pageSource);
    console.log(`💾 Saved page source to ${sourcePath}`);

    console.log('🎉 Comprehensive scraping completed!');
    console.log(`📊 Total aircraft items extracted: ${aircraftData.length}`);

  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

// Run the scraper
if (require.main === module) {
  scrapeIcaoAircraftTypes().catch(console.error);
}

module.exports = { scrapeIcaoAircraftTypes }; 