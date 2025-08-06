#!/usr/bin/env node

/**
 * Veriff Webhook Setup Script
 * 
 * This script helps set up the enhanced Veriff webhook system by:
 * 1. Running the database schema updates
 * 2. Verifying the installation
 * 3. Testing the webhook endpoints
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runSchemaUpdate() {
  console.log('🔧 Running enhanced Veriff webhook schema update...');
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'enhance-veriff-webhook-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema update
    const { error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('❌ Error running schema update:', error);
      return false;
    }
    
    console.log('✅ Schema update completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error reading or executing schema file:', error);
    return false;
  }
}

async function verifySchema() {
  console.log('🔍 Verifying schema changes...');
  
  try {
    // Check for new columns
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users')
      .like('column_name', 'veriff%')
      .order('column_name');
    
    if (error) {
      console.error('❌ Error checking schema:', error);
      return false;
    }
    
    const expectedColumns = [
      'veriffWebhookData',
      'veriffWebhookReceivedAt',
      'veriffWebhookSignature',
      'veriffPersonGivenName',
      'veriffPersonLastName',
      'veriffPersonIdNumber',
      'veriffPersonDateOfBirth',
      'veriffPersonNationality',
      'veriffPersonGender',
      'veriffPersonCountry',
      'veriffDocumentType',
      'veriffDocumentNumber',
      'veriffDocumentCountry',
      'veriffDocumentValidFrom',
      'veriffDocumentValidUntil',
      'veriffDocumentIssuedBy',
      'veriffFaceMatchSimilarity',
      'veriffFaceMatchStatus',
      'veriffDecisionScore',
      'veriffQualityScore',
      'veriffFlags',
      'veriffContext',
      'veriffVerificationId',
      'veriffAttemptId',
      'veriffFeature',
      'veriffCode',
      'veriffReason',
      'veriffCreatedAt',
      'veriffUpdatedAt',
      'veriffSubmittedAt',
      'veriffApprovedAt',
      'veriffDeclinedAt'
    ];
    
    const foundColumns = columns.map(col => col.column_name);
    const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns);
      return false;
    }
    
    console.log(`✅ All ${expectedColumns.length} expected columns found`);
    console.log('📋 Found columns:', foundColumns);
    return true;
  } catch (error) {
    console.error('❌ Error verifying schema:', error);
    return false;
  }
}

async function checkIndexes() {
  console.log('🔍 Checking database indexes...');
  
  try {
    const { data: indexes, error } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .like('tablename', 'users')
      .like('indexname', 'idx_users_veriff%');
    
    if (error) {
      console.error('❌ Error checking indexes:', error);
      return false;
    }
    
    const expectedIndexes = [
      'idx_users_veriff_session_id',
      'idx_users_veriff_verification_id',
      'idx_users_veriff_webhook_received_at',
      'idx_users_veriff_status',
      'idx_users_identity_verified',
      'idx_users_identity_verified_at'
    ];
    
    const foundIndexes = indexes.map(idx => idx.indexname);
    const missingIndexes = expectedIndexes.filter(idx => !foundIndexes.includes(idx));
    
    if (missingIndexes.length > 0) {
      console.warn('⚠️  Missing indexes:', missingIndexes);
      console.warn('   This is not critical but may affect performance');
    } else {
      console.log('✅ All expected indexes found');
    }
    
    console.log('📋 Found indexes:', foundIndexes);
    return true;
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
    return false;
  }
}

async function checkTriggers() {
  console.log('🔍 Checking database triggers...');
  
  try {
    const { data: triggers, error } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_statement')
      .eq('event_object_table', 'users')
      .like('trigger_name', '%veriff%');
    
    if (error) {
      console.error('❌ Error checking triggers:', error);
      return false;
    }
    
    const foundTriggers = triggers.map(t => t.trigger_name);
    
    if (foundTriggers.includes('trigger_update_veriff_timestamps')) {
      console.log('✅ Veriff timestamp trigger found');
    } else {
      console.warn('⚠️  Veriff timestamp trigger not found');
      console.warn('   Timestamps will not be automatically updated');
    }
    
    console.log('📋 Found triggers:', foundTriggers);
    return true;
  } catch (error) {
    console.error('❌ Error checking triggers:', error);
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  const requiredVars = [
    'VERIFF_API_KEY',
    'VERIFF_API_SECRET',
    'VERIFF_BASE_URL',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  const optionalVars = [
    'VERIFF_WEBHOOK_SECRET',
    'VERIFF_ENVIRONMENT'
  ];
  
  const missing = [];
  const present = [];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  }
  
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      present.push(varName + ' (optional)');
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('   Please add these to your .env.local file');
    return false;
  }
  
  console.log('✅ All required environment variables found');
  console.log('📋 Present variables:', present);
  
  if (!process.env.VERIFF_WEBHOOK_SECRET) {
    console.warn('⚠️  VERIFF_WEBHOOK_SECRET not set');
    console.warn('   Webhook signature validation will be disabled');
  }
  
  return true;
}

async function main() {
  console.log('🚀 Veriff Webhook System Setup');
  console.log('================================\n');
  
  // Check environment variables first
  const envOk = await testEnvironmentVariables();
  if (!envOk) {
    console.log('\n❌ Environment check failed. Please fix the issues above.');
    process.exit(1);
  }
  
  // Run schema update
  const schemaOk = await runSchemaUpdate();
  if (!schemaOk) {
    console.log('\n❌ Schema update failed. Please check the errors above.');
    process.exit(1);
  }
  
  // Verify schema
  const verifyOk = await verifySchema();
  if (!verifyOk) {
    console.log('\n❌ Schema verification failed. Please check the errors above.');
    process.exit(1);
  }
  
  // Check indexes
  await checkIndexes();
  
  // Check triggers
  await checkTriggers();
  
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Configure your Veriff dashboard webhook URL:');
  console.log(`   ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/veriff/callback`);
  console.log('2. Set the webhook secret in Veriff dashboard (if using VERIFF_WEBHOOK_SECRET)');
  console.log('3. Test the webhook system using the test endpoint');
  console.log('4. Monitor webhook processing in your application logs');
  console.log('\n📚 For more information, see: VERIFF_WEBHOOK_SETUP.md');
}

// Run the setup
main().catch(error => {
  console.error('❌ Setup failed with error:', error);
  process.exit(1);
}); 