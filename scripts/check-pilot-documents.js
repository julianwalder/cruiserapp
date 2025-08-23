require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPilotDocuments() {
  console.log('🔍 Checking pilot documents setup...\n');

  try {
    // Check if pilot_documents table exists
    console.log('📋 Checking pilot_documents table...');
    const { data: documents, error: documentsError } = await supabase
      .from('pilot_documents')
      .select('*')
      .limit(5);

    if (documentsError) {
      console.log('❌ pilot_documents table error:', documentsError.message);
    } else {
      console.log(`✅ pilot_documents table exists with ${documents?.length || 0} records`);
      if (documents && documents.length > 0) {
        console.log('📄 Sample documents:');
        documents.forEach((doc, index) => {
          console.log(`  ${index + 1}. ID: ${doc.id}`);
          console.log(`     Name: ${doc.file_name} (${doc.document_type})`);
          console.log(`     URL: ${doc.file_url}`);
          console.log(`     Uploaded: ${doc.uploaded_at}`);
          console.log(`     Size: ${doc.file_size} bytes`);
        });
      }
    }

    // Check if pilot_licenses table exists
    console.log('\n📋 Checking pilot_licenses table...');
    const { data: licenses, error: licensesError } = await supabase
      .from('pilot_licenses')
      .select('*')
      .limit(5);

    if (licensesError) {
      console.log('❌ pilot_licenses table error:', licensesError.message);
    } else {
      console.log(`✅ pilot_licenses table exists with ${licenses?.length || 0} records`);
      if (licenses && licenses.length > 0) {
        console.log('📄 Sample licenses:');
        licenses.forEach((license, index) => {
          console.log(`  ${index + 1}. ID: ${license.id}`);
          console.log(`     License: ${license.license_number} (${license.license_type})`);
          console.log(`     State: ${license.state_of_issue}`);
          console.log(`     Document ID: ${license.document_id}`);
        });
      }
    }

    // Check if pilot-documents storage bucket exists
    console.log('\n📦 Checking pilot-documents storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log('❌ Storage buckets error:', bucketsError.message);
    } else {
      const pilotBucket = buckets?.find(bucket => bucket.name === 'pilot-documents');
      if (pilotBucket) {
        console.log('✅ pilot-documents storage bucket exists');
        
        // List files in the bucket
        const { data: files, error: filesError } = await supabase.storage
          .from('pilot-documents')
          .list('', { limit: 10 });

        if (filesError) {
          console.log('❌ Error listing files:', filesError.message);
        } else {
          console.log(`📁 Found ${files?.length || 0} files in storage`);
          if (files && files.length > 0) {
            console.log('📄 Sample files:');
            files.forEach((file, index) => {
              console.log(`  ${index + 1}. ${file.name} (${file.metadata?.mimetype || 'unknown'})`);
            });
          }
        }
      } else {
        console.log('❌ pilot-documents storage bucket does not exist');
      }
    }

    // Check for specific user documents (using ops@cruiseraviation.ro)
    console.log('\n👤 Checking documents for ops@cruiseraviation.ro...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'ops@cruiseraviation.ro')
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
    } else {
      console.log(`✅ Found user: ${user.email} (${user.id})`);
      
      // Check user's pilot documents
      const { data: userDocuments, error: userDocsError } = await supabase
        .from('pilot_documents')
        .select('*')
        .eq('user_id', user.id);

      if (userDocsError) {
        console.log('❌ Error fetching user documents:', userDocsError.message);
      } else {
        console.log(`📄 User has ${userDocuments?.length || 0} pilot documents`);
        if (userDocuments && userDocuments.length > 0) {
          userDocuments.forEach((doc, index) => {
            console.log(`  ${index + 1}. ID: ${doc.id}`);
            console.log(`     Name: ${doc.file_name} (${doc.document_type})`);
            console.log(`     URL: ${doc.file_url}`);
            console.log(`     Uploaded: ${doc.uploaded_at}`);
            console.log(`     Size: ${doc.file_size} bytes`);
          });
        }
      }

      // Check user's pilot licenses
      const { data: userLicenses, error: userLicensesError } = await supabase
        .from('pilot_licenses')
        .select('*')
        .eq('user_id', user.id);

      if (userLicensesError) {
        console.log('❌ Error fetching user licenses:', userLicensesError.message);
      } else {
        console.log(`📄 User has ${userLicenses?.length || 0} pilot licenses`);
        if (userLicenses && userLicenses.length > 0) {
          userLicenses.forEach((license, index) => {
            console.log(`  ${index + 1}. ID: ${license.id}`);
            console.log(`     License: ${license.license_number} (${license.license_type})`);
            console.log(`     State: ${license.state_of_issue}`);
            console.log(`     Document ID: ${license.document_id}`);
            
            // Check if the document_id exists in pilot_documents
            if (license.document_id) {
              const matchingDoc = userDocuments?.find(doc => doc.id === license.document_id);
              if (matchingDoc) {
                console.log(`     ✅ Found matching document: ${matchingDoc.file_name}`);
              } else {
                console.log(`     ❌ No matching document found for ID: ${license.document_id}`);
              }
            } else {
              console.log(`     ⚠️ No document_id set`);
            }
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking pilot documents:', error);
  }
}

checkPilotDocuments();
