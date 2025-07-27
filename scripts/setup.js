#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up Cruiser Aviation Management System...\n');

  try {
    // Check if super admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN',
      },
    });

    if (existingAdmin) {
      console.log('✅ Super admin already exists');
      return;
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const superAdmin = await prisma.user.create({
      data: {
        email: 'admin@flightschool.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        phone: '+1234567890',
        address: '123 Cruiser Aviation Way',
        city: 'Aviation City',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        licenseNumber: 'SUPER-ADMIN-001',
        medicalClass: 'Class 1',
        totalFlightHours: 0,
      },
    });

    console.log('✅ Super admin created successfully!');
    console.log('📧 Email: admin@flightschool.com');
    console.log('🔑 Password: admin123');
    console.log('\n⚠️  Please change the password after first login!\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 