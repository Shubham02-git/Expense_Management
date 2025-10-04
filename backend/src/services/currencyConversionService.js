const axios = require('axios');

/**
 * Currency Conversion Service
 * Handles real-time currency conversion using ExchangeRate API
 */
class CurrencyConversionService {
  constructor() {
    this.baseUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';
    this.defaultBase = process.env.EXCHANGE_RATE_DEFAULT_BASE || 'USD';
    this.cache = new Map();
    this.cacheExpiry = parseInt(process.env.EXCHANGE_RATE_CACHE_TTL) || 3600; // 1 hour
    this.lastFetch = new Map();
  }

  /**
   * Get exchange rates for a base currency
   * @param {string} baseCurrency - Base currency code (e.g., 'USD')
   * @returns {Promise<Object>} Exchange rates object
   */
  async getExchangeRates(baseCurrency = this.defaultBase) {
    try {
      const cacheKey = `rates_${baseCurrency.toUpperCase()}`;
      
      // Check cache first
      if (this.cache.has(cacheKey) && this.isCacheValid(baseCurrency)) {
        console.log(`🔄 Using cached exchange rates for ${baseCurrency}`);
        return this.cache.get(cacheKey);
      }

      console.log(`💱 Fetching exchange rates for ${baseCurrency} from ExchangeRate API...`);
      const response = await axios.get(`${this.baseUrl}/${baseCurrency.toUpperCase()}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ExpenseManagementSystem/1.0'
        }
      });

      const data = response.data;
      
      // Validate response structure
      if (!data.rates || !data.base) {
        throw new Error('Invalid response format from exchange rate API');
      }

      // Cache the results
      this.cache.set(cacheKey, data);
      this.lastFetch.set(baseCurrency, Date.now());
      
      console.log(`✅ Successfully fetched exchange rates for ${baseCurrency} (${Object.keys(data.rates).length} currencies)`);
      return data;
      
    } catch (error) {
      console.error(`❌ Error fetching exchange rates for ${baseCurrency}:`, error.message);
      
      // Return cached data if available, even if expired
      const cacheKey = `rates_${baseCurrency.toUpperCase()}`;
      if (this.cache.has(cacheKey)) {
        console.log('⚠️ Using expired cached exchange rates due to API error');
        return this.cache.get(cacheKey);
      }
      
      throw new Error(`Failed to fetch exchange rates for ${baseCurrency}: ${error.message}`);
    }
  }

  /**
   * Convert amount from one currency to another
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @returns {Promise<Object>} Conversion result
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();

      // If same currency, return original amount
      if (from === to) {
        return {
          originalAmount: amount,
          convertedAmount: amount,
          fromCurrency: from,
          toCurrency: to,
          exchangeRate: 1,
          timestamp: new Date().toISOString(),
          source: 'same_currency'
        };
      }

      // Get exchange rates for the base currency
      let rates;
      let exchangeRate;

      if (from === this.defaultBase) {
        // Converting from default base currency
        rates = await this.getExchangeRates(from);
        exchangeRate = rates.rates[to];
      } else if (to === this.defaultBase) {
        // Converting to default base currency
        rates = await this.getExchangeRates(from);
        exchangeRate = 1 / rates.rates[from];
      } else {
        // Converting between two non-base currencies
        // First convert to base, then to target
        const baseRates = await this.getExchangeRates(this.defaultBase);
        const fromRate = baseRates.rates[from];
        const toRate = baseRates.rates[to];
        
        if (!fromRate || !toRate) {
          throw new Error(`Exchange rate not available for ${from} or ${to}`);
        }
        
        exchangeRate = toRate / fromRate;
        rates = baseRates;
      }

      if (!exchangeRate) {
        throw new Error(`Exchange rate not available for ${from} to ${to}`);
      }

      const convertedAmount = parseFloat((amount * exchangeRate).toFixed(4));

      return {
        originalAmount: amount,
        convertedAmount,
        fromCurrency: from,
        toCurrency: to,
        exchangeRate: parseFloat(exchangeRate.toFixed(6)),
        timestamp: new Date().toISOString(),
        source: 'exchangerate-api.com',
        lastUpdated: rates.date || rates.time_last_updated
      };
      
    } catch (error) {
      console.error(`❌ Error converting ${amount} ${fromCurrency} to ${toCurrency}:`, error.message);
      throw error;
    }
  }

  /**
   * Convert multiple amounts to a target currency
   * @param {Array} conversions - Array of {amount, fromCurrency} objects
   * @param {string} toCurrency - Target currency
   * @returns {Promise<Array>} Array of conversion results
   */
  async convertMultiple(conversions, toCurrency) {
    try {
      const results = [];
      
      for (const { amount, fromCurrency } of conversions) {
        try {
          const result = await this.convertCurrency(amount, fromCurrency, toCurrency);
          results.push(result);
        } catch (error) {
          results.push({
            error: error.message,
            originalAmount: amount,
            fromCurrency: fromCurrency.toUpperCase(),
            toCurrency: toCurrency.toUpperCase()
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('❌ Error in bulk currency conversion:', error.message);
      throw error;
    }
  }

  /**
   * Get all available currencies with their rates relative to base
   * @param {string} baseCurrency - Base currency for rates
   * @returns {Promise<Object>} Available currencies with rates
   */
  async getAvailableCurrencies(baseCurrency = this.defaultBase) {
    try {
      const data = await this.getExchangeRates(baseCurrency);
      
      return {
        base: data.base,
        currencies: Object.keys(data.rates).sort(),
        rates: data.rates,
        lastUpdated: data.date || data.time_last_updated,
        totalCurrencies: Object.keys(data.rates).length
      };
    } catch (error) {
      console.error('❌ Error getting available currencies:', error.message);
      throw error;
    }
  }

  /**
   * Check if cached exchange rates are still valid
   * @param {string} baseCurrency - Base currency to check
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(baseCurrency) {
    const lastFetchTime = this.lastFetch.get(baseCurrency);
    if (!lastFetchTime) return false;
    
    const now = Date.now();
    const expiryTime = lastFetchTime + (this.cacheExpiry * 1000);
    return now < expiryTime;
  }

  /**
   * Clear exchange rate cache
   * @param {string} baseCurrency - Specific currency to clear, or all if not specified
   */
  clearCache(baseCurrency = null) {
    if (baseCurrency) {
      const cacheKey = `rates_${baseCurrency.toUpperCase()}`;
      this.cache.delete(cacheKey);
      this.lastFetch.delete(baseCurrency);
      console.log(`🗑️ Cleared exchange rate cache for ${baseCurrency}`);
    } else {
      this.cache.clear();
      this.lastFetch.clear();
      console.log('🗑️ Cleared all exchange rate cache');
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache information
   */
  getCacheInfo() {
    const cacheEntries = Array.from(this.cache.keys()).map(key => {
      const currency = key.replace('rates_', '');
      return {
        currency,
        lastFetch: this.lastFetch.get(currency),
        isValid: this.isCacheValid(currency)
      };
    });

    return {
      totalEntries: this.cache.size,
      cacheExpiry: this.cacheExpiry,
      entries: cacheEntries
    };
  }

  /**
   * Get historical conversion (placeholder for future implementation)
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Historical conversion result
   */
  async getHistoricalConversion(amount, fromCurrency, toCurrency, date) {
    // Note: The free ExchangeRate API doesn't support historical rates
    // This is a placeholder for future implementation with a paid service
    throw new Error('Historical conversion not available with free API. Consider upgrading to a paid service.');
  }
}

// Export singleton instance
module.exports = new CurrencyConversionService();