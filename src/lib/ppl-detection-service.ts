/**
 * Simple PPL Course Detection Service
 * Detects PPL course invoices and calculates hours paid
 */

export interface PPLInvoiceInfo {
  isPPL: boolean;
  hoursPaid: number;
  description?: string;
}

export class PPLDetectionService {
  /**
   * Check if an invoice contains PPL course items
   */
  static isPPLCourseInvoice(items: Array<{ name: string; description?: string }>): boolean {
    return items.some(item => {
      const name = item.name.toLowerCase();
      const description = item.description?.toLowerCase() || '';
      
      return name.includes('pregătire ppl') ||
             name.includes('cursuri formare ppl') ||
             name.includes('ppl(a)') ||
             name.includes('ppl course') ||
             description.includes('pregătire ppl') ||
             description.includes('cursuri formare ppl') ||
             description.includes('ppl(a)') ||
             description.includes('ppl course');
    });
  }

  /**
   * Calculate PPL hours paid based on invoice items
   */
  static calculatePPLHoursPaid(items: Array<{ name: string; description?: string; total_amount: number }>): number {
    const pplItems = items.filter(item => {
      const name = item.name.toLowerCase();
      const description = item.description?.toLowerCase() || '';
      
      return name.includes('pregătire ppl') ||
             name.includes('cursuri formare ppl') ||
             name.includes('ppl(a)') ||
             name.includes('ppl course') ||
             description.includes('pregătire ppl') ||
             description.includes('cursuri formare ppl') ||
             description.includes('ppl(a)') ||
             description.includes('ppl course');
    });

    if (pplItems.length === 0) {
      return 0;
    }

    // Calculate hours based on amount paid
    // Assuming the full PPL course costs around 10,000-15,000 RON for 45 hours
    const totalAmount = pplItems.reduce((sum, item) => sum + item.total_amount, 0);
    
    // Simple calculation: if amount is close to full course cost, allocate 45 hours
    // Otherwise, calculate proportionally
    if (totalAmount >= 14000) {
      return 45; // Full course
    } else if (totalAmount >= 10000) {
      return 45; // Full course (lower threshold)
    } else if (totalAmount >= 7000) {
      return 30; // 2/3 of course
    } else if (totalAmount >= 5000) {
      return 20; // ~1/2 of course
    } else if (totalAmount >= 3000) {
      return 11; // ~1/4 of course
    } else if (totalAmount >= 2000) {
      return 7; // ~1/6 of course
    } else {
      return 5; // Minimum allocation
    }
  }

  /**
   * Get PPL information for an invoice
   */
  static getPPLInfo(items: Array<{ name: string; description?: string; total_amount: number }>): PPLInvoiceInfo {
    const isPPL = this.isPPLCourseInvoice(items);
    const hoursPaid = isPPL ? this.calculatePPLHoursPaid(items) : 0;
    
    return {
      isPPL,
      hoursPaid,
      description: isPPL ? `PPL Course - ${hoursPaid} hours paid` : undefined
    };
  }
} 