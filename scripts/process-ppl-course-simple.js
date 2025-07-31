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

// PPL Course detection function
function isPPLCourseInvoice(invoice) {
  return invoice.invoice_items?.some(item => 
    item.name.toLowerCase().includes('pregătire ppl') ||
    item.name.toLowerCase().includes('ppl(a)') ||
    item.name.toLowerCase().includes('ppl course') ||
    (item.description && (
      item.description.toLowerCase().includes('pregătire ppl') ||
      item.description.toLowerCase().includes('ppl(a)') ||
      item.description.toLowerCase().includes('ppl course')
    ))
  );
}

// Parse tranche information
function parseTrancheInfo(description) {
  if (!description) return null;

  const desc = description.toLowerCase();
  
  // Pattern 1: "tranșa 1 (2875 euro)" - extract amount and calculate total tranches
  const pattern1 = /tranșa\s+(\d+)\s*\(([^)]+)\s*(?:euro|ron|lei)?\)/i;
  const match1 = desc.match(pattern1);
  
  if (match1) {
    const trancheNumber = parseInt(match1[1]);
    const amountText = match1[2].trim();
    
    // Extract numeric amount
    const amountMatch = amountText.match(/(\d+(?:[.,]\d+)?)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(',', '.'));
      
      // Calculate total tranches based on typical PPL course costs
      // Assuming total course cost is around 10,000-12,000 euro
      let totalTranches;
      if (amount <= 2000) {
        totalTranches = 6; // Very small tranches
      } else if (amount <= 3000) {
        totalTranches = 4; // Standard 4-tranche course
      } else if (amount <= 4000) {
        totalTranches = 3; // 3-tranche course
      } else if (amount <= 6000) {
        totalTranches = 2; // 2-tranche course
      } else {
        totalTranches = 1; // Single payment
      }
      
      // Cap maximum at 6 tranches
      totalTranches = Math.min(totalTranches, 6);
      
      const isFinal = trancheNumber === totalTranches;
      
      console.log(`   💰 Amount: ${amount} -> calculated ${totalTranches} total tranches`);
      
      return {
        trancheNumber,
        totalTranches,
        isFinal,
        amount
      };
    }
  }

  // Pattern 2: "Tranșa 1/4" - fractional format
  const pattern2 = /tranșa\s+(\d+)\s*\/\s*(\d+)/i;
  const match2 = desc.match(pattern2);
  
  if (match2) {
    const trancheNumber = parseInt(match2[1]);
    const totalTranches = parseInt(match2[2]);
    const isFinal = trancheNumber === totalTranches;
    
    return {
      trancheNumber,
      totalTranches,
      isFinal
    };
  }

  // Pattern 3: "tranșa 1 din 4" or "tranșa 1 din 3" - Romanian format
  const pattern3 = /tranșa\s+(\d+)\s+din\s+(\d+)/i;
  const match3 = desc.match(pattern3);
  
  if (match3) {
    const trancheNumber = parseInt(match3[1]);
    const totalTranches = parseInt(match3[2]);
    const isFinal = trancheNumber === totalTranches;
    
    return {
      trancheNumber,
      totalTranches,
      isFinal
    };
  }

  // Pattern 4: "tranșa final" or "ultima tranșa" - final tranche
  if (desc.includes('tranșa final') || desc.includes('ultima tranșa')) {
    return {
      trancheNumber: 1,
      totalTranches: 1,
      isFinal: true
    };
  }

  // Pattern 5: "tranșa 1" - single tranche without additional info, default to 4
  const pattern5 = /tranșa\s+(\d+)(?!\s*\/|\s+din)/i;
  const match5 = desc.match(pattern5);
  
  if (match5) {
    const trancheNumber = parseInt(match5[1]);
    // Default to 4 tranches when no information is available, but cap at 6
    const totalTranches = Math.min(4, 6);
    const isFinal = trancheNumber === totalTranches;
    
    console.log(`   ⚠️  No tranche info found, defaulting to ${totalTranches} total tranches`);
    
    return {
      trancheNumber,
      totalTranches,
      isFinal
    };
  }

  return null;
}

// Calculate tranche hours
function calculateTrancheHours(trancheNumber, totalTranches, totalCourseHours = 45) {
  if (trancheNumber === totalTranches) {
    // Final tranche gets remaining hours to ensure total equals 45
    const previousTranches = totalTranches - 1;
    const previousHours = Math.floor((totalCourseHours / totalTranches) * previousTranches);
    return totalCourseHours - previousHours;
  } else {
    // Regular tranches get proportional hours
    return Math.floor(totalCourseHours / totalTranches);
  }
}

async function processPPLCourse(email) {
  console.log(`🔍 Processing PPL course for: ${email}`);
  
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
    
    // 2. Find invoices for this user
    console.log('\n📋 Step 2: Finding invoices for user...');
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
    
    // 3. Check for PPL course items
    console.log('\n📋 Step 3: Checking for PPL course items...');
    const pplInvoices = [];
    
    for (const invoice of invoices || []) {
      if (isPPLCourseInvoice(invoice)) {
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
    
    // 4. Process PPL courses
    console.log('\n📋 Step 4: Processing PPL courses...');
    
    for (const { invoice, pplItems } of pplInvoices) {
      console.log(`Processing invoice ${invoice.smartbill_id}...`);
      
      for (const item of pplItems) {
        const trancheInfo = parseTrancheInfo(item.description || item.name);
        
        if (!trancheInfo) {
          console.log(`   ⚠️  No tranche info found for item: ${item.name}`);
          continue;
        }
        
        // Validate tranche number doesn't exceed total tranches
        if (trancheInfo.trancheNumber > trancheInfo.totalTranches) {
          console.log(`   ⚠️  Tranche number ${trancheInfo.trancheNumber} exceeds total ${trancheInfo.totalTranches}, adjusting to final tranche`);
          trancheInfo.trancheNumber = trancheInfo.totalTranches;
          trancheInfo.isFinal = true;
        }
        
        const hoursAllocated = calculateTrancheHours(
          trancheInfo.trancheNumber,
          trancheInfo.totalTranches
        );
        
        console.log(`   📝 Creating tranche ${trancheInfo.trancheNumber}/${trancheInfo.totalTranches} with ${hoursAllocated} hours`);
        
        // Check if tranche already exists
        const { data: existingTranche } = await supabase
          .from('ppl_course_tranches')
          .select('id')
          .eq('invoice_id', invoice.smartbill_id)
          .eq('tranche_number', trancheInfo.trancheNumber)
          .single();
        
        if (existingTranche) {
          console.log(`   ⚠️  Tranche ${trancheInfo.trancheNumber} for invoice ${invoice.smartbill_id} already exists`);
          continue;
        }
        
        // Insert new tranche
        const { error: insertError } = await supabase
          .from('ppl_course_tranches')
          .insert({
            invoice_id: invoice.smartbill_id,
            user_id: user.id,
            tranche_number: trancheInfo.trancheNumber,
            total_tranches: trancheInfo.totalTranches,
            hours_allocated: hoursAllocated,
            total_course_hours: 45,
            amount: item.total_amount,
            currency: 'RON',
            description: item.description || item.name,
            purchase_date: invoice.issue_date,
            status: 'active',
            used_hours: 0,
            remaining_hours: hoursAllocated
          });
        
        if (insertError) {
          console.log(`   ❌ Error creating tranche: ${insertError.message}`);
        } else {
          console.log(`   ✅ Successfully created tranche ${trancheInfo.trancheNumber}`);
        }
      }
    }
    
    // 5. Final check
    console.log('\n📋 Step 5: Final check...');
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
        
        finalTranches.forEach(tranche => {
          console.log(`   - Tranche ${tranche.tranche_number}/${tranche.total_tranches}: ${tranche.hours_allocated}h allocated`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address: node scripts/process-ppl-course-simple.js <email>');
  process.exit(1);
}

// Run the processing
processPPLCourse(email); 