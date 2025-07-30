#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL environment variable is required');
  console.error('Please check your .env.local file');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🚀 Setting up Cruiser Aviation Management System...\n');

  try {
    // Check if super admin already exists
    const { data: existingAdmin, error: adminError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles!user_roles_userId_fkey (
          roles (
            name
          )
        )
      `)
      .eq('email', 'admin@cruiserapp.com')
      .single();

    if (adminError && adminError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing admin:', adminError);
      return;
    }

    if (existingAdmin && existingAdmin.user_roles.some(ur => ur.roles.name === 'SUPER_ADMIN')) {
      console.log('✅ Super admin already exists');
      return;
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const now = new Date().toISOString();
    const { data: superAdmin, error: createError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        email: 'admin@cruiserapp.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
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
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating super admin:', createError);
      return;
    }

    // Get SUPER_ADMIN role
    const { data: superAdminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'SUPER_ADMIN')
      .single();

    if (roleError) {
      console.error('❌ Error finding SUPER_ADMIN role:', roleError);
      return;
    }

    // Assign SUPER_ADMIN role to user
    const { error: userRoleError } = await supabase
      .from('user_roles')
      .insert({
        id: crypto.randomUUID(),
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      });

    if (userRoleError) {
      console.error('❌ Error assigning role to user:', userRoleError);
      return;
    }

    console.log('✅ Super admin created successfully!');
    console.log('📧 Email: admin@cruiserapp.com');
    console.log('🔑 Password: admin123');
    console.log('\n🚀 Setup complete! You can now log in to the application.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

main(); 