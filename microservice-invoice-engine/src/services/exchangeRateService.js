const { parseStringPromise } = require('xml2js');
const logger = require('../utils/logger');

class ExchangeRateService {
  constructor() {
    this.rates = new Map();
    this.lastUpdate = null;
    this.updateInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.bnrUrl = 'https://www.bnr.ro/nbrfxrates.xml';
  }

  /**
   * Get exchange rate for a currency pair
   */
  async getExchangeRate(fromCurrency, toCurrency = 'RON') {
    try {
      // If requesting RON to RON, return 1
      if (fromCurrency === toCurrency) {
        return 1;
      }

      // If requesting RON to another currency, we need the inverse
      if (fromCurrency === 'RON') {
        const rate = await this.getExchangeRate(toCurrency, 'RON');
        return 1 / rate;
      }

      // For EUR to RON, fetch from BNR
      if (fromCurrency === 'EUR' && toCurrency === 'RON') {
        return await this.getEURtoRON();
      }

      // For other currencies, we'll need to implement additional sources
      // For now, return null to indicate unsupported conversion
      logger.warn('Unsupported currency conversion', { fromCurrency, toCurrency });
      return null;

    } catch (error) {
      logger.error('Error getting exchange rate', { 
        fromCurrency, 
        toCurrency, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get EUR to RON exchange rate from BNR
   */
  async getEURtoRON() {
    try {
      // Check if we have a recent rate
      if (this.shouldUseCachedRate()) {
        const cachedRate = this.rates.get('EUR_RON');
        if (cachedRate) {
          logger.info('Using cached EUR to RON rate', { rate: cachedRate });
          return cachedRate;
        }
      }

      logger.info('Fetching EUR to RON rate from BNR');

      // Dynamic import for node-fetch
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(this.bnrUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      const data = await parseStringPromise(xml);

      // Find EUR rate
      const cube = data.DataSet.Body[0].Cube[0].Rate;
      const eur = cube.find(r => r.$.currency === 'EUR');
      
      if (!eur) {
        throw new Error('EUR rate not found in BNR data');
      }

      const rate = parseFloat(eur._);
      
      // Cache the rate
      this.rates.set('EUR_RON', rate);
      this.lastUpdate = new Date();

      logger.info('EUR to RON rate fetched successfully', { 
        rate, 
        source: 'BNR',
        timestamp: this.lastUpdate.toISOString()
      });

      return rate;

    } catch (error) {
      logger.error('Error fetching EUR to RON rate from BNR', { 
        error: error.message,
        url: this.bnrUrl
      });

      // If BNR is unavailable, try to use cached rate even if old
      const cachedRate = this.rates.get('EUR_RON');
      if (cachedRate) {
        logger.warn('Using stale cached EUR to RON rate due to BNR unavailability', { 
          rate: cachedRate,
          lastUpdate: this.lastUpdate?.toISOString()
        });
        return cachedRate;
      }

      throw error;
    }
  }

  /**
   * Check if we should use cached rate
   */
  shouldUseCachedRate() {
    if (!this.lastUpdate) {
      return false;
    }

    const now = new Date();
    const timeDiff = now.getTime() - this.lastUpdate.getTime();
    
    return timeDiff < this.updateInterval;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(amount, fromCurrency, toCurrency = 'RON') {
    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      
      if (rate === null) {
        throw new Error(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`);
      }

      const convertedAmount = amount * rate;
      
      logger.info('Currency conversion completed', {
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        rate,
        convertedAmount: Math.round(convertedAmount * 100) / 100
      });

      return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places

    } catch (error) {
      logger.error('Error converting currency', { 
        amount, 
        fromCurrency, 
        toCurrency, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get exchange rate information for an invoice
   */
  async getInvoiceExchangeRateInfo(baseCurrency, targetCurrency = 'RON') {
    try {
      const rate = await this.getExchangeRate(baseCurrency, targetCurrency);
      
      if (rate === null) {
        return null;
      }

      return {
        fromCurrency: baseCurrency,
        toCurrency: targetCurrency,
        rate: rate,
        source: 'BNR',
        date: this.lastUpdate?.toISOString() || new Date().toISOString(),
        isCached: this.shouldUseCachedRate()
      };

    } catch (error) {
      logger.error('Error getting invoice exchange rate info', { 
        baseCurrency, 
        targetCurrency, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Clear cached rates (useful for testing)
   */
  clearCache() {
    this.rates.clear();
    this.lastUpdate = null;
    logger.info('Exchange rate cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      hasRates: this.rates.size > 0,
      lastUpdate: this.lastUpdate?.toISOString(),
      cachedRates: Array.from(this.rates.entries()),
      shouldUseCached: this.shouldUseCachedRate()
    };
  }
}

module.exports = new ExchangeRateService();
