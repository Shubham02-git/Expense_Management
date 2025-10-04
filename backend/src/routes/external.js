const express = require('express');
const router = express.Router();
const axios = require('axios');

// External API routes (some are public, some require auth)

// GET /api/external/countries - Get countries with currencies (public)
router.get('/countries', async (req, res) => {
  try {
    const countriesUrl = process.env.COUNTRIES_API_URL || 'https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag';
    const response = await axios.get(countriesUrl);
    
    const countries = response.data.map(country => ({
      name: country.name.common,
      code: country.cca2,
      flag: country.flag,
      currencies: country.currencies ? Object.keys(country.currencies).map(code => ({
        code,
        name: country.currencies[code].name,
        symbol: country.currencies[code].symbol
      })) : []
    })).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      data: {
        countries
      }
    });
  } catch (error) {
    console.error('Countries API error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch countries data'
      }
    });
  }
});

// GET /api/external/currencies - Get list of currencies (public)
router.get('/currencies', async (req, res) => {
  console.log('🌍 Currencies endpoint called');
  try {
    const countriesUrl = process.env.COUNTRIES_API_URL || 'https://restcountries.com/v3.1/all?fields=currencies';
    console.log('📡 Fetching from external API:', countriesUrl);
    
    // Add timeout to prevent hanging requests
    const response = await axios.get(countriesUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'ExpenseManagement/1.0'
      }
    });
    
    console.log('✅ External API response received, processing currencies...');
    
    const currencySet = new Set();
    const currencies = [];
    
    response.data.forEach(country => {
      if (country.currencies) {
        Object.entries(country.currencies).forEach(([code, currency]) => {
          if (!currencySet.has(code)) {
            currencySet.add(code);
            currencies.push({
              code,
              name: currency.name,
              symbol: currency.symbol || code
            });
          }
        });
      }
    });
    
    currencies.sort((a, b) => a.code.localeCompare(b.code));
    console.log(`💰 Processed ${currencies.length} currencies from external API`);

    res.json({
      data: {
        currencies
      }
    });
  } catch (error) {
    console.error('❌ Currencies API error:', error.message);
    
    // Provide fallback currencies if external API fails
    const fallbackCurrencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' }
    ];
    
    console.log('🔄 Using fallback currencies due to external API failure');
    res.json({
      data: {
        currencies: fallbackCurrencies
      }
    });
  }
});

// GET /api/external/exchange-rates/:currency - Get exchange rates
router.get('/exchange-rates/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    
    if (!currency || currency.length !== 3) {
      return res.status(400).json({
        error: {
          message: 'Valid 3-letter currency code is required'
        }
      });
    }

    const baseUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';
    const response = await axios.get(`${baseUrl}/${currency.toUpperCase()}`);
    
    res.json({
      data: {
        base: response.data.base,
        date: response.data.date,
        rates: response.data.rates
      }
    });
  } catch (error) {
    console.error('Exchange rates API error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch exchange rates'
      }
    });
  }
});

// GET /api/external/convert - Convert currency amounts
router.get('/convert', async (req, res) => {
  try {
    const { from, to, amount } = req.query;
    
    if (!from || !to || !amount) {
      return res.status(400).json({
        error: {
          message: 'from, to, and amount parameters are required'
        }
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        error: {
          message: 'Amount must be a positive number'
        }
      });
    }

    // If same currency, return the same amount
    if (from.toUpperCase() === to.toUpperCase()) {
      return res.json({
        data: {
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          amount: numAmount,
          converted_amount: numAmount,
          rate: 1,
          date: new Date().toISOString().split('T')[0]
        }
      });
    }

    const baseUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';
    const response = await axios.get(`${baseUrl}/${from.toUpperCase()}`);
    const rate = response.data.rates[to.toUpperCase()];
    
    if (!rate) {
      return res.status(400).json({
        error: {
          message: `Conversion rate not found for ${to.toUpperCase()}`
        }
      });
    }

    const convertedAmount = numAmount * rate;

    res.json({
      data: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        amount: numAmount,
        converted_amount: Math.round(convertedAmount * 100) / 100,
        rate: rate,
        date: response.data.date
      }
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to convert currency'
      }
    });
  }
});

module.exports = router;