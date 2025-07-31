import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface PPLCourseTranche {
  id: string;
  invoiceId: string;
  userId: string;
  companyId?: string;
  trancheNumber: number;
  totalTranches: number;
  hoursAllocated: number;
  totalCourseHours: number;
  amount: number;
  currency: string;
  description: string;
  purchaseDate: string;
  status: 'active' | 'completed' | 'expired';
  usedHours: number;
  remainingHours: number;
}

export interface PPLCourseInvoice {
  id: string;
  smartbill_id: string;
  series: string;
  number: string;
  issue_date: string;
  client: {
    name: string;
    email?: string;
    user_id?: string;
    company_id?: string;
  };
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_amount: number;
  }>;
}

export class PPLCourseService {
  /**
   * Check if an invoice contains PPL course items
   */
  static isPPLCourseInvoice(invoice: PPLCourseInvoice): boolean {
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

  /**
   * Parse tranche information from invoice item description
   */
  static parseTrancheInfo(description: string): { trancheNumber: number; totalTranches: number; isFinal: boolean; amount?: number } | null {
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

  /**
   * Calculate hours allocated for a PPL course tranche
   */
  static calculateTrancheHours(
    trancheNumber: number, 
    totalTranches: number, 
    totalCourseHours: number = 45,
    amount?: number
  ): number {
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

  /**
   * Process PPL course invoice and create tranche records
   */
  static async processPPLCourseInvoice(invoice: PPLCourseInvoice): Promise<PPLCourseTranche[]> {
    const tranches: PPLCourseTranche[] = [];
    
    // Find PPL course items using the same logic as isPPLCourseInvoice
    const pplItems = invoice.items.filter(item => 
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

    for (const item of pplItems) {
      const trancheInfo = this.parseTrancheInfo(item.description || item.name);
      
      if (!trancheInfo) {
        console.warn(`No tranche info found for PPL item: ${item.name}`);
        continue;
      }

      const hoursAllocated = this.calculateTrancheHours(
        trancheInfo.trancheNumber,
        trancheInfo.totalTranches,
        45,
        trancheInfo.amount
      );

      const tranche: PPLCourseTranche = {
        id: `${invoice.id}-${trancheInfo.trancheNumber}`,
        invoiceId: invoice.smartbill_id,
        userId: invoice.client.user_id!,
        companyId: invoice.client.company_id || undefined,
        trancheNumber: trancheInfo.trancheNumber,
        totalTranches: trancheInfo.totalTranches,
        hoursAllocated,
        totalCourseHours: 45,
        amount: item.total_amount,
        currency: 'RON', // Default currency
        description: item.description || item.name,
        purchaseDate: invoice.issue_date,
        status: 'active',
        usedHours: 0,
        remainingHours: hoursAllocated
      };

      tranches.push(tranche);
    }

    return tranches;
  }

  /**
   * Save PPL course tranches to database
   */
  static async savePPLCourseTranches(tranches: PPLCourseTranche[]): Promise<void> {
    for (const tranche of tranches) {
      // Check if tranche already exists
      const { data: existingTranche } = await supabase
        .from('ppl_course_tranches')
        .select('id')
        .eq('invoice_id', tranche.invoiceId)
        .eq('tranche_number', tranche.trancheNumber)
        .single();

      if (existingTranche) {
        console.log(`Tranche ${tranche.trancheNumber} for invoice ${tranche.invoiceId} already exists`);
        continue;
      }

      // Insert new tranche
      const { error } = await supabase
        .from('ppl_course_tranches')
        .insert({
          invoice_id: tranche.invoiceId,
          user_id: tranche.userId,
          company_id: tranche.companyId,
          tranche_number: tranche.trancheNumber,
          total_tranches: tranche.totalTranches,
          hours_allocated: tranche.hoursAllocated,
          total_course_hours: tranche.totalCourseHours,
          amount: tranche.amount,
          currency: tranche.currency,
          description: tranche.description,
          purchase_date: tranche.purchaseDate,
          status: tranche.status,
          used_hours: tranche.usedHours,
          remaining_hours: tranche.remainingHours
        });

      if (error) {
        console.error(`Failed to save PPL course tranche: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Get PPL course tranches for a user
   */
  static async getUserPPLCourseTranches(userId: string): Promise<PPLCourseTranche[]> {
    const { data, error } = await supabase
      .from('ppl_course_tranches')
      .select('*')
      .eq('user_id', userId)
      .order('purchase_date', { ascending: false });

    if (error) {
      console.error(`Failed to fetch PPL course tranches: ${error.message}`);
      throw error;
    }

    return data?.map(tranche => ({
      id: tranche.id,
      invoiceId: tranche.invoice_id,
      userId: tranche.user_id,
      companyId: tranche.company_id,
      trancheNumber: tranche.tranche_number,
      totalTranches: tranche.total_tranches,
      hoursAllocated: tranche.hours_allocated,
      totalCourseHours: tranche.total_course_hours,
      amount: tranche.amount,
      currency: tranche.currency,
      description: tranche.description,
      purchaseDate: tranche.purchase_date,
      status: tranche.status,
      usedHours: tranche.used_hours,
      remainingHours: tranche.remaining_hours
    })) || [];
  }

  /**
   * Update PPL course tranche usage based on flight logs
   */
  static async updatePPLCourseUsage(userId: string): Promise<void> {
    // Get all PPL course tranches for the user
    const tranches = await this.getUserPPLCourseTranches(userId);
    
    if (tranches.length === 0) {
      return; // No PPL courses for this user
    }
    
    // Get user's flight logs
    const { data: flightLogs, error: flightLogsError } = await supabase
      .from('flight_logs')
      .select('id, totalHours, date')
      .eq('pilotId', userId)
      .order('date', { ascending: true });

    if (flightLogsError) {
      console.error(`Failed to fetch flight logs: ${flightLogsError.message}`);
      return;
    }

    // Calculate total flight hours
    const totalFlightHours = flightLogs.reduce((sum, log) => {
      const hours = parseFloat(log.totalHours) || 0;
      return sum + hours;
    }, 0);

    if (totalFlightHours === 0) {
      // Reset all tranches to 0 usage
      for (const tranche of tranches) {
        const { error } = await supabase
          .from('ppl_course_tranches')
          .update({
            used_hours: 0,
            remaining_hours: tranche.hoursAllocated,
            status: 'active'
          })
          .eq('id', tranche.id);

        if (error) {
          console.error(`Failed to update PPL course tranche ${tranche.id}: ${error.message}`);
        }
      }
      return;
    }

    // Calculate total PPL hours allocated
    const totalPPLAllocated = tranches.reduce((sum, t) => sum + t.hoursAllocated, 0);
    
    // Allocate flight hours to PPL tranches in order
    let remainingFlightHours = totalFlightHours;
    const trancheUpdates: Array<{ id: string; usedHours: number; remainingHours: number }> = [];

    for (const tranche of tranches.sort((a, b) => a.trancheNumber - b.trancheNumber)) {
      if (remainingFlightHours <= 0) {
        // No more flight hours to allocate
        trancheUpdates.push({
          id: tranche.id,
          usedHours: 0,
          remainingHours: tranche.hoursAllocated
        });
        continue;
      }

      // Calculate how many hours to use from this tranche
      const hoursToUse = Math.min(remainingFlightHours, tranche.hoursAllocated);
      const newRemainingHours = tranche.hoursAllocated - hoursToUse;
      
      trancheUpdates.push({
        id: tranche.id,
        usedHours: hoursToUse,
        remainingHours: Math.max(0, newRemainingHours)
      });

      remainingFlightHours -= hoursToUse;
    }

    // Update tranches in database
    for (const update of trancheUpdates) {
      const { error } = await supabase
        .from('ppl_course_tranches')
        .update({
          used_hours: update.usedHours,
          remaining_hours: update.remainingHours,
          status: update.remainingHours <= 0 ? 'completed' : 'active'
        })
        .eq('id', update.id);

      if (error) {
        console.error(`Failed to update PPL course tranche ${update.id}: ${error.message}`);
      }
    }
  }

  /**
   * Get PPL course summary for a user
   */
  static async getUserPPLCourseSummary(userId: string): Promise<{
    totalTranches: number;
    completedTranches: number;
    totalHoursAllocated: number;
    totalHoursUsed: number;
    totalHoursRemaining: number;
    progress: number;
    isCompleted: boolean;
  }> {
    const tranches = await this.getUserPPLCourseTranches(userId);
    
    const totalTranches = tranches.length;
    const completedTranches = tranches.filter(t => t.status === 'completed').length;
    const totalHoursAllocated = tranches.reduce((sum, t) => sum + t.hoursAllocated, 0);
    const totalHoursUsed = tranches.reduce((sum, t) => sum + t.usedHours, 0);
    const totalHoursRemaining = tranches.reduce((sum, t) => sum + t.remainingHours, 0);
    const progress = totalHoursAllocated > 0 ? (totalHoursUsed / totalHoursAllocated) * 100 : 0;
    const isCompleted = totalHoursRemaining <= 0 && totalHoursAllocated >= 45;

    return {
      totalTranches,
      completedTranches,
      totalHoursAllocated,
      totalHoursUsed,
      totalHoursRemaining,
      progress,
      isCompleted
    };
  }
} 