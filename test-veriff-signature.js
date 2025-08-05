const crypto = require('crypto');

// Test payload (same as what we're sending)
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
const apiSecret = "17a9e23d-507d-41f4-89f9-4e67cf13281e";

// Generate signature
const hmac = crypto.createHmac('sha256', apiSecret);
hmac.update(payloadString);
const signature = hmac.digest('hex');

console.log('Test Veriff Signature Generation:');
console.log('================================');
console.log('Payload:', payloadString);
console.log('Payload Length:', payloadString.length);
console.log('API Secret:', apiSecret);
console.log('Generated Signature:', signature);
console.log('Signature Length:', signature.length);

// Also test with different encoding
const hmac2 = crypto.createHmac('sha256', apiSecret);
hmac2.update(payloadString, 'utf8');
const signature2 = hmac2.digest('hex');

console.log('\nWith UTF-8 encoding:');
console.log('Signature:', signature2);
console.log('Signatures match:', signature === signature2); 