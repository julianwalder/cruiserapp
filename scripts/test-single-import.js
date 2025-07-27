const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();

async function testSingleImport() {
  console.log('🧪 Testing single record import...');

  try {
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Test record 1441 (first non-duplicate)
    const rowData = records[1440]; // 0-indexed
    console.log(`📋 Testing record 1441:`);
    console.log(`   Date: ${rowData.date}`);
    console.log(`   Pilot: ${rowData.pilot_email}`);
    console.log(`   Aircraft: ${rowData.aircraft_callsign}`);
    console.log(`   Departure: ${rowData.departure_airfield_code}`);
    console.log(`   Arrival: ${rowData.arrival_airfield_code}`);
    console.log(`   Departure Time: ${rowData.departure_time}`);
    console.log(`   Arrival Time: ${rowData.arrival_time}`);

    // Find pilot
    const pilot = await prisma.user.findFirst({
      where: { email: rowData.pilot_email }
    });
    console.log(`   Pilot found: ${pilot ? 'Yes' : 'No'}`);

    // Find aircraft
    const aircraft = await prisma.aircraft.findFirst({
      where: { callSign: rowData.aircraft_callsign }
    });
    console.log(`   Aircraft found: ${aircraft ? 'Yes' : 'No'}`);

    // Find departure airfield
    const departureAirfield = await prisma.airfield.findFirst({
      where: { code: rowData.departure_airfield_code }
    });
    console.log(`   Departure airfield found: ${departureAirfield ? 'Yes' : 'No'}`);

    // Find arrival airfield
    const arrivalAirfield = await prisma.airfield.findFirst({
      where: { code: rowData.arrival_airfield_code }
    });
    console.log(`   Arrival airfield found: ${arrivalAirfield ? 'Yes' : 'No'}`);

    // Find instructor (optional)
    let instructor = null;
    if (rowData.instructor_email) {
      instructor = await prisma.user.findFirst({
        where: { email: rowData.instructor_email },
        include: { userRoles: { include: { role: true } } }
      });
      console.log(`   Instructor found: ${instructor ? 'Yes' : 'No'}`);
    }

    // Calculate total flight time
    const departureTime = new Date(`2000-01-01T${rowData.departure_time}:00`);
    const arrivalTime = new Date(`2000-01-01T${rowData.arrival_time}:00`);
    const totalHours = (arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
    console.log(`   Total hours: ${totalHours}`);

    // Calculate time fields automatically
    const hasInstructor = !!instructor;
    const isCrossCountry = departureAirfield.code !== arrivalAirfield.code;
    
    let pilotInCommand = 0;
    let secondInCommand = 0;
    let dualReceived = 0;
    let dualGiven = 0;
    let solo = 0;
    let crossCountry = 0;
    let night = 0;
    let instrument = 0;
    let actualInstrument = 0;
    let simulatedInstrument = 0;

    if (hasInstructor) {
      dualReceived = totalHours;
      dualGiven = totalHours;
    } else {
      pilotInCommand = totalHours;
      solo = totalHours;
    }

    if (isCrossCountry) {
      crossCountry = totalHours;
    }

    // Try to create the flight log
    console.log('\n🚀 Attempting to create flight log...');
    
    try {
      const flightLog = await prisma.flightLog.create({
        data: {
          date: new Date(rowData.date),
          pilotId: pilot.id,
          instructorId: instructor?.id,
          aircraftId: aircraft.id,
          departureAirfieldId: departureAirfield.id,
          arrivalAirfieldId: arrivalAirfield.id,
          departureTime: rowData.departure_time,
          arrivalTime: rowData.arrival_time,
          departureHobbs: rowData.departure_hobbs ? parseFloat(rowData.departure_hobbs) : null,
          arrivalHobbs: rowData.arrival_hobbs ? parseFloat(rowData.arrival_hobbs) : null,
          flightType: (rowData.flight_type || 'SCHOOL').toUpperCase(),
          purpose: rowData.purpose || null,
          remarks: rowData.remarks || null,
          totalHours: Math.max(0, totalHours),
          pilotInCommand,
          secondInCommand,
          dualReceived,
          dualGiven,
          solo,
          crossCountry,
          night,
          instrument,
          actualInstrument,
          simulatedInstrument,
          dayLandings: rowData.day_landings ? parseInt(rowData.day_landings) : 0,
          nightLandings: rowData.night_landings ? parseInt(rowData.night_landings) : 0,
          route: rowData.route || null,
          conditions: rowData.conditions || null,
          oilAdded: rowData.oil_added ? parseInt(rowData.oil_added) : 0,
          fuelAdded: rowData.fuel_added ? parseInt(rowData.fuel_added) : 0,
          createdById: pilot.id, // Use pilot as creator for test
        }
      });

      console.log('✅ Flight log created successfully!');
      console.log(`   ID: ${flightLog.id}`);
      
      // Clean up - delete the test record
      await prisma.flightLog.delete({
        where: { id: flightLog.id }
      });
      console.log('🧹 Test record cleaned up');

    } catch (error) {
      console.error('❌ Error creating flight log:', error.message);
      console.error('Full error:', error);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleImport(); 