const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      }
    });
  }
  next();
};

// User registration validation
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('company_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Country is required'),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// User update validation
const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Role must be admin, manager, or employee'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position must be less than 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

// Expense validation
const validateExpense = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .withMessage('Currency must be a valid 3-letter code'),
  body('expense_date')
    .isISO8601()
    .toDate()
    .withMessage('Valid expense date is required'),
  body('category_id')
    .isUUID()
    .withMessage('Valid category ID is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('merchant_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Merchant name must be less than 255 characters'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'other'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
];

// Company validation
const validateCompany = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('country')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Country is required'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .withMessage('Currency must be a valid 3-letter code'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Valid website URL is required'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

// Expense category validation
const validateExpenseCategory = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('color')
    .optional()
    .isHexColor()
    .withMessage('Color must be a valid hex color'),
  body('parent_id')
    .optional()
    .isUUID()
    .withMessage('Parent ID must be a valid UUID'),
  body('approval_required')
    .optional()
    .isBoolean()
    .withMessage('Approval required must be a boolean'),
  body('max_amount_without_approval')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max amount must be a positive number'),
  body('requires_receipt')
    .optional()
    .isBoolean()
    .withMessage('Requires receipt must be a boolean'),
  handleValidationErrors
];

// Approval validation
const validateApproval = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments must be less than 1000 characters'),
  handleValidationErrors
];

// Workflow validation
const validateWorkflow = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Workflow name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('conditions')
    .isObject()
    .withMessage('Conditions must be an object'),
  body('steps')
    .isArray({ min: 1 })
    .withMessage('Steps must be an array with at least one step'),
  body('priority')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Priority must be a non-negative integer'),
  handleValidationErrors
];

// UUID parameter validation
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),
  query('order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Order must be ASC or DESC'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateUserUpdate,
  validateExpense,
  validateCompany,
  validateExpenseCategory,
  validateApproval,
  validateWorkflow,
  validateUUID,
  validatePagination,
  handleValidationErrors
};