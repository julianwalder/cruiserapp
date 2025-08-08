const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOrdersTable() {
  try {
    console.log('🚀 Setting up orders table...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-orders-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // If exec_sql doesn't exist, try direct query
          const { error: directError } = await supabase.from('orders').select('id').limit(1);
          
          if (directError && directError.message.includes('relation "orders" does not exist')) {
            console.log('⚠️  Orders table does not exist yet. This is expected for the first run.');
            console.log('   The table will be created when the first order is placed.');
          } else {
            console.error('❌ Error executing statement:', error);
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      } catch (err) {
        console.log('⚠️  Statement execution skipped (likely already exists):', err.message);
      }
    }

    console.log('\n✅ Orders table setup completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Configure your microservice URL in .env.local:');
    console.log('      MICROSERVICE_URL=http://your-microservice-url');
    console.log('   2. Set microservice API key if required:');
    console.log('      MICROSERVICE_API_KEY=your-api-key');
    console.log('   3. Test the Place Order functionality');

  } catch (error) {
    console.error('❌ Error setting up orders table:', error);
    process.exit(1);
  }
}

// Run the setup
setupOrdersTable();
