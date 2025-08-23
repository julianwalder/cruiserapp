require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPilotAPI() {
  console.log('🧪 Testing pilot documents API...\n');

  try {
    // Get user ID for ops@cruiseraviation.ro
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'ops@cruiseraviation.ro')
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
      return;
    }

    console.log(`✅ Found user: ${user.email} (${user.id})`);

    // Test the pilot licenses API logic
    console.log('\n📋 Testing pilot licenses fetch...');
    
    // Get pilot licenses
    const { data: licenses, error: licensesError } = await supabase
      .from('pilot_licenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (licensesError) {
      console.log('❌ Error fetching licenses:', licensesError.message);
      return;
    }

    console.log(`✅ Found ${licenses?.length || 0} licenses`);

    // Get related documents for each license (simulating the API logic)
    const licensesWithDocuments = await Promise.all(
      (licenses || []).map(async (license) => {
        console.log(`\n🔍 Processing license: ${license.license_number}`);
        console.log(`   Document ID: ${license.document_id}`);
        
        if (license.document_id) {
          const { data: document, error: docError } = await supabase
            .from('pilot_documents')
            .select('*')
            .eq('id', license.document_id)
            .single();

          if (docError) {
            console.log(`   ❌ Error fetching document: ${docError.message}`);
            return {
              ...license,
              pilot_documents: []
            };
          }

          if (document) {
            console.log(`   ✅ Found document: ${document.file_name}`);
            console.log(`      URL: ${document.file_url}`);
            console.log(`      Uploaded: ${document.uploaded_at}`);
            console.log(`      Size: ${document.file_size} bytes`);
            return {
              ...license,
              pilot_documents: [document]
            };
          } else {
            console.log(`   ⚠️ No document found for ID: ${license.document_id}`);
            return {
              ...license,
              pilot_documents: []
            };
          }
        } else {
          console.log(`   ⚠️ No document_id set`);
          return {
            ...license,
            pilot_documents: []
          };
        }
      })
    );

    console.log('\n📊 Final result:');
    licensesWithDocuments.forEach((license, index) => {
      console.log(`\n${index + 1}. License: ${license.license_number} (${license.license_type})`);
      console.log(`   State: ${license.state_of_issue}`);
      console.log(`   Related documents: ${license.pilot_documents?.length || 0}`);
      
      if (license.pilot_documents && license.pilot_documents.length > 0) {
        license.pilot_documents.forEach((doc, docIndex) => {
          console.log(`   Document ${docIndex + 1}: ${doc.file_name}`);
          console.log(`      URL: ${doc.file_url}`);
          console.log(`      Uploaded: ${doc.uploaded_at}`);
          console.log(`      Size: ${(doc.file_size / 1024 / 1024).toFixed(2)} MB`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error testing pilot API:', error);
  }
}

testPilotAPI();
