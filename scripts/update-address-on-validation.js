const { createClient } = require('@supabase/supabase-js');
const { OpenAIAddressService } = require('../src/lib/openai-address-service');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
      const normalizedAddress = await OpenAIAddressService.normalizeAddress({
        rawAddress: user.veriffPersonAddress,
        sourceType: 'veriff_validation',
        userEmail: user.email,
        context: `User validation with ID: ${user.veriffPersonIdNumber}`
      });

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
      const comparison = await OpenAIAddressService.compareAndUpdateAddress({
        existingAddress: {
          street_address: existingAddress.street_address,
          city: existingAddress.city,
          state_region: existingAddress.state_region,
          country: existingAddress.country,
          postal_code: existingAddress.postal_code,
          confidence_score: existingAddress.confidence_score,
          processing_notes: existingAddress.processing_notes
        },
        newAddress: user.veriffPersonAddress,
        sourceType: 'veriff_validation',
        userEmail: user.email
      });

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

async function batchUpdateAddressesOnValidation(userIds) {
  console.log(`🚀 Starting batch address update for ${userIds.length} users...\n`);

  const results = [];

  for (const userId of userIds) {
    try {
      console.log(`\n--- Processing user: ${userId} ---`);
      const result = await updateAddressOnValidation(userId);
      results.push({ userId, ...result });
    } catch (error) {
      console.error(`❌ Failed to update address for user ${userId}:`, error.message);
      results.push({ 
        userId, 
        success: false, 
        error: error.message 
      });
    }

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Generate summary report
  console.log('\n📋 Final Report');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const created = successful.filter(r => r.action === 'created');
  const updated = successful.filter(r => r.action === 'updated');
  const kept = successful.filter(r => r.action === 'kept_existing');

  console.log(`Total users processed: ${userIds.length}`);
  console.log(`Successful updates: ${successful.length}`);
  console.log(`Failed updates: ${failed.length}`);
  console.log(`New addresses created: ${created.length}`);
  console.log(`Addresses updated: ${updated.length}`);
  console.log(`Addresses kept (no change): ${kept.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed updates:');
    failed.forEach(result => {
      console.log(`  - User ${result.userId}: ${result.error || result.reason}`);
    });
  }

  return results;
}

// Run the script
if (require.main === module) {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Please provide a user ID as argument');
    console.log('Usage: node scripts/update-address-on-validation.js <userId>');
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

module.exports = { updateAddressOnValidation, batchUpdateAddressesOnValidation };
