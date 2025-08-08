import { createClient } from '@supabase/supabase-js';

let OpenAI: any;
try {
  OpenAI = require('openai').default || require('openai');
} catch (e) {
  console.warn('OpenAI not available in production - address normalization disabled');
  OpenAI = null;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize OpenAI client (only if available)
let openai: any = null;
if (OpenAI) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  } catch (e) {
    console.warn('Failed to initialize OpenAI client:', e);
    openai = null;
  }
}

interface NormalizedAddress {
  street_address?: string;
  city?: string;
  state_region?: string;
  country?: string;
  postal_code?: string;
  confidence_score?: number;
  processing_notes?: string;
}

interface AddressComparisonResult {
  shouldUpdate: boolean;
  updatedAddress?: NormalizedAddress;
  comparisonNotes: string;
  confidenceScore: number;
}

/**
 * Compare existing normalized address with Veriff address data using OpenAI
 */
async function compareAddressWithVeriff(
  existingAddress: NormalizedAddress, 
  veriffAddress: string, 
  userEmail: string
): Promise<AddressComparisonResult> {
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

  if (!openai) {
    console.warn('OpenAI not available - using fallback address comparison');
    return {
      shouldUpdate: false,
      comparisonNotes: 'OpenAI not available in production - comparison disabled',
      confidenceScore: 0.1
    };
  }

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
      comparisonNotes: result.comparison_notes || 'No comparison notes',
      confidenceScore: result.confidence_score || 0.5
    };

  } catch (error) {
    console.error('❌ Error comparing addresses with OpenAI:', error);
    
    return {
      shouldUpdate: false,
      comparisonNotes: `Error during comparison: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidenceScore: 0.1
    };
  }
}

/**
 * Normalize Veriff address using OpenAI
 */
async function normalizeVeriffAddress(veriffAddress: string, userEmail: string): Promise<NormalizedAddress> {
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

  if (!openai) {
    console.warn('OpenAI not available - using fallback address normalization');
    return {
      street_address: veriffAddress,
      city: 'Unknown',
      state_region: 'Unknown',
      country: 'Romania',
      confidence_score: 0.1,
      processing_notes: 'OpenAI not available in production - normalization disabled'
    };
  }

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
 * Update normalized address after Veriff verification
 */
export async function updateAddressAfterVeriff(userId: string): Promise<{
  success: boolean;
  action: 'updated' | 'created' | 'no_change' | 'error';
  notes?: string;
  error?: string;
}> {
  try {
    console.log(`🔄 Checking address updates for user ${userId} after Veriff verification`);

    // Get user data with Veriff information
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "veriffPersonCountry",
        "veriffStatus",
        address,
        city,
        state,
        "zipCode",
        country
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return {
        success: false,
        action: 'error',
        error: `User not found: ${userError?.message || 'Unknown error'}`
      };
    }

    // Check if user is verified
    if (user.veriffStatus !== 'approved') {
      return {
        success: false,
        action: 'error',
        error: 'User is not verified'
      };
    }

    // Check if user has Veriff address data
    if (!user.address) {
      return {
        success: false,
        action: 'error',
        error: 'No Veriff address data available'
      };
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

    // Get existing normalized address
    const { data: existingAddress, error: addressError } = await supabase
      .from('normalized_addresses')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (addressError && addressError.code !== 'PGRST116') {
      console.error('Error fetching existing address:', addressError);
    }

    if (!existingAddress) {
      // Create new normalized address from Veriff data
      console.log(`📝 Creating new normalized address for ${user.email} from Veriff data`);
      
      const normalizedAddress = await normalizeVeriffAddress(veriffAddress, user.email);
      
      const { error: insertError } = await supabase
        .from('normalized_addresses')
        .insert({
          user_id: userId,
          street_address: normalizedAddress.street_address,
          city: normalizedAddress.city,
          state_region: normalizedAddress.state_region,
          country: normalizedAddress.country,
          postal_code: normalizedAddress.postal_code,
          confidence_score: normalizedAddress.confidence_score,
          processing_notes: `Created from Veriff verification: ${normalizedAddress.processing_notes}`,
          source_type: 'veriff_validation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        return {
          success: false,
          action: 'error',
          error: `Failed to create normalized address: ${insertError.message}`
        };
      }

      return {
        success: true,
        action: 'created',
        notes: `Created new normalized address from Veriff verification: ${normalizedAddress.processing_notes}`
      };
    }

    // Compare existing address with Veriff data
    console.log(`🔍 Comparing existing address with Veriff data for ${user.email}`);
    
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
      // Update the normalized address
      console.log(`✅ Updating normalized address for ${user.email}`);
      
      const { error: updateError } = await supabase
        .from('normalized_addresses')
        .update({
          street_address: comparison.updatedAddress.street_address,
          city: comparison.updatedAddress.city,
          state_region: comparison.updatedAddress.state_region,
          country: comparison.updatedAddress.country,
          postal_code: comparison.updatedAddress.postal_code,
          confidence_score: comparison.updatedAddress.confidence_score,
          processing_notes: `Updated from Veriff verification: ${comparison.comparisonNotes}`,
          source_type: 'veriff_validation',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          action: 'error',
          error: `Failed to update address: ${updateError.message}`
        };
      }

      return {
        success: true,
        action: 'updated',
        notes: `Updated from Veriff verification: ${comparison.comparisonNotes}`
      };
    } else {
      // No update needed, but add a note about the comparison
      console.log(`ℹ️ No address update needed for ${user.email}`);
      
      const currentNotes = existingAddress.processing_notes || '';
      const newNotes = `Veriff verification completed - no address changes needed. ${comparison.comparisonNotes}`;
      const combinedNotes = currentNotes ? `${currentNotes}\n\n${newNotes}` : newNotes;

      const { error: noteError } = await supabase
        .from('normalized_addresses')
        .update({
          processing_notes: combinedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (noteError) {
        console.error('Failed to update processing notes:', noteError);
      }

      return {
        success: true,
        action: 'no_change',
        notes: `Veriff verification completed - no address changes needed. ${comparison.comparisonNotes}`
      };
    }

  } catch (error) {
    console.error('❌ Error updating address after Veriff verification:', error);
    return {
      success: false,
      action: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
