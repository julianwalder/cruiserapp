const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testIcaoSeeding() {
  console.log('🧪 Testing ICAO seeding functionality...');
  
  try {
    // Check if data files exist
    const comprehensivePath = path.join(__dirname, 'icao-aircraft-complete.json');
    const extractedPath = path.join(__dirname, 'icao-aircraft-extracted-v8.json');
    
    console.log('📁 Checking data files:');
    console.log(`  Comprehensive data: ${fs.existsSync(comprehensivePath) ? '✅' : '❌'}`);
    console.log(`  Extracted data: ${fs.existsSync(extractedPath) ? '✅' : '❌'}`);
    
    // Check current database state
    const currentCount = await prisma.iCAOReferenceType.count();
    console.log(`📊 Current ICAO types in database: ${currentCount}`);
    
    // Test reading the data files
    let dataSource = 'none';
    let dataCount = 0;
    
    if (fs.existsSync(comprehensivePath)) {
      const data = JSON.parse(fs.readFileSync(comprehensivePath, 'utf8'));
      dataCount = data.length;
      dataSource = 'comprehensive';
      console.log(`📋 Comprehensive data file contains ${dataCount} aircraft types`);
      
      // Show sample entries
      console.log('📋 Sample entries:');
      data.slice(0, 3).forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.icaoTypeDesignator} - ${entry.manufacturer} ${entry.model}`);
      });
    } else if (fs.existsSync(extractedPath)) {
      const data = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
      dataCount = data.length;
      dataSource = 'extracted';
      console.log(`📋 Extracted data file contains ${dataCount} aircraft types`);
      
      // Show sample entries
      console.log('📋 Sample entries:');
      data.slice(0, 3).forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.typeDesignator} - ${entry.manufacturer} ${entry.model}`);
      });
    }
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    const testQuery = await prisma.iCAOReferenceType.findFirst();
    console.log('✅ Database connection successful');
    
    // Show current database sample
    if (currentCount > 0) {
      console.log('📋 Current database sample:');
      const samples = await prisma.iCAOReferenceType.findMany({
        take: 3,
        orderBy: { typeDesignator: 'asc' }
      });
      samples.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.typeDesignator} - ${entry.manufacturer} ${entry.model}`);
      });
    }
    
    console.log('\n✅ ICAO seeding test completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - Data source available: ${dataSource}`);
    console.log(`  - Aircraft types in data file: ${dataCount}`);
    console.log(`  - Aircraft types in database: ${currentCount}`);
    console.log(`  - Database connection: ✅ Working`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIcaoSeeding(); 