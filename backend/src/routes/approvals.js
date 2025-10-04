const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const { validateApproval, validateUUID, validatePagination } = require('../middleware/validation');
const {
  getPendingApprovals,
  getApprovalById,
  approveExpense,
  rejectExpense,
  bulkApproveExpenses,
  getApprovalStats,
  delegateApproval
} = require('../controllers/approvalController');

// All approval routes require authentication
router.use(authenticate);

// GET /api/approvals/stats - Get approval statistics (must be before /:id route)
router.get('/stats', getApprovalStats);

// GET /api/approvals - List pending approvals for current user
router.get('/', validatePagination, getPendingApprovals);

// GET /api/approvals/:id - Get specific approval
router.get('/:id', validateUUID, getApprovalById);

// POST /api/approvals/:id/approve - Approve expense
router.post('/:id/approve', validateUUID, validateApproval, approveExpense);

// POST /api/approvals/:id/reject - Reject expense
router.post('/:id/reject', validateUUID, validateApproval, rejectExpense);

// POST /api/approvals/:id/delegate - Delegate approval to another user
router.post('/:id/delegate', validateUUID, delegateApproval);

// POST /api/approvals/bulk/approve - Bulk approve expenses
router.post('/bulk/approve', bulkApproveExpenses);

module.exports = router;