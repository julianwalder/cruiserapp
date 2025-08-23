require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAPIResponse() {
  console.log('🧪 Testing API response...\n');

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

    // Test the pilot licenses API logic (same as in the API route)
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
            console.log(`      Created: ${document.created_at}`);
            console.log(`      Size: ${document.file_size} bytes`);
            console.log(`      MIME: ${document.mime_type}`);
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

    console.log('\n📊 Final API response structure:');
    console.log(JSON.stringify(licensesWithDocuments, null, 2));

    // Test what the component would receive
    console.log('\n🎯 Component would receive:');
    const firstLicense = licensesWithDocuments[0];
    if (firstLicense) {
      console.log('License data:', {
        id: firstLicense.id,
        license_number: firstLicense.license_number,
        license_type: firstLicense.license_type,
        state_of_issue: firstLicense.state_of_issue,
        document_id: firstLicense.document_id,
        pilot_documents: firstLicense.pilot_documents
      });
      
      if (firstLicense.pilot_documents && firstLicense.pilot_documents.length > 0) {
        const doc = firstLicense.pilot_documents[0];
        console.log('Document data:', {
          file_name: doc.file_name,
          file_url: doc.file_url,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          uploaded_at: doc.uploaded_at,
          created_at: doc.created_at,
          document_type: doc.document_type
        });
      }
    }

  } catch (error) {
    console.error('❌ Error testing API response:', error);
  }
}

testAPIResponse();
