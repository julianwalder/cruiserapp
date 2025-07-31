const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUser() {
  console.log('🔍 Checking for dana.elena.costica@gmail.com...');
  
  // First, find the user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'dana.elena.costica@gmail.com')
    .single();
    
  if (userError) {
    console.log('❌ User not found or error:', userError.message);
    return;
  }
  
  console.log('✅ User found:', { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
  
  // Check for PPL course tranches
  const { data: pplTranches, error: pplError } = await supabase
    .from('ppl_course_tranches')
    .select('*')
    .eq('user_id', user.id);
    
  if (pplError) {
    console.log('❌ Error fetching PPL tranches:', pplError.message);
    return;
  }
  
  console.log(`\n🎓 Found ${pplTranches.length} PPL course tranches`);
  pplTranches.forEach((tranche, index) => {
    console.log(`  Tranche ${index + 1}:`, {
      id: tranche.id,
      trancheNumber: tranche.tranche_number,
      totalTranches: tranche.total_tranches,
      hoursAllocated: tranche.hours_allocated,
      usedHours: tranche.used_hours,
      remainingHours: tranche.remaining_hours,
      purchaseDate: tranche.purchase_date
    });
  });
  
  // Search for PPL content in all invoices
  console.log('\n🔍 Searching for PPL content in all invoices...');
  const { data: allInvoices, error: allInvoicesError } = await supabase
    .from('invoices')
    .select('*');
    
  if (allInvoicesError) {
    console.log('❌ Error fetching all invoices:', allInvoicesError.message);
    return;
  }
  
  console.log(`📄 Checking ${allInvoices.length} total invoices for PPL content...`);
  
  const pplInvoices = [];
  allInvoices.forEach((invoice, index) => {
    if (invoice.xml_content && invoice.xml_content.includes('Pregătire PPL')) {
      pplInvoices.push(invoice);
      console.log(`\n🎯 Found PPL invoice ${index + 1}:`);
      console.log('  - ID:', invoice.id);
      console.log('  - Series/Number:', invoice.series, invoice.number);
      console.log('  - Date:', invoice.issue_date);
      console.log('  - Total:', invoice.total_amount);
      
      // Extract customer info from XML if possible
      try {
        const xmlContent = invoice.xml_content;
        const customerMatch = xmlContent.match(/<CustomerName>([^<]+)<\/CustomerName>/);
        const emailMatch = xmlContent.match(/<CustomerEmail>([^<]+)<\/CustomerEmail>/);
        
        if (customerMatch) {
          console.log('  - Customer:', customerMatch[1]);
        }
        if (emailMatch) {
          console.log('  - Email:', emailMatch[1]);
        }
        
        // Check if this is for Dana
        if (emailMatch && emailMatch[1].includes('dana.elena.costica')) {
          console.log('  ✅ This invoice is for Dana!');
        }
        
        // Show a snippet of the XML content around PPL
        const pplIndex = xmlContent.indexOf('Pregătire PPL');
        if (pplIndex !== -1) {
          const snippet = xmlContent.substring(Math.max(0, pplIndex - 100), pplIndex + 200);
          console.log('  - PPL Content Snippet:', snippet.replace(/\n/g, ' ').substring(0, 300) + '...');
        }
      } catch (e) {
        console.log('  - Could not parse XML content');
      }
    }
  });
  
  console.log(`\n📊 Found ${pplInvoices.length} invoices with PPL content`);
  
  // Also search for any invoice that mentions Dana
  console.log('\n🔍 Searching for any invoice mentioning Dana...');
  allInvoices.forEach((invoice, index) => {
    if (invoice.xml_content && invoice.xml_content.toLowerCase().includes('dana')) {
      console.log(`\n👤 Found invoice mentioning Dana ${index + 1}:`);
      console.log('  - ID:', invoice.id);
      console.log('  - Series/Number:', invoice.series, invoice.number);
      console.log('  - Date:', invoice.issue_date);
      console.log('  - Total:', invoice.total_amount);
      
      try {
        const xmlContent = invoice.xml_content;
        const customerMatch = xmlContent.match(/<CustomerName>([^<]+)<\/CustomerName>/);
        const emailMatch = xmlContent.match(/<CustomerEmail>([^<]+)<\/CustomerEmail>/);
        
        if (customerMatch) {
          console.log('  - Customer:', customerMatch[1]);
        }
        if (emailMatch) {
          console.log('  - Email:', emailMatch[1]);
        }
        
        // Show a snippet around Dana
        const danaIndex = xmlContent.toLowerCase().indexOf('dana');
        if (danaIndex !== -1) {
          const snippet = xmlContent.substring(Math.max(0, danaIndex - 50), danaIndex + 100);
          console.log('  - Dana Content Snippet:', snippet.replace(/\n/g, ' ').substring(0, 200) + '...');
        }
      } catch (e) {
        console.log('  - Could not parse XML content');
      }
    }
  });
}

checkUser().catch(console.error); 