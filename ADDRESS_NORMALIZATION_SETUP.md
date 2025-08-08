# Romanian Address Normalization System

This document explains the Romanian address normalization system that creates a single source of truth for address data across the application.

## Overview

The address normalization system automatically parses and standardizes Romanian addresses from various sources (Veriff ID validation, historical invoices, user profiles) into a consistent, structured format. This ensures data consistency and improves the accuracy of invoice generation.

## Features

- **Multi-Source Address Parsing**: Handles addresses from ID cards, invoices, and user profiles
- **Romanian Address Structure**: Specifically designed for Romanian administrative divisions and address formats
- **Confidence Scoring**: Provides confidence scores for parsed addresses
- **Address Merging**: Combines multiple address sources into a single source of truth
- **Standardized Output**: Produces consistent, formatted addresses for invoices

## Address Sources

### 1. Veriff ID Validation (Highest Priority)
- **Source**: Romanian ID card address field
- **Format**: `MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20`
- **Priority**: Highest (most reliable source)

### 2. User Profile
- **Source**: User-entered address in profile
- **Format**: Various formats from user input
- **Priority**: Medium

### 3. Historical Invoices
- **Source**: Previous Smartbill invoice imports
- **Format**: Standardized invoice address format
- **Priority**: Medium

### 4. Constructed Address
- **Source**: Individual address fields (city, country, etc.)
- **Format**: Assembled from separate fields
- **Priority**: Lowest

## Address Structure

### Administrative Divisions
- **Județ (County)**: 41 Romanian counties (e.g., Cluj, Timiș, Constanța)
- **Capitală (Capital)**: București (special case)
- **Sector (District)**: Only for Bucharest (Sector 1-6)
- **Oraș (City)**: City name
- **Comună (Commune)**: Rural administrative unit
- **Sat (Village)**: Village name

### Street Information
- **Street Type**: Bulevardul, Strada, Calea, Piața, Șoseaua, Aleea
- **Street Name**: Actual street name
- **Street Number**: Building number
- **Block**: Bloc (apartment building)
- **Entrance**: Scară (entrance/staircase)
- **Floor**: Etaj (floor level)
- **Apartment**: Apartament (apartment number)

## Example: Address Normalization

### Input Address (from Romanian ID)
```
MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20
```

### Normalized Output
```json
{
  "capitala": "București",
  "sector": "Sector 4",
  "streetType": "Bulevardul",
  "streetName": "GHEORGHE ŞINCAI",
  "streetNumber": "5",
  "block": "2",
  "entrance": "A",
  "floor": "6",
  "apartment": "20",
  "streetAddress": "Bulevardul GHEORGHE ŞINCAI nr. 5 bl. 2 sc. A et. 6 ap. 20",
  "fullAddress": "București, Sector 4, Bulevardul GHEORGHE ŞINCAI nr. 5 bl. 2 sc. A et. 6 ap. 20",
  "confidence": 1.0
}
```

## Integration with Proforma Invoice System

### 1. Address Consolidation
The system automatically consolidates addresses from multiple sources:

```typescript
// In ProformaInvoiceService.consolidateAddressData()
const addressSources = [
  { address: veriffAddress, source: 'veriff_id', confidence: 0.95 },
  { address: profileAddress, source: 'user_profile', confidence: 0.80 },
  { address: invoiceAddress, source: 'smartbill_historical', confidence: 0.85 }
];

const mergedAddress = RomanianAddressNormalizer.mergeAddressSources(addressSources);
```

### 2. Single Source of Truth
All address data is stored in a normalized format:

```typescript
interface UserInvoiceData {
  // Legacy fields (for backward compatibility)
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  
  // Single source of truth
  normalizedAddress?: NormalizedAddress;
}
```

### 3. Invoice Generation
The normalized address is used for invoice generation:

```typescript
// In Smartbill invoice creation
const clientData = {
  name: `${userData.firstName} ${userData.lastName}`,
  address: userData.normalizedAddress?.streetAddress || userData.address,
  city: userData.normalizedAddress?.capitala || userData.normalizedAddress?.oras || userData.city,
  country: userData.normalizedAddress?.capitala || userData.normalizedAddress?.judet || userData.country,
  // ... other fields
};
```

## Usage Examples

### Basic Address Normalization
```typescript
import { RomanianAddressNormalizer } from '@/lib/address-normalizer';

const result = RomanianAddressNormalizer.normalizeAddress(
  "MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20",
  'veriff_id'
);

if (result.success) {
  console.log(result.address.fullAddress);
  // Output: "București, Sector 4, Bulevardul GHEORGHE ŞINCAI nr. 5 bl. 2 sc. A et. 6 ap. 20"
}
```

### Address Comparison
```typescript
const similarity = RomanianAddressNormalizer.compareAddresses(address1, address2);
console.log(`Address similarity: ${(similarity * 100).toFixed(1)}%`);
```

### Address Merging
```typescript
const mergedAddress = RomanianAddressNormalizer.mergeAddressSources([
  { address: address1, source: 'veriff_id', confidence: 0.95 },
  { address: address2, source: 'user_profile', confidence: 0.80 }
]);
```

## Configuration

### Street Type Abbreviations
The system recognizes common Romanian street type abbreviations:

```typescript
STREET_TYPES = {
  'BD.': 'Bulevardul',
  'STR.': 'Strada',
  'CALE': 'Calea',
  'PȚA.': 'Piața',
  'SOS.': 'Șoseaua',
  'AL.': 'Aleea'
}
```

### Administrative Divisions
All 41 Romanian counties are supported:

```typescript
JUDETE = [
  'ALBA', 'ARAD', 'ARGEȘ', 'BACĂU', 'BIHOR', 'BISTRIȚA-NĂSĂUD',
  'BOTOȘANI', 'BRĂILA', 'BRAȘOV', 'BUCUREȘTI', 'BUZĂU', 'CĂLĂRAȘI',
  // ... all counties
]
```

## Benefits

### 1. Data Consistency
- Eliminates address format inconsistencies
- Standardizes address structure across the application
- Reduces data entry errors

### 2. Improved Invoice Accuracy
- Ensures correct address information on invoices
- Meets fiscal invoice requirements
- Reduces invoice rejection rates

### 3. Better User Experience
- Automatic address completion from ID validation
- Reduced manual address entry
- Consistent address display

### 4. Compliance
- Meets Romanian fiscal invoice requirements
- Proper address formatting for legal documents
- Audit trail for address sources

## Testing

Run the address normalization test:

```bash
node scripts/test-address-simple.js
```

This will test:
- Romanian ID address parsing
- Multiple source address merging
- Various Romanian city examples
- Confidence scoring

## Future Enhancements

### 1. Enhanced Street Name Recognition
- Integration with Romanian postal service database
- Fuzzy matching for street names
- Automatic street name correction

### 2. Postal Code Integration
- Romanian postal code validation
- Automatic postal code lookup
- Address verification

### 3. International Address Support
- Extension for other European countries
- Multi-language address parsing
- International postal code support

### 4. Address Validation
- Real-time address validation
- Integration with mapping services
- Address completeness checking

## Troubleshooting

### Common Issues

1. **Low Confidence Scores**
   - Check if address format is recognized
   - Verify administrative division names
   - Ensure street type abbreviations are supported

2. **Missing Street Names**
   - Address may not contain recognizable street name
   - Check for unusual abbreviations
   - Verify Romanian character encoding

3. **Address Merging Failures**
   - Addresses may be too different to merge
   - Check source priorities
   - Verify confidence scores

### Debug Mode
Enable debug logging to see address parsing details:

```typescript
// Add debug logging in address normalization
console.log('Address parsing steps:', {
  input: rawAddress,
  normalized: normalized,
  parsed: result
});
```

## Conclusion

The Romanian address normalization system provides a robust solution for handling address data from multiple sources. It ensures data consistency, improves invoice accuracy, and enhances the overall user experience while maintaining compliance with Romanian fiscal requirements.

The system is designed to be extensible and can be enhanced with additional features as needed for your specific use case.
