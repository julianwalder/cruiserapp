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

/**
 * Compare existing normalized address with Veriff address data using OpenAI
 */
async function compareAddressWithVeriff(existingAddress, veriffAddress, userEmail) {
  const systemPrompt = `You are an expert in comparing Romanian addresses. Your task is to determine if a new address from Veriff verification should replace an existing normalized address.

RULES:
1. If the Veriff address is more complete/detailed, prefer it
2. If the Veriff address has higher quality data (from official ID validation), prefer it
3. If addresses are essentially the same, keep the existing one
4. Consider confidence scores and data sources
5. For Bucharest: "București" + "Sector X" is better than just "București"
6. Veriff data is from official ID documents, so it's highly reliable

Return ONLY a valid JSON object:
{
  "should_update": true/false,
  "updated_address": { normalized address object if should_update is true },
  "comparison_notes": "Explanation of the decision",
  "confidence_score": 0.95
}`;

  const userPrompt = `Compare these addresses:

EXISTING NORMALIZED ADDRESS:
${JSON.stringify(existingAddress, null, 2)}

VERIFF ADDRESS (from official ID):
Raw: ${veriffAddress}
Source: Veriff verification (official ID document)
User: ${userEmail}

Should the Veriff address replace the existing one? Return JSON with decision.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    const result = JSON.parse(content);
    
    console.log(`✅ Address comparison completed for ${userEmail}:`, {
      shouldUpdate: result.should_update,
      confidence: result.confidence_score,
      notes: result.comparison_notes
    });

    return {
      shouldUpdate: result.should_update || false,
      updatedAddress: result.updated_address || undefined,
      comparisonNotes: result.comparison_notes || 'No comparison notes'
    };

  } catch (error) {
    console.error('❌ Error comparing addresses with OpenAI:', error);
    
    return {
      shouldUpdate: false,
      comparisonNotes: `Error during comparison: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Normalize Veriff address using OpenAI
 */
async function normalizeVeriffAddress(veriffAddress, userEmail) {
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

  const userPrompt = `Please normalize this Romanian address from Veriff verification:

Raw Address: ${veriffAddress}
Source: Veriff verification (official ID document)
User Email: ${userEmail}

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

    console.log(`✅ Veriff address normalized successfully:`, {
      user: userEmail,
      confidence: normalizedData.confidence_score,
      city: normalizedData.city,
      state: normalizedData.state_region
    });

    return normalizedData;

  } catch (error) {
    console.error('❌ Error normalizing Veriff address with OpenAI:', error);
    
    // Return a fallback with low confidence
    return {
      street_address: veriffAddress,
      city: 'Unknown',
      state_region: 'Unknown',
      country: 'Romania',
      confidence_score: 0.1,
      processing_notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Main function to check and update addresses for verified users
 */
async function checkVeriffAddressUpdates() {
  console.log('🔍 Starting Veriff address update check...\n');

  try {
    // Step 1: Get all verified users with Veriff data
    console.log('📋 Step 1: Fetching verified users with Veriff data...');
    
    const { data: verifiedUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "veriffPersonCountry",
        "veriffStatus",
        "veriffPersonGivenName",
        "veriffPersonLastName",
        "veriffPersonIdNumber",
        address,
        city,
        state,
        "zipCode",
        country
      `)
      .not('veriffStatus', 'is', null)
      .eq('veriffStatus', 'approved');

    if (usersError) {
      throw new Error(`Failed to fetch verified users: ${usersError.message}`);
    }

    console.log(`📊 Found ${verifiedUsers.length} verified users with Veriff data\n`);

    if (verifiedUsers.length === 0) {
      console.log('✅ No verified users found. Nothing to process.');
      return;
    }

    // Step 2: Get existing normalized addresses
    console.log('📋 Step 2: Fetching existing normalized addresses...');
    
    const { data: existingAddresses, error: addressesError } = await supabase
      .from('normalized_addresses')
      .select('*');

    if (addressesError) {
      throw new Error(`Failed to fetch normalized addresses: ${addressesError.message}`);
    }

    console.log(`📊 Found ${existingAddresses.length} existing normalized addresses\n`);

    // Step 3: Process each verified user
    console.log('🤖 Step 3: Checking address updates for verified users...\n');

    const results = [];
    let processedCount = 0;

    for (const user of verifiedUsers) {
      processedCount++;
      console.log(`🔍 Processing user ${processedCount}/${verifiedUsers.length}: ${user.email}`);

      // Check if user has existing normalized address
      const existingAddress = existingAddresses.find(addr => addr.user_id === user.id);

      if (!existingAddress) {
        console.log(`  ⚠️  No existing normalized address found for ${user.email}`);
        results.push({
          userId: user.id,
          email: user.email,
          action: 'no_existing_address',
          notes: 'No existing normalized address to compare with'
        });
        continue;
      }

      // Check if user has Veriff address data
      if (!user.address) {
        console.log(`  ⚠️  No Veriff address data found for ${user.email}`);
        results.push({
          userId: user.id,
          email: user.email,
          action: 'no_veriff_address',
          notes: 'No Veriff address data available'
        });
        continue;
      }

      // Construct full Veriff address from components
      const veriffAddressComponents = [
        user.address,
        user.city,
        user.state,
        user.zipCode,
        user.country || user.veriffPersonCountry
      ].filter(Boolean);
      
      const veriffAddress = veriffAddressComponents.join(', ');
      
      console.log(`  📄 Found existing address: ${existingAddress.street_address || 'N/A'}`);
      console.log(`  🆔 Veriff address: ${veriffAddress}`);

      // Compare addresses using OpenAI
      const comparison = await compareAddressWithVeriff(
        {
          street_address: existingAddress.street_address,
          city: existingAddress.city,
          state_region: existingAddress.state_region,
          country: existingAddress.country,
          postal_code: existingAddress.postal_code,
          confidence_score: existingAddress.confidence_score
        },
        veriffAddress,
        user.email
      );

      if (comparison.shouldUpdate && comparison.updatedAddress) {
        console.log(`  ✅ Address update recommended for ${user.email}`);
        
        // Update the normalized address
        const { error: updateError } = await supabase
          .from('normalized_addresses')
          .update({
            street_address: comparison.updatedAddress.street_address,
            city: comparison.updatedAddress.city,
            state_region: comparison.updatedAddress.state_region,
            country: comparison.updatedAddress.country,
            postal_code: comparison.updatedAddress.postal_code,
            confidence_score: comparison.updatedAddress.confidence_score,
            processing_notes: `Updated from Veriff data: ${comparison.comparisonNotes}`,
            source_type: 'veriff_validation',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error(`  ❌ Failed to update address for ${user.email}:`, updateError.message);
          results.push({
            userId: user.id,
            email: user.email,
            action: 'update_failed',
            notes: `Failed to update: ${updateError.message}`
          });
        } else {
          console.log(`  ✅ Address updated successfully for ${user.email}`);
          results.push({
            userId: user.id,
            email: user.email,
            action: 'updated',
            notes: comparison.comparisonNotes
          });
        }
      } else {
        console.log(`  ℹ️  No address update needed for ${user.email}`);
        results.push({
          userId: user.id,
          email: user.email,
          action: 'no_update_needed',
          notes: comparison.comparisonNotes
        });
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Step 4: Generate report
    console.log('\n📋 Step 4: Generating final report...\n');
    
    const updatedCount = results.filter(r => r.action === 'updated').length;
    const noUpdateCount = results.filter(r => r.action === 'no_update_needed').length;
    const failedCount = results.filter(r => r.action === 'update_failed').length;
    const noDataCount = results.filter(r => r.action === 'no_existing_address' || r.action === 'no_veriff_address').length;

    console.log('📊 Final Report');
    console.log('==================================================');
    console.log(`Total verified users processed: ${verifiedUsers.length}`);
    console.log(`Addresses updated: ${updatedCount}`);
    console.log(`No update needed: ${noUpdateCount}`);
    console.log(`Update failed: ${failedCount}`);
    console.log(`No data available: ${noDataCount}`);
    console.log('');

    if (updatedCount > 0) {
      console.log('✅ Updated addresses:');
      results.filter(r => r.action === 'updated').forEach(result => {
        console.log(`  - ${result.email}: ${result.notes}`);
      });
      console.log('');
    }

    if (failedCount > 0) {
      console.log('❌ Failed updates:');
      results.filter(r => r.action === 'update_failed').forEach(result => {
        console.log(`  - ${result.email}: ${result.notes}`);
      });
      console.log('');
    }

    console.log('✅ Veriff address update check completed!');

  } catch (error) {
    console.error('❌ Error during Veriff address update check:', error);
    process.exit(1);
  }
}

// Run the script
checkVeriffAddressUpdates();
