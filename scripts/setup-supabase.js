const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupSupabaseDatabase() {
  try {
    console.log('🚀 Setting up Supabase database for production...');

    // Test database connection
    console.log('🔗 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Run migrations
    console.log('📦 Running database migrations...');
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Check if roles already exist
    const existingRoles = await prisma.role.findMany();
    
    if (existingRoles.length === 0) {
      console.log('🌱 Creating initial roles...');
      
      // Create roles
      const roles = [
        { name: 'SUPER_ADMIN', description: 'Super Administrator' },
        { name: 'ADMIN', description: 'Administrator' },
        { name: 'BASE_MANAGER', description: 'Base Manager' },
        { name: 'INSTRUCTOR', description: 'Flight Instructor' },
        { name: 'PILOT', description: 'Pilot' },
        { name: 'STUDENT', description: 'Student Pilot' }
      ];

      for (const role of roles) {
        await prisma.role.create({
          data: role
        });
      }
      console.log('✅ Roles created successfully!');
    } else {
      console.log('ℹ️  Roles already exist, skipping...');
    }

    // Check if super admin user exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        email: 'admin@cruiseraviation.ro'
      }
    });

    if (!existingAdmin) {
      console.log('👤 Creating super admin user...');
      
      // Create super admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const superAdmin = await prisma.user.create({
        data: {
          email: 'admin@cruiseraviation.ro',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          status: 'ACTIVE',
          userRoles: {
            create: {
              role: {
                connect: {
                  name: 'SUPER_ADMIN'
                }
              }
            }
          }
        }
      });

      console.log('✅ Super admin user created successfully!');
      console.log(`👤 Email: ${superAdmin.email}`);
      console.log('🔑 Default password: admin123');
    } else {
      console.log('ℹ️  Super admin user already exists, skipping...');
    }

    // Display database stats
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    const flightLogCount = await prisma.flightLog.count();
    const aircraftCount = await prisma.aircraft.count();
    const airfieldCount = await prisma.airfield.count();

    console.log('\n📊 Database Statistics:');
    console.log(`👥 Users: ${userCount}`);
    console.log(`🎭 Roles: ${roleCount}`);
    console.log(`✈️  Flight Logs: ${flightLogCount}`);
    console.log(`🛩️  Aircraft: ${aircraftCount}`);
    console.log(`🏢 Airfields: ${airfieldCount}`);

    console.log('\n✅ Supabase database setup completed successfully!');
    console.log('⚠️  Important: Change the admin password after first login!');

  } catch (error) {
    console.error('❌ Error setting up Supabase database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable must be set');
    console.error('Please set your Supabase database URL in .env.production');
    process.exit(1);
  }

  setupSupabaseDatabase();
}

module.exports = { setupSupabaseDatabase }; 