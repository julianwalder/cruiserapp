const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.warn('Supabase configuration not found, using in-memory counters');
      this.client = null;
      return;
    }

    this.client = createClient(supabaseUrl, supabaseServiceKey);
    logger.info('Supabase client initialized');
  }

  /**
   * Get current invoice counter for a series
   */
  async getInvoiceCounter(series) {
    if (!this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('invoice_counters')
        .select('current_counter, start_number')
        .eq('series', series)
        .single();

      if (error) {
        logger.error('Error getting invoice counter', { series, error: error.message });
        return null;
      }

      return {
        currentCounter: data.current_counter,
        startNumber: data.start_number
      };
    } catch (error) {
      logger.error('Error getting invoice counter', { series, error: error.message });
      return null;
    }
  }

  /**
   * Increment invoice counter and return new value
   */
  async incrementInvoiceCounter(series) {
    if (!this.client) {
      return null;
    }

    try {
      // First get the current counter
      const { data: currentData, error: getError } = await this.client
        .from('invoice_counters')
        .select('current_counter, start_number')
        .eq('series', series)
        .single();

      if (getError) {
        logger.error('Error getting current counter', { series, error: getError.message });
        return null;
      }

      const newCounter = currentData.current_counter + 1;

      // Update with the new counter value
      const { data, error } = await this.client
        .from('invoice_counters')
        .update({ 
          current_counter: newCounter,
          updated_at: new Date().toISOString()
        })
        .eq('series', series)
        .select('current_counter, start_number')
        .single();

      if (error) {
        logger.error('Error incrementing invoice counter', { series, error: error.message });
        return null;
      }

      return {
        currentCounter: data.current_counter,
        startNumber: data.start_number
      };
    } catch (error) {
      logger.error('Error incrementing invoice counter', { series, error: error.message });
      return null;
    }
  }

  /**
   * Get all invoice counters
   */
  async getAllInvoiceCounters() {
    if (!this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('invoice_counters')
        .select('series, current_counter, start_number, updated_at')
        .order('series');

      if (error) {
        logger.error('Error getting all invoice counters', { error: error.message });
        return null;
      }

      return data.reduce((acc, counter) => {
        acc[counter.series.toLowerCase() === 'prof' ? 'proforma' : 'fiscal'] = {
          series: counter.series,
          currentCounter: counter.current_counter,
          startNumber: counter.start_number,
          updatedAt: counter.updated_at
        };
        return acc;
      }, {});
    } catch (error) {
      logger.error('Error getting all invoice counters', { error: error.message });
      return null;
    }
  }

  /**
   * Initialize counters if they don't exist
   */
  async initializeCounters() {
    if (!this.client) {
      return false;
    }

    try {
      const { data, error } = await this.client
        .from('invoice_counters')
        .select('series')
        .in('series', ['PROF', 'FISC']);

      if (error) {
        logger.error('Error checking existing counters', { error: error.message });
        return false;
      }

      const existingSeries = data.map(row => row.series);
      const missingSeries = ['PROF', 'FISC'].filter(series => !existingSeries.includes(series));

      if (missingSeries.length > 0) {
        const insertData = missingSeries.map(series => ({
          series,
          current_counter: 1000,
          start_number: 1000
        }));

        const { error: insertError } = await this.client
          .from('invoice_counters')
          .insert(insertData);

        if (insertError) {
          logger.error('Error inserting missing counters', { error: insertError.message });
          return false;
        }

        logger.info('Initialized missing invoice counters', { missingSeries });
      }

      return true;
    } catch (error) {
      logger.error('Error initializing counters', { error: error.message });
      return false;
    }
  }

  /**
   * Check if Supabase is available
   */
  isAvailable() {
    return this.client !== null;
  }
}

module.exports = new SupabaseService();
