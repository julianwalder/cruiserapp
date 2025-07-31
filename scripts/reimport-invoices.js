const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function reimportInvoices() {
  console.log('🔄 Re-importing invoices with updated VAT code parsing...');
  
  // Get all invoices
  const { data: allInvoices, error: allError } = await supabase
    .from('invoices')
    .select('*');
    
  if (allError) {
    console.log('❌ Error fetching invoices:', allError.message);
    return;
  }
  
  console.log(`📊 Found ${allInvoices.length} invoices to re-import`);
  
  // For now, let's just show what would happen without actually re-importing
  console.log('\n⚠️  This script will show what VAT codes would be extracted with the updated parser.');
  console.log('   To actually re-import, you would need to:');
  console.log('   1. Delete existing invoices');
  console.log('   2. Re-import them using the updated XML parser');
  console.log('   3. Re-process PPL courses and company relationships');
  
  console.log('\n📋 VAT code analysis for existing invoices:');
  
  let invoicesWithNumericVAT = 0;
  let invoicesWithROVAT = 0;
  
  for (const invoice of allInvoices) {
    const xmlContent = invoice.xml_content;
    
    // Extract all CompanyIDs
    const allVatMatches = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/g);
    if (allVatMatches) {
      const vatCodes = allVatMatches.map(match => match.replace(/<\/?cbc:CompanyID[^>]*>/g, ''));
      
      // Find numeric VAT codes (without RO prefix)
      const numericCodes = vatCodes.filter(code => /^\d+$/.test(code));
      const roCodes = vatCodes.filter(code => code.startsWith('RO'));
      
      if (numericCodes.length > 0) {
        console.log(`  ${invoice.series}${invoice.number}: ${numericCodes[0]} (numeric) instead of ${roCodes[0] || 'unknown'} (RO)`);
        invoicesWithNumericVAT++;
      } else if (roCodes.length > 0) {
        console.log(`  ${invoice.series}${invoice.number}: ${roCodes[0]} (RO) - no change needed`);
        invoicesWithROVAT++;
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Invoices with numeric VAT codes: ${invoicesWithNumericVAT}`);
  console.log(`  - Invoices with RO VAT codes: ${invoicesWithROVAT}`);
  console.log(`  - Total invoices: ${allInvoices.length}`);
  
  if (invoicesWithNumericVAT > 0) {
    console.log(`\n🎯 ${invoicesWithNumericVAT} invoices would benefit from re-importing with updated VAT code parsing.`);
    console.log(`\n📝 To re-import these invoices:`);
    console.log(`   1. Export the XML files from SmartBill`);
    console.log(`   2. Use the updated import functionality`);
    console.log(`   3. The new parser will correctly extract numeric VAT codes like 32512351, 36729443, etc.`);
  } else {
    console.log(`\n✅ All invoices already use RO-prefixed VAT codes - no re-import needed!`);
  }
}

reimportInvoices().catch(console.error); 