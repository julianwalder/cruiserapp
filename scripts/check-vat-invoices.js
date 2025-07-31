const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkVATInvoices() {
  console.log('🔍 Checking invoices with VAT codes...');
  
  // Check invoice CA0588
  console.log('\n📋 Checking invoice CA0588...');
  const { data: invoice1, error: error1 } = await supabase
    .from('invoices')
    .select('*')
    .eq('series', 'CA')
    .eq('number', '0588')
    .single();
    
  if (error1) {
    console.log('❌ Error fetching CA0588:', error1.message);
  } else {
    console.log('✅ Found invoice CA0588');
    console.log('  - ID:', invoice1.id);
    console.log('  - Date:', invoice1.issue_date);
    console.log('  - Total:', invoice1.total_amount);
    
    // Extract VAT code from XML using different patterns
    const xmlContent = invoice1.xml_content;
    
    // Pattern 1: CompanyID
    const vatMatch1 = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    if (vatMatch1) {
      console.log('  - VAT Code (CompanyID):', vatMatch1[1]);
    }
    
    // Pattern 2: PartyTaxScheme
    const vatMatch2 = xmlContent.match(/<cac:PartyTaxScheme>[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    if (vatMatch2) {
      console.log('  - VAT Code (PartyTaxScheme):', vatMatch2[1]);
    }
    
    // Pattern 3: Any CompanyID
    const allVatMatches = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/g);
    if (allVatMatches) {
      console.log('  - All VAT Codes found:');
      allVatMatches.forEach((match, index) => {
        const code = match.replace(/<\/?cbc:CompanyID[^>]*>/g, '');
        console.log(`    ${index + 1}. ${code}`);
      });
    }
    
    // Extract company name
    const companyMatch = xmlContent.match(/<cac:PartyName>[\s\S]*?<cbc:Name>([^<]+)<\/cbc:Name>/);
    if (companyMatch) {
      console.log('  - Company:', companyMatch[1]);
    }
  }
  
  // Check invoice CA0590
  console.log('\n📋 Checking invoice CA0590...');
  const { data: invoice2, error: error2 } = await supabase
    .from('invoices')
    .select('*')
    .eq('series', 'CA')
    .eq('number', '0590')
    .single();
    
  if (error2) {
    console.log('❌ Error fetching CA0590:', error2.message);
  } else {
    console.log('✅ Found invoice CA0590');
    console.log('  - ID:', invoice2.id);
    console.log('  - Date:', invoice2.issue_date);
    console.log('  - Total:', invoice2.total_amount);
    
    // Extract VAT code from XML using different patterns
    const xmlContent = invoice2.xml_content;
    
    // Pattern 1: CompanyID
    const vatMatch1 = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    if (vatMatch1) {
      console.log('  - VAT Code (CompanyID):', vatMatch1[1]);
    }
    
    // Pattern 2: PartyTaxScheme
    const vatMatch2 = xmlContent.match(/<cac:PartyTaxScheme>[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    if (vatMatch2) {
      console.log('  - VAT Code (PartyTaxScheme):', vatMatch2[1]);
    }
    
    // Pattern 3: Any CompanyID
    const allVatMatches = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/g);
    if (allVatMatches) {
      console.log('  - All VAT Codes found:');
      allVatMatches.forEach((match, index) => {
        const code = match.replace(/<\/?cbc:CompanyID[^>]*>/g, '');
        console.log(`    ${index + 1}. ${code}`);
      });
    }
    
    // Extract company name
    const companyMatch = xmlContent.match(/<cac:PartyName>[\s\S]*?<cbc:Name>([^<]+)<\/cbc:Name>/);
    if (companyMatch) {
      console.log('  - Company:', companyMatch[1]);
    }
  }
  
  // Search for the specific VAT code 32512351
  console.log('\n🔍 Searching for VAT code 32512351...');
  const { data: allInvoices, error: allError } = await supabase
    .from('invoices')
    .select('*');
    
  if (allError) {
    console.log('❌ Error fetching all invoices:', allError.message);
    return;
  }
  
  const invoicesWith32512351 = [];
  const invoicesWithoutRO = [];
  
  allInvoices.forEach((invoice, index) => {
    const xmlContent = invoice.xml_content;
    const allVatMatches = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/g);
    
    if (allVatMatches) {
      allVatMatches.forEach(match => {
        const vatCode = match.replace(/<\/?cbc:CompanyID[^>]*>/g, '');
        
        // Check for specific VAT code
        if (vatCode.includes('32512351')) {
          invoicesWith32512351.push({
            series: invoice.series,
            number: invoice.number,
            vatCode: vatCode,
            date: invoice.issue_date,
            total: invoice.total_amount
          });
        }
        
        // Check if VAT code is numeric (without RO prefix)
        if (/^\d+$/.test(vatCode)) {
          invoicesWithoutRO.push({
            series: invoice.series,
            number: invoice.number,
            vatCode: vatCode,
            date: invoice.issue_date,
            total: invoice.total_amount
          });
        }
      });
    }
  });
  
  console.log(`\n📊 Found ${invoicesWith32512351.length} invoices with VAT code 32512351:`);
  invoicesWith32512351.forEach((invoice, index) => {
    console.log(`  ${index + 1}. ${invoice.series}${invoice.number} - VAT: ${invoice.vatCode} - Date: ${invoice.date} - Total: ${invoice.total}`);
  });
  
  console.log(`\n📊 Found ${invoicesWithoutRO.length} invoices with VAT codes without RO prefix:`);
  invoicesWithoutRO.forEach((invoice, index) => {
    console.log(`  ${index + 1}. ${invoice.series}${invoice.number} - VAT: ${invoice.vatCode} - Date: ${invoice.date} - Total: ${invoice.total}`);
  });
}

checkVATInvoices().catch(console.error); 