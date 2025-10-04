const { Company, User, Expense, ExpenseCategory, AuditLog } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

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

// Get company details
const getCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.company_id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'is_active'],
          where: { is_active: true },
          required: false
        }
      ]
    });

    if (!company) {
      return res.status(404).json({
        error: {
          message: 'Company not found'
        }
      });
    }

    // Get company statistics
    const stats = await Promise.all([
      User.count({ where: { company_id: company.id, is_active: true } }),
      User.count({ where: { company_id: company.id, is_active: true, role: 'admin' } }),
      User.count({ where: { company_id: company.id, is_active: true, role: 'manager' } }),
      User.count({ where: { company_id: company.id, is_active: true, role: 'employee' } }),
      Expense.count({ where: { company_id: company.id } }),
      Expense.sum('amount_in_company_currency', { where: { company_id: company.id, status: 'approved' } }),
      ExpenseCategory.count({ where: { company_id: company.id, is_active: true } })
    ]);

    const companyStats = {
      total_users: stats[0] || 0,
      admins: stats[1] || 0,
      managers: stats[2] || 0,
      employees: stats[3] || 0,
      total_expenses: stats[4] || 0,
      total_approved_amount: stats[5] || 0,
      expense_categories: stats[6] || 0
    };

    res.json({
      data: {
        company,
        stats: companyStats
      }
    });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch company details',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Update company details
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      country,
      currency,
      currency_symbol,
      timezone,
      address,
      phone,
      email,
      website,
      settings
    } = req.body;

    // Verify company ownership
    if (id !== req.user.company_id) {
      return res.status(403).json({
        error: {
          message: 'Access denied to this company'
        }
      });
    }

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({
        error: {
          message: 'Company not found'
        }
      });
    }

    // Store old values for audit
    const oldValues = {
      name: company.name,
      country: company.country,
      currency: company.currency,
      currency_symbol: company.currency_symbol,
      timezone: company.timezone,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      settings: company.settings
    };

    // If currency is changing, validate it and get symbol
    let currencyInfo = {};
    if (currency && currency !== company.currency) {
      try {
        const baseUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';
        const response = await axios.get(`${baseUrl}/${currency}`);
        if (!response.data.rates) {
          return res.status(400).json({
            error: {
              message: 'Invalid currency code'
            }
          });
        }
        currencyInfo.currency = currency;
        if (currency_symbol) {
          currencyInfo.currency_symbol = currency_symbol;
        }
      } catch (error) {
        return res.status(400).json({
          error: {
            message: 'Unable to validate currency code'
          }
        });
      }
    }

    // Update company
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (country !== undefined) updateData.country = country;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (settings !== undefined) updateData.settings = { ...company.settings, ...settings };
    
    // Merge currency info
    Object.assign(updateData, currencyInfo);

    await company.update(updateData);

    // Log audit event
    await logAuditEvent('company', company.id, 'update', req.user.id, req.user.company_id, oldValues, updateData, req);

    // Return updated company
    const updatedCompany = await Company.findByPk(company.id);

    res.json({
      message: 'Company updated successfully',
      data: {
        company: updatedCompany
      }
    });

  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update company',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Get company statistics and analytics
const getCompanyStats = async (req, res) => {
  try {
    const { period = '30', start_date, end_date } = req.query;
    const companyId = req.user.company_id;

    // Calculate date range
    let dateFilter = {};
    if (start_date && end_date) {
      dateFilter = {
        created_at: {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        }
      };
    } else {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      dateFilter = {
        created_at: {
          [Op.gte]: daysAgo
        }
      };
    }

    // Get comprehensive statistics
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      totalExpenses,
      expensesByStatus,
      expensesByCategory,
      monthlyExpenses,
      topSpenders,
      avgApprovalTime,
      expenseCategories
    ] = await Promise.all([
      // Total users
      User.count({ where: { company_id: companyId } }),
      
      // Active users
      User.count({ where: { company_id: companyId, is_active: true } }),
      
      // Users by role
      User.findAll({
        where: { company_id: companyId, is_active: true },
        attributes: [
          'role',
          [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
        ],
        group: ['role'],
        raw: true
      }),
      
      // Total expenses
      Expense.findAll({
        where: { company_id: companyId, ...dateFilter },
        attributes: [
          [Expense.sequelize.fn('COUNT', Expense.sequelize.col('id')), 'total_count'],
          [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'total_amount'],
          [Expense.sequelize.fn('AVG', Expense.sequelize.col('amount_in_company_currency')), 'avg_amount']
        ],
        raw: true
      }),
      
      // Expenses by status
      Expense.findAll({
        where: { company_id: companyId, ...dateFilter },
        attributes: [
          'status',
          [Expense.sequelize.fn('COUNT', Expense.sequelize.col('id')), 'count'],
          [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'amount']
        ],
        group: ['status'],
        raw: true
      }),
      
      // Expenses by category
      Expense.findAll({
        where: { company_id: companyId, ...dateFilter },
        include: [
          {
            model: ExpenseCategory,
            as: 'category',
            attributes: ['name', 'color']
          }
        ],
        attributes: [
          'category_id',
          [Expense.sequelize.fn('COUNT', Expense.sequelize.col('Expense.id')), 'count'],
          [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'amount']
        ],
        group: ['category_id', 'category.id', 'category.name', 'category.color'],
        raw: true
      }),
      
      // Monthly expense trends
      Expense.findAll({
        where: { 
          company_id: companyId,
          created_at: {
            [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 12))
          }
        },
        attributes: [
          [Expense.sequelize.fn('DATE_TRUNC', 'month', Expense.sequelize.col('created_at')), 'month'],
          [Expense.sequelize.fn('COUNT', Expense.sequelize.col('id')), 'count'],
          [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'amount']
        ],
        group: [Expense.sequelize.fn('DATE_TRUNC', 'month', Expense.sequelize.col('created_at'))],
        order: [[Expense.sequelize.fn('DATE_TRUNC', 'month', Expense.sequelize.col('created_at')), 'ASC']],
        raw: true
      }),
      
      // Top spenders
      Expense.findAll({
        where: { company_id: companyId, ...dateFilter },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['first_name', 'last_name', 'email']
          }
        ],
        attributes: [
          'user_id',
          [Expense.sequelize.fn('COUNT', Expense.sequelize.col('Expense.id')), 'expense_count'],
          [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'total_amount']
        ],
        group: ['user_id', 'user.id', 'user.first_name', 'user.last_name', 'user.email'],
        order: [[Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'DESC']],
        limit: 10,
        raw: true
      }),
      
      // Average approval time (mock calculation)
      Promise.resolve(2.5), // TODO: Implement actual approval time calculation
      
      // Expense categories count
      ExpenseCategory.count({ where: { company_id: companyId, is_active: true } })
    ]);

    // Format the response
    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        by_role: usersByRole.reduce((acc, item) => {
          acc[item.role] = parseInt(item.count);
          return acc;
        }, {})
      },
      expenses: {
        total_count: parseInt(totalExpenses[0]?.total_count || 0),
        total_amount: parseFloat(totalExpenses[0]?.total_amount || 0),
        average_amount: parseFloat(totalExpenses[0]?.avg_amount || 0),
        by_status: expensesByStatus.reduce((acc, item) => {
          acc[item.status] = {
            count: parseInt(item.count),
            amount: parseFloat(item.amount || 0)
          };
          return acc;
        }, {}),
        by_category: expensesByCategory.map(item => ({
          category_id: item.category_id,
          category_name: item['category.name'],
          category_color: item['category.color'],
          count: parseInt(item.count),
          amount: parseFloat(item.amount || 0)
        })),
        monthly_trends: monthlyExpenses.map(item => ({
          month: item.month,
          count: parseInt(item.count),
          amount: parseFloat(item.amount || 0)
        })),
        top_spenders: topSpenders.map(item => ({
          user_id: item.user_id,
          user_name: `${item['user.first_name']} ${item['user.last_name']}`,
          user_email: item['user.email'],
          expense_count: parseInt(item.expense_count),
          total_amount: parseFloat(item.total_amount || 0)
        }))
      },
      system: {
        average_approval_time_days: avgApprovalTime,
        expense_categories: expenseCategories
      }
    };

    res.json({
      data: {
        stats,
        period: {
          type: start_date && end_date ? 'custom' : 'days',
          value: start_date && end_date ? `${start_date} to ${end_date}` : period
        }
      }
    });

  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch company statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Get expense categories for the company
const getExpenseCategories = async (req, res) => {
  try {
    const categories = await ExpenseCategory.findAll({
      where: {
        company_id: req.user.company_id,
        is_active: true
      },
      include: [
        {
          model: ExpenseCategory,
          as: 'children',
          where: { is_active: true },
          required: false
        }
      ],
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      data: {
        categories
      }
    });

  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch expense categories',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Create expense category
const createExpenseCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      color = '#3B82F6',
      icon,
      parent_id,
      approval_required = true,
      max_amount_without_approval,
      requires_receipt = true
    } = req.body;

    // Check if category name already exists
    const existingCategory = await ExpenseCategory.findOne({
      where: {
        name,
        company_id: req.user.company_id
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        error: {
          message: 'Category with this name already exists'
        }
      });
    }

    // Validate parent category if provided
    if (parent_id) {
      const parentCategory = await ExpenseCategory.findOne({
        where: {
          id: parent_id,
          company_id: req.user.company_id
        }
      });

      if (!parentCategory) {
        return res.status(400).json({
          error: {
            message: 'Parent category not found'
          }
        });
      }
    }

    // Create category
    const category = await ExpenseCategory.create({
      name,
      description,
      color,
      icon,
      parent_id,
      approval_required,
      max_amount_without_approval,
      requires_receipt,
      company_id: req.user.company_id
    });

    // Log audit event
    await logAuditEvent('category', category.id, 'create', req.user.id, req.user.company_id, null, {
      name: category.name,
      created_by: req.user.id
    }, req);

    res.status(201).json({
      message: 'Expense category created successfully',
      data: {
        category
      }
    });

  } catch (error) {
    console.error('Create expense category error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create expense category',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

module.exports = {
  getCompany,
  updateCompany,
  getCompanyStats,
  getExpenseCategories,
  createExpenseCategory
};