const { createClient } = require('@supabase/supabase-js');
const { OpenAIAddressService } = require('../src/lib/openai-address-service');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
      
      // Get the most recent invoice with address data for this user
      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          client_address,
          import_date
        `)
        .eq('client_email', user.email)
        .not('client_address', 'is', null)
        .order('import_date', { ascending: false })
        .limit(1);

      if (invoiceError) {
        console.error(`❌ Error fetching invoices for ${user.email}:`, invoiceError.message);
        continue;
      }

      if (invoices && invoices.length > 0) {
        const invoice = invoices[0];
        console.log(`  📄 Found invoice with address: ${invoice.client_address}`);
        
        addressData.push({
          userId: user.id,
          email: user.email,
          rawAddress: invoice.client_address,
          invoiceId: invoice.id
        });
      } else {
        console.log(`  ⚠️  No invoice addresses found for ${user.email}`);
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
    
    const results = await OpenAIAddressService.batchNormalizeInvoiceAddresses(addressesToProcess);

    // Step 5: Store normalized addresses in database
    console.log('\n💾 Step 4: Storing normalized addresses...');
    
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    console.log(`📊 Results: ${successfulResults.length} successful, ${failedResults.length} failed`);

    if (successfulResults.length > 0) {
      const normalizedAddresses = successfulResults.map(result => ({
        user_id: result.userId,
        street_address: result.normalizedAddress.street_address,
        city: result.normalizedAddress.city,
        state_region: result.normalizedAddress.state_region,
        country: result.normalizedAddress.country,
        postal_code: result.normalizedAddress.postal_code,
        source_type: 'invoice_import',
        source_data: {
          raw_address: addressData.find(addr => addr.userId === result.userId)?.rawAddress,
          invoice_id: addressData.find(addr => addr.userId === result.userId)?.invoiceId
        },
        confidence_score: result.normalizedAddress.confidence_score,
        processing_notes: result.normalizedAddress.processing_notes
      }));

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
