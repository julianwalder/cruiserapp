// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple address normalization function
async function normalizeAddress(rawAddress, sourceType, userEmail) {
  const systemPrompt = `You are an expert in Romanian address normalization. Your task is to parse and normalize Romanian addresses into structured fields.

IMPORTANT RULES:
1. For Bucharest (București): Use "București" as state_region and "Sector X" as city
2. For other cities: Use the județ (county) as state_region and the city name as city
3. Always use proper Romanian diacritics (ă, â, î, ș, ț)
4. Normalize street types: "BD." → "Bulevardul", "STR." → "Strada", etc.
5. Extract building details (bloc, scară, etaj, apartament) into street_address
6. Assign confidence_score based on data quality (0.0-1.0)

Return ONLY a valid JSON object with these exact fields:
{
  "street_address": "Complete street address with building details",
  "city": "City name (Sector X for Bucharest)",
  "state_region": "Județ or București",
  "country": "Romania",
  "postal_code": "Postal code if available",
  "confidence_score": 0.95,
  "processing_notes": "Brief notes about the normalization"
}`;

  const userPrompt = `Please normalize this Romanian address:

Raw Address: ${rawAddress}
Source: ${sourceType}
${userEmail ? `User Email: ${userEmail}` : ''}

Return the normalized address as JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    const normalizedData = JSON.parse(content);
    
    // Validate required fields
    if (!normalizedData.street_address || !normalizedData.city || !normalizedData.state_region || !normalizedData.country) {
      throw new Error('Missing required fields in normalized address');
    }

    // Ensure confidence score is within bounds
    normalizedData.confidence_score = Math.max(0, Math.min(1, normalizedData.confidence_score || 0.5));

    console.log(`✅ Address normalized successfully:`, {
      source: sourceType,
      confidence: normalizedData.confidence_score,
      city: normalizedData.city,
      state: normalizedData.state_region
    });

    return normalizedData;

  } catch (error) {
    console.error('❌ Error normalizing address with OpenAI:', error);
    
    // Return a fallback with low confidence
    return {
      street_address: rawAddress,
      city: 'Unknown',
      state_region: 'Unknown',
      country: 'Romania',
      confidence_score: 0.1,
      processing_notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function normalizeInvoiceAddresses() {
  console.log('🚀 Starting invoice address normalization...\n');

  try {
    // Step 1: Get all users with invoice data but no normalized address
    console.log('📋 Step 1: Finding users with invoice addresses...');
    
    const { data: usersWithInvoices, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName"
      `)
      .not('email', 'is', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`Found ${usersWithInvoices.length} users with emails`);

    // Step 2: Get invoice addresses for each user
    const addressData = [];
    
    for (const user of usersWithInvoices) {
      console.log(`\n🔍 Processing user: ${user.email}`);
      
      // Get the most recent invoice client with address data for this user (only for individual users, not companies)
      const { data: invoiceClients, error: invoiceError } = await supabase
        .from('invoice_clients')
        .select(`
          id,
          invoice_id,
          address,
          city,
          country,
          phone,
          vat_code,
          company_id,
          created_at
        `)
        .eq('email', user.email)
        .is('company_id', null) // Only process individual users, not companies
        .not('address', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (invoiceError) {
        console.error(`❌ Error fetching invoice clients for ${user.email}:`, invoiceError.message);
        continue;
      }

      if (invoiceClients && invoiceClients.length > 0) {
        const invoiceClient = invoiceClients[0];
        // Construct full address from components
        const fullAddress = [invoiceClient.address, invoiceClient.city, invoiceClient.country].filter(Boolean).join(', ');
        console.log(`  📄 Found individual user invoice with address: ${fullAddress}`);
        console.log(`  📞 Phone: ${invoiceClient.phone || 'N/A'}`);
        console.log(`  🆔 VAT/CNP: ${invoiceClient.vat_code || 'N/A'}`);
        
        addressData.push({
          userId: user.id,
          email: user.email,
          rawAddress: fullAddress,
          phone: invoiceClient.phone,
          vatCode: invoiceClient.vat_code,
          invoiceId: invoiceClient.invoice_id
        });
      } else {
        console.log(`  ⚠️  No individual user invoice addresses found for ${user.email}`);
      }
    }

    console.log(`\n📊 Found ${addressData.length} users with invoice addresses to normalize`);

    if (addressData.length === 0) {
      console.log('✅ No addresses to normalize');
      return;
    }

    // Step 3: Check which users already have normalized addresses
    console.log('\n📋 Step 2: Checking existing normalized addresses...');
    
    const { data: existingNormalized, error: existingError } = await supabase
      .from('normalized_addresses')
      .select('user_id, source_type, confidence_score');

    if (existingError) {
      throw new Error(`Failed to fetch existing normalized addresses: ${existingError.message}`);
    }

    const existingUserIds = new Set(existingNormalized.map(addr => addr.user_id));
    const addressesToProcess = addressData.filter(addr => !existingUserIds.has(addr.userId));

    console.log(`📊 ${addressData.length} total addresses, ${addressesToProcess.length} need processing`);

    if (addressesToProcess.length === 0) {
      console.log('✅ All addresses already normalized');
      return;
    }

    // Step 4: Normalize addresses using OpenAI
    console.log('\n🤖 Step 3: Normalizing addresses with OpenAI...');
    
    const results = [];
    for (const addressData of addressesToProcess) {
      try {
        console.log(`🔄 Normalizing address for user ${addressData.userId}`);
        
        const normalizedAddress = await normalizeAddress(
          addressData.rawAddress,
          'invoice_import',
          addressData.email
        );

        results.push({
          userId: addressData.userId,
          normalizedAddress,
          success: true
        });

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Failed to normalize address for user ${addressData.userId}:`, error.message);
        results.push({
          userId: addressData.userId,
          normalizedAddress: {
            street_address: addressData.rawAddress,
            city: 'Unknown',
            state_region: 'Unknown',
            country: 'Romania',
            confidence_score: 0.1,
            processing_notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Step 5: Store normalized addresses in database
    console.log('\n💾 Step 4: Storing normalized addresses...');
    
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    console.log(`📊 Results: ${successfulResults.length} successful, ${failedResults.length} failed`);

    if (successfulResults.length > 0) {
      const normalizedAddresses = successfulResults.map(result => {
        const addressData = addressesToProcess.find(addr => addr.userId === result.userId);
        return {
          user_id: result.userId,
          street_address: result.normalizedAddress.street_address,
          city: result.normalizedAddress.city,
          state_region: result.normalizedAddress.state_region,
          country: result.normalizedAddress.country,
          postal_code: result.normalizedAddress.postal_code,
          source_type: 'invoice_import',
          source_data: {
            raw_address: addressData?.rawAddress,
            invoice_id: addressData?.invoiceId,
            phone: addressData?.phone,
            vat_code: addressData?.vatCode // This will be used as CNP for individual users
          },
          confidence_score: result.normalizedAddress.confidence_score,
          processing_notes: result.normalizedAddress.processing_notes,
          phone: addressData?.phone,
          cnp: addressData?.vatCode
        };
      });

      const { data: insertedAddresses, error: insertError } = await supabase
        .from('normalized_addresses')
        .upsert(normalizedAddresses, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select();

      if (insertError) {
        throw new Error(`Failed to insert normalized addresses: ${insertError.message}`);
      }

      console.log(`✅ Successfully stored ${insertedAddresses.length} normalized addresses`);
    }

    // Step 6: Report results
    console.log('\n📋 Step 5: Final Report');
    console.log('='.repeat(50));
    console.log(`Total users processed: ${usersWithInvoices.length}`);
    console.log(`Users with invoice addresses: ${addressData.length}`);
    console.log(`Addresses normalized: ${successfulResults.length}`);
    console.log(`Addresses failed: ${failedResults.length}`);
    console.log(`Addresses already existed: ${addressData.length - addressesToProcess.length}`);

    if (failedResults.length > 0) {
      console.log('\n❌ Failed normalizations:');
      failedResults.forEach(result => {
        console.log(`  - User ${result.userId}: ${result.error}`);
      });
    }

    console.log('\n✅ Invoice address normalization completed!');

  } catch (error) {
    console.error('❌ Error during invoice address normalization:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  normalizeInvoiceAddresses();
}

module.exports = { normalizeInvoiceAddresses };
