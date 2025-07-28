const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetUserPassword() {
  try {
    const email = 'ops@cruiseraviation.ro';
    const newPassword = 'CruiserOps2024!'; // You can change this password
    
    console.log(`🔍 Resetting password for user: ${email}`);
    console.log(`🔑 New password: ${newPassword}`);
    
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔐 Password hashed successfully');
    
    // Update the user's password in the database
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      })
      .eq('email', email)
      .select('id, email, firstName, lastName');
    
    if (error) {
      console.error('❌ Error updating password:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Password updated successfully!');
      console.log('👤 User details:', data[0]);
      console.log(`📧 Email: ${data[0].email}`);
      console.log(`👤 Name: ${data[0].firstName} ${data[0].lastName}`);
      console.log(`🔑 New password: ${newPassword}`);
      console.log('\n💡 You can now login with the new password');
    } else {
      console.log('❌ User not found with email:', email);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
resetUserPassword(); 