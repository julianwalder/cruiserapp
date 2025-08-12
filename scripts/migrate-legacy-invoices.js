const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateLegacyInvoices() {
  console.log('🔧 Starting legacy invoice migration...');
  
  try {
    // Step 1: Get current state
    console.log('📊 Checking current state...');
    const { data: currentState, error: stateError } = await supabase
      .from('invoice_clients')
      .select('id, email, user_id, name')
      .order('created_at', { ascending: false });

    if (stateError) {
      console.error('❌ Error fetching current state:', stateError);
      return;
    }

    const totalClients = currentState.length;
    const linkedClients = currentState.filter(c => c.user_id).length;
    const unlinkedClients = totalClients - linkedClients;

    console.log(`📈 Current state:`);
    console.log(`   Total invoice clients: ${totalClients}`);
    console.log(`   Already linked to users: ${linkedClients}`);
    console.log(`   Unlinked clients: ${unlinkedClients}`);

    // Step 2: Get all users with emails
    console.log('👥 Fetching users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .not('email', 'is', null);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} users with email addresses`);

    // Step 3: Update invoice_clients to link users by email
    console.log('🔗 Linking invoices to users by email...');
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      if (!user.email) continue;

      const { data: updateResult, error: updateError } = await supabase
        .from('invoice_clients')
        .update({ user_id: user.id })
        .eq('email', user.email)
        .is('user_id', null);

      if (updateError) {
        console.error(`❌ Error updating invoices for ${user.email}:`, updateError);
        errorCount++;
      } else if (updateResult && updateResult.length > 0) {
        console.log(`✅ Linked ${updateResult.length} invoices to ${user.email} (${user.firstName} ${user.lastName})`);
        updatedCount += updateResult.length;
      }
    }

    // Step 4: Show final results
    console.log('\n📊 Migration Results:');
    console.log(`   Total invoices linked: ${updatedCount}`);
    console.log(`   Errors encountered: ${errorCount}`);

    // Step 5: Show users with their invoice counts
    console.log('\n👥 Users with linked invoices:');
    const { data: userInvoices, error: userInvoicesError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        firstName,
        lastName,
        invoice_clients!inner(id)
      `)
      .not('email', 'is', null);

    if (!userInvoicesError && userInvoices) {
      userInvoices.forEach(user => {
        const invoiceCount = user.invoice_clients?.length || 0;
        if (invoiceCount > 0) {
          console.log(`   ${user.firstName} ${user.lastName} (${user.email}): ${invoiceCount} invoices`);
        }
      });
    }

    // Step 6: Show unlinked clients for manual review
    console.log('\n⚠️  Unlinked clients (for manual review):');
    const { data: unlinkedClients, error: unlinkedError } = await supabase
      .from('invoice_clients')
      .select(`
        email,
        name,
        vat_code,
        invoices!inner(id, smartbill_id)
      `)
      .is('user_id', null)
      .not('email', 'is', null);

    if (!unlinkedError && unlinkedClients) {
      const groupedClients = unlinkedClients.reduce((acc, client) => {
        const key = client.email || 'no-email';
        if (!acc[key]) {
          acc[key] = {
            email: client.email,
            name: client.name,
            vat_code: client.vat_code,
            invoice_count: 0
          };
        }
        acc[key].invoice_count += client.invoices?.length || 0;
        return acc;
      }, {});

      Object.values(groupedClients)
        .sort((a, b) => b.invoice_count - a.invoice_count)
        .forEach(client => {
          console.log(`   ${client.email} (${client.name}): ${client.invoice_count} invoices`);
        });
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Review unlinked clients above');
    console.log('   2. Manually link any remaining invoices if needed');
    console.log('   3. Test the billing page to ensure invoices are now visible');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateLegacyInvoices()
  .then(() => {
    console.log('🏁 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
