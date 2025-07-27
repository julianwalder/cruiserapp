const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyIcaoData() {
  console.log('🔍 Verifying ICAO aircraft data in database...');
  
  try {
    // Count total ICAO reference aircraft
    const icaoCount = await prisma.aircraft.count({
      where: {
        isIcaoReference: true
      }
    });
    
    console.log(`📊 Total ICAO reference aircraft: ${icaoCount}`);
    
    // Get sample ICAO aircraft
    const sampleIcao = await prisma.aircraft.findMany({
      where: {
        isIcaoReference: true
      },
      select: {
        registration: true,
        icaoTypeDesignator: true,
        manufacturer: true,
        model: true,
        engineType: true,
        engineCount: true,
        wakeTurbulenceCategory: true,
        status: true
      },
      take: 10,
      orderBy: {
        icaoTypeDesignator: 'asc'
      }
    });
    
    console.log('\n📋 Sample ICAO aircraft:');
    sampleIcao.forEach((aircraft, index) => {
      console.log(`${index + 1}. ${aircraft.icaoTypeDesignator} - ${aircraft.manufacturer} ${aircraft.model} (${aircraft.engineType})`);
    });
    
    // Get statistics
    const engineTypeStats = await prisma.aircraft.groupBy({
      by: ['engineType'],
      where: {
        isIcaoReference: true
      },
      _count: {
        engineType: true
      }
    });
    
    console.log('\n🔧 Engine Type Distribution:');
    engineTypeStats.forEach(stat => {
      console.log(`  ${stat.engineType}: ${stat._count.engineType}`);
    });
    
    const wakeTurbulenceStats = await prisma.aircraft.groupBy({
      by: ['wakeTurbulenceCategory'],
      where: {
        isIcaoReference: true
      },
      _count: {
        wakeTurbulenceCategory: true
      }
    });
    
    console.log('\n🌪️ Wake Turbulence Distribution:');
    wakeTurbulenceStats.forEach(stat => {
      console.log(`  ${stat.wakeTurbulenceCategory}: ${stat._count.wakeTurbulenceCategory}`);
    });
    
    // Check if combobox data is accessible
    console.log('\n🔍 Testing combobox data access...');
    const comboboxData = await prisma.aircraft.findMany({
      where: {
        isIcaoReference: true
      },
      select: {
        icaoTypeDesignator: true,
        manufacturer: true,
        model: true,
        engineType: true,
        engineCount: true,
        wakeTurbulenceCategory: true
      },
      take: 5
    });
    
    console.log('✅ Combobox data accessible:');
    comboboxData.forEach(aircraft => {
      console.log(`  ${aircraft.icaoTypeDesignator} - ${aircraft.manufacturer} ${aircraft.model}`);
    });
    
    console.log('\n🎉 ICAO data verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying ICAO data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
if (require.main === module) {
  verifyIcaoData().catch(console.error);
}

module.exports = { verifyIcaoData }; 