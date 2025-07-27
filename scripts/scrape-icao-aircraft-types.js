const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function scrapeIcaoAircraftTypes() {
  console.log('🚁 Starting ICAO aircraft type scraper...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📡 Navigating to ICAO DOC 8643 website...');
    await page.goto('https://www.icao.int/publications/DOC8643/Pages/Search.aspx', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('🔍 Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if we need to handle any popups or accept terms
    try {
      // Look for common popup selectors
      const popupSelectors = [
        '#onetrust-accept-btn-handler',
        '.cookie-accept',
        '.popup-close',
        '[data-testid="close-button"]'
      ];

      for (const selector of popupSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.click(selector);
          console.log(`✅ Closed popup with selector: ${selector}`);
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (e) {
      console.log('ℹ️ No popups found or already handled');
    }

    // Wait for the search form to be available
    console.log('🔍 Looking for search interface...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to find the search form or table
    const searchForm = await page.$('#ctl00_ContentPlaceHolder1_SearchForm');
    const dataGrid = await page.$('#ctl00_ContentPlaceHolder1_GridView1');
    
    if (searchForm) {
      console.log('✅ Found search form, attempting to extract data...');
      await extractFromSearchForm(page);
    } else if (dataGrid) {
      console.log('✅ Found data grid, attempting to extract data...');
      await extractFromDataGrid(page);
    } else {
      console.log('🔍 No standard form found, trying alternative approach...');
      await extractFromPageContent(page);
    }

  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

async function extractFromSearchForm(page) {
  console.log('📋 Extracting data from search form...');
  
  // Try to get all aircraft types by searching with empty criteria
  try {
    // Look for search button
    const searchButton = await page.$('#ctl00_ContentPlaceHolder1_SearchButton');
    if (searchButton) {
      console.log('🔍 Clicking search button to get all results...');
      await searchButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } catch (e) {
    console.log('ℹ️ Could not find search button, trying direct table extraction...');
  }

  // Try to extract from any visible table
  await extractFromDataGrid(page);
}

async function extractFromDataGrid(page) {
  console.log('📊 Extracting data from data grid...');
  
  const aircraftData = [];
  
  try {
    // Wait for table to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try different table selectors
    const tableSelectors = [
      '#ctl00_ContentPlaceHolder1_GridView1',
      '.GridView',
      'table',
      '[id*="GridView"]',
      '[class*="grid"]'
    ];

    let table = null;
    for (const selector of tableSelectors) {
      try {
        table = await page.$(selector);
        if (table) {
          console.log(`✅ Found table with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!table) {
      console.log('❌ No table found, trying to extract from page content...');
      await extractFromPageContent(page);
      return;
    }

    // Extract table data
    const rows = await page.$$(`${tableSelectors.find(s => table)} tr`);
    console.log(`📊 Found ${rows.length} rows in table`);

    for (let i = 1; i < rows.length; i++) { // Skip header row
      try {
        const cells = await rows[i].$$('td');
        if (cells.length >= 4) {
          const rowData = await Promise.all(
            cells.map(cell => cell.evaluate(el => el.textContent?.trim() || ''))
          );

          if (rowData[0] && rowData[0].length > 0) {
            const aircraft = {
              icaoTypeDesignator: rowData[0] || '',
              manufacturer: rowData[1] || '',
              model: rowData[2] || '',
              description: rowData[3] || '',
              engineType: rowData[4] || '',
              engineCount: parseInt(rowData[5]) || 1,
              wakeTurbulenceCategory: rowData[6] || 'LIGHT'
            };

            aircraftData.push(aircraft);
          }
        }
      } catch (e) {
        console.log(`⚠️ Error extracting row ${i}:`, e.message);
      }
    }

  } catch (error) {
    console.error('❌ Error extracting from data grid:', error);
  }

  if (aircraftData.length > 0) {
    console.log(`✅ Successfully extracted ${aircraftData.length} aircraft types`);
    await saveAircraftData(aircraftData);
  } else {
    console.log('⚠️ No aircraft data extracted from table, trying alternative method...');
    await extractFromPageContent(page);
  }
}

async function extractFromPageContent(page) {
  console.log('📄 Extracting data from page content...');
  
  try {
    // Get all text content and look for patterns
    const pageContent = await page.evaluate(() => {
      return document.body.innerText;
    });

    console.log('📄 Page content length:', pageContent.length);
    
    // Look for ICAO type patterns (4-letter codes)
    const icaoPattern = /([A-Z]{4})\s+([^\n]+)/g;
    const matches = [...pageContent.matchAll(icaoPattern)];
    
    console.log(`🔍 Found ${matches.length} potential ICAO type matches`);
    
    const aircraftData = [];
    for (const match of matches) {
      const icaoCode = match[1];
      const description = match[2].trim();
      
      // Try to parse manufacturer and model from description
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

    if (aircraftData.length > 0) {
      console.log(`✅ Extracted ${aircraftData.length} aircraft types from page content`);
      await saveAircraftData(aircraftData);
    } else {
      console.log('❌ No aircraft data found in page content');
    }

  } catch (error) {
    console.error('❌ Error extracting from page content:', error);
  }
}

async function saveAircraftData(aircraftData) {
  try {
    const outputPath = path.join(__dirname, 'icao-aircraft-data.json');
    await fs.writeFile(outputPath, JSON.stringify(aircraftData, null, 2));
    console.log(`💾 Saved ${aircraftData.length} aircraft types to ${outputPath}`);
    
    // Also create a summary
    const summary = {
      totalAircraft: aircraftData.length,
      manufacturers: [...new Set(aircraftData.map(a => a.manufacturer))].length,
      engineTypes: [...new Set(aircraftData.map(a => a.engineType))],
      extractedAt: new Date().toISOString(),
      source: 'ICAO DOC 8643'
    };
    
    const summaryPath = path.join(__dirname, 'icao-aircraft-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to ${summaryPath}`);
    
    // Display some sample data
    console.log('\n📋 Sample aircraft types:');
    aircraftData.slice(0, 5).forEach((aircraft, index) => {
      console.log(`${index + 1}. ${aircraft.icaoTypeDesignator} - ${aircraft.manufacturer} ${aircraft.model}`);
    });
    
  } catch (error) {
    console.error('❌ Error saving aircraft data:', error);
  }
}

// Run the scraper
if (require.main === module) {
  scrapeIcaoAircraftTypes().catch(console.error);
}

module.exports = { scrapeIcaoAircraftTypes }; 