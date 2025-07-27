const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeIcaoAircraftTypes() {
  console.log('🚀 Starting Comprehensive ICAO Aircraft Scraper (v8)...');
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

    // Wait for the table to load data
    console.log('🔍 Waiting for aircraft data table to load...');
    
    // Wait for the table to be populated (not showing "Loading...")
    await page.waitForFunction(() => {
      const tbody = document.querySelector('#atd-table-body');
      if (!tbody) return false;
      
      const loadingRow = tbody.querySelector('.dataTables_empty');
      if (loadingRow && loadingRow.textContent.includes('Loading')) {
        return false;
      }
      
      const rows = tbody.querySelectorAll('tr');
      return rows.length > 0 && !rows[0].textContent.includes('Loading');
    }, { timeout: 60000 });

    console.log('✅ Table data loaded, extracting aircraft entries...');

    // Extract all aircraft data from the table
    const aircraftEntries = await page.evaluate(() => {
      const aircraft = [];
      const tbody = document.querySelector('#atd-table-body');
      
      if (!tbody) {
        console.log('No table body found');
        return aircraft;
      }
      
      const rows = tbody.querySelectorAll('tr');
      console.log(`Found ${rows.length} rows in table`);
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 7) {
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

    // If we have data, try to get all entries by navigating through pagination
    if (aircraftEntries.length > 0) {
      console.log('🔄 Attempting to load all entries...');
      
      // Try to change the page size to show more entries
      try {
        await page.select('#atd-table_length select', '100');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we can get more entries
        const totalEntries = await page.evaluate(() => {
          const infoText = document.querySelector('#atd-table_info')?.textContent || '';
          const match = infoText.match(/Showing \d+ to \d+ of (\d+) entries/);
          return match ? parseInt(match[1]) : 0;
        });
        
        console.log(`📊 Total entries available: ${totalEntries}`);
        
        if (totalEntries > aircraftEntries.length) {
          console.log('🔄 Loading all entries by pagination...');
          
          // Load all entries by clicking through pages
          let currentPage = 1;
          const allAircraft = [...aircraftEntries];
          
          while (true) {
            // Check if there's a next page
            const hasNextPage = await page.evaluate(() => {
              const nextButton = document.querySelector('#atd-table_next');
              return nextButton && !nextButton.classList.contains('disabled');
            });
            
            if (!hasNextPage) break;
            
            // Click next page
            await page.click('#atd-table_next');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Extract data from current page
            const pageData = await page.evaluate(() => {
              const aircraft = [];
              const tbody = document.querySelector('#atd-table-body');
              const rows = tbody.querySelectorAll('tr');
              
              rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 7) {
                  const manufacturer = cells[0]?.textContent?.trim() || '';
                  const model = cells[1]?.textContent?.trim() || '';
                  const typeDesignator = cells[2]?.textContent?.trim() || '';
                  const description = cells[3]?.textContent?.trim() || '';
                  const engineType = cells[4]?.textContent?.trim() || '';
                  const engineCount = cells[5]?.textContent?.trim() || '';
                  const wtc = cells[6]?.textContent?.trim() || '';
                  
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
            
            allAircraft.push(...pageData);
            currentPage++;
            
            console.log(`📄 Page ${currentPage}: ${pageData.length} entries (Total: ${allAircraft.length})`);
            
            // Safety check to prevent infinite loop
            if (currentPage > 100) {
              console.log('⚠️ Reached maximum page limit, stopping pagination');
              break;
            }
          }
          
          // Update aircraft entries with all data
          aircraftEntries.length = 0;
          aircraftEntries.push(...allAircraft);
        }
      } catch (error) {
        console.log(`⚠️ Error during pagination: ${error.message}`);
      }
    }

    // Save the extracted data
    console.log('💾 Saving extracted data...');
    
    const extractionSummary = {
      timestamp: new Date().toISOString(),
      totalAircraftEntries: aircraftEntries.length,
      lastUpdatedDate,
      nextScheduledUpdate,
      extractionMethod: 'dynamic_table_scraping',
      notes: 'Comprehensive ICAO aircraft data extraction with pagination'
    };

    // Save API responses
    fs.writeFileSync(
      path.join(__dirname, 'icao-api-responses-v8.json'),
      JSON.stringify(apiResponses, null, 2)
    );
    console.log(`✅ Saved ${apiResponses.length} API responses to icao-api-responses-v8.json`);

    // Save aircraft data
    fs.writeFileSync(
      path.join(__dirname, 'icao-aircraft-extracted-v8.json'),
      JSON.stringify(aircraftEntries, null, 2)
    );
    console.log(`✅ Saved ${aircraftEntries.length} aircraft entries to icao-aircraft-extracted-v8.json`);

    // Save extraction summary
    fs.writeFileSync(
      path.join(__dirname, 'icao-extraction-summary-v8.json'),
      JSON.stringify(extractionSummary, null, 2)
    );
    console.log('✅ Saved extraction summary to icao-extraction-summary-v8.json');

    // Save page source for debugging
    const pageSource = await page.content();
    fs.writeFileSync(
      path.join(__dirname, 'icao-page-source-v8.html'),
      pageSource
    );
    console.log('✅ Saved page source to icao-page-source-v8.html');

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