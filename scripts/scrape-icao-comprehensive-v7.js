const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeIcaoAircraftTypes() {
  console.log('🚀 Starting Comprehensive ICAO Aircraft Scraper (v7)...');
  console.log('🎯 Goal: Extract all 7,388 aircraft entries with structured data');
  console.log('📊 Target structure: manufacturer, model, type designator, description, engine type, engine count, WTC');
  
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
    let lastUpdatedDate = null;
    let nextScheduledUpdate = null;
    
    page.on('request', request => {
      request.continue();
    });
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('icao.int') && response.status() === 200) {
        try {
          const responseBody = await response.text();
          apiResponses.push({
            url,
            body: responseBody,
            timestamp: new Date().toISOString()
          });
          console.log(`📡 Captured API response: ${url} (${responseBody.length} chars)`);
        } catch (error) {
          console.log(`⚠️ Error capturing response from ${url}: ${error.message}`);
        }
      }
    });

    console.log('🌐 Navigating to ICAO DOC 8643 search page...');
    await page.goto('https://www.icao.int/publications/DOC8643/Pages/Search.aspx', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to fully load
    console.log('⏳ Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Look for Last Updated and Next Scheduled Update information
    console.log('🔍 Looking for update information...');
    try {
      const updateInfo = await page.evaluate(() => {
        const pageText = document.body.innerText;
        const lastUpdatedMatch = pageText.match(/Last Updated[:\s]*([^\n\r]+)/i);
        const nextUpdateMatch = pageText.match(/Next Scheduled Update[:\s]*([^\n\r]+)/i);
        
        return {
          lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : null,
          nextScheduledUpdate: nextUpdateMatch ? nextUpdateMatch[1].trim() : null
        };
      });
      
      lastUpdatedDate = updateInfo.lastUpdated;
      nextScheduledUpdate = updateInfo.nextScheduledUpdate;
      
      console.log(`📅 Last Updated: ${lastUpdatedDate || 'Not found'}`);
      console.log(`📅 Next Scheduled Update: ${nextScheduledUpdate || 'Not found'}`);
    } catch (error) {
      console.log(`⚠️ Error extracting update information: ${error.message}`);
    }

    // Look for the main aircraft data table
    console.log('🔍 Looking for aircraft data table...');
    
    // Try to find and extract data from the main table
    const aircraftEntries = await page.evaluate(() => {
      const aircraft = [];
      
      // Look for table rows containing aircraft data
      const rows = document.querySelectorAll('tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
          // Extract data from cells
          const manufacturer = cells[0]?.textContent?.trim() || '';
          const model = cells[1]?.textContent?.trim() || '';
          const typeDesignator = cells[2]?.textContent?.trim() || '';
          const description = cells[3]?.textContent?.trim() || '';
          const engineType = cells[4]?.textContent?.trim() || '';
          const engineCount = cells[5]?.textContent?.trim() || '';
          const wtc = cells[6]?.textContent?.trim() || '';
          
          // Only add if we have meaningful data
          if (typeDesignator && (manufacturer || model)) {
            aircraft.push({
              manufacturer,
              model,
              typeDesignator,
              description,
              engineType,
              engineCount,
              wtc
            });
          }
        }
      });
      
      return aircraft;
    });

    console.log(`📊 Found ${aircraftEntries.length} aircraft entries in table`);

    // If we didn't find data in the main table, try to extract from the page source
    if (aircraftEntries.length === 0) {
      console.log('🔍 No data found in main table, trying alternative extraction...');
      
      // Get the page source and look for data patterns
      const pageSource = await page.content();
      
      // Look for data in the page source
      const dataMatches = pageSource.match(/<tr[^>]*>.*?<\/tr>/gs);
      if (dataMatches) {
        console.log(`📊 Found ${dataMatches.length} potential data rows`);
        
        // Process each row to extract aircraft data
        dataMatches.forEach(match => {
          // Extract data using regex patterns
          const manufacturerMatch = match.match(/<td[^>]*>([^<]+)<\/td>/g);
          if (manufacturerMatch && manufacturerMatch.length >= 7) {
            const manufacturer = manufacturerMatch[0].replace(/<[^>]+>/g, '').trim();
            const model = manufacturerMatch[1].replace(/<[^>]+>/g, '').trim();
            const typeDesignator = manufacturerMatch[2].replace(/<[^>]+>/g, '').trim();
            const description = manufacturerMatch[3].replace(/<[^>]+>/g, '').trim();
            const engineType = manufacturerMatch[4].replace(/<[^>]+>/g, '').trim();
            const engineCount = manufacturerMatch[5].replace(/<[^>]+>/g, '').trim();
            const wtc = manufacturerMatch[6].replace(/<[^>]+>/g, '').trim();
            
            if (typeDesignator && (manufacturer || model)) {
              aircraftEntries.push({
                manufacturer,
                model,
                typeDesignator,
                description,
                engineType,
                engineCount,
                wtc
              });
            }
          }
        });
      }
    }

    // If still no data, try to navigate through pagination or search
    if (aircraftEntries.length === 0) {
      console.log('🔍 Trying to find search interface...');
      
      // Look for search forms or pagination
      const searchElements = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input');
        const buttons = document.querySelectorAll('button');
        
        return {
          forms: forms.length,
          inputs: inputs.length,
          buttons: buttons.length
        };
      });
      
      console.log(`Found ${searchElements.forms} forms, ${searchElements.inputs} inputs, ${searchElements.buttons} buttons`);
      
      // Try to find and click on search or view all button
      try {
        const searchButton = await page.$('input[type="submit"], button[type="submit"], .search-button, #searchButton');
        if (searchButton) {
          console.log('🔍 Found search button, clicking...');
          await searchButton.click();
          await page.waitForTimeout(3000);
        }
      } catch (error) {
        console.log(`⚠️ Error clicking search button: ${error.message}`);
      }
    }

    // Save the extracted data
    console.log('💾 Saving extracted data...');
    
    const extractionSummary = {
      timestamp: new Date().toISOString(),
      totalAircraftEntries: aircraftEntries.length,
      lastUpdatedDate,
      nextScheduledUpdate,
      extractionMethod: 'table_scraping',
      notes: 'Comprehensive ICAO aircraft data extraction'
    };

    // Save API responses
    fs.writeFileSync(
      path.join(__dirname, 'icao-api-responses-v7.json'),
      JSON.stringify(apiResponses, null, 2)
    );
    console.log(`✅ Saved ${apiResponses.length} API responses to icao-api-responses-v7.json`);

    // Save aircraft data
    fs.writeFileSync(
      path.join(__dirname, 'icao-aircraft-extracted-v7.json'),
      JSON.stringify(aircraftEntries, null, 2)
    );
    console.log(`✅ Saved ${aircraftEntries.length} aircraft entries to icao-aircraft-extracted-v7.json`);

    // Save extraction summary
    fs.writeFileSync(
      path.join(__dirname, 'icao-extraction-summary-v7.json'),
      JSON.stringify(extractionSummary, null, 2)
    );
    console.log('✅ Saved extraction summary to icao-extraction-summary-v7.json');

    // Save page source for debugging
    const pageSource = await page.content();
    fs.writeFileSync(
      path.join(__dirname, 'icao-page-source-v7.html'),
      pageSource
    );
    console.log('✅ Saved page source to icao-page-source-v7.html');

    console.log('🎉 Comprehensive scraping completed!');
    console.log(`📊 Total aircraft entries extracted: ${aircraftEntries.length}`);
    console.log(`📊 Total API responses captured: ${apiResponses.length}`);
    console.log(`📅 Last Updated: ${lastUpdatedDate || 'Not found'}`);
    console.log(`📅 Next Scheduled Update: ${nextScheduledUpdate || 'Not found'}`);

  } catch (error) {
    console.error('❌ Error during comprehensive scraping:', error);
  } finally {
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

scrapeIcaoAircraftTypes().catch(console.error); 