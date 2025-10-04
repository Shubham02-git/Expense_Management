const { User, Company, Expense, AuditLog } = require('../models');
const { Op } = require('sequelize');

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

// Get all users (with role-based filtering)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, department, is_active } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {
      company_id: req.user.company_id
    };

    // Add filters
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { employee_id: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (department) {
      whereClause.department = { [Op.iLike]: `%${department}%` };
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    // If user is manager, only show their direct reports (unless admin)
    if (req.user.role === 'manager') {
      whereClause[Op.or] = [
        { manager_id: req.user.id },
        { id: req.user.id }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'directReports',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        }
      ],
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: {
        id,
        company_id: req.user.company_id
      },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'currency', 'currency_symbol']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'directReports',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'department']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found'
        }
      });
    }

    // Get user statistics
    const expenseStats = await Expense.findAll({
      where: { user_id: id },
      attributes: [
        [req.user.company.sequelize.fn('COUNT', req.user.company.sequelize.col('id')), 'total_expenses'],
        [req.user.company.sequelize.fn('SUM', req.user.company.sequelize.col('amount_in_company_currency')), 'total_amount'],
        [req.user.company.sequelize.fn('COUNT', req.user.company.sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")), 'approved_expenses'],
        [req.user.company.sequelize.fn('COUNT', req.user.company.sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pending_expenses']
      ],
      raw: true
    });

    res.json({
      data: {
        user,
        stats: expenseStats[0] || {
          total_expenses: 0,
          total_amount: 0,
          approved_expenses: 0,
          pending_expenses: 0
        }
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Create new user (Admin only)
const createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      role = 'employee',
      employee_id,
      department,
      position,
      phone,
      manager_id,
      hire_date
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: {
          message: 'User with this email already exists'
        }
      });
    }

    // Validate manager_id if provided
    if (manager_id) {
      const manager = await User.findOne({
        where: {
          id: manager_id,
          company_id: req.user.company_id,
          role: { [Op.in]: ['admin', 'manager'] }
        }
      });

      if (!manager) {
        return res.status(400).json({
          error: {
            message: 'Invalid manager ID or manager not found'
          }
        });
      }
    }

    // Create user
    const newUser = await User.create({
      email,
      password,
      first_name,
      last_name,
      role,
      employee_id,
      department,
      position,
      phone,
      manager_id,
      company_id: req.user.company_id,
      hire_date: hire_date || new Date()
    });

    // Log audit event
    await logAuditEvent('user', newUser.id, 'create', req.user.id, req.user.company_id, null, {
      email: newUser.email,
      role: newUser.role,
      created_by: req.user.id
    }, req);

    // Return created user (without password)
    const createdUser = await User.findByPk(newUser.id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    res.status(201).json({
      message: 'User created successfully',
      data: {
        user: createdUser
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      first_name,
      last_name,
      role,
      employee_id,
      department,
      position,
      phone,
      manager_id,
      is_active
    } = req.body;

    // Find user
    const user = await User.findOne({
      where: {
        id,
        company_id: req.user.company_id
      }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found'
        }
      });
    }

    // Store old values for audit
    const oldValues = {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      employee_id: user.employee_id,
      department: user.department,
      position: user.position,
      phone: user.phone,
      manager_id: user.manager_id,
      is_active: user.is_active
    };

    // Check email uniqueness if changing
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: { email, id: { [Op.ne]: id } }
      });

      if (existingUser) {
        return res.status(400).json({
          error: {
            message: 'Email already exists'
          }
        });
      }
    }

    // Validate manager_id if provided
    if (manager_id && manager_id !== user.manager_id) {
      const manager = await User.findOne({
        where: {
          id: manager_id,
          company_id: req.user.company_id,
          role: { [Op.in]: ['admin', 'manager'] }
        }
      });

      if (!manager) {
        return res.status(400).json({
          error: {
            message: 'Invalid manager ID or manager not found'
          }
        });
      }
    }

    // Update user
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (role !== undefined) updateData.role = role;
    if (employee_id !== undefined) updateData.employee_id = employee_id;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (phone !== undefined) updateData.phone = phone;
    if (manager_id !== undefined) updateData.manager_id = manager_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    await user.update(updateData);

    // Log audit event
    await logAuditEvent('user', user.id, 'update', req.user.id, req.user.company_id, oldValues, updateData, req);

    // Return updated user
    const updatedUser = await User.findByPk(user.id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: 'User updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Delete user (soft delete)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findOne({
      where: {
        id,
        company_id: req.user.company_id
      }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found'
        }
      });
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: {
          message: 'Cannot delete your own account'
        }
      });
    }

    // Check if user has pending expenses
    const pendingExpenses = await Expense.count({
      where: {
        user_id: id,
        status: { [Op.in]: ['submitted', 'under_review'] }
      }
    });

    if (pendingExpenses > 0) {
      return res.status(400).json({
        error: {
          message: `Cannot delete user with ${pendingExpenses} pending expense(s). Please resolve them first.`
        }
      });
    }

    // Soft delete by deactivating
    await user.update({ is_active: false });

    // Log audit event
    await logAuditEvent('user', user.id, 'delete', req.user.id, req.user.company_id, {
      is_active: true
    }, {
      is_active: false,
      deleted_by: req.user.id
    }, req);

    res.json({
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Get user hierarchy (organizational chart)
const getUserHierarchy = async (req, res) => {
  try {
    // Get all active users in the company
    const users = await User.findAll({
      where: {
        company_id: req.user.company_id,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        },
        {
          model: User,
          as: 'directReports',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'department']
        }
      ],
      attributes: { exclude: ['password'] },
      order: [['role', 'ASC'], ['first_name', 'ASC']]
    });

    // Build hierarchy tree
    const buildHierarchy = (managerId = null) => {
      return users
        .filter(user => user.manager_id === managerId)
        .map(user => ({
          ...user.toJSON(),
          children: buildHierarchy(user.id)
        }));
    };

    const hierarchy = buildHierarchy();

    res.json({
      data: {
        hierarchy,
        total_users: users.length
      }
    });

  } catch (error) {
    console.error('Get user hierarchy error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch user hierarchy',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserHierarchy
};