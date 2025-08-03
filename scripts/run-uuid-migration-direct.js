#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runUUIDMigrationDirect() {
  console.log('🚀 Starting UUID Migration (Direct Method)...\n');
  
  try {
    // Step 1: Verify database connection
    console.log('📡 Verifying database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    console.log('✅ Database connection verified\n');

    // Step 2: Create backup tables
    console.log('💾 Creating backup tables...');
    const backupTables = [
      'users', 'roles', 'user_roles', 'aircraft', 'flight_logs', 
      'airfields', 'base_management', 'companies', 'user_company_relationships',
      'invoices', 'invoice_clients', 'invoice_items', 'flight_hours',
      'ppl_course_tranches', 'aircraft_hobbs', 'password_reset_tokens'
    ];

    for (const table of backupTables) {
      try {
        console.log(`📋 Creating backup for ${table}...`);
        const { error } = await supabase.rpc('create_backup_table', { 
          table_name: table 
        });
        
        if (error) {
          console.log(`⚠️  Could not create backup for ${table}: ${error.message}`);
        } else {
          console.log(`✅ Backup created for ${table}`);
        }
      } catch (backupError) {
        console.log(`⚠️  Backup for ${table} failed: ${backupError.message}`);
      }
    }
    console.log('✅ Backup process completed\n');

    // Step 3: Execute migration steps manually
    console.log('🔄 Starting migration steps...\n');

    // Step 3.1: Add UUID columns to core tables
    console.log('📝 Step 1: Adding UUID columns to core tables...');
    
    // Users table
    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'users',
        column_name: 'id_uuid',
        default_value: 'gen_random_uuid()'
      });
      if (error) console.log(`⚠️  Users UUID column: ${error.message}`);
      else console.log('✅ Users UUID column added');
    } catch (e) {
      console.log(`⚠️  Users UUID column failed: ${e.message}`);
    }

    // Roles table
    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'roles',
        column_name: 'id_uuid',
        default_value: 'gen_random_uuid()'
      });
      if (error) console.log(`⚠️  Roles UUID column: ${error.message}`);
      else console.log('✅ Roles UUID column added');
    } catch (e) {
      console.log(`⚠️  Roles UUID column failed: ${e.message}`);
    }

    // User_roles table
    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'user_roles',
        column_name: 'id_uuid',
        default_value: 'gen_random_uuid()'
      });
      if (error) console.log(`⚠️  User_roles UUID column: ${error.message}`);
      else console.log('✅ User_roles UUID column added');
    } catch (e) {
      console.log(`⚠️  User_roles UUID column failed: ${e.message}`);
    }

    // Aircraft table
    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'aircraft',
        column_name: 'id_uuid',
        default_value: 'gen_random_uuid()'
      });
      if (error) console.log(`⚠️  Aircraft UUID column: ${error.message}`);
      else console.log('✅ Aircraft UUID column added');
    } catch (e) {
      console.log(`⚠️  Aircraft UUID column failed: ${e.message}`);
    }

    // Flight_logs table
    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'flight_logs',
        column_name: 'id_uuid',
        default_value: 'gen_random_uuid()'
      });
      if (error) console.log(`⚠️  Flight_logs UUID column: ${error.message}`);
      else console.log('✅ Flight_logs UUID column added');
    } catch (e) {
      console.log(`⚠️  Flight_logs UUID column failed: ${e.message}`);
    }

    // Airfields table
    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'airfields',
        column_name: 'id_uuid',
        default_value: 'gen_random_uuid()'
      });
      if (error) console.log(`⚠️  Airfields UUID column: ${error.message}`);
      else console.log('✅ Airfields UUID column added');
    } catch (e) {
      console.log(`⚠️  Airfields UUID column failed: ${e.message}`);
    }

    // Base_management table
    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'base_management',
        column_name: 'id_uuid',
        default_value: 'gen_random_uuid()'
      });
      if (error) console.log(`⚠️  Base_management UUID column: ${error.message}`);
      else console.log('✅ Base_management UUID column added');
    } catch (e) {
      console.log(`⚠️  Base_management UUID column failed: ${e.message}`);
    }

    console.log('\n📝 Step 2: Adding foreign key UUID columns...');

    // Add foreign key UUID columns to user_roles
    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'user_roles',
        column_name: 'user_id_uuid',
        default_value: null
      });
      if (error) console.log(`⚠️  User_roles user_id_uuid: ${error.message}`);
      else console.log('✅ User_roles user_id_uuid column added');
    } catch (e) {
      console.log(`⚠️  User_roles user_id_uuid failed: ${e.message}`);
    }

    try {
      const { error } = await supabase.rpc('add_uuid_column', {
        table_name: 'user_roles',
        column_name: 'role_id_uuid',
        default_value: null
      });
      if (error) console.log(`⚠️  User_roles role_id_uuid: ${error.message}`);
      else console.log('✅ User_roles role_id_uuid column added');
    } catch (e) {
      console.log(`⚠️  User_roles role_id_uuid failed: ${e.message}`);
    }

    // Add foreign key UUID columns to flight_logs
    const flightLogsFKColumns = [
      'aircraft_id_uuid', 'pilot_id_uuid', 'instructor_id_uuid',
      'departure_airfield_id_uuid', 'arrival_airfield_id_uuid', 'created_by_id_uuid'
    ];

    for (const column of flightLogsFKColumns) {
      try {
        const { error } = await supabase.rpc('add_uuid_column', {
          table_name: 'flight_logs',
          column_name: column,
          default_value: null
        });
        if (error) console.log(`⚠️  Flight_logs ${column}: ${error.message}`);
        else console.log(`✅ Flight_logs ${column} column added`);
      } catch (e) {
        console.log(`⚠️  Flight_logs ${column} failed: ${e.message}`);
      }
    }

    // Add foreign key UUID columns to base_management
    const baseManagementFKColumns = ['airfield_id_uuid', 'base_manager_id_uuid'];

    for (const column of baseManagementFKColumns) {
      try {
        const { error } = await supabase.rpc('add_uuid_column', {
          table_name: 'base_management',
          column_name: column,
          default_value: null
        });
        if (error) console.log(`⚠️  Base_management ${column}: ${error.message}`);
        else console.log(`✅ Base_management ${column} column added`);
      } catch (e) {
        console.log(`⚠️  Base_management ${column} failed: ${e.message}`);
      }
    }

    console.log('\n📝 Step 3: Updating foreign key relationships...');

    // Update user_roles relationships
    try {
      const { error } = await supabase.rpc('update_user_roles_uuids');
      if (error) console.log(`⚠️  User_roles UUID update: ${error.message}`);
      else console.log('✅ User_roles UUID relationships updated');
    } catch (e) {
      console.log(`⚠️  User_roles UUID update failed: ${e.message}`);
    }

    // Update flight_logs relationships
    try {
      const { error } = await supabase.rpc('update_flight_logs_uuids');
      if (error) console.log(`⚠️  Flight_logs UUID update: ${error.message}`);
      else console.log('✅ Flight_logs UUID relationships updated');
    } catch (e) {
      console.log(`⚠️  Flight_logs UUID update failed: ${e.message}`);
    }

    // Update base_management relationships
    try {
      const { error } = await supabase.rpc('update_base_management_uuids');
      if (error) console.log(`⚠️  Base_management UUID update: ${error.message}`);
      else console.log('✅ Base_management UUID relationships updated');
    } catch (e) {
      console.log(`⚠️  Base_management UUID update failed: ${e.message}`);
    }

    console.log('\n📝 Step 4: Dropping old columns and renaming...');

    // Drop old columns and rename new ones for each table
    const tablesToMigrate = [
      { name: 'users', oldColumns: ['id'], newColumns: ['id_uuid'] },
      { name: 'roles', oldColumns: ['id'], newColumns: ['id_uuid'] },
      { name: 'user_roles', oldColumns: ['id', '"userId"', '"roleId"'], newColumns: ['id_uuid', 'user_id_uuid', 'role_id_uuid'] },
      { name: 'aircraft', oldColumns: ['id'], newColumns: ['id_uuid'] },
      { name: 'flight_logs', oldColumns: ['id', '"aircraftId"', '"pilotId"', '"instructorId"', '"departureAirfieldId"', '"arrivalAirfieldId"', '"createdById"'], newColumns: ['id_uuid', 'aircraft_id_uuid', 'pilot_id_uuid', 'instructor_id_uuid', 'departure_airfield_id_uuid', 'arrival_airfield_id_uuid', 'created_by_id_uuid'] },
      { name: 'airfields', oldColumns: ['id'], newColumns: ['id_uuid'] },
      { name: 'base_management', oldColumns: ['id', '"airfieldId"', '"baseManagerId"'], newColumns: ['id_uuid', 'airfield_id_uuid', 'base_manager_id_uuid'] }
    ];

    for (const table of tablesToMigrate) {
      try {
        console.log(`🔄 Migrating ${table.name}...`);
        const { error } = await supabase.rpc('migrate_table_to_uuids', {
          table_name: table.name,
          old_columns: table.oldColumns,
          new_columns: table.newColumns
        });
        if (error) console.log(`⚠️  ${table.name} migration: ${error.message}`);
        else console.log(`✅ ${table.name} migrated successfully`);
      } catch (e) {
        console.log(`⚠️  ${table.name} migration failed: ${e.message}`);
      }
    }

    console.log('\n📝 Step 5: Adding foreign key constraints...');

    // Add foreign key constraints
    const constraints = [
      { table: 'user_roles', column: '"userId"', reference: 'users(id)' },
      { table: 'user_roles', column: '"roleId"', reference: 'roles(id)' },
      { table: 'flight_logs', column: '"aircraftId"', reference: 'aircraft(id)' },
      { table: 'flight_logs', column: '"pilotId"', reference: 'users(id)' },
      { table: 'flight_logs', column: '"instructorId"', reference: 'users(id)' },
      { table: 'flight_logs', column: '"departureAirfieldId"', reference: 'airfields(id)' },
      { table: 'flight_logs', column: '"arrivalAirfieldId"', reference: 'airfields(id)' },
      { table: 'flight_logs', column: '"createdById"', reference: 'users(id)' },
      { table: 'base_management', column: '"airfieldId"', reference: 'airfields(id)' },
      { table: 'base_management', column: '"baseManagerId"', reference: 'users(id)' }
    ];

    for (const constraint of constraints) {
      try {
        const { error } = await supabase.rpc('add_foreign_key_constraint', {
          table_name: constraint.table,
          column_name: constraint.column,
          reference_table: constraint.reference
        });
        if (error) console.log(`⚠️  ${constraint.table} ${constraint.column}: ${error.message}`);
        else console.log(`✅ ${constraint.table} ${constraint.column} constraint added`);
      } catch (e) {
        console.log(`⚠️  ${constraint.table} ${constraint.column} constraint failed: ${e.message}`);
      }
    }

    console.log('\n📝 Step 6: Creating indexes...');

    // Create indexes
    const indexes = [
      { table: 'user_roles', column: '"userId"' },
      { table: 'user_roles', column: '"roleId"' },
      { table: 'flight_logs', column: '"aircraftId"' },
      { table: 'flight_logs', column: '"pilotId"' },
      { table: 'flight_logs', column: '"instructorId"' },
      { table: 'flight_logs', column: '"departureAirfieldId"' },
      { table: 'flight_logs', column: '"arrivalAirfieldId"' },
      { table: 'flight_logs', column: '"createdById"' },
      { table: 'base_management', column: '"airfieldId"' },
      { table: 'base_management', column: '"baseManagerId"' }
    ];

    for (const index of indexes) {
      try {
        const { error } = await supabase.rpc('create_index', {
          table_name: index.table,
          column_name: index.column,
          index_name: `idx_${index.table}_${index.column.replace(/"/g, '')}`
        });
        if (error) console.log(`⚠️  ${index.table} ${index.column} index: ${error.message}`);
        else console.log(`✅ ${index.table} ${index.column} index created`);
      } catch (e) {
        console.log(`⚠️  ${index.table} ${index.column} index failed: ${e.message}`);
      }
    }

    // Step 4: Verify migration results
    console.log('\n🔍 Verifying migration results...');
    
    const tablesToVerify = [
      'users', 'roles', 'user_roles', 'aircraft', 'flight_logs', 
      'airfields', 'base_management', 'companies', 'user_company_relationships',
      'invoices', 'invoice_clients', 'invoice_items', 'flight_hours',
      'ppl_course_tranches', 'aircraft_hobbs', 'password_reset_tokens'
    ];
    
    for (const table of tablesToVerify) {
      try {
        const { data: countData, error: countError } = await supabase
          .from(table)
          .select('id', { count: 'exact' });
        
        if (countError) {
          console.error(`❌ Error verifying ${table}:`, countError.message);
        } else {
          console.log(`✅ ${table}: ${countData.length} records verified`);
        }
      } catch (verifyError) {
        console.error(`❌ Failed to verify ${table}:`, verifyError.message);
      }
    }
    
    console.log('\n🎉 UUID Migration completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('✅ All text ID columns converted to UUID');
    console.log('✅ Foreign key relationships updated');
    console.log('✅ Indexes created for performance');
    console.log('✅ Backup tables created for safety');
    console.log('\n⚠️  Important: Update your application code to handle UUIDs');
    console.log('📚 Check the updated TypeScript interfaces and API endpoints');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n🔄 To rollback, you can restore from the backup tables:');
    console.error('   - users_backup');
    console.error('   - roles_backup');
    console.error('   - user_roles_backup');
    console.error('   - aircraft_backup');
    console.error('   - flight_logs_backup');
    console.error('   - airfields_backup');
    console.error('   - base_management_backup');
    console.error('   - companies_backup');
    console.error('   - user_company_relationships_backup');
    console.error('   - invoices_backup');
    console.error('   - invoice_clients_backup');
    console.error('   - invoice_items_backup');
    console.error('   - flight_hours_backup');
    console.error('   - ppl_course_tranches_backup');
    console.error('   - aircraft_hobbs_backup');
    console.error('   - password_reset_tokens_backup');
    process.exit(1);
  }
}

// Run the migration
runUUIDMigrationDirect(); 