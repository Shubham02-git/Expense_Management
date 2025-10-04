const express = require('express');
const router = express.Router();

const { authenticate, authorize, managerAccess } = require('../middleware/auth');
const { validateExpense, validateUUID, validatePagination } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');

// All expense routes require authentication
router.use(authenticate);

// GET /api/expenses - List expenses (role-based filtering)
router.get('/', validatePagination, async (req, res) => {
  // TODO: Implement expense listing with filters
  res.json({ message: 'Expense listing endpoint - to be implemented' });
});

// GET /api/expenses/:id - Get specific expense
router.get('/:id', validateUUID, managerAccess, async (req, res) => {
  // TODO: Implement get expense by ID
  res.json({ message: 'Get expense by ID endpoint - to be implemented' });
});

// POST /api/expenses - Create new expense
router.post('/', validateExpense, async (req, res) => {
  // TODO: Implement expense creation
  res.json({ message: 'Create expense endpoint - to be implemented' });
});

// PUT /api/expenses/:id - Update expense (own expenses only, unless admin)
router.put('/:id', validateUUID, validateExpense, async (req, res) => {
  // TODO: Implement expense update
  res.json({ message: 'Update expense endpoint - to be implemented' });
});

// DELETE /api/expenses/:id - Delete expense (own expenses only, unless admin)
router.delete('/:id', validateUUID, async (req, res) => {
  // TODO: Implement expense deletion
  res.json({ message: 'Delete expense endpoint - to be implemented' });
});

// POST /api/expenses/:id/receipt - Upload receipt with OCR
router.post('/:id/receipt', validateUUID, uploadLimiter, async (req, res) => {
  // TODO: Implement receipt upload and OCR processing
  res.json({ message: 'Receipt upload with OCR endpoint - to be implemented' });
});

// POST /api/expenses/:id/submit - Submit expense for approval
router.post('/:id/submit', validateUUID, async (req, res) => {
  // TODO: Implement expense submission
  res.json({ message: 'Submit expense endpoint - to be implemented' });
});

module.exports = router;