const express = require('express');
const router = express.Router();

const companyController = require('../controllers/companyController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCompany, validateUUID, validateExpenseCategory } = require('../middleware/validation');

// All company routes require authentication
router.use(authenticate);

// GET /api/companies - Get current user's company
router.get('/', companyController.getCompany);

// PUT /api/companies/:id - Update company (Admin only)
router.put('/:id', validateUUID, authorize('admin'), validateCompany, companyController.updateCompany);

// GET /api/companies/stats - Get company statistics (Admin/Manager)
router.get('/stats', authorize('admin', 'manager'), companyController.getCompanyStats);

// GET /api/companies/categories - Get expense categories
router.get('/categories', companyController.getExpenseCategories);

// POST /api/companies/categories - Create expense category (Admin only)
router.post('/categories', authorize('admin'), validateExpenseCategory, companyController.createExpenseCategory);

module.exports = router;