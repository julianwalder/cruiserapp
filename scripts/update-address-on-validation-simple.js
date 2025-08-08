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

// Compare addresses function
async function compareAndUpdateAddress(existingAddress, newAddress, sourceType, userEmail) {
  const systemPrompt = `You are an expert in comparing Romanian addresses. Your task is to determine if a new address should replace an existing normalized address.

RULES:
1. If the new address is more complete/detailed, prefer it
2. If the new address has higher quality data (from ID validation), prefer it
3. If addresses are essentially the same, keep the existing one
4. Consider confidence scores and data sources
5. For Bucharest: "București" + "Sector X" is better than just "București"

Return ONLY a valid JSON object:
{
  "should_update": true/false,
  "updated_address": { normalized address object if should_update is true },
  "comparison_notes": "Explanation of the decision",
  "confidence_score": 0.95
}`;

  const userPrompt = `Compare these addresses:

EXISTING ADDRESS:
${JSON.stringify(existingAddress, null, 2)}

NEW ADDRESS:
Raw: ${newAddress}
Source: ${sourceType}
${userEmail ? `User: ${userEmail}` : ''}

Should the new address replace the existing one? Return JSON with decision.`;

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

async function updateAddressOnValidation(userId) {
  console.log(`🚀 Starting address update for user: ${userId}\n`);

  try {
    // Step 1: Get user data including Veriff validation data
    console.log('📋 Step 1: Fetching user data...');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "veriffPersonAddress",
        "veriffPersonIdNumber",
        "veriffPersonGivenName",
        "veriffPersonLastName"
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message || 'Unknown error'}`);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`Veriff address: ${user.veriffPersonAddress || 'None'}`);

    if (!user.veriffPersonAddress) {
      console.log('⚠️  No Veriff address data found for this user');
      return { success: false, reason: 'No Veriff address data' };
    }

    // Step 2: Get existing normalized address
    console.log('\n📋 Step 2: Checking existing normalized address...');
    
    const { data: existingAddress, error: existingError } = await supabase
      .from('normalized_addresses')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch existing address: ${existingError.message}`);
    }

    if (!existingAddress) {
      console.log('📝 No existing normalized address found, creating new one...');
      
      // Create new normalized address from Veriff data
      const normalizedAddress = await normalizeAddress(
        user.veriffPersonAddress,
        'veriff_validation',
        user.email
      );

      const { data: insertedAddress, error: insertError } = await supabase
        .from('normalized_addresses')
        .insert({
          user_id: userId,
          street_address: normalizedAddress.street_address,
          city: normalizedAddress.city,
          state_region: normalizedAddress.state_region,
          country: normalizedAddress.country,
          postal_code: normalizedAddress.postal_code,
          source_type: 'veriff_validation',
          source_data: {
            raw_address: user.veriffPersonAddress,
            veriff_id_number: user.veriffPersonIdNumber,
            veriff_name: `${user.veriffPersonGivenName} ${user.veriffPersonLastName}`
          },
          confidence_score: normalizedAddress.confidence_score,
          processing_notes: normalizedAddress.processing_notes
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to insert normalized address: ${insertError.message}`);
      }

      console.log('✅ New normalized address created from Veriff data');
      return { 
        success: true, 
        action: 'created',
        address: insertedAddress 
      };

    } else {
      console.log('📝 Existing normalized address found, comparing with Veriff data...');
      
      // Compare existing address with new Veriff data
      const comparison = await compareAndUpdateAddress(
        {
          street_address: existingAddress.street_address,
          city: existingAddress.city,
          state_region: existingAddress.state_region,
          country: existingAddress.country,
          postal_code: existingAddress.postal_code,
          confidence_score: existingAddress.confidence_score,
          processing_notes: existingAddress.processing_notes
        },
        user.veriffPersonAddress,
        'veriff_validation',
        user.email
      );

      console.log(`Comparison result: ${comparison.shouldUpdate ? 'UPDATE' : 'KEEP EXISTING'}`);
      console.log(`Notes: ${comparison.comparisonNotes}`);

      if (comparison.shouldUpdate && comparison.updatedAddress) {
        console.log('🔄 Updating normalized address with Veriff data...');
        
        const { data: updatedAddress, error: updateError } = await supabase
          .from('normalized_addresses')
          .update({
            street_address: comparison.updatedAddress.street_address,
            city: comparison.updatedAddress.city,
            state_region: comparison.updatedAddress.state_region,
            country: comparison.updatedAddress.country,
            postal_code: comparison.updatedAddress.postal_code,
            source_type: 'veriff_validation',
            source_data: {
              ...existingAddress.source_data,
              previous_source: existingAddress.source_type,
              veriff_raw_address: user.veriffPersonAddress,
              veriff_id_number: user.veriffPersonIdNumber,
              comparison_notes: comparison.comparisonNotes
            },
            confidence_score: comparison.updatedAddress.confidence_score,
            processing_notes: comparison.updatedAddress.processing_notes,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update normalized address: ${updateError.message}`);
        }

        console.log('✅ Normalized address updated with Veriff data');
        return { 
          success: true, 
          action: 'updated',
          address: updatedAddress,
          comparison: comparison
        };

      } else {
        console.log('✅ Keeping existing normalized address (Veriff data not better)');
        return { 
          success: true, 
          action: 'kept_existing',
          address: existingAddress,
          comparison: comparison
        };
      }
    }

  } catch (error) {
    console.error('❌ Error updating address on validation:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Please provide a user ID as argument');
    console.log('Usage: node scripts/update-address-on-validation-simple.js <userId>');
    process.exit(1);
  }

  updateAddressOnValidation(userId)
    .then(result => {
      console.log('\n✅ Address update completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Address update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateAddressOnValidation };
