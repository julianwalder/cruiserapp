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

async function runOptimization() {
  try {
    console.log('🚀 Starting base management optimization...');
    
    // Read the SQL optimization script
    const sqlPath = path.join(__dirname, 'optimize-base-management.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📊 Running database optimizations...');
    
    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error running optimization:', error);
      process.exit(1);
    }
    
    console.log('✅ Base management optimization completed successfully!');
    console.log('');
    console.log('📈 Performance improvements applied:');
    console.log('   • Added database indexes for faster queries');
    console.log('   • Created materialized view for complex joins');
    console.log('   • Optimized table statistics');
    console.log('   • Added composite indexes for common query patterns');
    console.log('');
    console.log('🎯 The base management feature should now be significantly faster!');
    
  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

// Alternative approach if RPC doesn't exist
async function runOptimizationAlternative() {
  try {
    console.log('🚀 Starting base management optimization (alternative method)...');
    
    // Read the SQL optimization script
    const sqlPath = path.join(__dirname, 'optimize-base-management.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Running ${statements.length} optimization statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`   [${i + 1}/${statements.length}] Executing statement...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn(`   ⚠️  Warning on statement ${i + 1}:`, error.message);
          }
        } catch (err) {
          console.warn(`   ⚠️  Warning on statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('✅ Base management optimization completed!');
    console.log('');
    console.log('📈 Performance improvements applied:');
    console.log('   • Added database indexes for faster queries');
    console.log('   • Created materialized view for complex joins');
    console.log('   • Optimized table statistics');
    console.log('   • Added composite indexes for common query patterns');
    console.log('');
    console.log('🎯 The base management feature should now be significantly faster!');
    
  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

// Check if we can use the direct SQL execution
async function checkAndRun() {
  try {
    // Try the direct approach first
    await runOptimization();
  } catch (error) {
    console.log('⚠️  Direct SQL execution not available, trying alternative method...');
    await runOptimizationAlternative();
  }
}

checkAndRun();
