const { scrapeIcaoAircraftTypes } = require('./scrape-icao-aircraft-types');

async function testScraping() {
  try {
    console.log('🧪 Testing ICAO web scraping...');
    console.log('⚠️  Note: This may not work due to anti-scraping measures on the ICAO website');
    console.log('📡 Attempting to scrape: https://www.icao.int/publications/DOC8643/Pages/Search.aspx\n');
    
    const aircraftData = await scrapeIcaoAircraftTypes();
    
    if (aircraftData && aircraftData.length > 0) {
      console.log(`\n🎉 Success! Scraped ${aircraftData.length} aircraft types from ICAO website`);
      console.log('📋 First 5 scraped aircraft:');
      aircraftData.slice(0, 5).forEach((aircraft, index) => {
        console.log(`${index + 1}. ${aircraft.icaoTypeDesignator} - ${aircraft.manufacturer} ${aircraft.model}`);
      });
    } else {
      console.log('❌ No aircraft data was scraped. This could be due to:');
      console.log('   - Anti-scraping protection on the ICAO website');
      console.log('   - Dynamic content loading issues');
      console.log('   - Website structure changes');
      console.log('   - Network connectivity issues');
    }
    
  } catch (error) {
    console.error('❌ Scraping test failed:', error.message);
    console.log('\n💡 Alternative: Use the static database instead:');
    console.log('   node scripts/icao-aircraft-database.js');
  }
}

testScraping(); 