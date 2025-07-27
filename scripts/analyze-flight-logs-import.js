const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function analyzeFlightLogsImport() {
  try {
    console.log('🔍 Flight Logs Import Analysis\n');
    
    // Get all existing data from database
    console.log('📊 Loading database data...');
    
    const existingPilots = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: { in: ['PILOT', 'STUDENT'] }
            }
          }
        }
      },
      select: { email: true, firstName: true, lastName: true }
    });
    
    const existingInstructors = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'INSTRUCTOR'
            }
          }
        }
      },
      select: { email: true, firstName: true, lastName: true }
    });
    
    const existingAircraft = await prisma.aircraft.findMany({
      select: { callSign: true, serialNumber: true, icaoReferenceType: { select: { typeDesignator: true } } }
    });
    
    console.log(`✅ Database loaded:`);
    console.log(`   👨‍✈️ Pilots & Students: ${existingPilots.length}`);
    console.log(`   👨‍🏫 Instructors: ${existingInstructors.length}`);
    console.log(`   ✈️ Aircraft: ${existingAircraft.length}\n`);
    
    // Create lookup sets
    const pilotEmails = new Set(existingPilots.map(p => p.email.toLowerCase()));
    const instructorEmails = new Set(existingInstructors.map(i => i.email.toLowerCase()));
    const aircraftCallSigns = new Set(existingAircraft.map(a => a.callSign.toUpperCase()));
    
    // Find CSV file
    const csvFiles = [
      'flight_logs_import_template.csv',
      'flight_logs.csv',
      'flight-logs.csv',
      'import.csv',
      'flight_logs_import.csv'
    ];
    
    let csvPath = null;
    for (const file of csvFiles) {
      if (fs.existsSync(file)) {
        csvPath = file;
        break;
      }
    }
    
    if (!csvPath) {
      console.log('❌ No CSV file found in project root.');
      console.log('\n📋 Please place your flight logs CSV file in the project root with one of these names:');
      csvFiles.forEach(file => console.log(`   - ${file}`));
      console.log('\n💡 Or you can manually copy your CSV file to the project root and run this script again.');
      return;
    }
    
    console.log(`📄 Found CSV file: ${csvPath}`);
    
    // Read and analyze CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('❌ CSV file is empty');
      return;
    }
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`📋 CSV has ${lines.length - 1} data rows`);
    
    // Find column indices
    const pilotEmailIndex = header.findIndex(h => h.toLowerCase().includes('pilot') && h.toLowerCase().includes('email'));
    const instructorEmailIndex = header.findIndex(h => h.toLowerCase().includes('instructor') && h.toLowerCase().includes('email'));
    const aircraftCallSignIndex = header.findIndex(h => h.toLowerCase().includes('aircraft') && h.toLowerCase().includes('callsign'));
    
    if (pilotEmailIndex === -1 || aircraftCallSignIndex === -1) {
      console.log('❌ Required columns not found in CSV');
      console.log('Required: pilot_email, aircraft_callsign');
      console.log('Optional: instructor_email');
      console.log('\nFound columns:');
      header.forEach((col, index) => console.log(`   ${index}: ${col}`));
      return;
    }
    
    console.log(`📍 Column mapping:`);
    console.log(`   Pilot Email: ${header[pilotEmailIndex]} (index ${pilotEmailIndex})`);
    console.log(`   Aircraft Call Sign: ${header[aircraftCallSignIndex]} (index ${aircraftCallSignIndex})`);
    if (instructorEmailIndex !== -1) {
      console.log(`   Instructor Email: ${header[instructorEmailIndex]} (index ${instructorEmailIndex})`);
    }
    
    // Analyze data rows
    const missingPilots = new Set();
    const missingInstructors = new Set();
    const missingAircraft = new Set();
    const validRows = [];
    const invalidRows = [];
    
    console.log('\n🔍 Analyzing CSV data...');
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < Math.max(pilotEmailIndex, aircraftCallSignIndex) + 1) {
        invalidRows.push({ row: i + 1, reason: 'Incomplete row' });
        continue;
      }
      
      const pilotEmail = values[pilotEmailIndex]?.toLowerCase();
      const aircraftCallSign = values[aircraftCallSignIndex]?.toUpperCase();
      const instructorEmail = instructorEmailIndex !== -1 ? values[instructorEmailIndex]?.toLowerCase() : null;
      
      let rowValid = true;
      let rowIssues = [];
      
      // Check pilot
      if (!pilotEmail) {
        rowIssues.push('Missing pilot email');
        rowValid = false;
      } else if (!pilotEmails.has(pilotEmail)) {
        missingPilots.add(pilotEmail);
        rowIssues.push(`Pilot not found: ${pilotEmail}`);
        rowValid = false;
      }
      
      // Check aircraft
      if (!aircraftCallSign) {
        rowIssues.push('Missing aircraft call sign');
        rowValid = false;
      } else if (!aircraftCallSigns.has(aircraftCallSign)) {
        missingAircraft.add(aircraftCallSign);
        rowIssues.push(`Aircraft not found: ${aircraftCallSign}`);
        rowValid = false;
      }
      
      // Check instructor
      if (instructorEmail && !instructorEmails.has(instructorEmail)) {
        missingInstructors.add(instructorEmail);
        rowIssues.push(`Instructor not found: ${instructorEmail}`);
        rowValid = false;
      }
      
      if (rowValid) {
        validRows.push(i + 1);
      } else {
        invalidRows.push({ row: i + 1, reason: rowIssues.join(', ') });
      }
    }
    
    // Report results
    console.log('\n📈 Analysis Results:');
    console.log(`✅ Valid rows (would import successfully): ${validRows.length}`);
    console.log(`❌ Invalid rows (would fail import): ${invalidRows.length}`);
    console.log(`📊 Total rows analyzed: ${lines.length - 1}`);
    
    if (missingPilots.size > 0) {
      console.log(`\n👨‍✈️ Missing Pilots (${missingPilots.size}):`);
      Array.from(missingPilots).slice(0, 20).forEach(email => {
        console.log(`   - ${email}`);
      });
      if (missingPilots.size > 20) {
        console.log(`   ... and ${missingPilots.size - 20} more`);
      }
    }
    
    if (missingAircraft.size > 0) {
      console.log(`\n✈️ Missing Aircraft (${missingAircraft.size}):`);
      Array.from(missingAircraft).slice(0, 20).forEach(callSign => {
        console.log(`   - ${callSign}`);
      });
      if (missingAircraft.size > 20) {
        console.log(`   ... and ${missingAircraft.size - 20} more`);
      }
    }
    
    if (missingInstructors.size > 0) {
      console.log(`\n👨‍🏫 Missing Instructors (${missingInstructors.size}):`);
      Array.from(missingInstructors).slice(0, 20).forEach(email => {
        console.log(`   - ${email}`);
      });
      if (missingInstructors.size > 20) {
        console.log(`   ... and ${missingInstructors.size - 20} more`);
      }
    }
    
    // Show sample of existing data for reference
    console.log('\n📋 Current Database Data:');
    console.log('👨‍✈️ Sample Pilots:');
    existingPilots.slice(0, 5).forEach(pilot => {
      console.log(`   - ${pilot.email} (${pilot.firstName} ${pilot.lastName})`);
    });
    
    console.log('\n✈️ Current Aircraft:');
    existingAircraft.forEach(aircraft => {
      console.log(`   - ${aircraft.callSign} (${aircraft.icaoReferenceType?.typeDesignator || 'N/A'})`);
    });
    
    // Generate recommendations
    console.log('\n💡 Recommendations:');
    
    if (missingPilots.size > 0) {
      console.log(`1. Add ${missingPilots.size} missing pilots to the database`);
      console.log('   - Use the "Users Import" feature in Settings');
      console.log('   - Or manually add them through the Users management');
    }
    
    if (missingAircraft.size > 0) {
      console.log(`2. Add ${missingAircraft.size} missing aircraft to the database`);
      console.log('   - Use the Fleet Management to add aircraft');
      console.log('   - Or use the "Fleet Import" feature in Settings');
    }
    
    if (missingInstructors.size > 0) {
      console.log(`3. Add ${missingInstructors.size} missing instructors to the database`);
      console.log('   - Use the "Users Import" feature in Settings');
      console.log('   - Assign the INSTRUCTOR role to existing users');
    }
    
    if (validRows.length > 0) {
      console.log(`4. You can import ${validRows.length} valid rows immediately`);
    }
    
    if (invalidRows.length > 0) {
      console.log(`5. Fix ${invalidRows.length} invalid rows before importing`);
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      csvFile: csvPath,
      totalRows: lines.length - 1,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      missingPilots: Array.from(missingPilots),
      missingAircraft: Array.from(missingAircraft),
      missingInstructors: Array.from(missingInstructors),
      invalidRowDetails: invalidRows.slice(0, 50), // Limit to first 50
      existingPilots: existingPilots.length,
      existingAircraft: existingAircraft.length,
      existingInstructors: existingInstructors.length
    };
    
    fs.writeFileSync('flight-logs-import-analysis.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: flight-logs-import-analysis.json');
    
  } catch (error) {
    console.error('❌ Error analyzing flight logs import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeFlightLogsImport(); 