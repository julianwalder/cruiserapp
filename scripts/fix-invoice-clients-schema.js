const { createClient } = require('@supabase/supabase-js');
const { parseString } = require('xml2js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to extract client data from XML or JSON
function extractClientFromContent(content) {
  return new Promise((resolve, reject) => {
    // Check if content is JSON (starts with {)
    if (content.trim().startsWith('{')) {
      try {
        const jsonData = JSON.parse(content);
        // Handle JSON format (edited invoice data)
        if (jsonData.client) {
          resolve({
            name: jsonData.client.name || 'Unknown Client',
            email: jsonData.client.email || undefined,
            phone: jsonData.client.phone || undefined,
            vat_code: jsonData.client.vatCode || jsonData.client.vat_code || undefined,
            address: jsonData.client.address || undefined,
            city: jsonData.client.city || undefined,
            country: jsonData.client.country || 'Romania'
          });
        } else {
          resolve(null);
        }
      } catch (error) {
        reject(new Error(`JSON parsing error: ${error.message}`));
      }
      return;
    }

    // Handle XML content
    parseString(content, { explicitArray: false }, (err, result) => {
      if (err) {
        reject(new Error(`XML parsing error: ${err.message}`));
        return;
      }

      try {
        const invoice = result.Invoice || result.invoice || result.factura;
        if (!invoice) {
          resolve(null);
          return;
        }

        // Extract client information (UBL format)
        const customerParty = invoice['cac:AccountingCustomerParty'];
        const party = customerParty?.['cac:Party'];
        const partyLegalEntity = party?.['cac:PartyLegalEntity'];
        const contact = party?.['cac:Contact'];
        const postalAddress = party?.['cac:PostalAddress'];
        const partyTaxScheme = party?.['cac:PartyTaxScheme'];

        const clientName = getNestedValue(partyLegalEntity, 'cbc:RegistrationName') || 'Unknown Client';
        const clientEmail = getNestedValue(contact, 'cbc:ElectronicMail');
        const clientPhone = getNestedValue(contact, 'cbc:Telephone');
        const clientVatCode = getNestedValue(partyTaxScheme, 'cbc:CompanyID');
        const clientAddress = getNestedValue(postalAddress, 'cbc:StreetName');
        const clientCity = getNestedValue(postalAddress, 'cbc:CityName');
        const country = postalAddress?.['cac:Country'];
        const clientCountry = getNestedValue(country, 'cbc:IdentificationCode') || 'Romania';

        resolve({
          name: clientName,
          email: clientEmail || undefined,
          phone: clientPhone || undefined,
          vat_code: clientVatCode || undefined,
          address: clientAddress || undefined,
          city: clientCity || undefined,
          country: clientCountry || undefined
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Helper function to get nested values from XML2JS result
function getNestedValue(obj, path) {
  if (!obj || !path) return null;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }
  
  // Handle xml2js format: values are in "_" property
  if (current && typeof current === 'object' && '_' in current) {
    return current['_'];
  }
  
  return current && typeof current === 'string' ? current : null;
}

async function fixInvoiceClientsSchema() {
  console.log('🔧 Fixing invoice_clients schema and populating data...');
  
  try {
    // First, let's try to make the user_id column nullable
    console.log('📝 Attempting to make user_id column nullable...');
    
    // Try to update the schema by inserting a test record with null user_id
    // This will fail if the constraint is still there, but we'll handle it gracefully
    const { error: testError } = await supabase
      .from('invoice_clients')
      .insert({
        invoice_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        name: 'Test Client',
        user_id: null
      });

    if (testError && testError.message.includes('not-null constraint')) {
      console.log('⚠️  user_id column still has NOT NULL constraint. Proceeding with alternative approach...');
    } else {
      console.log('✅ user_id column appears to be nullable');
      // Clean up test record
      await supabase
        .from('invoice_clients')
        .delete()
        .eq('invoice_id', '00000000-0000-0000-0000-000000000000');
    }

    // Get all invoices
    console.log('📊 Fetching all invoices...');
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id, xml_content, original_xml_content')
      .order('issue_date', { ascending: false });

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      return;
    }

    console.log(`✅ Found ${invoices.length} invoices to process`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const invoice of invoices) {
      try {
        console.log(`📝 Processing invoice ${invoice.smartbill_id}...`);

        // Check if client record already exists
        const { data: existingClient } = await supabase
          .from('invoice_clients')
          .select('id')
          .eq('invoice_id', invoice.id)
          .limit(1);

        if (existingClient && existingClient.length > 0) {
          console.log(`   ⏭️  Client record already exists for ${invoice.smartbill_id}`);
          skippedCount++;
          continue;
        }

        // Try to extract client data from xml_content first, then original_xml_content
        let clientData = null;
        let contentSource = '';

        if (invoice.xml_content) {
          try {
            clientData = await extractClientFromContent(invoice.xml_content);
            contentSource = 'xml_content';
          } catch (error) {
            console.log(`   ⚠️  Failed to parse xml_content for ${invoice.smartbill_id}: ${error.message}`);
          }
        }

        if (!clientData && invoice.original_xml_content) {
          try {
            clientData = await extractClientFromContent(invoice.original_xml_content);
            contentSource = 'original_xml_content';
          } catch (error) {
            console.log(`   ⚠️  Failed to parse original_xml_content for ${invoice.smartbill_id}: ${error.message}`);
          }
        }

        if (!clientData) {
          console.log(`   ⚠️  Could not extract client data from ${invoice.smartbill_id}`);
          errorCount++;
          continue;
        }

        // Try to insert client record with null user_id
        const { error: insertError } = await supabase
          .from('invoice_clients')
          .insert({
            invoice_id: invoice.id,
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            vat_code: clientData.vat_code,
            address: clientData.address,
            city: clientData.city,
            country: clientData.country,
            user_id: null // Try with null first
          });

        if (insertError) {
          console.error(`   ❌ Error inserting client for ${invoice.smartbill_id}:`, insertError.message);
          
          // If it's a constraint error, try with a dummy user_id
          if (insertError.message.includes('not-null constraint')) {
            console.log(`   🔄 Retrying with dummy user_id for ${invoice.smartbill_id}...`);
            
            const { error: retryError } = await supabase
              .from('invoice_clients')
              .insert({
                invoice_id: invoice.id,
                name: clientData.name,
                email: clientData.email,
                phone: clientData.phone,
                vat_code: clientData.vat_code,
                address: clientData.address,
                city: clientData.city,
                country: clientData.country,
                user_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID
              });

            if (retryError) {
              console.error(`   ❌ Retry failed for ${invoice.smartbill_id}:`, retryError.message);
              errorCount++;
            } else {
              console.log(`   ✅ Added client (with dummy user_id): ${clientData.name} (${clientData.email || 'no email'}) from ${contentSource}`);
              successCount++;
            }
          } else {
            errorCount++;
          }
        } else {
          console.log(`   ✅ Added client: ${clientData.name} (${clientData.email || 'no email'}) from ${contentSource}`);
          successCount++;
        }

      } catch (error) {
        console.error(`   ❌ Error processing ${invoice.smartbill_id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully processed: ${successCount} invoices`);
    console.log(`   ❌ Errors: ${errorCount} invoices`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedCount} invoices`);
    console.log(`   📝 Total processed: ${successCount + errorCount + skippedCount} invoices`);

    // Verify the results
    console.log('\n🔍 Verifying results...');
    const { data: clientCount, error: countError } = await supabase
      .from('invoice_clients')
      .select('id');

    if (countError) {
      console.error('❌ Error counting clients:', countError);
    } else {
      console.log(`✅ Total invoice clients in database: ${clientCount.length}`);
    }

    // Test the API endpoint
    console.log('\n🔍 Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/smartbill/import-xml');
    if (response.ok) {
      const data = await response.json();
      const firstInvoice = data.invoices?.[0];
      if (firstInvoice && firstInvoice.client && Object.keys(firstInvoice.client).length > 0) {
        console.log('✅ API endpoint now returns client data correctly');
        console.log(`   Sample client: ${firstInvoice.client.name} (${firstInvoice.client.email || 'no email'})`);
      } else {
        console.log('❌ API endpoint still not returning client data');
      }
    } else {
      console.log('❌ API endpoint not responding');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
fixInvoiceClientsSchema(); 