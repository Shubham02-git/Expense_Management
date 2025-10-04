const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getExpenseCategories } = require('../controllers/expenseController');

// All expense category routes require authentication
router.use(authenticate);

// GET /api/expense-categories - Get expense categories
router.get('/', getExpenseCategories);

module.exports = router;