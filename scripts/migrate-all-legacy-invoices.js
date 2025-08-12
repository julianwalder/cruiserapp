const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAllLegacyInvoices() {
  try {
    console.log('🔧 Starting comprehensive legacy invoice migration...\n');

    // Step 1: Get all users with their emails
    console.log('📋 Step 1: Fetching all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status
      `)
      .eq('status', 'ACTIVE');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} active users`);
    
    // Create a map of email to user ID for quick lookup
    const emailToUserId = {};
    users.forEach(user => {
      if (user.email) {
        emailToUserId[user.email.toLowerCase()] = user.id;
      }
    });

    console.log(`📧 Email mappings created for ${Object.keys(emailToUserId).length} users\n`);

    // Step 2: Get all invoices that need to be linked
    console.log('📄 Step 2: Fetching all invoices...');
    const { data: allInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        payment_method,
        client:invoice_clients(
          id,
          name,
          email,
          user_id
        )
      `);

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      return;
    }

    console.log(`✅ Found ${allInvoices.length} total invoices`);

    // Step 3: Analyze which invoices need linking
    console.log('\n🔍 Step 3: Analyzing invoices that need linking...');
    
    const invoicesToUpdate = [];
    const invoicesAlreadyLinked = [];
    const invoicesNoClient = [];
    const invoicesNoEmail = [];

    allInvoices.forEach(invoice => {
      const client = invoice.client?.[0];
      
      if (!client) {
        invoicesNoClient.push(invoice);
        return;
      }

      if (!client.email) {
        invoicesNoEmail.push(invoice);
        return;
      }

      const userEmail = client.email.toLowerCase();
      const userId = emailToUserId[userEmail];

      if (!userId) {
        invoicesNoEmail.push(invoice);
        return;
      }

      if (client.user_id === userId) {
        invoicesAlreadyLinked.push(invoice);
      } else {
        invoicesToUpdate.push({
          clientId: client.id,
          invoiceId: invoice.id,
          smartbillId: invoice.smartbill_id,
          email: client.email,
          userId: userId,
          currentUserId: client.user_id
        });
      }
    });

    console.log(`📊 Analysis Results:`);
    console.log(`  - Already linked: ${invoicesAlreadyLinked.length}`);
    console.log(`  - Need linking: ${invoicesToUpdate.length}`);
    console.log(`  - No client record: ${invoicesNoClient.length}`);
    console.log(`  - No matching email: ${invoicesNoEmail.length}`);

    if (invoicesToUpdate.length === 0) {
      console.log('\n✅ No invoices need to be linked!');
      return;
    }

    // Step 4: Update invoice_clients table
    console.log(`\n🔧 Step 4: Updating ${invoicesToUpdate.length} invoice client records...`);
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const invoice of invoicesToUpdate) {
      try {
        const { data: updateResult, error: updateError } = await supabase
          .from('invoice_clients')
          .update({ user_id: invoice.userId })
          .eq('id', invoice.clientId);

        if (updateError) {
          console.error(`❌ Error updating invoice ${invoice.smartbillId}:`, updateError);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount % 10 === 0) {
            console.log(`  ✅ Updated ${updatedCount}/${invoicesToUpdate.length} invoices...`);
          }
        }
      } catch (error) {
        console.error(`❌ Exception updating invoice ${invoice.smartbillId}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📈 Migration Results:`);
    console.log(`  ✅ Successfully updated: ${updatedCount} invoices`);
    console.log(`  ❌ Errors: ${errorCount} invoices`);

    // Step 5: Show summary by user
    console.log('\n📋 Step 5: Generating summary by user...');
    
    const userSummary = {};
    invoicesToUpdate.forEach(invoice => {
      if (!userSummary[invoice.userId]) {
        userSummary[invoice.userId] = {
          email: invoice.email,
          count: 0,
          invoices: []
        };
      }
      userSummary[invoice.userId].count++;
      userSummary[invoice.userId].invoices.push(invoice.smartbillId);
    });

    console.log('\n👥 Invoices linked by user:');
    Object.entries(userSummary).forEach(([userId, data]) => {
      const user = users.find(u => u.id === userId);
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
      console.log(`  - ${userName} (${data.email}): ${data.count} invoices`);
      if (data.count <= 5) {
        console.log(`    Invoices: ${data.invoices.join(', ')}`);
      } else {
        console.log(`    Invoices: ${data.invoices.slice(0, 3).join(', ')}... and ${data.count - 3} more`);
      }
    });

    // Step 6: Verify the results
    console.log('\n🔍 Step 6: Verifying migration results...');
    
    const { data: verificationResults, error: verificationError } = await supabase
      .from('invoice_clients')
      .select(`
        id,
        email,
        user_id,
        invoice:invoices(
          smartbill_id
        )
      `)
      .not('user_id', 'is', null);

    if (verificationError) {
      console.error('❌ Error verifying results:', verificationError);
    } else {
      const linkedCount = verificationResults.length;
      console.log(`✅ Verification: ${linkedCount} invoice client records now have user_id linked`);
      
      // Count by user
      const userCounts = {};
      verificationResults.forEach(result => {
        const userId = result.user_id;
        userCounts[userId] = (userCounts[userId] || 0) + 1;
      });

      console.log('\n📊 Final user invoice counts:');
      Object.entries(userCounts).forEach(([userId, count]) => {
        const user = users.find(u => u.id === userId);
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
        console.log(`  - ${userName}: ${count} invoices`);
      });
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateAllLegacyInvoices();
