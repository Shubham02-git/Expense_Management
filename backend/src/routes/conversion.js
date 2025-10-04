const express = require('express');
const router = express.Router();
const currencyConversionService = require('../services/currencyConversionService');
const { rateLimit } = require('express-rate-limit');

// Rate limiting for conversion endpoints
const conversionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for conversion operations
  message: {
    error: 'Too many conversion requests',
    retryAfter: '15 minutes'
  }
});

/**
 * GET /api/conversion/rates/:baseCurrency
 * Get all exchange rates for a base currency
 */
router.get('/rates/:baseCurrency?', conversionLimiter, async (req, res) => {
  try {
    const baseCurrency = req.params.baseCurrency || 'USD';
    
    if (!/^[A-Z]{3}$/.test(baseCurrency.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency code format. Must be 3 letters (e.g., USD, EUR)'
      });
    }

    const rates = await currencyConversionService.getExchangeRates(baseCurrency);
    
    res.json({
      success: true,
      data: rates,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /rates endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rates',
      message: error.message
    });
  }
});

/**
 * POST /api/conversion/convert
 * Convert amount from one currency to another
 * Body: { amount, fromCurrency, toCurrency }
 */
router.post('/convert', conversionLimiter, async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;
    
    // Validation
    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, fromCurrency, toCurrency'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }

    if (!/^[A-Z]{3}$/i.test(fromCurrency) || !/^[A-Z]{3}$/i.test(toCurrency)) {
      return res.status(400).json({
        success: false,
        error: 'Currency codes must be 3 letters (e.g., USD, EUR)'
      });
    }

    const result = await currencyConversionService.convertCurrency(
      parseFloat(amount), 
      fromCurrency, 
      toCurrency
    );
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /convert endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to convert currency',
      message: error.message
    });
  }
});

/**
 * POST /api/conversion/convert-multiple
 * Convert multiple amounts to a target currency
 * Body: { conversions: [{amount, fromCurrency}], toCurrency }
 */
router.post('/convert-multiple', conversionLimiter, async (req, res) => {
  try {
    const { conversions, toCurrency } = req.body;
    
    // Validation
    if (!Array.isArray(conversions) || !toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: conversions (array), toCurrency'
      });
    }

    if (conversions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Conversions array cannot be empty'
      });
    }

    if (conversions.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 conversions allowed per request'
      });
    }

    // Validate each conversion
    for (const conversion of conversions) {
      if (!conversion.amount || !conversion.fromCurrency) {
        return res.status(400).json({
          success: false,
          error: 'Each conversion must have amount and fromCurrency'
        });
      }
    }

    const results = await currencyConversionService.convertMultiple(conversions, toCurrency);
    
    res.json({
      success: true,
      data: results,
      totalConversions: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /convert-multiple endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to convert currencies',
      message: error.message
    });
  }
});

/**
 * GET /api/conversion/currencies/:baseCurrency?
 * Get all available currencies with their rates
 */
router.get('/currencies/:baseCurrency?', conversionLimiter, async (req, res) => {
  try {
    const baseCurrency = req.params.baseCurrency || 'USD';
    
    const currencies = await currencyConversionService.getAvailableCurrencies(baseCurrency);
    
    res.json({
      success: true,
      data: currencies,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /currencies endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available currencies',
      message: error.message
    });
  }
});

/**
 * GET /api/conversion/cache/info
 * Get conversion cache information
 */
router.get('/cache/info', conversionLimiter, async (req, res) => {
  try {
    const cacheInfo = currencyConversionService.getCacheInfo();
    
    res.json({
      success: true,
      data: cacheInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /cache/info endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache info',
      message: error.message
    });
  }
});

/**
 * DELETE /api/conversion/cache/:baseCurrency?
 * Clear conversion cache for specific or all currencies
 */
router.delete('/cache/:baseCurrency?', conversionLimiter, async (req, res) => {
  try {
    // TODO: Add admin authentication middleware here
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, error: 'Admin access required' });
    // }
    
    const baseCurrency = req.params.baseCurrency;
    currencyConversionService.clearCache(baseCurrency);
    
    const message = baseCurrency 
      ? `Cache cleared for ${baseCurrency}` 
      : 'All conversion cache cleared';
    
    res.json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /cache/clear endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/conversion/quick/:amount/:from/:to
 * Quick conversion endpoint for simple use cases
 * Example: GET /api/conversion/quick/100/USD/EUR
 */
router.get('/quick/:amount/:from/:to', conversionLimiter, async (req, res) => {
  try {
    const { amount, from, to } = req.params;
    
    // Validation
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }

    const result = await currencyConversionService.convertCurrency(
      parseFloat(amount), 
      from, 
      to
    );
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /quick conversion endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to convert currency',
      message: error.message
    });
  }
});

module.exports = router;