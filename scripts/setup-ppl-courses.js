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
  console.error('');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupPPLCourses() {
  console.log('🚀 Setting up PPL Course Tranches table...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-ppl-courses.sql');
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
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        console.error('Statement:', statement);
        throw error;
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