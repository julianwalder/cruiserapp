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
class VATCodeUpdater {
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

async function updateExistingVATCodes() {
  console.log('🔄 Updating existing invoices with correct VAT codes...');
  
  // Get all invoices
  const { data: allInvoices, error: allError } = await supabase
    .from('invoices')
    .select('*');
    
  if (allError) {
    console.log('❌ Error fetching invoices:', allError.message);
    return;
  }
  
  console.log(`📊 Found ${allInvoices.length} invoices to process`);
  
  let updatedCount = 0;
  let noChangeCount = 0;
  let errorCount = 0;
  
  for (const invoice of allInvoices) {
    try {
      const xmlContent = invoice.xml_content;
      
      // Extract client VAT code from the specific BT-47 location first
      const bt47VatCode = VATCodeUpdater.extractClientVatCodeFromBT47(xmlContent);
      
      // Extract all CompanyIDs as fallback
      const allCompanyIds = VATCodeUpdater.extractAllCompanyIds(xmlContent);
      
      // Get party tax scheme VAT code (old method)
      const partyTaxSchemeMatch = xmlContent.match(/<cac:PartyTaxScheme>[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
      const partyTaxSchemeVatCode = partyTaxSchemeMatch ? partyTaxSchemeMatch[1] : null;
      
      // Prioritize BT-47 VAT code, then use the selection logic
      const bestVatCode = bt47VatCode || VATCodeUpdater.selectBestVatCode(allCompanyIds, partyTaxSchemeVatCode);
      
      // Check if we need to update the client VAT code
      if (invoice.client && invoice.client.vat_code !== bestVatCode) {
        console.log(`\n📝 Updating ${invoice.series}${invoice.number}:`);
        console.log(`  - Old VAT code: ${invoice.client.vat_code || 'undefined'}`);
        console.log(`  - New VAT code: ${bestVatCode || 'undefined'}`);
        console.log(`  - All CompanyIDs found: ${allCompanyIds.join(', ')}`);
        
        // Update the invoice with the correct VAT code
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            client: {
              ...invoice.client,
              vat_code: bestVatCode
            }
          })
          .eq('id', invoice.id);
          
        if (updateError) {
          console.log(`  ❌ Error updating invoice: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`  ✅ Successfully updated`);
          updatedCount++;
        }
      } else {
        noChangeCount++;
      }
      
    } catch (error) {
      console.log(`❌ Error processing invoice ${invoice.series}${invoice.number}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Update Summary:`);
  console.log(`  - Total invoices processed: ${allInvoices.length}`);
  console.log(`  - Updated: ${updatedCount}`);
  console.log(`  - No change needed: ${noChangeCount}`);
  console.log(`  - Errors: ${errorCount}`);
  
  if (updatedCount > 0) {
    console.log(`\n🎉 Successfully updated ${updatedCount} invoices with correct VAT codes!`);
    console.log(`\n⚠️  Note: You may need to re-process these invoices to update company relationships.`);
  } else {
    console.log(`\n✅ All invoices already have correct VAT codes!`);
  }
}

updateExistingVATCodes().catch(console.error); 