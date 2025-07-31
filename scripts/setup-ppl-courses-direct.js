const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupPPLCourses() {
  console.log('🚀 Setting up PPL Course Tranches table...');
  
  try {
    // Create the table
    console.log('📝 Creating ppl_course_tranches table...');
    const { error: createTableError } = await supabase.rpc('create_ppl_course_tranches_table');
    
    if (createTableError) {
      console.log('Table creation via RPC failed, trying direct SQL...');
      
      // Try direct SQL execution
      const { error: sqlError } = await supabase
        .from('ppl_course_tranches')
        .select('id')
        .limit(1);
      
      if (sqlError && sqlError.code === '42P01') {
        // Table doesn't exist, create it manually
        console.log('Creating table manually...');
        
        // We'll need to create the table through the Supabase dashboard
        // or use a migration tool. For now, let's provide instructions.
        console.log('❌ Table creation requires manual setup.');
        console.log('');
        console.log('Please run the following SQL in your Supabase SQL editor:');
        console.log('');
        console.log(`
-- Create PPL Course Tranches table
CREATE TABLE IF NOT EXISTS ppl_course_tranches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  tranche_number INTEGER NOT NULL,
  total_tranches INTEGER NOT NULL,
  hours_allocated DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_course_hours DECIMAL(5,2) NOT NULL DEFAULT 45,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RON',
  description TEXT,
  purchase_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  used_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  remaining_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique tranche per invoice
  UNIQUE(invoice_id, tranche_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_user_id ON ppl_course_tranches(user_id);
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_invoice_id ON ppl_course_tranches(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_status ON ppl_course_tranches(status);
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_purchase_date ON ppl_course_tranches(purchase_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ppl_course_tranches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_ppl_course_tranches_updated_at
  BEFORE UPDATE ON ppl_course_tranches
  FOR EACH ROW
  EXECUTE FUNCTION update_ppl_course_tranches_updated_at();

-- Add RLS policies
ALTER TABLE ppl_course_tranches ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own PPL course tranches
CREATE POLICY "Users can view their own PPL course tranches" ON ppl_course_tranches
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for admins to see all PPL course tranches
CREATE POLICY "Admins can view all PPL course tranches" ON ppl_course_tranches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER')
    )
  );

-- Policy for instructors to see PPL course tranches of their students
CREATE POLICY "Instructors can view PPL course tranches of their students" ON ppl_course_tranches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      JOIN flight_logs fl ON fl.instructorId = u.id AND fl.pilotId = ppl_course_tranches.user_id
      WHERE u.id = auth.uid() 
      AND r.name = 'INSTRUCTOR'
    )
  );

-- Insert policy for admins
CREATE POLICY "Admins can insert PPL course tranches" ON ppl_course_tranches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER')
    )
  );

-- Update policy for admins
CREATE POLICY "Admins can update PPL course tranches" ON ppl_course_tranches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER')
    )
  );

-- Delete policy for admins
CREATE POLICY "Admins can delete PPL course tranches" ON ppl_course_tranches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER')
    )
  );
        `);
        console.log('');
        console.log('After running the SQL, you can test the setup with:');
        console.log('node scripts/test-ppl-setup.js');
        return;
      }
    }
    
    console.log('✅ PPL Course Tranches table setup completed successfully!');
    
    // Verify the table was created
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'ppl_course_tranches');
    
    if (tableError) {
      console.error('❌ Error verifying table creation:', tableError);
    } else if (tables && tables.length > 0) {
      console.log('✅ PPL Course Tranches table verified successfully!');
    } else {
      console.error('❌ PPL Course Tranches table not found after setup');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupPPLCourses(); 