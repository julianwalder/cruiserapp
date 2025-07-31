const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Company details constants
const COMPANY_DETAILS = {
  VAT_CODE: 'RO39767581',
  EMAIL: 'tower@cruiseraviation.ro',
  NAME: 'CRUISER AVIATION SRL'
};

// Copy the helper methods from the updated XML parser
class VATCodeTester {
  static extractAllCompanyIds(xmlContent) {
    const companyIdMatches = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/g);
    if (!companyIdMatches) return [];
    
    return companyIdMatches.map(match => {
      return match.replace(/<\/?cbc:CompanyID[^>]*>/g, '');
    });
  }

  static extractClientVatCodeFromBT47(xmlContent) {
    // Look for CompanyID with BT-47 comment (client VAT/CNP)
    const bt47Match = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>\s*<!--BT-47-->/);
    if (bt47Match) {
      return bt47Match[1];
    }
    
    // Fallback: look for CompanyID in customer party section
    const customerPartyMatch = xmlContent.match(/<cac:AccountingCustomerParty>[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    if (customerPartyMatch) {
      return customerPartyMatch[1];
    }
    
    return undefined;
  }

  static selectBestVatCode(allCompanyIds, partyTaxSchemeVatCode) {
    if (allCompanyIds.length === 0) {
      return partyTaxSchemeVatCode || undefined;
    }

    // Filter out company VAT code (RO39767581) from client VAT codes
    const filteredCompanyIds = allCompanyIds.filter(id => id !== COMPANY_DETAILS.VAT_CODE);

    if (filteredCompanyIds.length === 0) {
      // If only company VAT code is found, return the party tax scheme VAT code
      return partyTaxSchemeVatCode || undefined;
    }

    // Priority 1: Non-RO-prefixed numeric codes (like 32512351, 36729443)
    const numericCodes = filteredCompanyIds.filter(id => /^\d+$/.test(id));
    if (numericCodes.length > 0) {
      return numericCodes[0]; // Return the first numeric code found
    }

    // Priority 2: RO-prefixed codes (excluding company VAT code)
    const roCodes = filteredCompanyIds.filter(id => id.startsWith('RO') && id !== COMPANY_DETAILS.VAT_CODE);
    if (roCodes.length > 0) {
      return roCodes[0]; // Return the first RO code found
    }

    // Priority 3: Fallback to party tax scheme VAT code (if it's not the company VAT code)
    if (partyTaxSchemeVatCode && partyTaxSchemeVatCode !== COMPANY_DETAILS.VAT_CODE) {
      return partyTaxSchemeVatCode;
    }

    // Priority 4: Any other CompanyID (like registration numbers)
    return filteredCompanyIds[0];
  }
}

async function testVATParsing() {
  console.log('🧪 Testing VAT code parsing with updated logic...');
  
  // Test invoice CA0588
  console.log('\n📋 Testing invoice CA0588...');
  const { data: invoice1, error: error1 } = await supabase
    .from('invoices')
    .select('*')
    .eq('series', 'CA')
    .eq('number', '0588')
    .single();
    
  if (error1) {
    console.log('❌ Error fetching CA0588:', error1.message);
  } else {
    const xmlContent = invoice1.xml_content;
    
    // Extract client VAT code from the specific BT-47 location first
    const bt47VatCode = VATCodeTester.extractClientVatCodeFromBT47(xmlContent);
    console.log('  - BT-47 VAT Code:', bt47VatCode);
    
    // Extract all CompanyIDs as fallback
    const allCompanyIds = VATCodeTester.extractAllCompanyIds(xmlContent);
    console.log('  - All CompanyIDs found:', allCompanyIds);
    
    // Get party tax scheme VAT code (old method)
    const partyTaxSchemeMatch = xmlContent.match(/<cac:PartyTaxScheme>[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    const partyTaxSchemeVatCode = partyTaxSchemeMatch ? partyTaxSchemeMatch[1] : null;
    console.log('  - Party Tax Scheme VAT Code (old method):', partyTaxSchemeVatCode);
    
    // Prioritize BT-47 VAT code, then use the selection logic
    const bestVatCode = bt47VatCode || VATCodeTester.selectBestVatCode(allCompanyIds, partyTaxSchemeVatCode);
    console.log('  - Best VAT Code (new method):', bestVatCode);
    
    console.log('  ✅ Expected: 32512351, Got:', bestVatCode);
  }
  
  // Test invoice CA0590
  console.log('\n📋 Testing invoice CA0590...');
  const { data: invoice2, error: error2 } = await supabase
    .from('invoices')
    .select('*')
    .eq('series', 'CA')
    .eq('number', '0590')
    .single();
    
  if (error2) {
    console.log('❌ Error fetching CA0590:', error2.message);
  } else {
    const xmlContent = invoice2.xml_content;
    
    // Extract client VAT code from the specific BT-47 location first
    const bt47VatCode = VATCodeTester.extractClientVatCodeFromBT47(xmlContent);
    console.log('  - BT-47 VAT Code:', bt47VatCode);
    
    // Extract all CompanyIDs as fallback
    const allCompanyIds = VATCodeTester.extractAllCompanyIds(xmlContent);
    console.log('  - All CompanyIDs found:', allCompanyIds);
    
    // Get party tax scheme VAT code (old method)
    const partyTaxSchemeMatch = xmlContent.match(/<cac:PartyTaxScheme>[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    const partyTaxSchemeVatCode = partyTaxSchemeMatch ? partyTaxSchemeMatch[1] : null;
    console.log('  - Party Tax Scheme VAT Code (old method):', partyTaxSchemeVatCode);
    
    // Prioritize BT-47 VAT code, then use the selection logic
    const bestVatCode = bt47VatCode || VATCodeTester.selectBestVatCode(allCompanyIds, partyTaxSchemeVatCode);
    console.log('  - Best VAT Code (new method):', bestVatCode);
    
    console.log('  ✅ Expected: 36729443, Got:', bestVatCode);
  }
  
  // Test a few more invoices with different patterns
  console.log('\n📋 Testing additional invoices...');
  const testInvoices = [
    { series: 'CA', number: '0757' }, // Has 1970326297299
    { series: 'CA', number: '0766' }, // Has 5010723225621
    { series: 'CA', number: '0579' }  // Has 2880329226706
  ];
  
  for (const testInvoice of testInvoices) {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('series', testInvoice.series)
      .eq('number', testInvoice.number)
      .single();
      
    if (error) {
      console.log(`❌ Error fetching ${testInvoice.series}${testInvoice.number}:`, error.message);
      continue;
    }
    
    const xmlContent = invoice.xml_content;
    const bt47VatCode = VATCodeTester.extractClientVatCodeFromBT47(xmlContent);
    const allCompanyIds = VATCodeTester.extractAllCompanyIds(xmlContent);
    const partyTaxSchemeMatch = xmlContent.match(/<cac:PartyTaxScheme>[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    const partyTaxSchemeVatCode = partyTaxSchemeMatch ? partyTaxSchemeMatch[1] : null;
    const bestVatCode = bt47VatCode || VATCodeTester.selectBestVatCode(allCompanyIds, partyTaxSchemeVatCode);
    
    console.log(`  ${testInvoice.series}${testInvoice.number}:`);
    console.log(`    - All CompanyIDs: ${allCompanyIds.join(', ')}`);
    console.log(`    - Old method: ${partyTaxSchemeVatCode}`);
    console.log(`    - New method: ${bestVatCode}`);
  }
}

testVATParsing().catch(console.error); 