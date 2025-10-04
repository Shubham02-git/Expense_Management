const axios = require('axios');

/**
 * Currency and Country Service
 * Handles REST Countries API integration for country and currency data
 */
class CurrencyCountryService {
  constructor() {
    this.baseUrl = process.env.COUNTRIES_API_URL || 'https://restcountries.com/v3.1/all?fields=name,currencies';
    this.cache = new Map();
    this.cacheExpiry = parseInt(process.env.COUNTRIES_CACHE_TTL) || 86400; // 24 hours
    this.lastFetch = null;
  }

  /**
   * Fetch all countries with their currencies
   * @returns {Promise<Array>} Array of countries with currency data
   */
  async fetchCountriesAndCurrencies() {
    try {
      // Check cache first
      if (this.cache.has('countries') && this.isCacheValid()) {
        console.log('🔄 Using cached country/currency data');
        return this.cache.get('countries');
      }

      console.log('🌍 Fetching country/currency data from REST Countries API...');
      const response = await axios.get(this.baseUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ExpenseManagementSystem/1.0'
        }
      });

      const countries = response.data;
      
      // Cache the results
      this.cache.set('countries', countries);
      this.lastFetch = Date.now();
      
      console.log(`✅ Successfully fetched ${countries.length} countries with currency data`);
      return countries;
      
    } catch (error) {
      console.error('❌ Error fetching country/currency data:', error.message);
      
      // Return cached data if available, even if expired
      if (this.cache.has('countries')) {
        console.log('⚠️ Using expired cached data due to API error');
        return this.cache.get('countries');
      }
      
      throw new Error(`Failed to fetch country/currency data: ${error.message}`);
    }
  }

  /**
   * Get all unique currencies from countries
   * @returns {Promise<Array>} Array of currency objects
   */
  async getAllCurrencies() {
    try {
      const countries = await this.fetchCountriesAndCurrencies();
      const currencyMap = new Map();

      countries.forEach(country => {
        if (country.currencies) {
          Object.entries(country.currencies).forEach(([code, details]) => {
            if (!currencyMap.has(code)) {
              currencyMap.set(code, {
                code,
                name: details.name,
                symbol: details.symbol || code,
                countries: []
              });
            }
            currencyMap.get(code).countries.push(country.name.common);
          });
        }
      });

      return Array.from(currencyMap.values()).sort((a, b) => a.code.localeCompare(b.code));
      
    } catch (error) {
      console.error('❌ Error processing currencies:', error.message);
      throw error;
    }
  }

  /**
   * Get currency details by currency code
   * @param {string} currencyCode - Currency code (e.g., 'USD', 'EUR')
   * @returns {Promise<Object|null>} Currency details or null if not found
   */
  async getCurrencyDetails(currencyCode) {
    try {
      const currencies = await this.getAllCurrencies();
      return currencies.find(currency => currency.code === currencyCode) || null;
    } catch (error) {
      console.error(`❌ Error getting currency details for ${currencyCode}:`, error.message);
      return null;
    }
  }

  /**
   * Get countries that use a specific currency
   * @param {string} currencyCode - Currency code
   * @returns {Promise<Array>} Array of country names
   */
  async getCountriesByCurrency(currencyCode) {
    try {
      const currencyDetails = await this.getCurrencyDetails(currencyCode);
      return currencyDetails ? currencyDetails.countries : [];
    } catch (error) {
      console.error(`❌ Error getting countries for currency ${currencyCode}:`, error.message);
      return [];
    }
  }

  /**
   * Search countries by name (partial match)
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching countries
   */
  async searchCountries(searchTerm) {
    try {
      const countries = await this.fetchCountriesAndCurrencies();
      const term = searchTerm.toLowerCase();
      
      return countries.filter(country => 
        country.name.common.toLowerCase().includes(term) ||
        (country.name.official && country.name.official.toLowerCase().includes(term))
      );
    } catch (error) {
      console.error(`❌ Error searching countries for term "${searchTerm}":`, error.message);
      return [];
    }
  }

  /**
   * Get popular/common currencies for dropdown selection
   * @returns {Array} Array of popular currency codes
   */
  getPopularCurrencies() {
    return [
      'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'INR', 'SGD',
      'HKD', 'KRW', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RUB', 'BRL',
      'MXN', 'ZAR', 'TRY', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'AED', 'SAR'
    ];
  }

  /**
   * Check if cached data is still valid
   * @returns {boolean} True if cache is valid
   */
  isCacheValid() {
    if (!this.lastFetch) return false;
    const now = Date.now();
    const expiryTime = this.lastFetch + (this.cacheExpiry * 1000);
    return now < expiryTime;
  }

  /**
   * Clear cache (useful for testing or force refresh)
   */
  clearCache() {
    this.cache.clear();
    this.lastFetch = null;
    console.log('🗑️ Currency/Country cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache info
   */
  getCacheInfo() {
    return {
      hasData: this.cache.has('countries'),
      lastFetch: this.lastFetch,
      isValid: this.isCacheValid(),
      cacheSize: this.cache.size,
      expiryTime: this.lastFetch ? new Date(this.lastFetch + (this.cacheExpiry * 1000)) : null
    };
  }
}

// Export singleton instance
module.exports = new CurrencyCountryService();