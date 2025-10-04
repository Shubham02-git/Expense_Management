const express = require('express');
const router = express.Router();
const currencyCountryService = require('../services/currencyCountryService');
const { rateLimit } = require('express-rate-limit');

// Rate limiting for currency/country endpoints
const currencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests to currency/country endpoints',
    retryAfter: '15 minutes'
  }
});

/**
 * GET /api/currencies/countries
 * Get all countries with their currencies
 */
router.get('/countries', currencyLimiter, async (req, res) => {
  try {
    const countries = await currencyCountryService.fetchCountriesAndCurrencies();
    
    res.json({
      success: true,
      data: countries,
      count: countries.length,
      timestamp: new Date().toISOString(),
      cache: currencyCountryService.getCacheInfo()
    });
    
  } catch (error) {
    console.error('❌ Error in /countries endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch countries data',
      message: error.message
    });
  }
});

/**
 * GET /api/currencies/list
 * Get all unique currencies
 */
router.get('/list', currencyLimiter, async (req, res) => {
  try {
    const currencies = await currencyCountryService.getAllCurrencies();
    
    res.json({
      success: true,
      data: currencies,
      count: currencies.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /currencies/list endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currencies list',
      message: error.message
    });
  }
});

/**
 * GET /api/currencies/popular
 * Get popular/common currencies for dropdown selection
 */
router.get('/popular', currencyLimiter, async (req, res) => {
  try {
    const popularCodes = currencyCountryService.getPopularCurrencies();
    const allCurrencies = await currencyCountryService.getAllCurrencies();
    
    // Filter to get only popular currencies with details
    const popularCurrencies = popularCodes
      .map(code => allCurrencies.find(curr => curr.code === code))
      .filter(Boolean); // Remove undefined entries
    
    res.json({
      success: true,
      data: popularCurrencies,
      count: popularCurrencies.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /currencies/popular endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular currencies',
      message: error.message
    });
  }
});

/**
 * GET /api/currencies/:code
 * Get currency details by currency code
 */
router.get('/:code', currencyLimiter, async (req, res) => {
  try {
    const { code } = req.params;
    const currencyCode = code.toUpperCase();
    
    const currencyDetails = await currencyCountryService.getCurrencyDetails(currencyCode);
    
    if (!currencyDetails) {
      return res.status(404).json({
        success: false,
        error: 'Currency not found',
        message: `Currency code '${currencyCode}' not found`
      });
    }
    
    res.json({
      success: true,
      data: currencyDetails,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Error in /currencies/${req.params.code} endpoint:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currency details',
      message: error.message
    });
  }
});

/**
 * GET /api/currencies/:code/countries
 * Get countries that use a specific currency
 */
router.get('/:code/countries', currencyLimiter, async (req, res) => {
  try {
    const { code } = req.params;
    const currencyCode = code.toUpperCase();
    
    const countries = await currencyCountryService.getCountriesByCurrency(currencyCode);
    
    res.json({
      success: true,
      data: countries,
      currency: currencyCode,
      count: countries.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Error in /currencies/${req.params.code}/countries endpoint:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch countries for currency',
      message: error.message
    });
  }
});

/**
 * GET /api/currencies/countries/search?q=searchTerm
 * Search countries by name
 */
router.get('/countries/search', currencyLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search term must be at least 2 characters long'
      });
    }
    
    const countries = await currencyCountryService.searchCountries(q.trim());
    
    res.json({
      success: true,
      data: countries,
      searchTerm: q.trim(),
      count: countries.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /currencies/countries/search endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search countries',
      message: error.message
    });
  }
});

/**
 * DELETE /api/currencies/cache
 * Clear currency/country cache (admin only)
 */
router.delete('/cache', currencyLimiter, async (req, res) => {
  try {
    // TODO: Add admin authentication middleware here
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, error: 'Admin access required' });
    // }
    
    currencyCountryService.clearCache();
    
    res.json({
      success: true,
      message: 'Currency/Country cache cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /currencies/cache endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/currencies/cache/info
 * Get cache information
 */
router.get('/cache/info', currencyLimiter, async (req, res) => {
  try {
    const cacheInfo = currencyCountryService.getCacheInfo();
    
    res.json({
      success: true,
      data: cacheInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /currencies/cache/info endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache info',
      message: error.message
    });
  }
});

module.exports = router;