const fetch = require('node-fetch');

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

async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function setupInvoicesDatabase() {
  try {
    console.log('🚀 Setting up SmartBill invoices database...');
    
    // First, let's try to create the exec_sql function if it doesn't exist
    console.log('Setting up exec_sql function...');
    try {
      await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ 
          sql: `
            CREATE OR REPLACE FUNCTION exec_sql(sql text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE sql;
            END;
            $$;
          `
        })
      });
    } catch (error) {
      console.log('exec_sql function might already exist or we need to create it manually');
    }

    // Create invoices table
    console.log('Creating invoices table...');
    try {
      await executeSQL(`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          smartbill_id VARCHAR(50) UNIQUE,
          series VARCHAR(10) NOT NULL,
          number VARCHAR(50) NOT NULL,
          issue_date DATE NOT NULL,
          due_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'imported',
          total_amount DECIMAL(10,2) NOT NULL,
          vat_amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'RON',
          xml_content TEXT NOT NULL,
          import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ invoices table created');
    } catch (error) {
      console.log('⚠️ invoices table might already exist:', error.message);
    }

    // Create invoice_clients table
    console.log('Creating invoice_clients table...');
    try {
      await executeSQL(`
        CREATE TABLE IF NOT EXISTS invoice_clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          vat_code VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          country VARCHAR(100) DEFAULT 'Romania',
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ invoice_clients table created');
    } catch (error) {
      console.log('⚠️ invoice_clients table might already exist:', error.message);
    }

    // Create invoice_items table
    console.log('Creating invoice_items table...');
    try {
      await executeSQL(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
          line_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          quantity DECIMAL(10,4) NOT NULL,
          unit VARCHAR(10) NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          vat_rate DECIMAL(5,2) DEFAULT 19.00,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ invoice_items table created');
    } catch (error) {
      console.log('⚠️ invoice_items table might already exist:', error.message);
    }

    // Create flight_hours table
    console.log('Creating flight_hours table...');
    try {
      await executeSQL(`
        CREATE TABLE IF NOT EXISTS flight_hours (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id),
          invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE CASCADE,
          flight_date DATE NOT NULL,
          hours_regular DECIMAL(5,2) DEFAULT 0,
          hours_promotional DECIMAL(5,2) DEFAULT 0,
          total_hours DECIMAL(5,2) NOT NULL,
          rate_per_hour DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ flight_hours table created');
    } catch (error) {
      console.log('⚠️ flight_hours table might already exist:', error.message);
    }

    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_invoices_smartbill_id ON invoices(smartbill_id);',
      'CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);',
      'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);',
      'CREATE INDEX IF NOT EXISTS idx_invoice_clients_email ON invoice_clients(email);',
      'CREATE INDEX IF NOT EXISTS idx_invoice_clients_user_id ON invoice_clients(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);',
      'CREATE INDEX IF NOT EXISTS idx_flight_hours_user_id ON flight_hours(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_flight_hours_flight_date ON flight_hours(flight_date);',
      'CREATE INDEX IF NOT EXISTS idx_flight_hours_invoice_id ON flight_hours(invoice_id);'
    ];

    for (const indexSql of indexes) {
      try {
        await executeSQL(indexSql);
      } catch (error) {
        console.log(`⚠️ Index might already exist: ${indexSql}`);
      }
    }

    // Create trigger function
    console.log('Creating trigger function...');
    try {
      await executeSQL(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      console.log('✅ trigger function created');
    } catch (error) {
      console.log('⚠️ trigger function might already exist:', error.message);
    }

    // Create trigger
    console.log('Creating trigger...');
    try {
      await executeSQL(`
        DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
        CREATE TRIGGER update_invoices_updated_at 
          BEFORE UPDATE ON invoices 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('✅ trigger created');
    } catch (error) {
      console.log('⚠️ trigger might already exist:', error.message);
    }

    console.log('');
    console.log('✅ SmartBill invoices database setup completed successfully!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('  - invoices');
    console.log('  - invoice_clients');
    console.log('  - invoice_items');
    console.log('  - flight_hours');
    console.log('');
    console.log('📊 Indexes created for optimal performance');
    console.log('🔄 Triggers set up for automatic timestamp updates');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Go to your Supabase dashboard to verify the tables');
    console.log('2. Test the XML import at http://localhost:3000/xml-import');
    console.log('3. Import your SmartBill XML invoice');
    
  } catch (error) {
    console.error('❌ Failed to setup invoices database:', error);
    console.log('');
    console.log('💡 Alternative: Use the manual setup guide in INVOICE_DATABASE_SETUP.md');
    process.exit(1);
  }
}

// Run the setup
setupInvoicesDatabase(); 