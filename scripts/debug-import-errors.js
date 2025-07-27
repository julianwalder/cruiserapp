const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();

async function debugImportErrors() {
  console.log('🔍 Debugging import errors...');

  try {
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`📊 Total records: ${records.length}`);

    // Test a few records that would be after the first 1440 (duplicates)
    const startIndex = 1440;
    const testCount = 5;
    
    for (let i = startIndex; i < startIndex + testCount && i < records.length; i++) {
      const rowData = records[i];
      console.log(`\n🔍 Testing row ${i + 1}:`);
      console.log(`   Date: ${rowData.date}`);
      console.log(`   Pilot: ${rowData.pilot_email}`);
      console.log(`   Aircraft: ${rowData.aircraft_callsign}`);
      console.log(`   Departure: ${rowData.departure_airfield_code}`);
      console.log(`   Arrival: ${rowData.arrival_airfield_code}`);
      console.log(`   Departure Time: ${rowData.departure_time}`);
      console.log(`   Arrival Time: ${rowData.arrival_time}`);

      // Validate required fields
      const requiredFields = ['date', 'pilot_email', 'aircraft_callsign', 'departure_airfield_code', 'arrival_airfield_code', 'departure_time', 'arrival_time'];
      const missingFields = requiredFields.filter(field => !rowData[field]);
      if (missingFields.length > 0) {
        console.log(`   ❌ Missing required fields:`, missingFields);
        continue;
      } else {
        console.log(`   ✅ Required fields present`);
      }

      // Find pilot by email
      const pilot = await prisma.user.findFirst({
        where: { email: rowData.pilot_email }
      });
      if (pilot) {
        console.log(`   ✅ Pilot found: ${pilot.firstName} ${pilot.lastName}`);
      } else {
        console.log(`   ❌ Pilot with email ${rowData.pilot_email} not found`);
      }

      // Find aircraft by call sign
      const aircraft = await prisma.aircraft.findFirst({
        where: { callSign: rowData.aircraft_callsign }
      });
      if (aircraft) {
        console.log(`   ✅ Aircraft found: ${aircraft.callSign}`);
      } else {
        console.log(`   ❌ Aircraft with call sign ${rowData.aircraft_callsign} not found`);
      }

      // Find departure airfield by code
      const departureAirfield = await prisma.airfield.findFirst({
        where: { code: rowData.departure_airfield_code }
      });
      if (departureAirfield) {
        console.log(`   ✅ Departure airfield found: ${departureAirfield.name}`);
      } else {
        console.log(`   ❌ Departure airfield with code ${rowData.departure_airfield_code} not found`);
      }

      // Find arrival airfield by code
      const arrivalAirfield = await prisma.airfield.findFirst({
        where: { code: rowData.arrival_airfield_code }
      });
      if (arrivalAirfield) {
        console.log(`   ✅ Arrival airfield found: ${arrivalAirfield.name}`);
      } else {
        console.log(`   ❌ Arrival airfield with code ${rowData.arrival_airfield_code} not found`);
      }

      // Find instructor by email (optional)
      let instructor = null;
      if (rowData.instructor_email) {
        instructor = await prisma.user.findFirst({
          where: { email: rowData.instructor_email },
          include: { userRoles: { include: { role: true } } }
        });
        if (instructor) {
          console.log(`   ✅ Instructor found: ${instructor.firstName} ${instructor.lastName}`);
        } else {
          console.log(`   ❌ Instructor with email ${rowData.instructor_email} not found`);
        }
      }

      // Check for existing flight log to prevent duplicates
      if (pilot && aircraft && departureAirfield && arrivalAirfield) {
        const existingFlightLog = await prisma.flightLog.findFirst({
          where: {
            date: new Date(rowData.date),
            pilotId: pilot.id,
            aircraftId: aircraft.id,
            departureTime: rowData.departure_time,
            arrivalTime: rowData.arrival_time,
            departureAirfieldId: departureAirfield.id,
            arrivalAirfieldId: arrivalAirfield.id,
          }
        });

        if (existingFlightLog) {
          console.log(`   ⚠️  Duplicate flight found - would be skipped`);
        } else {
          console.log(`   ✅ No duplicate flight found - would be imported`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugImportErrors(); 