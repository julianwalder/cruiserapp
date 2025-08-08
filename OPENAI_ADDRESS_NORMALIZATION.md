# OpenAI-Powered Address Normalization System

## 🎯 Overview

This system replaces the complex Romanian address normalization logic with a clean, reliable OpenAI-powered solution. It provides a single source of truth for user addresses across the application.

## 📋 Architecture

### Database Schema

```sql
-- Normalized addresses table
CREATE TABLE normalized_addresses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    
    -- Normalized fields
    street_address TEXT,
    city TEXT,
    state_region TEXT,
    country TEXT,
    postal_code TEXT,
    
    -- Source tracking
    source_type TEXT, -- 'invoice_import', 'veriff_validation', 'manual_update'
    source_data JSONB,
    
    -- Processing info
    confidence_score DECIMAL(3,2),
    processing_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Key Components

1. **OpenAIAddressService** - Core service for address normalization
2. **Database Scripts** - Migration and setup scripts
3. **Processing Scripts** - Batch processing for invoice addresses and validation updates
4. **Simplified ProformaInvoiceService** - Uses normalized addresses instead of complex logic

## 🚀 Implementation Steps

### Step 1: Database Setup

Run the database migration:

```bash
# Execute in Supabase SQL Editor
\i scripts/create-normalized-addresses-table.sql
```

### Step 2: Environment Setup

Add OpenAI API key to your environment:

```bash
# .env.local
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 3: Process Existing Invoice Addresses

Normalize addresses from imported invoices for non-validated users:

```bash
node scripts/normalize-invoice-addresses.js
```

This script will:
- Find all users with invoice addresses
- Check for existing normalized addresses
- Use OpenAI to normalize addresses
- Store results in `normalized_addresses` table

### Step 4: Update Addresses on User Validation

When users validate their identity with Veriff, update their normalized address:

```bash
# For a single user
node scripts/update-address-on-validation.js <userId>

# For batch processing
node scripts/update-address-on-validation.js --batch <userIds>
```

## 🔧 Usage Examples

### Normalizing a Single Address

```typescript
import { OpenAIAddressService } from './src/lib/openai-address-service';

const normalizedAddress = await OpenAIAddressService.normalizeAddress({
  rawAddress: "MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20",
  sourceType: 'veriff_validation',
  userEmail: 'user@example.com'
});

// Result:
// {
//   street_address: "Bulevardul Gheorghe Şincai nr. 5 bl. 2 sc. A et. 6 ap. 20",
//   city: "Sector 4",
//   state_region: "București",
//   country: "Romania",
//   confidence_score: 0.95
// }
```

### Comparing Addresses

```typescript
const comparison = await OpenAIAddressService.compareAndUpdateAddress({
  existingAddress: currentNormalizedAddress,
  newAddress: "New address from Veriff",
  sourceType: 'veriff_validation',
  userEmail: 'user@example.com'
});

if (comparison.shouldUpdate) {
  // Update the normalized address
  await updateNormalizedAddress(comparison.updatedAddress);
}
```

## 📊 Benefits

### ✅ Advantages of OpenAI Approach

1. **Reliability** - No complex regex or parsing logic to maintain
2. **Accuracy** - AI understands context and Romanian address patterns
3. **Flexibility** - Handles various address formats automatically
4. **Maintainability** - Simple, clean codebase
5. **Scalability** - Easy to add new address types or regions
6. **Consistency** - Standardized output format

### 🔄 Migration Benefits

1. **Removes Complex Logic** - No more `RomanianAddressNormalizer` complexity
2. **Simplified Service** - Clean `ProformaInvoiceService` implementation
3. **Better Error Handling** - Graceful fallbacks and clear error messages
4. **Performance** - Faster processing without complex parsing
5. **Debugging** - Clear logs and processing notes

## 🛠️ Scripts Reference

### normalize-invoice-addresses.js

Processes existing invoice addresses for all users.

**Usage:**
```bash
node scripts/normalize-invoice-addresses.js
```

**Features:**
- Batch processing with rate limiting
- Error handling and reporting
- Progress tracking
- Detailed final report

### update-address-on-validation.js

Updates normalized addresses when users validate their identity.

**Usage:**
```bash
# Single user
node scripts/update-address-on-validation.js <userId>

# Batch processing
node scripts/update-address-on-validation.js --batch <userIds>
```

**Features:**
- Compares existing vs new addresses
- Uses AI to determine which is better
- Preserves processing history
- Detailed comparison notes

## 🔍 Monitoring and Debugging

### Confidence Scores

Each normalized address includes a confidence score (0.0-1.0):
- **0.9-1.0**: High confidence (complete, clear address)
- **0.7-0.9**: Good confidence (minor issues)
- **0.5-0.7**: Medium confidence (some missing details)
- **0.0-0.5**: Low confidence (significant issues)

### Processing Notes

Every normalization includes notes about:
- What was processed
- Any issues encountered
- Decisions made during comparison
- Error details if applicable

### Logs

All operations are logged with:
- User ID and email
- Source type and confidence
- Processing time
- Success/failure status

## 🔄 Integration with Existing System

### Proforma Invoice Service

The simplified service now:
1. Fetches normalized address from `normalized_addresses` table
2. Uses it as single source of truth
3. Falls back to user profile data if needed
4. No complex address consolidation logic

### API Endpoints

Existing endpoints continue to work:
- `/api/proforma-invoices` - Uses normalized addresses
- `/api/proforma-invoices/[id]/payment-status` - Unchanged
- All validation logic remains the same

## 🚨 Error Handling

### OpenAI API Errors

- Automatic retry with exponential backoff
- Fallback to raw address with low confidence
- Clear error messages in processing notes

### Database Errors

- Transaction rollback on failures
- Detailed error logging
- Graceful degradation

### Rate Limiting

- Built-in delays between API calls
- Batch processing with pauses
- Configurable limits

## 📈 Performance Considerations

### OpenAI API Costs

- Uses `gpt-4o-mini` for cost efficiency
- Batch processing to minimize API calls
- Caching of normalized addresses

### Processing Time

- ~1-2 seconds per address normalization
- Batch processing with 100ms delays
- Progress tracking for long operations

## 🔮 Future Enhancements

### Potential Improvements

1. **Caching** - Cache common address patterns
2. **Bulk Processing** - Process multiple addresses in single API call
3. **Custom Models** - Fine-tuned model for Romanian addresses
4. **Validation Rules** - Additional validation beyond AI processing
5. **Address Verification** - Integration with postal services

### Monitoring

1. **Success Rates** - Track normalization success rates
2. **Confidence Trends** - Monitor confidence score distributions
3. **API Usage** - Track OpenAI API usage and costs
4. **Processing Times** - Monitor performance metrics

## 🎉 Conclusion

This OpenAI-powered address normalization system provides:

- **Clean, maintainable code**
- **Reliable address processing**
- **Scalable architecture**
- **Better user experience**
- **Reduced complexity**

The system automatically handles Romanian address nuances while providing a single source of truth for all address data across the application.
