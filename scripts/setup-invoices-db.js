const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupInvoicesDatabase() {
  try {
    console.log('🚀 Setting up SmartBill invoices database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-invoices-db.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement using the REST API
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Use the REST API to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Error executing statement ${i + 1}:`, errorData);
          console.error('Statement:', statement);
          throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
        }
      }
    }
    
    console.log('✅ SmartBill invoices database setup completed successfully!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('  - invoices');
    console.log('  - invoice_clients');
    console.log('  - invoice_items');
    console.log('  - flight_hours');
    console.log('');
    console.log('🔐 Row Level Security (RLS) enabled with proper policies');
    console.log('📊 Indexes created for optimal performance');
    console.log('🔄 Triggers set up for automatic timestamp updates');
    
  } catch (error) {
    console.error('❌ Failed to setup invoices database:', error);
    process.exit(1);
  }
}

// Run the setup
setupInvoicesDatabase(); 