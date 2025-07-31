const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// PPL Course Service logic (copied from TypeScript service)
class PPLCourseService {
  static isPPLCourseInvoice(invoice) {
    return invoice.items.some(item => 
      item.name.toLowerCase().includes('pregătire ppl') ||
      item.name.toLowerCase().includes('cursuri formare ppl') ||
      item.name.toLowerCase().includes('ppl(a)') ||
      item.name.toLowerCase().includes('ppl course') ||
      (item.description && (
        item.description.toLowerCase().includes('pregătire ppl') ||
        item.description.toLowerCase().includes('cursuri formare ppl') ||
        item.description.toLowerCase().includes('ppl(a)') ||
        item.description.toLowerCase().includes('ppl course')
      ))
    );
  }

  static parseTrancheInfo(description) {
    if (!description) return null;

    const desc = description.toLowerCase();
    
    // Pattern 1: "tranșa 1 (2875 euro)" or "Tranșa 1/4" or "Transa 1 (4750 euro)"
    const pattern1 = /tran[sș]a\s+(\d+)(?:\s*\/\s*(\d+))?/i;
    const match1 = desc.match(pattern1);
    
    if (match1) {
      const trancheNumber = parseInt(match1[1]);
      const totalTranches = match1[2] ? parseInt(match1[2]) : null;
      const isFinal = desc.includes('final') || desc.includes('ultima');
      
      // Extract amount if present
      const amountMatch = desc.match(/\((\d+(?:[.,]\d+)?)\s*(?:euro|ron|lei)?\)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : undefined;
      
      return {
        trancheNumber,
        totalTranches: totalTranches || (isFinal ? trancheNumber : null),
        isFinal,
        amount
      };
    }

    // Pattern 2: "tranșa final" or "ultima tranșa" or "transa final"
    if (desc.includes('tranșa final') || desc.includes('transa final') || desc.includes('ultima tranșa') || desc.includes('ultima transa')) {
      return {
        trancheNumber: 1,
        totalTranches: 1,
        isFinal: true
      };
    }

    // Pattern 3: "tranșa 1 din 4" or "tranșa 1 din 3" or "transa 1 din 4"
    const pattern3 = /tran[sș]a\s+(\d+)\s+din\s+(\d+)/i;
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

    return null;
  }

  static calculateTrancheHours(trancheNumber, totalTranches, totalCourseHours = 45, amount) {
    // If we have an amount, use the improved logic based on amount ranges
    if (amount) {
      let calculatedTotalTranches = totalTranches;
      
      // Infer total tranches based on amount if not provided
      if (!totalTranches) {
        if (amount <= 2000) { calculatedTotalTranches = 6; }
        else if (amount <= 3000) { calculatedTotalTranches = 4; }
        else if (amount <= 4000) { calculatedTotalTranches = 3; }
        else if (amount <= 6000) { calculatedTotalTranches = 2; }
        else { calculatedTotalTranches = 1; }
        calculatedTotalTranches = Math.min(calculatedTotalTranches, 6); // Cap maximum at 6 tranches
      }
      
      if (trancheNumber === calculatedTotalTranches) {
        // Final tranche gets remaining hours to ensure total equals 45
        const previousTranches = calculatedTotalTranches - 1;
        const previousHours = Math.floor((totalCourseHours / calculatedTotalTranches) * previousTranches);
        return totalCourseHours - previousHours;
      } else {
        // Regular tranches get proportional hours
        return Math.floor(totalCourseHours / calculatedTotalTranches);
      }
    }
    
    // Fallback to original logic
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
}

async function processDanaPPL() {
  console.log('🔍 Processing Dana\'s PPL invoice...');
  
  // Get Dana's user ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'dana.elena.costica@gmail.com')
    .single();
    
  if (userError) {
    console.log('❌ User not found:', userError.message);
    return;
  }
  
  console.log('✅ Found user:', user.email);
  
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
  
  // Parse XML to extract items
  try {
    const xmlContent = invoice.xml_content;
    
    // Extract customer info
    const customerMatch = xmlContent.match(/<CustomerName>([^<]+)<\/CustomerName>/);
    const emailMatch = xmlContent.match(/<CustomerEmail>([^<]+)<\/CustomerEmail>/);
    
    console.log('📋 Customer:', customerMatch ? customerMatch[1] : 'Unknown');
    console.log('📧 Email:', emailMatch ? emailMatch[1] : 'Unknown');
    
    // Extract items from XML
    const items = [];
    
    // Look for the specific structure we found
    const itemMatch = xmlContent.match(/<cac:Item>([\s\S]*?)<\/cac:Item>/);
    
    if (itemMatch) {
      const itemXml = itemMatch[1];
      console.log('📦 Found item XML:', itemXml);
      
      const descriptionMatch = itemXml.match(/<cbc:Description>([^<]+)<\/cbc:Description>/);
      const nameMatch = itemXml.match(/<cbc:Name>([^<]+)<\/cbc:Name>/);
      
      // Look for amount in the parent InvoiceLine
      const lineExtensionMatch = xmlContent.match(/<cbc:LineExtensionAmount[^>]*>([^<]+)<\/cbc:LineExtensionAmount>/);
      
      const item = {
        name: nameMatch ? nameMatch[1] : '',
        description: descriptionMatch ? descriptionMatch[1] : '',
        quantity: 1,
        unit: 'piece',
        unit_price: 0,
        total_amount: lineExtensionMatch ? parseFloat(lineExtensionMatch[1]) : 0
      };
      
      items.push(item);
      console.log(`\n📦 Extracted item:`, item);
    } else {
      console.log('❌ No item found in XML');
    }
    
    // Create invoice object for processing
    const invoiceObj = {
      id: invoice.id,
      smartbill_id: invoice.smartbill_id,
      series: invoice.series,
      number: invoice.number,
      issue_date: invoice.issue_date,
      client: {
        name: customerMatch ? customerMatch[1] : '',
        email: emailMatch ? emailMatch[1] : '',
        user_id: user.id
      },
      items: items
    };
    
    console.log('\n🔍 Checking if this is a PPL course invoice...');
    const isPPL = PPLCourseService.isPPLCourseInvoice(invoiceObj);
    console.log('Is PPL Course Invoice:', isPPL);
    
    if (isPPL) {
      console.log('\n🎯 Processing PPL course items...');
      
      // Find PPL course items
      const pplItems = items.filter(item => 
        item.name.toLowerCase().includes('pregătire ppl') ||
        item.name.toLowerCase().includes('cursuri formare ppl') ||
        item.name.toLowerCase().includes('ppl(a)') ||
        item.name.toLowerCase().includes('ppl course') ||
        (item.description && (
          item.description.toLowerCase().includes('pregătire ppl') ||
          item.description.toLowerCase().includes('cursuri formare ppl') ||
          item.description.toLowerCase().includes('ppl(a)') ||
          item.description.toLowerCase().includes('ppl course')
        ))
      );
      
      console.log(`Found ${pplItems.length} PPL course items`);
      
      for (const item of pplItems) {
        console.log(`\n📋 Processing item: ${item.name}`);
        console.log(`Description: ${item.description}`);
        
        const trancheInfo = PPLCourseService.parseTrancheInfo(item.description || item.name);
        console.log('Tranche Info:', trancheInfo);
        
        if (!trancheInfo) {
          console.log('❌ No tranche info found');
          continue;
        }
        
        const hoursAllocated = PPLCourseService.calculateTrancheHours(
          trancheInfo.trancheNumber,
          trancheInfo.totalTranches,
          45,
          trancheInfo.amount
        );
        
        console.log(`✅ Hours allocated: ${hoursAllocated}`);
        
        // Create tranche record
        const tranche = {
          id: crypto.randomUUID(),
          invoice_id: invoice.smartbill_id,
          user_id: user.id,
          tranche_number: trancheInfo.trancheNumber,
          total_tranches: trancheInfo.totalTranches || 1,
          hours_allocated: hoursAllocated,
          total_course_hours: 45,
          amount: item.total_amount,
          currency: 'RON',
          description: item.description || item.name,
          purchase_date: invoice.issue_date,
          status: 'active',
          used_hours: 0,
          remaining_hours: hoursAllocated
        };
        
        console.log('📝 Creating tranche record:', tranche);
        
        // Insert into database
        const { data: insertedTranche, error: insertError } = await supabase
          .from('ppl_course_tranches')
          .insert(tranche);
          
        if (insertError) {
          console.log('❌ Error inserting tranche:', insertError.message);
        } else {
          console.log('✅ Tranche created successfully!');
        }
      }
    } else {
      console.log('❌ This is not a PPL course invoice');
    }
    
  } catch (e) {
    console.log('❌ Error processing XML:', e.message);
  }
}

processDanaPPL().catch(console.error); 