const express = require('express');
const router = express.Router();

const { authenticate, authorize, managerAccess } = require('../middleware/auth');
const { validateExpense, validateUUID, validatePagination } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  uploadReceipt,
  getExpenseStats,
  getExpenseCategories
} = require('../controllers/expenseController');

// All expense routes require authentication
router.use(authenticate);

// GET /api/expenses/stats - Get expense statistics (must be before /:id route)
router.get('/stats', getExpenseStats);

// GET /api/expenses/categories - Get expense categories (public)
router.get('/categories', getExpenseCategories);

// GET /api/expenses - List expenses (role-based filtering)
router.get('/', validatePagination, getExpenses);

// GET /api/expenses/:id - Get specific expense
router.get('/:id', validateUUID, managerAccess, getExpenseById);

// POST /api/expenses - Create new expense
router.post('/', validateExpense, createExpense);

// PUT /api/expenses/:id - Update expense (own expenses only, unless admin)
router.put('/:id', validateUUID, validateExpense, updateExpense);

// DELETE /api/expenses/:id - Delete expense (own expenses only, unless admin)
router.delete('/:id', validateUUID, deleteExpense);

// POST /api/expenses/:id/receipt - Upload receipt with OCR
router.post('/:id/receipt', validateUUID, uploadLimiter, uploadReceipt);

// POST /api/expenses/:id/submit - Submit expense for approval
router.post('/:id/submit', validateUUID, submitExpense);

module.exports = router;