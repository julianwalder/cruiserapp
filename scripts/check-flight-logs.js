const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFlightLogs() {
  try {
    const count = await prisma.flightLog.count();
    console.log(`Current flight logs in database: ${count}`);
    
    // Also check the import summary file
    const fs = require('fs');
    const path = require('path');
    const summaryFile = path.join(process.cwd(), 'data', 'flight-logs-import-summary.json');
    
    if (fs.existsSync(summaryFile)) {
      const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
      console.log('\nImport Summary:');
      console.log(`- Total records: ${summary.total}`);
      console.log(`- Successfully imported: ${summary.totalImported}`);
      console.log(`- Skipped duplicates: ${summary.totalSkipped}`);
      console.log(`- Errors: ${summary.totalErrors}`);
      console.log(`- Last import: ${summary.lastImportDate}`);
    }
    
  } catch (error) {
    console.error('Error checking flight logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFlightLogs(); 