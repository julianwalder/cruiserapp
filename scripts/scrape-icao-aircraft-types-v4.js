const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeIcaoAircraftTypes() {
  console.log('🚀 Starting ICAO aircraft type scraper (v4) - capturing all manufacturers...');
  
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
    
    page.on('request', request => {
      request.continue();
    });
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('DOC8643') && url.includes('Search.aspx')) {
        try {
          const responseBody = await response.text();
          if (responseBody && responseBody.length > 100) {
            apiResponses.push({
              url,
              body: responseBody,
              timestamp: new Date().toISOString()
            });
            console.log(`📡 Captured API response: ${url}`);
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

    console.log('⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to trigger the search to get all aircraft data
    console.log('🔍 Attempting to trigger search for all aircraft...');
    
    // Look for search form elements
    const searchSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      '.search-button',
      '#searchButton',
      'input[value*="Search"]',
      'button:contains("Search")'
    ];

    for (const selector of searchSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Found search element: ${selector}`);
          await element.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Wait for any additional network activity
    console.log('⏳ Waiting for network activity to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Save captured API responses
    if (apiResponses.length > 0) {
      const outputPath = path.join(__dirname, 'icao-api-responses-v4.json');
      fs.writeFileSync(outputPath, JSON.stringify(apiResponses, null, 2));
      console.log(`💾 Saved ${apiResponses.length} API responses to ${outputPath}`);
    } else {
      console.log('⚠️ No API responses captured, trying alternative approach...');
      
      // Try to extract data from the page directly
      const aircraftData = await page.evaluate(() => {
        const aircraft = [];
        
        // Look for table rows or list items containing aircraft data
        const selectors = [
          'table tr',
          '.aircraft-item',
          '.result-item',
          'li',
          '.item'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 10) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            
            elements.forEach((element, index) => {
              const text = element.textContent.trim();
              if (text.length > 10 && text.length < 500) {
                // Look for patterns that might be aircraft data
                const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                
                if (lines.length >= 2) {
                  // Try to extract ICAO code (4-letter pattern)
                  const icaoMatch = text.match(/\b[A-Z]{4}\b/);
                  if (icaoMatch) {
                    aircraft.push({
                      icaoTypeDesignator: icaoMatch[0],
                      rawText: text,
                      lines: lines,
                      elementIndex: index
                    });
                  }
                }
              }
            });
            break;
          }
        }
        
        return aircraft;
      });
      
      if (aircraftData.length > 0) {
        const outputPath = path.join(__dirname, 'icao-page-data-v4.json');
        fs.writeFileSync(outputPath, JSON.stringify(aircraftData, null, 2));
        console.log(`💾 Saved ${aircraftData.length} aircraft items from page to ${outputPath}`);
      }
    }

    // Try to get the page source to analyze the structure
    console.log('📄 Capturing page source for analysis...');
    const pageSource = await page.content();
    const sourcePath = path.join(__dirname, 'icao-page-source-v4.html');
    fs.writeFileSync(sourcePath, pageSource);
    console.log(`💾 Saved page source to ${sourcePath}`);

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