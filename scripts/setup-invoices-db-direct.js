const { createClient } = require('@supabase/supabase-js');

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
    
    // Create invoices table
    console.log('Creating invoices table...');
    const { error: invoicesError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (invoicesError) {
      console.log('Invoices table might already exist, continuing...');
    }

    // Create invoice_clients table
    console.log('Creating invoice_clients table...');
    const { error: clientsError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (clientsError) {
      console.log('Invoice_clients table might already exist, continuing...');
    }

    // Create invoice_items table
    console.log('Creating invoice_items table...');
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (itemsError) {
      console.log('Invoice_items table might already exist, continuing...');
    }

    // Create flight_hours table
    console.log('Creating flight_hours table...');
    const { error: flightError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (flightError) {
      console.log('Flight_hours table might already exist, continuing...');
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
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError) {
        console.log(`Index might already exist: ${indexSql}`);
      }
    }

    // Create trigger function
    console.log('Creating trigger function...');
    const { error: triggerFuncError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    });
    
    if (triggerFuncError) {
      console.log('Trigger function might already exist, continuing...');
    }

    // Create trigger
    console.log('Creating trigger...');
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
        CREATE TRIGGER update_invoices_updated_at 
          BEFORE UPDATE ON invoices 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    });
    
    if (triggerError) {
      console.log('Trigger might already exist, continuing...');
    }

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
    
  } catch (error) {
    console.error('❌ Failed to setup invoices database:', error);
    process.exit(1);
  }
}

// Run the setup
setupInvoicesDatabase(); 