const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function scrapeIcaoAircraftTypesV2() {
  console.log('🚁 Starting improved ICAO aircraft type scraper...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
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
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Take a screenshot to see what we're dealing with
    await page.screenshot({ path: 'scripts/icao-page-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved to scripts/icao-page-screenshot.png');

    // Try to find and click on the search or browse button
    console.log('🔍 Looking for search/browse interface...');
    
    // Wait for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to find common search form elements
    const searchSelectors = [
      'input[type="text"]',
      'input[name*="search"]',
      'input[id*="search"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'a[href*="search"]',
      'a[onclick*="search"]'
    ];

    let searchElement = null;
    for (const selector of searchSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
          searchElement = elements[0];
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (searchElement) {
      console.log('🔍 Attempting to interact with search element...');
      try {
        await searchElement.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.log('⚠️ Could not click search element:', e.message);
      }
    }

    // Try to find the actual data table
    console.log('📊 Looking for aircraft data table...');
    
    // Wait for any AJAX content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take another screenshot after potential interactions
    await page.screenshot({ path: 'scripts/icao-page-after-interaction.png', fullPage: true });
    console.log('📸 Post-interaction screenshot saved');

    // Try to extract data from any visible tables
    const aircraftData = await extractFromAllTables(page);
    
    if (aircraftData.length === 0) {
      console.log('🔍 No tables found, trying to navigate to different pages...');
      await tryAlternativeNavigation(page);
    }

    // Final attempt - try to get the page source and parse it
    if (aircraftData.length === 0) {
      console.log('🔍 Trying to parse page source...');
      const sourceData = await extractFromPageSource(page);
      aircraftData.push(...sourceData);
    }

    if (aircraftData.length > 0) {
      console.log(`✅ Successfully extracted ${aircraftData.length} aircraft types`);
      await saveAircraftData(aircraftData);
    } else {
      console.log('❌ No aircraft data could be extracted');
      console.log('💡 The ICAO website might require specific navigation or have anti-scraping measures');
    }

  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

async function extractFromAllTables(page) {
  console.log('📊 Extracting data from all tables...');
  
  const aircraftData = [];
  
  try {
    // Get all tables on the page
    const tables = await page.$$('table');
    console.log(`📊 Found ${tables.length} tables on the page`);

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      try {
        const table = tables[tableIndex];
        console.log(`📊 Processing table ${tableIndex + 1}/${tables.length}`);
        
        const rows = await table.$$('tr');
        console.log(`📊 Table ${tableIndex + 1} has ${rows.length} rows`);

        for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) { // Skip header
          try {
            const cells = await rows[rowIndex].$$('td');
            if (cells.length >= 3) {
              const rowData = await Promise.all(
                cells.map(cell => cell.evaluate(el => el.textContent?.trim() || ''))
              );

              // Check if this looks like aircraft data (4-letter ICAO code)
              if (rowData[0] && /^[A-Z]{4}$/.test(rowData[0])) {
                console.log(`✅ Found aircraft data: ${rowData[0]}`);
                
                const aircraft = {
                  icaoTypeDesignator: rowData[0],
                  manufacturer: rowData[1] || '',
                  model: rowData[2] || '',
                  description: rowData[3] || '',
                  engineType: rowData[4] || 'UNKNOWN',
                  engineCount: parseInt(rowData[5]) || 1,
                  wakeTurbulenceCategory: rowData[6] || 'LIGHT'
                };

                aircraftData.push(aircraft);
              }
            }
          } catch (e) {
            console.log(`⚠️ Error processing row ${rowIndex} in table ${tableIndex + 1}:`, e.message);
          }
        }
      } catch (e) {
        console.log(`⚠️ Error processing table ${tableIndex + 1}:`, e.message);
      }
    }

  } catch (error) {
    console.error('❌ Error extracting from tables:', error);
  }

  return aircraftData;
}

async function tryAlternativeNavigation(page) {
  console.log('🔍 Trying alternative navigation...');
  
  try {
    // Try to find links that might lead to aircraft data
    const links = await page.$$('a[href*="aircraft"], a[href*="type"], a[href*="designator"]');
    console.log(`🔍 Found ${links.length} potential aircraft-related links`);

    for (let i = 0; i < Math.min(links.length, 3); i++) { // Try first 3 links
      try {
        console.log(`🔍 Clicking link ${i + 1}...`);
        await links[i].click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we got aircraft data
        const newData = await extractFromAllTables(page);
        if (newData.length > 0) {
          console.log(`✅ Found ${newData.length} aircraft types after clicking link ${i + 1}`);
          return newData;
        }
        
        // Go back
        await page.goBack();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.log(`⚠️ Error with link ${i + 1}:`, e.message);
      }
    }
  } catch (error) {
    console.error('❌ Error during alternative navigation:', error);
  }

  return [];
}

async function extractFromPageSource(page) {
  console.log('📄 Extracting from page source...');
  
  try {
    // Get the page HTML
    const html = await page.content();
    
    // Look for patterns in the HTML that might contain aircraft data
    const aircraftPatterns = [
      /([A-Z]{4})\s*[-\s]\s*([^<>\n]+?)\s*[-\s]\s*([A-Z]{4})/g, // ICAO - Description - ICAO
      /([A-Z]{4})\s+([A-Za-z\s]+?)\s+([A-Za-z0-9\s]+?)\s+(LandPlane|SeaPlane|Helicopter|Glider)/g, // ICAO Manufacturer Model Type
      /([A-Z]{4})\s+([^<>\n]{10,})/g // ICAO followed by description
    ];

    const aircraftData = [];
    
    for (const pattern of aircraftPatterns) {
      const matches = [...html.matchAll(pattern)];
      console.log(`🔍 Pattern found ${matches.length} matches`);
      
      for (const match of matches) {
        if (match[1] && /^[A-Z]{4}$/.test(match[1])) {
          const icaoCode = match[1];
          const description = match[2] || match[3] || '';
          
          // Parse description for manufacturer and model
          const parts = description.split(/\s+/).filter(p => p.length > 0);
          const manufacturer = parts[0] || '';
          const model = parts.slice(1, 3).join(' ') || '';
          
          aircraftData.push({
            icaoTypeDesignator: icaoCode,
            manufacturer: manufacturer,
            model: model,
            description: description.trim(),
            engineType: 'UNKNOWN',
            engineCount: 1,
            wakeTurbulenceCategory: 'LIGHT'
          });
        }
      }
    }

    // Remove duplicates
    const uniqueData = aircraftData.filter((aircraft, index, self) => 
      index === self.findIndex(a => a.icaoTypeDesignator === aircraft.icaoTypeDesignator)
    );

    console.log(`✅ Extracted ${uniqueData.length} unique aircraft types from page source`);
    return uniqueData;

  } catch (error) {
    console.error('❌ Error extracting from page source:', error);
    return [];
  }
}

async function saveAircraftData(aircraftData) {
  try {
    const outputPath = path.join(__dirname, 'icao-aircraft-data-v2.json');
    await fs.writeFile(outputPath, JSON.stringify(aircraftData, null, 2));
    console.log(`💾 Saved ${aircraftData.length} aircraft types to ${outputPath}`);
    
    // Also create a summary
    const summary = {
      totalAircraft: aircraftData.length,
      manufacturers: [...new Set(aircraftData.map(a => a.manufacturer))].length,
      engineTypes: [...new Set(aircraftData.map(a => a.engineType))],
      extractedAt: new Date().toISOString(),
      source: 'ICAO DOC 8643 (Improved Scraper)'
    };
    
    const summaryPath = path.join(__dirname, 'icao-aircraft-summary-v2.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to ${summaryPath}`);
    
    // Display some sample data
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
  scrapeIcaoAircraftTypesV2().catch(console.error);
}

module.exports = { scrapeIcaoAircraftTypesV2 }; 