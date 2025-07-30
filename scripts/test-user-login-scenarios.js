#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function testUserLoginScenarios() {
  console.log('🧪 Testing User Login Scenarios...\n');

  try {
    // Test scenarios
    const testScenarios = [
      {
        name: 'Inactive User (Suspended Account)',
        email: process.env.TEST_INACTIVE_USER_EMAIL || 'inactive@example.com',
        password: process.env.TEST_INACTIVE_USER_PASSWORD || 'testpassword',
        expectedStatus: 403,
        expectedMessage: 'suspended'
      },
      {
        name: 'Prospect User (New Enrollment)',
        email: process.env.TEST_PROSPECT_USER_EMAIL || 'prospect@example.com',
        password: process.env.TEST_PROSPECT_USER_PASSWORD || 'testpassword',
        expectedStatus: 200,
        expectedMessage: 'prospectGuidance'
      },
      {
        name: 'Active Pilot/Student/Instructor',
        email: process.env.TEST_ACTIVE_USER_EMAIL || 'active@example.com',
        password: process.env.TEST_ACTIVE_USER_PASSWORD || 'testpassword',
        expectedStatus: 200,
        expectedMessage: 'successful'
      }
    ];

    for (const scenario of testScenarios) {
      console.log(`📋 Testing: ${scenario.name}`);
      console.log(`   Email: ${scenario.email}`);
      console.log(`   Expected Status: ${scenario.expectedStatus}`);
      console.log('');

      // Test login attempt
      console.log('📤 Attempting login...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: scenario.email,
          password: scenario.password,
        }),
      });

      const data = await response.json();
      
      console.log('📥 Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(data, null, 2));
      console.log('');

      if (response.status === scenario.expectedStatus) {
        if (scenario.expectedStatus === 403 && data.error && data.error.includes('suspended')) {
          console.log('✅ Test PASSED: Inactive user correctly receives suspension message');
        } else if (scenario.expectedStatus === 200 && data.prospectGuidance) {
          console.log('✅ Test PASSED: Prospect user receives guidance message');
        } else if (scenario.expectedStatus === 200 && data.message === 'Login successful') {
          console.log('✅ Test PASSED: Active user can login successfully');
        } else {
          console.log('⚠️  Test RESULT: Expected status but unexpected response format');
        }
      } else if (response.status === 401) {
        console.log('⚠️  Test RESULT: Invalid credentials (user may not exist or password is wrong)');
      } else {
        console.log('❌ Test FAILED: Unexpected response status');
      }
      
      console.log('─'.repeat(50));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error testing inactive user login:', error);
  }
}

// Run the test
testUserLoginScenarios(); 