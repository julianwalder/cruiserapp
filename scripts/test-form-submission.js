const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFormSubmission() {
  try {
    console.log('🧪 Testing Form Submission...\n');

    // Get test data
    const users = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'PILOT'
            }
          }
        }
      },
      take: 1
    });

    const aircraft = await prisma.aircraft.findMany({
      take: 1
    });

    const airfields = await prisma.airfield.findMany({
      take: 2
    });

    if (!users.length || !aircraft.length || airfields.length < 2) {
      console.log('❌ Need at least 1 pilot, 1 aircraft, and 2 airfields to test');
      return;
    }

    const pilot = users[0];
    const selectedAircraft = aircraft[0];
    const departureAirfield = airfields[0];
    const arrivalAirfield = airfields[1];

    console.log('📋 Test Data:');
    console.log(`Pilot: ${pilot.firstName} ${pilot.lastName}`);
    console.log(`Aircraft: ${selectedAircraft.callSign}`);
    console.log(`Departure: ${departureAirfield.name}`);
    console.log(`Arrival: ${arrivalAirfield.name}`);
    console.log('');

    // Simulate form data that would be submitted
    const formData = {
      aircraftId: selectedAircraft.id,
      pilotId: pilot.id,
      instructorId: null,
      date: '2024-07-24',
      departureTime: '10:30',
      arrivalTime: '12:45',
      departureAirfieldId: departureAirfield.id,
      arrivalAirfieldId: arrivalAirfield.id,
      flightType: 'TRAINING',
      purpose: 'Test flight with simplified inputs',
      remarks: 'Testing the new simplified time and Hobbs inputs',
      // Jeppesen time breakdown
      pilotInCommand: 2.25,
      secondInCommand: 0,
      dualReceived: 0,
      dualGiven: 0,
      solo: 2.25,
      crossCountry: 1.5,
      night: 0,
      instrument: 0,
      actualInstrument: 0,
      simulatedInstrument: 0,
      // Landings
      dayLandings: 2,
      nightLandings: 0,
      // Hobbs readings
      departureHobbs: 3456.7,
      arrivalHobbs: 3459.0,
      // Fuel and oil information
      oilAdded: 0,
      fuelAdded: 60,
      // Additional information
      route: 'Test route with simplified inputs',
      conditions: 'VFR',
    };

    console.log('📤 Simulated Form Data:');
    console.log(JSON.stringify(formData, null, 2));
    console.log('');

    // Calculate total hours
    const calculateFlightHours = (departureTime, arrivalTime) => {
      const departure = new Date(`2000-01-01T${departureTime}`);
      const arrival = new Date(`2000-01-01T${arrivalTime}`);
      const diffMs = arrival.getTime() - departure.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHours);
    };

    const totalHours = calculateFlightHours(formData.departureTime, formData.arrivalTime);
    console.log(`⏱️ Calculated Total Hours: ${totalHours}`);

    // Create flight log
    const flightLog = await prisma.flightLog.create({
      data: {
        ...formData,
        date: new Date(formData.date),
        totalHours: totalHours,
        createdById: pilot.id,
      },
      include: {
        aircraft: {
          include: {
            icaoReferenceType: true,
          },
        },
        pilot: true,
        departureAirfield: true,
        arrivalAirfield: true,
      },
    });

    console.log('✅ Flight Log Created Successfully!');
    console.log('📊 Verification:');
    console.log(`✅ ID: ${flightLog.id}`);
    console.log(`✅ Date: ${flightLog.date.toDateString()}`);
    console.log(`✅ Times: ${flightLog.departureTime} - ${flightLog.arrivalTime}`);
    console.log(`✅ Hobbs: ${flightLog.departureHobbs} - ${flightLog.arrivalHobbs}`);
    console.log(`✅ Total Hours: ${flightLog.totalHours}`);
    console.log(`✅ Purpose: ${flightLog.purpose}`);
    console.log(`✅ Aircraft: ${flightLog.aircraft.callSign}`);
    console.log(`✅ Pilot: ${flightLog.pilot.firstName} ${flightLog.pilot.lastName}`);
    console.log(`✅ Route: ${flightLog.departureAirfield.code} → ${flightLog.arrivalAirfield.code}`);

    // Show total count
    const totalFlightLogs = await prisma.flightLog.count();
    console.log(`\n📈 Total Flight Logs in Database: ${totalFlightLogs}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFormSubmission(); 