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
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    const { data: packages, error } = await supabase
      .from('hour_packages')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('purchase_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch hour packages: ${error.message}`);
    }

    const totalBought = packages.reduce((sum, pkg) => sum + pkg.hours_bought, 0);
    const totalUsed = packages.reduce((sum, pkg) => sum + pkg.hours_used, 0);
    const totalRemaining = totalBought - totalUsed;

    return {
      totalBought,
      totalUsed,
      totalRemaining,
      packages: packages || []
    };
  }

  /**
   * Create a new hour package (when user buys hours)
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
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    const { data: hourPackage, error } = await supabase
      .from('hour_packages')
      .insert({
        user_id: userId,
        invoice_id: invoiceId,
        package_name: packageName,
        hours_bought: hoursBought,
        hours_used: 0,
        price,
        currency,
        expiry_date: expiryDate,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create hour package: ${error.message}`);
    }

    return hourPackage;
  }

  /**
   * Use hours from packages (when user logs a flight)
   */
  static async useHours(userId: string, hoursToUse: number): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    // Get active packages with remaining hours
    const { data: packages, error: fetchError } = await supabase
      .from('hour_packages')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('purchase_date', { ascending: true }); // Use oldest packages first

    if (fetchError) {
      throw new Error(`Failed to fetch packages: ${fetchError.message}`);
    }

    if (!packages || packages.length === 0) {
      throw new Error('No active hour packages found');
    }

    let remainingHoursToUse = hoursToUse;
    const updates: Promise<any>[] = [];

    for (const pkg of packages) {
      if (remainingHoursToUse <= 0) break;

      const availableHours = pkg.hours_bought - pkg.hours_used;
      if (availableHours <= 0) continue;

      const hoursToUseFromPackage = Math.min(remainingHoursToUse, availableHours);
      const newUsedHours = pkg.hours_used + hoursToUseFromPackage;
      const newStatus = newUsedHours >= pkg.hours_bought ? 'USED_UP' : 'ACTIVE';

      updates.push(
        supabase
          .from('hour_packages')
          .update({
            hours_used: newUsedHours,
            status: newStatus
          })
          .eq('id', pkg.id)
      );

      remainingHoursToUse -= hoursToUseFromPackage;
    }

    if (remainingHoursToUse > 0) {
      throw new Error(`Insufficient hours available. Need ${hoursToUse} but only have ${hoursToUse - remainingHoursToUse} remaining`);
    }

    // Execute all updates
    const results = await Promise.all(updates);
    const errors = results.filter(result => result.error);
    
    if (errors.length > 0) {
      throw new Error(`Failed to update some packages: ${errors.map(e => e.error.message).join(', ')}`);
    }

    return true;
  }

  /**
   * Get packages that are expiring soon
   */
  static async getExpiringPackages(daysThreshold: number = 30): Promise<HourPackage[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysThreshold);

    const { data: packages, error } = await supabase
      .from('hour_packages')
      .select('*')
      .eq('status', 'ACTIVE')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', expiryDate.toISOString())
      .order('expiry_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch expiring packages: ${error.message}`);
    }

    return packages || [];
  }

  /**
   * Update expired packages
   */
  static async updateExpiredPackages(): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    const { data, error } = await supabase
      .from('hour_packages')
      .update({ status: 'EXPIRED' })
      .eq('status', 'ACTIVE')
      .not('expiry_date', 'is', null)
      .lt('expiry_date', new Date().toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to update expired packages: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get package usage history
   */
  static async getPackageHistory(userId: string): Promise<HourPackage[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    const { data: packages, error } = await supabase
      .from('hour_packages')
      .select('*')
      .eq('user_id', userId)
      .order('purchase_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch package history: ${error.message}`);
    }

    return packages || [];
  }
} 