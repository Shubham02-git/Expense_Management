const express = require('express');
const router = express.Router();
const axios = require('axios');

// External API routes (some are public, some require auth)

// GET /api/external/countries - Get countries with currencies (public)
router.get('/countries', async (req, res) => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag');
    
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

    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${currency.toUpperCase()}`);
    
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

    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`);
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