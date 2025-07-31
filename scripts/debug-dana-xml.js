const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugDanaXML() {
  console.log('🔍 Debugging Dana\'s XML content...');
  
  // Get Dana's invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('series', 'CA')
    .eq('number', '0587')
    .single();
    
  if (invoiceError) {
    console.log('❌ Invoice not found:', invoiceError.message);
    return;
  }
  
  console.log('✅ Found invoice:', invoice.series, invoice.number);
  
  const xmlContent = invoice.xml_content;
  
  // Look for PPL content
  console.log('\n🔍 Searching for PPL content...');
  if (xmlContent.includes('PPL')) {
    console.log('✅ Found PPL in XML');
    const pplIndex = xmlContent.indexOf('PPL');
    const snippet = xmlContent.substring(Math.max(0, pplIndex - 200), pplIndex + 300);
    console.log('PPL snippet:', snippet);
  } else {
    console.log('❌ No PPL found in XML');
  }
  
  // Look for "Cursuri formare"
  console.log('\n🔍 Searching for "Cursuri formare"...');
  if (xmlContent.includes('Cursuri formare')) {
    console.log('✅ Found "Cursuri formare" in XML');
    const cursuriIndex = xmlContent.indexOf('Cursuri formare');
    const snippet = xmlContent.substring(Math.max(0, cursuriIndex - 200), cursuriIndex + 300);
    console.log('Cursuri snippet:', snippet);
  } else {
    console.log('❌ No "Cursuri formare" found in XML');
  }
  
  // Look for "Transa"
  console.log('\n🔍 Searching for "Transa"...');
  if (xmlContent.includes('Transa')) {
    console.log('✅ Found "Transa" in XML');
    const transaIndex = xmlContent.indexOf('Transa');
    const snippet = xmlContent.substring(Math.max(0, transaIndex - 200), transaIndex + 300);
    console.log('Transa snippet:', snippet);
  } else {
    console.log('❌ No "Transa" found in XML');
  }
  
  // Look for InvoiceLine tags
  console.log('\n🔍 Searching for InvoiceLine tags...');
  const invoiceLineMatches = xmlContent.match(/<cac:InvoiceLine>/g);
  if (invoiceLineMatches) {
    console.log(`✅ Found ${invoiceLineMatches.length} InvoiceLine tags`);
    
    // Extract all InvoiceLine content
    const invoiceLines = xmlContent.match(/<cac:InvoiceLine>([\s\S]*?)<\/cac:InvoiceLine>/g);
    if (invoiceLines) {
      console.log(`\n📋 Found ${invoiceLines.length} invoice lines:`);
      invoiceLines.forEach((line, index) => {
        console.log(`\n--- Line ${index + 1} ---`);
        console.log(line.substring(0, 500) + '...');
      });
    }
  } else {
    console.log('❌ No InvoiceLine tags found');
  }
  
  // Look for different item tags
  console.log('\n🔍 Searching for item-related tags...');
  const possibleTags = [
    'cac:InvoiceLine',
    'cac:Item',
    'cbc:Name',
    'cbc:Description',
    'cbc:InvoicedQuantity',
    'cbc:UnitPrice',
    'cbc:LineExtensionAmount'
  ];
  
  possibleTags.forEach(tag => {
    const matches = xmlContent.match(new RegExp(`<${tag}[^>]*>`, 'g'));
    if (matches) {
      console.log(`✅ Found ${matches.length} ${tag} tags`);
    } else {
      console.log(`❌ No ${tag} tags found`);
    }
  });
}

debugDanaXML().catch(console.error); 