const { Expense, User, Company, ExpenseCategory, Approval, AuditLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const CurrencyConversionService = require('../services/currencyConversionService');

// Initialize services
const currencyService = new CurrencyConversionService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `receipt-${timestamp}-${randomSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.'));
    }
  }
});

// Helper function to log audit events
const logAuditEvent = async (entityType, entityId, action, userId, companyId, oldValues = null, newValues = null, req = null) => {
  try {
    await AuditLog.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      user_id: userId,
      company_id: companyId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: req?.ip || null,
      user_agent: req?.get('User-Agent') || null
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

// Get all expenses (with filtering)
const getExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause based on user role and filters
    let whereClause = { company_id: req.user.company_id };
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause.user_id = req.user.id;
    } else if (req.user.role === 'manager' && userId) {
      whereClause.user_id = userId;
    }
    
    // Status filter
    if (status) {
      whereClause.status = status;
    }
    
    // Category filter
    if (category) {
      whereClause.category_id = category;
    }
    
    // Date range filter
    if (startDate || endDate) {
      whereClause.expense_date = {};
      if (startDate) whereClause.expense_date[Op.gte] = startDate;
      if (endDate) whereClause.expense_date[Op.lte] = endDate;
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      whereClause.amount_in_company_currency = {};
      if (minAmount) whereClause.amount_in_company_currency[Op.gte] = parseFloat(minAmount);
      if (maxAmount) whereClause.amount_in_company_currency[Op.lte] = parseFloat(maxAmount);
    }
    
    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { merchant_name: { [Op.iLike]: `%${search}%` } },
        { expense_number: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows: expenses, count } = await Expense.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      offset,
      limit: parseInt(limit),
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true
    });

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch expenses'
      }
    });
  }
};

// Get expense by ID
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let whereClause = { id, company_id: req.user.company_id };
    
    // Employees can only see their own expenses
    if (req.user.role === 'employee') {
      whereClause.user_id = req.user.id;
    }

    const expense = await Expense.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id']
        },
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon', 'description']
        },
        {
          model: Approval,
          as: 'approvals',
          include: [{
            model: User,
            as: 'approver',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }],
          order: [['created_at', 'ASC']]
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({
        error: {
          message: 'Expense not found'
        }
      });
    }

    res.json({
      success: true,
      data: expense
    });

  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch expense'
      }
    });
  }
};

// Create new expense
const createExpense = async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      currency,
      expense_date,
      merchant_name,
      merchant_address,
      payment_method,
      category_id,
      reimbursement_requested,
      tax_amount,
      tags
    } = req.body;

    // Get company currency for conversion
    const company = await Company.findByPk(req.user.company_id);
    if (!company) {
      return res.status(404).json({
        error: {
          message: 'Company not found'
        }
      });
    }

    // Calculate amount in company currency
    let amount_in_company_currency = parseFloat(amount);
    let exchange_rate = 1.0;

    if (currency !== company.currency) {
      try {
        const conversionResult = await currencyService.convertCurrency(
          parseFloat(amount),
          currency,
          company.currency
        );
        amount_in_company_currency = conversionResult.convertedAmount;
        exchange_rate = conversionResult.exchangeRate;
      } catch (conversionError) {
        console.error('Currency conversion failed:', conversionError);
        // Continue with 1:1 conversion if API fails
      }
    }

    // Verify category exists and belongs to company
    const category = await ExpenseCategory.findOne({
      where: { id: category_id, company_id: req.user.company_id }
    });

    if (!category) {
      return res.status(400).json({
        error: {
          message: 'Invalid expense category'
        }
      });
    }

    // Create expense
    const expense = await Expense.create({
      title,
      description,
      amount: parseFloat(amount),
      currency,
      amount_in_company_currency,
      exchange_rate,
      expense_date,
      merchant_name,
      merchant_address,
      payment_method,
      category_id,
      user_id: req.user.id,
      company_id: req.user.company_id,
      reimbursement_requested: reimbursement_requested !== undefined ? reimbursement_requested : true,
      tax_amount: tax_amount ? parseFloat(tax_amount) : 0,
      tags: tags || []
    });

    // Log audit event
    await logAuditEvent('expense', expense.id, 'create', req.user.id, req.user.company_id, null, {
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      status: expense.status
    }, req);

    // Fetch the created expense with associations
    const createdExpense = await Expense.findByPk(expense.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: createdExpense
    });

  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create expense'
      }
    });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find expense
    let whereClause = { id, company_id: req.user.companyId };
    
    // Employees can only update their own expenses
    if (req.user.role === 'employee') {
      whereClause.user_id = req.user.id;
    }

    const expense = await Expense.findOne({ where: whereClause });

    if (!expense) {
      return res.status(404).json({
        error: {
          message: 'Expense not found'
        }
      });
    }

    // Check if expense can be updated
    if (['approved', 'rejected', 'paid'].includes(expense.status)) {
      return res.status(400).json({
        error: {
          message: 'Cannot update expense in current status'
        }
      });
    }

    // Store old values for audit
    const oldValues = {
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      status: expense.status
    };

    // Handle currency conversion if amount or currency changed
    if (updates.amount || updates.currency) {
      const company = await Company.findByPk(req.user.company_id);
      const newCurrency = updates.currency || expense.currency;
      const newAmount = updates.amount || expense.amount;

      if (newCurrency !== company.currency) {
        try {
          const conversionResult = await currencyService.convertCurrency(
            parseFloat(newAmount),
            newCurrency,
            company.currency
          );
          updates.amount_in_company_currency = conversionResult.convertedAmount;
          updates.exchange_rate = conversionResult.exchangeRate;
        } catch (conversionError) {
          console.error('Currency conversion failed:', conversionError);
        }
      } else {
        updates.amount_in_company_currency = parseFloat(newAmount);
        updates.exchange_rate = 1.0;
      }
    }

    // Verify category if being updated
    if (updates.category_id) {
      const category = await ExpenseCategory.findOne({
        where: { id: updates.category_id, company_id: req.user.company_id }
      });

      if (!category) {
        return res.status(400).json({
          error: {
            message: 'Invalid expense category'
          }
        });
      }
    }

    // Update expense
    await expense.update(updates);

    // Log audit event
    await logAuditEvent('expense', expense.id, 'update', req.user.userId, req.user.companyId, oldValues, {
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      status: expense.status
    }, req);

    // Fetch updated expense with associations
    const updatedExpense = await Expense.findByPk(expense.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense
    });

  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update expense'
      }
    });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Find expense
    let whereClause = { id, company_id: req.user.companyId };
    
    // Employees can only delete their own expenses
    if (req.user.role === 'employee') {
      whereClause.user_id = req.user.userId;
    }

    const expense = await Expense.findOne({ where: whereClause });

    if (!expense) {
      return res.status(404).json({
        error: {
          message: 'Expense not found'
        }
      });
    }

    // Check if expense can be deleted
    if (['approved', 'paid'].includes(expense.status)) {
      return res.status(400).json({
        error: {
          message: 'Cannot delete expense in current status'
        }
      });
    }

    // Delete receipt file if exists
    if (expense.receipt_url) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', 'receipts', expense.receipt_filename);
        await fs.unlink(filePath);
      } catch (fileError) {
        console.error('Error deleting receipt file:', fileError);
      }
    }

    // Store values for audit
    const oldValues = {
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      status: expense.status
    };

    // Delete expense
    await expense.destroy();

    // Log audit event
    await logAuditEvent('expense', id, 'delete', req.user.userId, req.user.companyId, oldValues, null, req);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete expense'
      }
    });
  }
};

// Submit expense for approval
const submitExpense = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Find expense
    const expense = await Expense.findOne({
      where: {
        id,
        user_id: req.user.userId,
        company_id: req.user.companyId
      },
      transaction
    });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({
        error: {
          message: 'Expense not found'
        }
      });
    }

    // Check if expense can be submitted
    if (expense.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        error: {
          message: 'Expense is not in draft status'
        }
      });
    }

    // Get company approval settings
    const company = await Company.findByPk(req.user.companyId);
    if (!company) {
      await transaction.rollback();
      return res.status(404).json({
        error: {
          message: 'Company not found'
        }
      });
    }

    // Determine first approver
    const firstApprover = await getFirstApprover(expense, company);
    
    if (!firstApprover) {
      // No approval required - auto-approve
      await expense.update({
        status: 'approved',
        submitted_at: new Date(),
        approved_at: new Date()
      }, { transaction });
    } else {
      // Create first approval
      await Approval.create({
        expense_id: expense.id,
        approver_id: firstApprover.id,
        approval_level: 1,
        company_id: expense.company_id,
        status: 'pending'
      }, { transaction });

      // Update expense status
      await expense.update({
        status: 'submitted',
        submitted_at: new Date()
      }, { transaction });
    }

    // Log audit event
    await logAuditEvent('expense', expense.id, 'submit', req.user.userId, req.user.companyId, 
      { status: 'draft' }, 
      { status: firstApprover ? 'submitted' : 'approved' }, 
      req
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Expense submitted successfully',
      data: expense
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting expense:', error);
    res.status(500).json({
      error: {
        message: 'Failed to submit expense'
      }
    });
  }
};

// Helper function to determine first approver
const getFirstApprover = async (expense, company) => {
  const approvalSettings = company.approval_settings;
  
  if (!approvalSettings || !approvalSettings.enabled) {
    return null; // No approval required
  }

  // Sequential approval workflow
  if (approvalSettings.workflow_type === 'sequential') {
    const levels = approvalSettings.approval_levels || [];
    const firstLevel = levels.find(level => level.level === 1);
    
    if (!firstLevel) {
      return null;
    }

    // Find approver based on level configuration
    if (firstLevel.approver_type === 'manager') {
      // Find employee's direct manager
      const employee = await User.findByPk(expense.user_id);
      if (employee && employee.manager_id) {
        return await User.findByPk(employee.manager_id);
      }
    } else if (firstLevel.approver_type === 'role') {
      // Find users with specific role
      const approvers = await User.findAll({
        where: {
          company_id: expense.company_id,
          role: firstLevel.role,
          is_active: true
        }
      });
      return approvers[0]; // Return first available approver
    } else if (firstLevel.approver_id) {
      // Specific user approval
      return await User.findByPk(firstLevel.approver_id);
    }
  }
  
  // Conditional approval based on amount
  else if (approvalSettings.workflow_type === 'conditional') {
    const rules = approvalSettings.approval_rules || [];
    const applicableRule = rules.find(rule => 
      expense.amount_in_company_currency >= rule.min_amount &&
      (!rule.max_amount || expense.amount_in_company_currency <= rule.max_amount)
    );
    
    if (applicableRule && applicableRule.approver_id) {
      return await User.findByPk(applicableRule.approver_id);
    }
  }

  // Default: require manager approval if no specific rules
  const employee = await User.findByPk(expense.user_id);
  if (employee && employee.manager_id) {
    return await User.findByPk(employee.manager_id);
  }

  return null;
};

// Upload receipt with OCR processing
const uploadReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    // Find expense
    const expense = await Expense.findOne({
      where: {
        id,
        user_id: req.user.userId,
        company_id: req.user.companyId
      }
    });

    if (!expense) {
      return res.status(404).json({
        error: {
          message: 'Expense not found'
        }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'No file uploaded'
        }
      });
    }

    // Process the uploaded file
    const receiptUrl = `/uploads/receipts/${req.file.filename}`;
    
    // Basic OCR data structure (can be enhanced with actual OCR service)
    const ocrData = {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      processed_at: new Date(),
      extracted_data: {
        // Placeholder for OCR extracted data
        confidence: 0.85,
        text_extracted: true,
        fields_detected: ['amount', 'date', 'merchant']
      }
    };

    // Update expense with receipt information
    await expense.update({
      receipt_url: receiptUrl,
      receipt_filename: req.file.filename,
      ocr_data: ocrData
    });

    // Log audit event
    await logAuditEvent('expense', expense.id, 'receipt_upload', req.user.userId, req.user.companyId, null, {
      receipt_uploaded: true,
      filename: req.file.filename
    }, req);

    res.json({
      success: true,
      message: 'Receipt uploaded successfully',
      data: {
        receipt_url: receiptUrl,
        ocr_data: ocrData
      }
    });

  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({
      error: {
        message: 'Failed to upload receipt'
      }
    });
  }
};

// Get expense statistics
const getExpenseStats = async (req, res) => {
  try {
    let whereClause = { company_id: req.user.companyId };
    
    // Employees can only see their own stats
    if (req.user.role === 'employee') {
      whereClause.user_id = req.user.userId;
    }

    const stats = await Expense.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount_in_company_currency')), 'total_amount']
      ],
      group: ['status'],
      raw: true
    });

    const formattedStats = {
      total_expenses: 0,
      total_amount: 0,
      by_status: {}
    };

    stats.forEach(stat => {
      formattedStats.by_status[stat.status] = {
        count: parseInt(stat.count),
        total_amount: parseFloat(stat.total_amount) || 0
      };
      formattedStats.total_expenses += parseInt(stat.count);
      formattedStats.total_amount += parseFloat(stat.total_amount) || 0;
    });

    res.json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch expense statistics'
      }
    });
  }
};

// Get expense categories
const getExpenseCategories = async (req, res) => {
  try {
    // Validate user context
    if (!req.user || !req.user.company_id) {
      console.log('Missing user context in getExpenseCategories');
      return res.status(401).json({
        error: {
          message: 'User authentication required'
        }
      });
    }

    // Get all expense categories for the user's company
    const categories = await ExpenseCategory.findAll({
      where: {
        company_id: req.user.company_id,
        is_active: true
      },
      attributes: ['id', 'name', 'description', 'icon', 'color'],
      order: [['name', 'ASC']]
    });

    res.json({
      data: {
        categories: categories.map(category => ({
          id: category.id,
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    await logAuditEvent('expense_category', null, 'fetch_failed', req.user?.id, req.user?.company_id, null, { error: error.message }, req);
    
    res.status(500).json({
      error: {
        message: 'Failed to fetch expense categories'
      }
    });
  }
};

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  uploadReceipt: [upload.single('receipt'), uploadReceipt],
  getExpenseStats,
  getExpenseCategories
};