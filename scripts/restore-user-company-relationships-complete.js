const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreUserCompanyRelationshipsComplete() {
  console.log('🔧 Restoring user_company_relationships table with proper foreign key relationships...');
  
  try {
    // Step 1: Get all backup data
    console.log('📊 Step 1: Fetching backup data...');
    
    const { data: backupRelationships, error: backupRelationshipsError } = await supabase
      .from('user_company_relationships_backup')
      .select('*');

    if (backupRelationshipsError) {
      console.error('❌ Error fetching backup relationships:', backupRelationshipsError);
      return;
    }

    const { data: backupUsers, error: backupUsersError } = await supabase
      .from('users_backup')
      .select('id, email, firstName, lastName');

    if (backupUsersError) {
      console.error('❌ Error fetching backup users:', backupUsersError);
      return;
    }

    const { data: backupCompanies, error: backupCompaniesError } = await supabase
      .from('companies_backup')
      .select('id, name, vat_code, email');

    if (backupCompaniesError) {
      console.error('❌ Error fetching backup companies:', backupCompaniesError);
      return;
    }

    const { data: currentUsers, error: currentUsersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName');

    if (currentUsersError) {
      console.error('❌ Error fetching current users:', currentUsersError);
      return;
    }

    const { data: currentCompanies, error: currentCompaniesError } = await supabase
      .from('companies')
      .select('id, name, vat_code, email');

    if (currentCompaniesError) {
      console.error('❌ Error fetching current companies:', currentCompaniesError);
      return;
    }

    console.log(`✅ Found ${backupRelationships.length} backup relationships`);
    console.log(`✅ Found ${backupUsers.length} backup users`);
    console.log(`✅ Found ${backupCompanies.length} backup companies`);
    console.log(`✅ Found ${currentUsers.length} current users`);
    console.log(`✅ Found ${currentCompanies.length} current companies`);

    // Step 2: Create mappings from backup IDs to current UUIDs
    console.log('📊 Step 2: Creating ID mappings...');
    
    // Create mapping from old user ID to email
    const oldUserIdToEmail = new Map();
    backupUsers.forEach(user => {
      oldUserIdToEmail.set(user.id, user.email);
    });

    // Create mapping from email to new user UUID
    const emailToNewUserId = new Map();
    currentUsers.forEach(user => {
      emailToNewUserId.set(user.email, user.id);
    });

    // Create mapping from old company ID to email/VAT
    const oldCompanyIdToEmail = new Map();
    const oldCompanyIdToVat = new Map();
    backupCompanies.forEach(company => {
      oldCompanyIdToEmail.set(company.id, company.email);
      oldCompanyIdToVat.set(company.id, company.vat_code);
    });

    // Create mapping from email/VAT to new company UUID
    const emailToNewCompanyId = new Map();
    const vatToNewCompanyId = new Map();
    currentCompanies.forEach(company => {
      if (company.email) {
        emailToNewCompanyId.set(company.email, company.id);
      }
      if (company.vat_code) {
        vatToNewCompanyId.set(company.vat_code, company.id);
      }
    });

    // Step 3: Process each backup relationship
    console.log('📊 Step 3: Processing backup relationships...');
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const backupRelationship of backupRelationships) {
      try {
        // Map the old user ID to new UUID
        const userEmail = oldUserIdToEmail.get(backupRelationship.user_id);
        let newUserId = null;
        
        if (userEmail) {
          newUserId = emailToNewUserId.get(userEmail);
          if (!newUserId) {
            console.log(`   ⚠️  No current user found for email: ${userEmail}`);
          }
        } else {
          console.log(`   ⚠️  No email found for old user ID: ${backupRelationship.user_id}`);
        }

        // Map the old company ID to new UUID
        const companyEmail = oldCompanyIdToEmail.get(backupRelationship.company_id);
        const companyVat = oldCompanyIdToVat.get(backupRelationship.company_id);
        let newCompanyId = null;
        
        if (companyEmail) {
          newCompanyId = emailToNewCompanyId.get(companyEmail);
        }
        
        if (!newCompanyId && companyVat) {
          newCompanyId = vatToNewCompanyId.get(companyVat);
        }

        if (!newCompanyId) {
          console.log(`   ⚠️  No current company found for old company ID: ${backupRelationship.company_id}`);
        }

        // Skip if we can't map either user or company
        if (!newUserId || !newCompanyId) {
          console.log(`   ⏭️  Skipping relationship - missing mappings for user: ${newUserId ? 'OK' : 'MISSING'}, company: ${newCompanyId ? 'OK' : 'MISSING'}`);
          skippedCount++;
          continue;
        }

        console.log(`📝 Processing relationship: ${userEmail} -> ${companyEmail || companyVat}`);

        // Check if relationship already exists
        const { data: existingRelationship } = await supabase
          .from('user_company_relationships')
          .select('id')
          .eq('user_id', newUserId)
          .eq('company_id', newCompanyId)
          .limit(1);

        if (existingRelationship && existingRelationship.length > 0) {
          console.log(`   ⏭️  Relationship already exists for ${userEmail} -> ${companyEmail || companyVat}`);
          skippedCount++;
          continue;
        }

        // Insert the relationship record with the new UUIDs
        const { error: insertError } = await supabase
          .from('user_company_relationships')
          .insert({
            user_id: newUserId,
            company_id: newCompanyId,
            role: backupRelationship.role,
            status: backupRelationship.status,
            created_at: backupRelationship.created_at,
            updated_at: backupRelationship.updated_at
          });

        if (insertError) {
          console.error(`   ❌ Error inserting relationship for ${userEmail} -> ${companyEmail || companyVat}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`   ✅ Restored relationship: ${userEmail} -> ${companyEmail || companyVat} (${backupRelationship.role})`);
          successCount++;
        }

      } catch (error) {
        console.error(`   ❌ Error processing backup relationship ${backupRelationship.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully restored: ${successCount} relationships`);
    console.log(`   ❌ Errors: ${errorCount} relationships`);
    console.log(`   ⏭️  Skipped: ${skippedCount} relationships`);
    console.log(`   📝 Total processed: ${successCount + errorCount + skippedCount} relationships`);

    // Step 4: Verify the results
    console.log('\n🔍 Step 4: Verifying results...');
    const { data: relationshipCount, error: countError } = await supabase
      .from('user_company_relationships')
      .select('id');

    if (countError) {
      console.error('❌ Error counting relationships:', countError);
    } else {
      console.log(`✅ Total user-company relationships in database: ${relationshipCount.length}`);
    }

    // Step 5: Show some statistics
    console.log('\n📊 Step 5: Relationship statistics...');
    const { data: relationshipStats, error: statsError } = await supabase
      .from('user_company_relationships')
      .select('role, status');

    if (!statsError && relationshipStats) {
      const roleCounts = {};
      const statusCounts = {};
      
      relationshipStats.forEach(rel => {
        roleCounts[rel.role] = (roleCounts[rel.role] || 0) + 1;
        statusCounts[rel.status] = (statusCounts[rel.status] || 0) + 1;
      });

      console.log('   👥 Role distribution:');
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`      ${role}: ${count}`);
      });

      console.log('   📊 Status distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`      ${status}: ${count}`);
      });
    }

    // Step 6: Test the API endpoint
    console.log('\n🔍 Step 6: Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/user-company-relationships');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ User-company relationships API endpoint working');
      console.log(`   Found ${data.length} relationships`);
    } else {
      console.log('❌ User-company relationships API endpoint not responding');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
restoreUserCompanyRelationshipsComplete(); 