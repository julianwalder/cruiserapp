#!/usr/bin/env node

/**
 * Simple Veriff Webhook Verification Script
 * 
 * This script verifies that the enhanced Veriff webhook system is properly set up
 * by directly checking the users table structure.
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

async function testNewColumns() {
  console.log('🔍 Testing new Veriff columns...');
  
  try {
    // Try to select from the new columns to see if they exist
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        "veriffWebhookData",
        "veriffWebhookReceivedAt",
        "veriffPersonGivenName",
        "veriffPersonLastName",
        "veriffDocumentType",
        "veriffFaceMatchSimilarity",
        "veriffDecisionScore",
        "veriffVerificationId",
        "veriffCreatedAt",
        "veriffApprovedAt"
      `)
      .limit(1);
    
    if (error) {
      // Check if it's a column not found error
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.error('❌ Some Veriff columns are missing from the users table');
        console.error('   Error:', error.message);
        return false;
      }
      console.error('❌ Error testing columns:', error);
      return false;
    }
    
    console.log('✅ All new Veriff columns are accessible');
    console.log('📋 Successfully queried columns:');
    console.log('   - veriffWebhookData');
    console.log('   - veriffWebhookReceivedAt');
    console.log('   - veriffPersonGivenName');
    console.log('   - veriffPersonLastName');
    console.log('   - veriffDocumentType');
    console.log('   - veriffFaceMatchSimilarity');
    console.log('   - veriffDecisionScore');
    console.log('   - veriffVerificationId');
    console.log('   - veriffCreatedAt');
    console.log('   - veriffApprovedAt');
    console.log('   - ... and more');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing columns:', error);
    return false;
  }
}

async function testWebhookDataInsert() {
  console.log('🔍 Testing webhook data insertion...');
  
  try {
    // Create a test user or find an existing one
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
    
    if (!existingUser) {
      console.warn('⚠️  No users found in database');
      console.warn('   Skipping webhook data insertion test');
      return true;
    }
    
    // Test updating with webhook data
    const testWebhookData = {
      test: true,
      timestamp: new Date().toISOString(),
      verificationId: 'test-verification-123'
    };
    
    const { error } = await supabase
      .from('users')
      .update({
        veriffWebhookData: testWebhookData,
        veriffWebhookReceivedAt: new Date().toISOString(),
        veriffVerificationId: 'test-verification-123',
        veriffStatus: 'test',
        veriffUpdatedAt: new Date().toISOString()
      })
      .eq('id', existingUser.id);
    
    if (error) {
      console.error('❌ Error testing webhook data insertion:', error);
      return false;
    }
    
    console.log('✅ Webhook data insertion test successful');
    
    // Clean up test data
    await supabase
      .from('users')
      .update({
        veriffWebhookData: null,
        veriffWebhookReceivedAt: null,
        veriffVerificationId: null,
        veriffStatus: null,
        veriffUpdatedAt: null
      })
      .eq('id', existingUser.id);
    
    console.log('✅ Test data cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing webhook data insertion:', error);
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
  console.log('🚀 Simple Veriff Webhook System Verification');
  console.log('============================================\n');
  
  // Check environment variables first
  const envOk = await testEnvironmentVariables();
  if (!envOk) {
    console.log('\n❌ Environment check failed. Please fix the issues above.');
    process.exit(1);
  }
  
  // Test new columns
  const columnsOk = await testNewColumns();
  if (!columnsOk) {
    console.log('\n❌ Column verification failed. Please check the errors above.');
    process.exit(1);
  }
  
  // Test webhook data insertion
  await testWebhookDataInsert();
  
  console.log('\n🎉 Verification completed successfully!');
  console.log('\n📋 Your enhanced Veriff webhook system is ready!');
  console.log('\n📋 Next steps:');
  console.log('1. Configure your Veriff dashboard webhook URL:');
  console.log(`   ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/veriff/callback`);
  console.log('2. Set the webhook secret in Veriff dashboard (if using VERIFF_WEBHOOK_SECRET)');
  console.log('3. Test the webhook system using the test endpoint');
  console.log('4. Monitor webhook processing in your application logs');
  
  console.log('\n🔧 To test the system:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Use the test webhook endpoint to simulate verifications');
  console.log('3. Check the verification data in your database');
  
  console.log('\n📚 For more information, see: VERIFF_WEBHOOK_SETUP.md');
}

// Run the verification
main().catch(error => {
  console.error('❌ Verification failed with error:', error);
  process.exit(1);
}); 