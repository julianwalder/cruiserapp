const crypto = require('crypto');

console.log('🔍 Veriff Integration Diagnostic Tool');
console.log('=====================================');
console.log('');

// Test payload (exact same as your application)
const payload = {
  verification: {
    callback: "http://localhost:3000/api/veriff/callback",
    person: {
      givenName: "Julian",
      lastName: "Walder"
    },
    document: {
      type: "PASSPORT"
    },
    additionalVerification: {
      faceMatch: true
    }
  }
};

const payloadString = JSON.stringify(payload);

console.log('📋 Test Configuration:');
console.log('======================');
console.log('Payload:', payloadString);
console.log('Payload Length:', payloadString.length);
console.log('Callback URL:', payload.verification.callback);
console.log('');

// Test different API credentials
const testConfigs = [
  {
    name: 'Current Production Credentials',
    apiKey: '931cee51-124c-4e02-8606-5c36dac7023f',
    apiSecret: '7849ba40-507d-41f4-89f9-4e67cf13281e',
    environment: 'production'
  },
  {
    name: 'Previous Production Credentials',
    apiKey: '01692d40-124c-4e02-8606-5c36dac7023f',
    apiSecret: '17a9e23d-507d-41f4-89f9-4e67cf13281e',
    environment: 'production'
  },
  {
    name: 'Sandbox Test (if you have sandbox credentials)',
    apiKey: 'sandbox-key-here',
    apiSecret: 'sandbox-secret-here',
    environment: 'sandbox'
  }
];

console.log('🔑 Testing Different Credentials:');
console.log('=================================');

testConfigs.forEach((config, index) => {
  if (config.apiKey === 'sandbox-key-here') {
    console.log(`${index + 1}. ${config.name}`);
    console.log('   ⚠️  Replace with your actual sandbox credentials');
    console.log('');
    return;
  }

  const hmac = crypto.createHmac('sha256', config.apiSecret);
  hmac.update(payloadString);
  const signature = hmac.digest('hex');

  console.log(`${index + 1}. ${config.name}`);
  console.log(`   API Key: ${config.apiKey}`);
  console.log(`   API Secret: ${config.apiSecret}`);
  console.log(`   Environment: ${config.environment}`);
  console.log(`   Generated Signature: ${signature}`);
  console.log(`   Signature Length: ${signature.length}`);
  console.log('');
});

console.log('🔧 Common Issues & Solutions:');
console.log('=============================');
console.log('');
console.log('1. 🔑 API Secret Mismatch:');
console.log('   - Check your Veriff dashboard for the exact API secret');
console.log('   - Make sure there are no extra spaces or characters');
console.log('   - Verify you\'re using the correct environment (Sandbox/Production)');
console.log('');
console.log('2. 🌐 Callback URL Issues:');
console.log('   - Veriff Dashboard should have: http://localhost:3000/api/veriff/callback');
console.log('   - No trailing slashes');
console.log('   - Correct protocol (http vs https)');
console.log('');
console.log('3. 🏢 Environment Mismatch:');
console.log('   - Production credentials won\'t work in Sandbox environment');
console.log('   - Sandbox credentials won\'t work in Production environment');
console.log('');
console.log('4. 📝 Integration Status:');
console.log('   - Make sure your Veriff integration is "Active" or "Enabled"');
console.log('   - Check if there are any pending approval requirements');
console.log('');
console.log('💡 Next Steps:');
console.log('==============');
console.log('1. Go to your Veriff Dashboard');
console.log('2. Copy the exact API Key and Secret');
console.log('3. Check the environment (Sandbox/Production)');
console.log('4. Verify the callback URL configuration');
console.log('5. Update your .env.local file with the correct values');
console.log('6. Restart your development server');
console.log('');
console.log('📞 If still failing:');
console.log('===================');
console.log('- Contact Veriff support with your integration details');
console.log('- Ask them to verify your API credentials and callback URL');
console.log('- Request them to check if your integration is properly activated'); 