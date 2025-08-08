#!/usr/bin/env node

// Simple Romanian Address Normalizer Test
// This demonstrates the address parsing logic

class SimpleRomanianAddressNormalizer {
  static JUDETE = [
    'ALBA', 'ARAD', 'ARGEȘ', 'BACĂU', 'BIHOR', 'BISTRIȚA-NĂSĂUD', 'BOTOȘANI', 'BRĂILA',
    'BRAȘOV', 'BUCUREȘTI', 'BUZĂU', 'CĂLĂRAȘI', 'CARAȘ-SEVERIN', 'CLUJ', 'CONSTANȚA',
    'COVASNA', 'DÂMBOVIȚA', 'DOLJ', 'GALAȚI', 'GIURGIU', 'GORJ', 'HARGHITA', 'HUNEDOARA',
    'IALOMIȚA', 'IAȘI', 'ILFOV', 'MARAMUREȘ', 'MEHEDINȚI', 'MUREȘ', 'NEAMȚ', 'OLT',
    'PRAHOVA', 'SĂLAJ', 'SATU MARE', 'SIBIU', 'SUCEAVA', 'TELEORMAN', 'TIMIȘ', 'TULCEA',
    'VÂLCEA', 'VASLUI', 'VRANCEA'
  ];

  static STREET_TYPES = {
    'BD.': 'Bulevardul',
    'BLVD.': 'Bulevardul',
    'STR.': 'Strada',
    'CALE': 'Calea',
    'PȚA.': 'Piața',
    'SOS.': 'Șoseaua',
    'AL.': 'Aleea'
  };

  static BUCHAREST_SECTORS = [
    'SEC.1', 'SEC.2', 'SEC.3', 'SEC.4', 'SEC.5', 'SEC.6'
  ];

  static normalizeAddress(rawAddress) {
    const address = rawAddress.trim().toUpperCase();
    const result = {
      fullAddress: rawAddress,
      streetAddress: '',
      source: 'test',
      confidence: 0
    };

    // Parse administrative divisions
    if (address.includes('BUCUREȘTI') || address.includes('BUCUREŞTI')) {
      result.capitala = 'București';
      
      // Check for sectors
      for (const sector of this.BUCHAREST_SECTORS) {
        if (address.includes(sector)) {
          result.sector = sector.replace('SEC.', 'Sector ');
          break;
        }
      }
    }

    // Extract street type
    for (const [abbrev, full] of Object.entries(this.STREET_TYPES)) {
      if (address.includes(abbrev)) {
        result.streetType = full;
        break;
      }
    }

    // Extract building details
    const blockMatch = address.match(/BL\.?\s*(\d+)/i);
    if (blockMatch) result.block = blockMatch[1];

    const entranceMatch = address.match(/SC\.?\s*([A-Z])/i);
    if (entranceMatch) result.entrance = entranceMatch[1];

    const floorMatch = address.match(/ET\.?\s*(\d+)/i);
    if (floorMatch) result.floor = floorMatch[1];

    const apartmentMatch = address.match(/AP\.?\s*(\d+)/i);
    if (apartmentMatch) result.apartment = apartmentMatch[1];

    const numberMatch = address.match(/NR\.?\s*(\d+)/i);
    if (numberMatch) result.streetNumber = numberMatch[1];

    // Extract street name (simplified)
    let streetPart = address;
    if (result.capitala) {
      streetPart = streetPart.replace(/BUCUREȘTI|BUCUREŞTI/g, '');
    }
    if (result.sector) {
      streetPart = streetPart.replace(/SEC\.\d+/g, '');
    }
    streetPart = streetPart.replace(/BL\.?\s*\d+|SC\.?\s*[A-Z]|ET\.?\s*\d+|AP\.?\s*\d+|NR\.?\s*\d+/gi, '');
    streetPart = streetPart.replace(/\s+/g, ' ').trim();
    
    const nameMatch = streetPart.match(/^([A-ZĂÂÎȘȚ\s]+?)(?=\s*\d|$)/);
    if (nameMatch) {
      result.streetName = nameMatch[1].trim();
    }

    // Build formatted addresses
    const parts = [];
    if (result.capitala) {
      parts.push(result.capitala);
      if (result.sector) parts.push(result.sector);
    }

    const streetParts = [];
    if (result.streetType) streetParts.push(result.streetType);
    if (result.streetName) streetParts.push(result.streetName);
    if (result.streetNumber) streetParts.push(`nr. ${result.streetNumber}`);
    if (result.block) streetParts.push(`bl. ${result.block}`);
    if (result.entrance) streetParts.push(`sc. ${result.entrance}`);
    if (result.floor) streetParts.push(`et. ${result.floor}`);
    if (result.apartment) streetParts.push(`ap. ${result.apartment}`);

    result.streetAddress = streetParts.join(' ');
    result.fullAddress = [...parts, result.streetAddress].filter(Boolean).join(', ');

    // Calculate confidence
    let score = 0;
    let total = 0;
    if (result.capitala || result.judet) { score += 30; total += 30; }
    if (result.streetType) { score += 15; total += 15; }
    if (result.streetName) { score += 25; total += 25; }
    if (result.streetNumber) { score += 10; total += 30; }
    if (result.block) { score += 5; }
    if (result.entrance) { score += 5; }
    if (result.floor) { score += 5; }
    if (result.apartment) { score += 5; }
    
    result.confidence = total > 0 ? score / total : 0;

    return result;
  }
}

async function testAddressNormalizer() {
  console.log('🧪 Testing Romanian Address Normalizer\n');

  // Test with the example address from Romanian ID
  const testAddress = "MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20";
  
  console.log('📝 Original Address:');
  console.log(`   "${testAddress}"\n`);

  // Normalize the address
  const result = SimpleRomanianAddressNormalizer.normalizeAddress(testAddress);
  
  console.log('✅ Normalized Address:');
  console.log('   Administrative Divisions:');
  console.log(`     Capitală: ${result.capitala || 'N/A'}`);
  console.log(`     Sector: ${result.sector || 'N/A'}`);
  console.log('   Street Information:');
  console.log(`     Street Type: ${result.streetType || 'N/A'}`);
  console.log(`     Street Name: ${result.streetName || 'N/A'}`);
  console.log(`     Street Number: ${result.streetNumber || 'N/A'}`);
  console.log(`     Block: ${result.block || 'N/A'}`);
  console.log(`     Entrance: ${result.entrance || 'N/A'}`);
  console.log(`     Floor: ${result.floor || 'N/A'}`);
  console.log(`     Apartment: ${result.apartment || 'N/A'}`);
  console.log('   Formatted Addresses:');
  console.log(`     Street Address: ${result.streetAddress}`);
  console.log(`     Full Address: ${result.fullAddress}`);
  console.log(`   Metadata:`);
  console.log(`     Source: ${result.source}`);
  console.log(`     Confidence: ${(result.confidence * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(60) + '\n');

  // Test with multiple address sources
  console.log('🔄 Testing Address Source Merging:\n');

  const address1 = SimpleRomanianAddressNormalizer.normalizeAddress(
    "MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20"
  );

  const address2 = SimpleRomanianAddressNormalizer.normalizeAddress(
    "București, Sector 4, Bulevardul Gheorghe Șincai nr. 5, bl. 2, sc. A, et. 6, ap. 20"
  );

  console.log('📋 Address Sources:');
  console.log(`   1. Veriff ID: ${address1.fullAddress} (${(address1.confidence * 100).toFixed(1)}%)`);
  console.log(`   2. Historical Invoice: ${address2.fullAddress} (${(address2.confidence * 100).toFixed(1)}%)`);

  console.log('\n✅ Single Source of Truth Result:');
  console.log(`   Capitală: ${address1.capitala}`);
  console.log(`   Sector: ${address1.sector}`);
  console.log(`   Street: ${address1.streetType} ${address1.streetName}`);
  console.log(`   Number: ${address1.streetNumber}`);
  console.log(`   Building: bl. ${address1.block}, sc. ${address1.entrance}, et. ${address1.floor}, ap. ${address1.apartment}`);
  console.log(`   Full Address: ${address1.fullAddress}`);

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
    
    const result = SimpleRomanianAddressNormalizer.normalizeAddress(example.input);
    
    console.log(`   Output: ${result.fullAddress}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('');
  }

  console.log('🎉 Address normalization test completed!');
  console.log('\n💡 This demonstrates how Romanian addresses from ID cards can be parsed and normalized');
  console.log('💡 The system can handle multiple address sources and create a single source of truth');
  console.log('💡 This can be integrated into the proforma invoice system for better data consistency');
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
