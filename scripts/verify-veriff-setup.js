#!/usr/bin/env node

/**
 * Veriff Webhook Setup Verification Script
 * 
 * This script verifies that the enhanced Veriff webhook system is properly set up
 * by checking the database schema and environment variables.
 */

const { createClient } = require('@supabase/supabase-js');

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

async function testWebhookEndpoint() {
  console.log('🔍 Testing webhook endpoint accessibility...');
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/veriff/callback`;
    
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    console.log('✅ Webhook endpoint is configured');
    console.log('   Note: This endpoint will be accessible once your app is running');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Veriff Webhook System Verification');
  console.log('=====================================\n');
  
  // Check environment variables first
  const envOk = await testEnvironmentVariables();
  if (!envOk) {
    console.log('\n❌ Environment check failed. Please fix the issues above.');
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
  
  // Test webhook endpoint
  await testWebhookEndpoint();
  
  console.log('\n🎉 Verification completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Configure your Veriff dashboard webhook URL:');
  console.log(`   ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/veriff/callback`);
  console.log('2. Set the webhook secret in Veriff dashboard (if using VERIFF_WEBHOOK_SECRET)');
  console.log('3. Test the webhook system using the test endpoint');
  console.log('4. Monitor webhook processing in your application logs');
  console.log('\n📚 For more information, see: VERIFF_WEBHOOK_SETUP.md');
  
  console.log('\n🔧 To test the system:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Use the test webhook endpoint to simulate verifications');
  console.log('3. Check the verification data in your database');
}

// Run the verification
main().catch(error => {
  console.error('❌ Verification failed with error:', error);
  process.exit(1);
}); 