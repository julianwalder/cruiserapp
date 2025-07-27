const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testFleetImport() {
  console.log('🧪 Testing fleet import functionality...');
  
  try {
    // Check if test CSV file exists
    const csvPath = path.join(__dirname, '..', 'test-fleet-import.csv');
    if (!fs.existsSync(csvPath)) {
      console.log('❌ Test CSV file not found. Please create test-fleet-import.csv first.');
      return;
    }
    
    console.log('📁 Test CSV file found');
    
    // Read and parse the test CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 CSV contains ${lines.length - 1} aircraft records`);
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('📋 Headers:', headers);
    
    // Check current aircraft count
    const currentAircraftCount = await prisma.aircraft.count();
    console.log(`📊 Current aircraft in database: ${currentAircraftCount}`);
    
    // Test each aircraft record
    console.log('\n📋 Testing aircraft records:');
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const values = row.split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        console.log(`❌ Row ${i + 1}: Column count mismatch`);
        continue;
      }
      
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });
      
      console.log(`\n${i}. ${rowData.callSign} - ${rowData.manufacturer} ${rowData.model}`);
      
      // Check if aircraft already exists
      const existingAircraft = await prisma.aircraft.findFirst({
        where: {
          OR: [
            { callSign: rowData.callSign },
            { serialNumber: rowData.serialNumber }
          ]
        }
      });
      
      if (existingAircraft) {
        console.log(`   ⚠️  Aircraft already exists: ${existingAircraft.callSign}`);
        continue;
      }
      
      // Check if ICAO reference type exists
      const icaoRef = await prisma.iCAOReferenceType.findFirst({
        where: {
          typeDesignator: rowData.icaoTypeDesignator,
          manufacturer: rowData.manufacturer,
          model: rowData.model
        }
      });
      
      if (icaoRef) {
        console.log(`   ✅ ICAO reference found: ${icaoRef.typeDesignator} - ${icaoRef.manufacturer} ${icaoRef.model}`);
      } else {
        console.log(`   ❌ ICAO reference not found for: ${rowData.icaoTypeDesignator} - ${rowData.manufacturer} ${rowData.model}`);
        
        // Show similar ICAO types
        const similarTypes = await prisma.iCAOReferenceType.findMany({
          where: {
            typeDesignator: rowData.icaoTypeDesignator
          },
          take: 3
        });
        
        if (similarTypes.length > 0) {
          console.log(`   💡 Similar ICAO types found:`);
          similarTypes.forEach(type => {
            console.log(`      - ${type.typeDesignator} - ${type.manufacturer} ${type.model}`);
          });
        }
      }
      
      // Validate year
      const year = parseInt(rowData.yearOfManufacture);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        console.log(`   ❌ Invalid year: ${rowData.yearOfManufacture}`);
      } else {
        console.log(`   ✅ Valid year: ${year}`);
      }
      
      // Validate status
      const validStatuses = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
      if (validStatuses.includes(rowData.status)) {
        console.log(`   ✅ Valid status: ${rowData.status}`);
      } else {
        console.log(`   ❌ Invalid status: ${rowData.status}`);
      }
    }
    
    // Show sample ICAO types for reference
    console.log('\n📋 Sample ICAO types in database:');
    const sampleIcaoTypes = await prisma.iCAOReferenceType.findMany({
      take: 5,
      orderBy: { typeDesignator: 'asc' }
    });
    
    sampleIcaoTypes.forEach(type => {
      console.log(`   - ${type.typeDesignator} - ${type.manufacturer} ${type.model}`);
    });
    
    console.log('\n✅ Fleet import test completed!');
    console.log('\n📝 Notes:');
    console.log('   - Make sure ICAO data is imported first');
    console.log('   - Aircraft call signs and serial numbers must be unique');
    console.log('   - ICAO type designator, manufacturer, and model must match existing ICAO reference data');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFleetImport(); 