const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDanaInvoice() {
  console.log('🔍 Checking Dana\'s invoice CA 0587...');
  
  // Get Dana's specific invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('series', 'CA')
    .eq('number', '0587')
    .single();
    
  if (invoiceError) {
    console.log('❌ Error fetching invoice:', invoiceError.message);
    return;
  }
  
  console.log('✅ Found Dana\'s invoice:');
  console.log('  - ID:', invoice.id);
  console.log('  - Series/Number:', invoice.series, invoice.number);
  console.log('  - Date:', invoice.issue_date);
  console.log('  - Total:', invoice.total_amount);
  
  // Parse the XML content to find items
  try {
    const xmlContent = invoice.xml_content;
    
    // Extract customer info
    const customerMatch = xmlContent.match(/<CustomerName>([^<]+)<\/CustomerName>/);
    const emailMatch = xmlContent.match(/<CustomerEmail>([^<]+)<\/CustomerEmail>/);
    
    if (customerMatch) {
      console.log('  - Customer:', customerMatch[1]);
    }
    if (emailMatch) {
      console.log('  - Email:', emailMatch[1]);
    }
    
    // Find all item descriptions
    const descriptionMatches = xmlContent.match(/<cbc:Description>([^<]+)<\/cbc:Description>/g);
    const nameMatches = xmlContent.match(/<cbc:Name>([^<]+)<\/cbc:Name>/g);
    
    console.log('\n📋 Invoice Items:');
    
    if (descriptionMatches) {
      descriptionMatches.forEach((match, index) => {
        const description = match.replace(/<\/?cbc:Description>/g, '');
        console.log(`  Description ${index + 1}: ${description}`);
      });
    }
    
    if (nameMatches) {
      nameMatches.forEach((match, index) => {
        const name = match.replace(/<\/?cbc:Name>/g, '');
        console.log(`  Name ${index + 1}: ${name}`);
      });
    }
    
    // Check if any item contains PPL content
    if (xmlContent.includes('PPL') || xmlContent.includes('Pregătire')) {
      console.log('\n🎯 Found PPL-related content!');
      
      // Find the specific PPL content
      const pplIndex = xmlContent.indexOf('PPL');
      if (pplIndex !== -1) {
        const snippet = xmlContent.substring(Math.max(0, pplIndex - 200), pplIndex + 300);
        console.log('PPL Content:', snippet.replace(/\n/g, ' ').substring(0, 500) + '...');
      }
    } else {
      console.log('\n❌ No PPL content found in this invoice');
    }
    
  } catch (e) {
    console.log('❌ Error parsing XML:', e.message);
  }
}

checkDanaInvoice().catch(console.error); 