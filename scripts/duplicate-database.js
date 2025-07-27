const { PrismaClient } = require('@prisma/client');

// Development database (source)
const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Your development database
    }
  }
});

// Production database (target)
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PROD_DATABASE_URL // Your production database
    }
  }
});

async function duplicateDatabase() {
  try {
    console.log('🚀 Starting database duplication...');

    // 1. Export data from development database
    console.log('📤 Exporting data from development database...');
    
    const users = await devPrisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    const roles = await devPrisma.role.findMany();
    const airfields = await devPrisma.airfield.findMany();
    const aircraft = await devPrisma.aircraft.findMany({
      include: {
        icaoReferenceType: true
      }
    });
    const flightLogs = await devPrisma.flightLog.findMany({
      include: {
        aircraft: true,
        pilot: true,
        instructor: true,
        departureAirfield: true,
        arrivalAirfield: true
      }
    });

    console.log(`📊 Exported: ${users.length} users, ${roles.length} roles, ${airfields.length} airfields, ${aircraft.length} aircraft, ${flightLogs.length} flight logs`);

    // 2. Clear production database
    console.log('🧹 Clearing production database...');
    await prodPrisma.flightLog.deleteMany();
    await prodPrisma.aircraft.deleteMany();
    await prodPrisma.airfield.deleteMany();
    await prodPrisma.userRole.deleteMany();
    await prodPrisma.user.deleteMany();
    await prodPrisma.role.deleteMany();
    await prodPrisma.icaoReferenceType.deleteMany();

    // 3. Import data to production database
    console.log('📥 Importing data to production database...');

    // Import roles
    for (const role of roles) {
      await prodPrisma.role.create({
        data: role
      });
    }

    // Import users (without passwords for security)
    for (const user of users) {
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        personalNumber: user.personalNumber,
        phoneNumber: user.phoneNumber,
        status: user.status,
        totalFlightHours: user.totalFlightHours,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Don't copy password - will be reset
        password: '$2a$12$default.hash.for.production'
      };

      const newUser = await prodPrisma.user.create({
        data: userData
      });

      // Import user roles
      for (const userRole of user.userRoles) {
        await prodPrisma.userRole.create({
          data: {
            userId: newUser.id,
            roleId: userRole.roleId
          }
        });
      }
    }

    // Import ICAO reference types
    for (const icaoType of aircraft.map(a => a.icaoReferenceType).filter(Boolean)) {
      await prodPrisma.icaoReferenceType.create({
        data: icaoType
      });
    }

    // Import airfields
    for (const airfield of airfields) {
      await prodPrisma.airfield.create({
        data: airfield
      });
    }

    // Import aircraft
    for (const aircraftItem of aircraft) {
      await prodPrisma.aircraft.create({
        data: {
          ...aircraftItem,
          icaoReferenceTypeId: aircraftItem.icaoReferenceTypeId
        }
      });
    }

    // Import flight logs
    for (const flightLog of flightLogs) {
      await prodPrisma.flightLog.create({
        data: {
          ...flightLog,
          aircraftId: flightLog.aircraftId,
          pilotId: flightLog.pilotId,
          instructorId: flightLog.instructorId,
          departureAirfieldId: flightLog.departureAirfieldId,
          arrivalAirfieldId: flightLog.arrivalAirfieldId
        }
      });
    }

    console.log('✅ Database duplication completed successfully!');
    console.log('⚠️  Important: All user passwords have been reset to default.');
    console.log('🔑 Users will need to reset their passwords on first login.');

  } catch (error) {
    console.error('❌ Error duplicating database:', error);
    throw error;
  } finally {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

if (require.main === module) {
  // Check if environment variables are set
  if (!process.env.DATABASE_URL || !process.env.PROD_DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL and PROD_DATABASE_URL environment variables must be set');
    process.exit(1);
  }

  duplicateDatabase();
}

module.exports = { duplicateDatabase }; 