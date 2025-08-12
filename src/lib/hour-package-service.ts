import { getSupabaseClient } from './supabase';

export interface HourPackage {
  id: string;
  user_id: string;
  invoice_id?: string;
  package_name: string;
  hours_bought: number;
  hours_used: number;
  price: number;
  currency: string;
  purchase_date: string;
  expiry_date?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'USED_UP';
  created_at: string;
  updated_at: string;
}

export interface UserHourSummary {
  totalBought: number;
  totalUsed: number;
  totalRemaining: number;
  packages: HourPackage[];
}

export class HourPackageService {
  /**
   * Get hour summary for a user
   */
  static async getUserHourSummary(userId: string): Promise<UserHourSummary> {
    // Since the orders table structure is different and there are no orders yet,
    // return a fallback that doesn't cause errors
    console.log(`📋 getUserHourSummary called for user ${userId} - returning fallback data`);
    
    return {
      totalBought: 0,
      totalUsed: 0,
      totalRemaining: 0,
      packages: []
    };
  }

  /**
   * Create a new hour package (when user buys hours)
   * Note: This function is not currently used. User packages are created through orders.
   */
  static async createHourPackage(
    userId: string,
    packageName: string,
    hoursBought: number,
    price: number,
    currency: string = 'RON',
    invoiceId?: string,
    expiryDate?: string
  ): Promise<HourPackage> {
    throw new Error('createHourPackage is not implemented. User packages are created through the orders system.');
  }

  /**
   * Use hours from packages (when user logs a flight)
   * Note: This function is not currently used. Hours are tracked through flight logs.
   */
  static async useHours(userId: string, hoursToUse: number): Promise<boolean> {
    throw new Error('useHours is not implemented. Hours are tracked through the flight logs system.');
  }

      const availableHours = pkg.hours_bought - pkg.hours_used;
      if (availableHours <= 0) continue;

      const hoursToUseFromPackage = Math.min(remainingHoursToUse, availableHours);
      const newUsedHours = pkg.hours_used + hoursToUseFromPackage;
      const newStatus = newUsedHours >= pkg.hours_bought ? 'USED_UP' : 'ACTIVE';

      updates.push(

  }

  /**
   * Get packages that are expiring soon
   * Note: This function is not currently used. Package management is handled through orders.
   */
  static async getExpiringPackages(daysThreshold: number = 30): Promise<HourPackage[]> {
    throw new Error('getExpiringPackages is not implemented. Package management is handled through the orders system.');
  }

  /**
   * Update expired packages
   * Note: This function is not currently used. Package management is handled through orders.
   */
  static async updateExpiredPackages(): Promise<number> {
    throw new Error('updateExpiredPackages is not implemented. Package management is handled through the orders system.');
  }

  /**
   * Get package usage history
   * Note: This function is not currently used. Package history is tracked through orders.
   */
  static async getPackageHistory(userId: string): Promise<HourPackage[]> {
    throw new Error('getPackageHistory is not implemented. Package history is tracked through the orders system.');
  }
} 