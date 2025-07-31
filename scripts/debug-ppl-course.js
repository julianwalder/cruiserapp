const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugPPLCourse(email) {
  console.log(`🔍 Debugging PPL course for: ${email}`);
  
  try {
    // 1. Find the user
    console.log('\n📋 Step 1: Finding user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      console.log('❌ User not found:', userError?.message || 'No user found');
      return;
    }
    
    console.log('✅ User found:', `${user.firstName} ${user.lastName} (${user.email})`);
    
    // 2. Check if PPL course table exists
    console.log('\n📋 Step 2: Checking PPL course table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('ppl_course_tranches')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('❌ PPL course table does not exist!');
      console.log('Please run the SQL setup first in your Supabase SQL editor.');
      return;
    }
    
    console.log('✅ PPL course table exists');
    
    // 3. Find invoices for this user
    console.log('\n📋 Step 3: Finding invoices for user...');
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        series,
        number,
        issue_date,
        status,
        invoice_clients!inner (
          name,
          email,
          user_id
        ),
        invoice_items (
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount
        )
      `)
      .eq('invoice_clients.user_id', user.id)
      .in('status', ['paid', 'imported'])
      .order('issue_date', { ascending: false });
    
    if (invoicesError) {
      console.log('❌ Error fetching invoices:', invoicesError.message);
      return;
    }
    
    console.log(`✅ Found ${invoices?.length || 0} invoices for user`);
    
    // 4. Check for PPL course items
    console.log('\n📋 Step 4: Checking for PPL course items...');
    const pplInvoices = [];
    
    for (const invoice of invoices || []) {
      const pplItems = invoice.invoice_items?.filter(item => 
        item.name.toLowerCase().includes('pregătire ppl') ||
        item.name.toLowerCase().includes('ppl(a)') ||
        item.name.toLowerCase().includes('ppl course') ||
        (item.description && (
          item.description.toLowerCase().includes('pregătire ppl') ||
          item.description.toLowerCase().includes('ppl(a)') ||
          item.description.toLowerCase().includes('ppl course')
        ))
      ) || [];
      
      if (pplItems.length > 0) {
        pplInvoices.push({
          invoice,
          pplItems
        });
        console.log(`✅ Found PPL course items in invoice ${invoice.smartbill_id}:`);
        pplItems.forEach(item => {
          console.log(`   - ${item.name} (${item.description || 'No description'})`);
        });
      }
    }
    
    if (pplInvoices.length === 0) {
      console.log('❌ No PPL course items found in any invoices');
      return;
    }
    
    // 5. Check existing PPL course tranches
    console.log('\n📋 Step 5: Checking existing PPL course tranches...');
    const { data: existingTranches, error: tranchesError } = await supabase
      .from('ppl_course_tranches')
      .select('*')
      .eq('user_id', user.id)
      .order('tranche_number', { ascending: true });
    
    if (tranchesError) {
      console.log('❌ Error fetching existing tranches:', tranchesError.message);
    } else {
      console.log(`✅ Found ${existingTranches?.length || 0} existing tranches`);
      if (existingTranches && existingTranches.length > 0) {
        existingTranches.forEach(tranche => {
          console.log(`   - Tranche ${tranche.tranche_number}/${tranche.total_tranches}: ${tranche.hours_allocated}h allocated, ${tranche.used_hours}h used`);
        });
      }
    }
    
    // 6. Process PPL courses if needed
    if (pplInvoices.length > 0 && (!existingTranches || existingTranches.length === 0)) {
      console.log('\n📋 Step 6: Processing PPL courses...');
      
      // Import the PPL course service
      const { PPLCourseService } = require('../src/lib/ppl-course-service.ts');
      
      for (const { invoice, pplItems } of pplInvoices) {
        console.log(`Processing invoice ${invoice.smartbill_id}...`);
        
        const pplInvoice = {
          id: invoice.id,
          smartbill_id: invoice.smartbill_id,
          series: invoice.series,
          number: invoice.number,
          issue_date: invoice.issue_date,
          client: {
            name: invoice.invoice_clients[0].name,
            email: invoice.invoice_clients[0].email,
            user_id: invoice.invoice_clients[0].user_id
          },
          items: invoice.invoice_items?.map(item => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_amount: item.total_amount
          })) || []
        };
        
        try {
          const tranches = await PPLCourseService.processPPLCourseInvoice(pplInvoice);
          await PPLCourseService.savePPLCourseTranches(tranches);
          console.log(`✅ Created ${tranches.length} tranches for invoice ${invoice.smartbill_id}`);
        } catch (error) {
          console.log(`❌ Error processing invoice ${invoice.smartbill_id}:`, error.message);
        }
      }
    }
    
    // 7. Final check
    console.log('\n📋 Step 7: Final check...');
    const { data: finalTranches, error: finalError } = await supabase
      .from('ppl_course_tranches')
      .select('*')
      .eq('user_id', user.id)
      .order('tranche_number', { ascending: true });
    
    if (finalError) {
      console.log('❌ Error in final check:', finalError.message);
    } else {
      console.log(`✅ Final result: ${finalTranches?.length || 0} PPL course tranches`);
      if (finalTranches && finalTranches.length > 0) {
        const totalAllocated = finalTranches.reduce((sum, t) => sum + parseFloat(t.hours_allocated), 0);
        const totalUsed = finalTranches.reduce((sum, t) => sum + parseFloat(t.used_hours), 0);
        const totalRemaining = finalTranches.reduce((sum, t) => sum + parseFloat(t.remaining_hours), 0);
        
        console.log(`   Total allocated: ${totalAllocated}h`);
        console.log(`   Total used: ${totalUsed}h`);
        console.log(`   Total remaining: ${totalRemaining}h`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address: node scripts/debug-ppl-course.js <email>');
  process.exit(1);
}

// Run the debug
debugPPLCourse(email); 