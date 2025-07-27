const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function scrapeIcaoAircraftTypesV3() {
  console.log('🚁 Starting advanced ICAO aircraft type scraper...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Enable request interception to see what's happening
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      console.log(`🌐 Request: ${request.method()} ${request.url()}`);
      request.continue();
    });

    console.log('📡 Navigating to ICAO DOC 8643 website...');
    await page.goto('https://www.icao.int/publications/DOC8643/Pages/Search.aspx', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('🔍 Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Take initial screenshot
    await page.screenshot({ path: 'scripts/icao-initial.png', fullPage: true });
    console.log('📸 Initial screenshot saved');

    // Try to find and interact with the search interface
    console.log('🔍 Looking for search interface elements...');
    
    // Wait for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try multiple approaches to find the search form
    const searchApproaches = [
      async () => {
        console.log('🔍 Approach 1: Looking for ASP.NET form elements...');
        const form = await page.$('form[id*="form"]');
        if (form) {
          console.log('✅ Found form, looking for search controls...');
          
          // Look for search input fields
          const searchInputs = await page.$$('input[type="text"], input[name*="search"], input[id*="search"]');
          console.log(`Found ${searchInputs.length} search input fields`);
          
          if (searchInputs.length > 0) {
            // Try to click on the first search input to activate the form
            await searchInputs[0].click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Look for search button
            const searchButtons = await page.$$('input[type="submit"], button[type="submit"], input[value*="Search"], button:contains("Search")');
            if (searchButtons.length > 0) {
              console.log('🔍 Clicking search button...');
              await searchButtons[0].click();
              await new Promise(resolve => setTimeout(resolve, 5000));
              return true;
            }
          }
        }
        return false;
      },
      
      async () => {
        console.log('🔍 Approach 2: Looking for direct data table...');
        const tables = await page.$$('table');
        console.log(`Found ${tables.length} tables`);
        
        for (let i = 0; i < tables.length; i++) {
          const table = tables[i];
          const rows = await table.$$('tr');
          console.log(`Table ${i + 1} has ${rows.length} rows`);
          
          if (rows.length > 10) { // Likely a data table
            console.log(`✅ Table ${i + 1} looks like a data table`);
            return true;
          }
        }
        return false;
      },
      
      async () => {
        console.log('🔍 Approach 3: Looking for navigation links...');
        const links = await page.$$('a[href*="aircraft"], a[href*="type"], a[href*="designator"], a[onclick*="search"]');
        console.log(`Found ${links.length} potential navigation links`);
        
        for (let i = 0; i < Math.min(links.length, 5); i++) {
          try {
            const linkText = await links[i].evaluate(el => el.textContent?.trim());
            console.log(`🔍 Link ${i + 1}: "${linkText}"`);
            
            if (linkText && (linkText.includes('Search') || linkText.includes('Browse') || linkText.includes('View'))) {
              console.log(`🔍 Clicking promising link: "${linkText}"`);
              await links[i].click();
              await new Promise(resolve => setTimeout(resolve, 5000));
              return true;
            }
          } catch (e) {
            console.log(`⚠️ Error with link ${i + 1}:`, e.message);
          }
        }
        return false;
      },
      
      async () => {
        console.log('🔍 Approach 4: Looking for JavaScript functions...');
        // Try to execute JavaScript to find search functions
        const hasSearchFunction = await page.evaluate(() => {
          return typeof window.searchAircraft !== 'undefined' || 
                 typeof window.loadData !== 'undefined' ||
                 typeof window.showResults !== 'undefined';
        });
        
        if (hasSearchFunction) {
          console.log('✅ Found search functions, trying to execute...');
          try {
            await page.evaluate(() => {
              if (typeof window.searchAircraft === 'function') window.searchAircraft();
              if (typeof window.loadData === 'function') window.loadData();
              if (typeof window.showResults === 'function') window.showResults();
            });
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
          } catch (e) {
            console.log('⚠️ Error executing search functions:', e.message);
          }
        }
        return false;
      }
    ];

    let success = false;
    for (let i = 0; i < searchApproaches.length; i++) {
      console.log(`\n🔄 Trying approach ${i + 1}...`);
      try {
        success = await searchApproaches[i]();
        if (success) {
          console.log(`✅ Approach ${i + 1} succeeded`);
          break;
        }
      } catch (e) {
        console.log(`❌ Approach ${i + 1} failed:`, e.message);
      }
    }

    // Take screenshot after interactions
    await page.screenshot({ path: 'scripts/icao-after-interaction.png', fullPage: true });
    console.log('📸 Post-interaction screenshot saved');

    // Extract data from the page
    console.log('📊 Extracting aircraft data...');
    const aircraftData = await extractAircraftData(page);
    
    if (aircraftData.length === 0) {
      console.log('🔍 No data found, trying to navigate to different sections...');
      await tryAlternativeSections(page);
      const additionalData = await extractAircraftData(page);
      aircraftData.push(...additionalData);
    }

    if (aircraftData.length > 0) {
      console.log(`✅ Successfully extracted ${aircraftData.length} aircraft types`);
      await saveAircraftData(aircraftData);
    } else {
      console.log('❌ No aircraft data could be extracted');
      console.log('💡 The ICAO website might require specific authentication or have changed its structure');
    }

  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

async function extractAircraftData(page) {
  console.log('📊 Extracting aircraft data from page...');
  
  const aircraftData = [];
  
  try {
    // Method 1: Extract from tables
    const tables = await page.$$('table');
    console.log(`📊 Found ${tables.length} tables`);
    
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      try {
        const table = tables[tableIndex];
        const rows = await table.$$('tr');
        
        if (rows.length > 5) { // Likely a data table
          console.log(`📊 Processing table ${tableIndex + 1} with ${rows.length} rows`);
          
          for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
            try {
              const cells = await rows[rowIndex].$$('td');
              if (cells.length >= 3) {
                const rowData = await Promise.all(
                  cells.map(cell => cell.evaluate(el => el.textContent?.trim() || ''))
                );

                // Check for ICAO pattern (4-letter code)
                if (rowData[0] && /^[A-Z]{4}$/.test(rowData[0])) {
                  console.log(`✅ Found aircraft: ${rowData[0]}`);
                  
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
              // Continue with next row
            }
          }
        }
      } catch (e) {
        console.log(`⚠️ Error processing table ${tableIndex + 1}:`, e.message);
      }
    }

    // Method 2: Extract from page content using regex
    if (aircraftData.length === 0) {
      console.log('🔍 No table data found, trying regex extraction...');
      const pageContent = await page.content();
      
      // Look for ICAO patterns in HTML
      const icaoPatterns = [
        /<td[^>]*>([A-Z]{4})<\/td>/g,
        /([A-Z]{4})\s*[-\s]\s*([^<>\n]{10,})/g,
        /([A-Z]{4})\s+([A-Za-z\s]+?)\s+([A-Za-z0-9\s]+?)\s+(LandPlane|SeaPlane|Helicopter|Glider)/g
      ];

      for (const pattern of icaoPatterns) {
        const matches = [...pageContent.matchAll(pattern)];
        console.log(`🔍 Pattern found ${matches.length} matches`);
        
        for (const match of matches) {
          if (match[1] && /^[A-Z]{4}$/.test(match[1])) {
            const icaoCode = match[1];
            const description = match[2] || match[3] || '';
            
            // Parse description
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
    }

    // Remove duplicates
    const uniqueData = aircraftData.filter((aircraft, index, self) => 
      index === self.findIndex(a => a.icaoTypeDesignator === aircraft.icaoTypeDesignator)
    );

    console.log(`✅ Extracted ${uniqueData.length} unique aircraft types`);
    return uniqueData;

  } catch (error) {
    console.error('❌ Error extracting aircraft data:', error);
    return [];
  }
}

async function tryAlternativeSections(page) {
  console.log('🔍 Trying alternative sections...');
  
  try {
    // Try to find and click on different navigation elements
    const navSelectors = [
      'a[href*="browse"]',
      'a[href*="list"]',
      'a[href*="view"]',
      'a[href*="all"]',
      'button[onclick*="load"]',
      'input[onclick*="search"]'
    ];

    for (const selector of navSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);
          
          for (let i = 0; i < Math.min(elements.length, 2); i++) {
            try {
              const elementText = await elements[i].evaluate(el => el.textContent?.trim());
              console.log(`🔍 Clicking element: "${elementText}"`);
              
              await elements[i].click();
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              // Check if we got new data
              const newData = await extractAircraftData(page);
              if (newData.length > 0) {
                console.log(`✅ Got ${newData.length} aircraft types from alternative section`);
                return;
              }
              
              // Go back if no data
              await page.goBack();
              await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (e) {
              console.log(`⚠️ Error with element ${i}:`, e.message);
            }
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
  } catch (error) {
    console.error('❌ Error trying alternative sections:', error);
  }
}

async function saveAircraftData(aircraftData) {
  try {
    const outputPath = path.join(__dirname, 'icao-aircraft-data-v3.json');
    await fs.writeFile(outputPath, JSON.stringify(aircraftData, null, 2));
    console.log(`💾 Saved ${aircraftData.length} aircraft types to ${outputPath}`);
    
    // Create summary
    const summary = {
      totalAircraft: aircraftData.length,
      manufacturers: [...new Set(aircraftData.map(a => a.manufacturer))].length,
      engineTypes: [...new Set(aircraftData.map(a => a.engineType))],
      extractedAt: new Date().toISOString(),
      source: 'ICAO DOC 8643 (Advanced Scraper)'
    };
    
    const summaryPath = path.join(__dirname, 'icao-aircraft-summary-v3.json');
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
  scrapeIcaoAircraftTypesV3().catch(console.error);
}

module.exports = { scrapeIcaoAircraftTypesV3 }; 