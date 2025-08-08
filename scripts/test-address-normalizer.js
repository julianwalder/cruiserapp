#!/usr/bin/env node

// Test script for Romanian Address Normalizer
const { RomanianAddressNormalizer } = require('../src/lib/address-normalizer.ts');

async function testAddressNormalizer() {
  console.log('🧪 Testing Romanian Address Normalizer\n');

  // Test with the example address from Romanian ID
  const testAddress = "MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20";
  
  console.log('📝 Original Address:');
  console.log(`   "${testAddress}"\n`);

  // Normalize the address
  const result = RomanianAddressNormalizer.normalizeAddress(testAddress, 'veriff_id');
  
  if (result.success) {
    console.log('✅ Normalized Address:');
    console.log('   Administrative Divisions:');
    console.log(`     Capitală: ${result.address.capitala || 'N/A'}`);
    console.log(`     Sector: ${result.address.sector || 'N/A'}`);
    console.log('   Street Information:');
    console.log(`     Street Type: ${result.address.streetType || 'N/A'}`);
    console.log(`     Street Name: ${result.address.streetName || 'N/A'}`);
    console.log(`     Street Number: ${result.address.streetNumber || 'N/A'}`);
    console.log(`     Block: ${result.address.block || 'N/A'}`);
    console.log(`     Entrance: ${result.address.entrance || 'N/A'}`);
    console.log(`     Floor: ${result.address.floor || 'N/A'}`);
    console.log(`     Apartment: ${result.address.apartment || 'N/A'}`);
    console.log('   Formatted Addresses:');
    console.log(`     Street Address: ${result.address.streetAddress}`);
    console.log(`     Full Address: ${result.address.fullAddress}`);
    console.log(`   Metadata:`);
    console.log(`     Source: ${result.address.source}`);
    console.log(`     Confidence: ${(result.address.confidence * 100).toFixed(1)}%`);
  } else {
    console.log('❌ Failed to normalize address:');
    console.log(`   Error: ${result.error}`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test with multiple address sources
  console.log('🔄 Testing Address Source Merging:\n');

  const address1 = RomanianAddressNormalizer.normalizeAddress(
    "MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20",
    'veriff_id'
  );

  const address2 = RomanianAddressNormalizer.normalizeAddress(
    "București, Sector 4, Bulevardul Gheorghe Șincai nr. 5, bl. 2, sc. A, et. 6, ap. 20",
    'historical_invoice'
  );

  const address3 = RomanianAddressNormalizer.normalizeAddress(
    "BUCUREȘTI SEC.4 BD.ȘINCAI 5 BL.2 SC.A ET.6 AP.20",
    'user_profile'
  );

  if (address1.success && address2.success && address3.success) {
    console.log('📋 Address Sources:');
    console.log(`   1. Veriff ID: ${address1.address.fullAddress} (${(address1.address.confidence * 100).toFixed(1)}%)`);
    console.log(`   2. Historical Invoice: ${address2.address.fullAddress} (${(address2.address.confidence * 100).toFixed(1)}%)`);
    console.log(`   3. User Profile: ${address3.address.fullAddress} (${(address3.address.confidence * 100).toFixed(1)}%)`);

    // Merge addresses
    const merged = RomanianAddressNormalizer.mergeAddressSources([
      { address: address1.address, source: 'veriff_id', confidence: address1.address.confidence },
      { address: address2.address, source: 'historical_invoice', confidence: address2.address.confidence },
      { address: address3.address, source: 'user_profile', confidence: address3.address.confidence }
    ]);

    console.log('\n✅ Merged Address (Single Source of Truth):');
    console.log(`   Full Address: ${merged.fullAddress}`);
    console.log(`   Street Address: ${merged.streetAddress}`);
    console.log(`   Source: ${merged.source}`);
    console.log(`   Confidence: ${(merged.confidence * 100).toFixed(1)}%`);

    // Compare addresses
    console.log('\n📊 Address Similarity Scores:');
    const similarity12 = RomanianAddressNormalizer.compareAddresses(address1.address, address2.address);
    const similarity13 = RomanianAddressNormalizer.compareAddresses(address1.address, address3.address);
    const similarity23 = RomanianAddressNormalizer.compareAddresses(address2.address, address3.address);

    console.log(`   Veriff ID ↔ Historical Invoice: ${(similarity12 * 100).toFixed(1)}%`);
    console.log(`   Veriff ID ↔ User Profile: ${(similarity13 * 100).toFixed(1)}%`);
    console.log(`   Historical Invoice ↔ User Profile: ${(similarity23 * 100).toFixed(1)}%`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test with more examples
  console.log('🧪 More Test Examples:\n');

  const examples = [
    {
      input: "CLUJ-NAPOCA STR.REPUBLICII NR.15 AP.7",
      description: "Cluj-Napoca example"
    },
    {
      input: "TIMIȘOARA BD.VICTORIEI NR.8 BL.10 SC.B ET.3 AP.12",
      description: "Timișoara example"
    },
    {
      input: "CONSTANȚA SOS.MAMAIA NR.100 BL.5 SC.C ET.1 AP.25",
      description: "Constanța example"
    }
  ];

  for (const example of examples) {
    console.log(`📝 ${example.description}:`);
    console.log(`   Input: "${example.input}"`);
    
    const result = RomanianAddressNormalizer.normalizeAddress(example.input, 'test');
    
    if (result.success) {
      console.log(`   Output: ${result.address.fullAddress}`);
      console.log(`   Confidence: ${(result.address.confidence * 100).toFixed(1)}%`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }

  console.log('🎉 Address normalization test completed!');
}

// Run the test
testAddressNormalizer()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
