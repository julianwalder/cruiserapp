#!/usr/bin/env node

/**
 * Find Julian Walder Script
 * 
 * This script searches for Julian Walder in the database to find his correct email.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findJulian() {
  console.log('🔍 Searching for Julian Walder in database...\n');

  try {
    // Search by first name
    const { data: usersByFirstName, error: error1 } = await supabase
      .from('users')
      .select('id, "firstName", "lastName", email')
      .ilike('firstName', '%julian%');

    if (error1) {
      console.error('Error searching by first name:', error1);
    } else if (usersByFirstName && usersByFirstName.length > 0) {
      console.log('👥 Users with "Julian" in first name:');
      usersByFirstName.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      });
    }

    // Search by last name
    const { data: usersByLastName, error: error2 } = await supabase
      .from('users')
      .select('id, "firstName", "lastName", email')
      .ilike('lastName', '%walder%');

    if (error2) {
      console.error('Error searching by last name:', error2);
    } else if (usersByLastName && usersByLastName.length > 0) {
      console.log('\n👥 Users with "Walder" in last name:');
      usersByLastName.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      });
    }

    // Search by email containing julian
    const { data: usersByEmail, error: error3 } = await supabase
      .from('users')
      .select('id, "firstName", "lastName", email')
      .ilike('email', '%julian%');

    if (error3) {
      console.error('Error searching by email:', error3);
    } else if (usersByEmail && usersByEmail.length > 0) {
      console.log('\n👥 Users with "julian" in email:');
      usersByEmail.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      });
    }

    // Search by vendor data (user ID from Veriff)
    const { data: userByVendorData, error: error4 } = await supabase
      .from('users')
      .select('id, "firstName", "lastName", email')
      .eq('id', '837cd244-17a3-404e-b434-06c60638f5be');

    if (error4) {
      console.error('Error searching by vendor data:', error4);
    } else if (userByVendorData && userByVendorData.length > 0) {
      console.log('\n🎯 User found by vendor data (Veriff user ID):');
      userByVendorData.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      });
    } else {
      console.log('\n❌ No user found with vendor data: 837cd244-17a3-404e-b434-06c60638f5be');
    }

    // Show all users for reference
    const { data: allUsers, error: error5 } = await supabase
      .from('users')
      .select('id, "firstName", "lastName", email')
      .order('firstName');

    if (error5) {
      console.error('Error fetching all users:', error5);
    } else if (allUsers && allUsers.length > 0) {
      console.log('\n📋 All users in database:');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}`);
      });
    }

  } catch (error) {
    console.error('Error searching for Julian:', error);
  }
}

// Run the search
findJulian().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 