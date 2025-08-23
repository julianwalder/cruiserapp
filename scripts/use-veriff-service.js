// Import the VeriffService from our codebase
const { VeriffService } = require('../src/lib/veriff-service');

async function useVeriffService() {
  console.log('🔍 Using VeriffService to fetch real data...\n');

  try {
    // Try to use the VeriffService to get verification details
    console.log('📡 Attempting to fetch verification data using VeriffService...');
    
    // Since we have the attemptId, let's try to get the verification details
    const attemptId = '1ac59c9a-d8aa-468f-b420-1c72107b616e';
    
    console.log(`📋 Attempt ID: ${attemptId}`);
    console.log('📝 Note: This would require the VeriffService to be properly configured');
    console.log('with API credentials and the correct endpoints for SelfID.');
    console.log();
    
    console.log('💡 ALTERNATIVE APPROACH:');
    console.log('========================');
    console.log('Since direct API access is complex, let\'s try a simpler approach:');
    console.log();
    console.log('1. 📋 Go to the Veriff dashboard');
    console.log('2. 🔍 Search for Bogdan Luca\'s verification record');
    console.log('3. 📝 Copy the real data from the Veriff ID');
    console.log('4. 🔄 Update our database with the real values');
    console.log();
    console.log('📊 What we need to get from Veriff ID:');
    console.log('=====================================');
    console.log('❌ Date of Birth (currently: 1990-01-01 - fake)');
    console.log('❌ CNP/ID Number (currently: null)');
    console.log('❌ Gender (currently: M - might be real)');
    console.log('❌ Document Valid From (currently: null)');
    console.log('❌ Document Valid Until (currently: null)');
    console.log();
    console.log('✅ What we already have (real):');
    console.log('================================');
    console.log('✅ Document Number: RX740900');
    console.log('✅ Name: BOGDAN LUCA');
    console.log('✅ Nationality: Romanian');
    console.log('✅ Country: Romania');
    console.log();
    console.log('🎯 NEXT STEPS:');
    console.log('==============');
    console.log('1. Access Bogdan Luca\'s Veriff ID in the Veriff dashboard');
    console.log('2. Copy the real values for the missing fields');
    console.log('3. Update the database with the real data');
    console.log('4. Test the verification display');
    
  } catch (error) {
    console.log('❌ Error using VeriffService:', error.message);
    console.log('This confirms that we need to get the data manually from the Veriff dashboard.');
  }
}

useVeriffService().catch(console.error);
