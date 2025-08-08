const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupInvoiceCounters() {
  try {
    console.log('🚀 Setting up invoice counters table...');

    // Read the SQL script
    const sqlPath = path.join(__dirname, 'add-invoice-counters-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query (for newer Supabase versions)
      console.log('⚠️  exec_sql not available, trying direct query...');
      
      // Split the SQL into individual statements
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (stmtError) {
            console.log(`⚠️  Statement failed (this might be expected): ${statement.substring(0, 50)}...`);
          }
        }
      }
    }

    // Verify the table was created
    const { data: counters, error: selectError } = await supabase
      .from('invoice_counters')
      .select('*');

    if (selectError) {
      console.error('❌ Error verifying table creation:', selectError);
      process.exit(1);
    }

    console.log('✅ Invoice counters table created successfully!');
    console.log('📊 Current counters:');
    counters.forEach(counter => {
      console.log(`   ${counter.series}: ${counter.current_counter} (start: ${counter.start_number})`);
    });

    console.log('\n🎯 Next steps:');
    console.log('1. Update the microservice to use Supabase for counter persistence');
    console.log('2. Test the persistent counter functionality');
    console.log('3. Restart the microservice to verify counters persist');

  } catch (error) {
    console.error('❌ Error setting up invoice counters:', error);
    process.exit(1);
  }
}

setupInvoiceCounters();
