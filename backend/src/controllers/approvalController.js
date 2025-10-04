const { Approval, Expense, User, Company, ExpenseCategory, AuditLog, sequelize } = require('../models');
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

// Helper function to determine next approver
const getNextApprover = async (expense, currentLevel = 0) => {
  const company = await Company.findByPk(expense.company_id);
  if (!company || !company.approval_settings) {
    return null;
  }

  const approvalSettings = company.approval_settings;
  
  // Sequential approval workflow
  if (approvalSettings.workflow_type === 'sequential') {
    const levels = approvalSettings.approval_levels || [];
    const nextLevel = levels.find(level => level.level === currentLevel + 1);
    
    if (!nextLevel) {
      return null; // No more approval levels
    }

    // Find approver based on level configuration
    if (nextLevel.approver_type === 'manager') {
      // Find employee's direct manager
      const employee = await User.findByPk(expense.user_id);
      if (employee && employee.manager_id) {
        return await User.findByPk(employee.manager_id);
      }
    } else if (nextLevel.approver_type === 'role') {
      // Find users with specific role
      const approvers = await User.findAll({
        where: {
          company_id: expense.company_id,
          role: nextLevel.role,
          is_active: true
        }
      });
      return approvers[0]; // Return first available approver
    } else if (nextLevel.approver_id) {
      // Specific user approval
      return await User.findByPk(nextLevel.approver_id);
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

  return null;
};

// Helper function to send notification
const sendApprovalNotification = async (approval, type) => {
  // TODO: Implement actual notification sending (email, push, etc.)
  console.log(`Sending ${type} notification for approval ${approval.id}`);
};

// Get pending approvals for current user
const getPendingApprovals = async (req, res) => {
  try {
    console.log('getPendingApprovals called for user:', req.user?.id, 'company:', req.user?.company_id);
    
    // If user context is missing, return error
    if (!req.user || !req.user.id || !req.user.company_id) {
      console.log('Missing user context in getPendingApprovals');
      return res.status(401).json({
        error: {
          message: 'User authentication required'
        }
      });
    }
    
    const {
      page = 1,
      limit = 10,
      status = 'pending',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereClause = {
      approver_id: req.user.id
    };

    if (status !== 'all') {
      whereClause.status = status;
    }

    console.log('Where clause for approvals:', whereClause);

    const { rows: approvals, count } = await Approval.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Expense,
          as: 'expense',
          where: {
            company_id: req.user.company_id
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id']
            },
            {
              model: ExpenseCategory,
              as: 'category',
              attributes: ['id', 'name', 'color', 'icon']
            }
          ]
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'email']
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
        approvals,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch pending approvals'
      }
    });
  }
};

// Get approval by ID
const getApprovalById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const approval = await Approval.findOne({
      where: {
        id,
        approver_id: req.user.userId,
        company_id: req.user.company_id
      },
      include: [
        {
          model: Expense,
          as: 'expense',
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
            }
          ]
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!approval) {
      return res.status(404).json({
        error: {
          message: 'Approval not found'
        }
      });
    }

    res.json({
      success: true,
      data: approval
    });

  } catch (error) {
    console.error('Error fetching approval:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch approval'
      }
    });
  }
};

// Approve expense
const approveExpense = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    // Find the approval
    const approval = await Approval.findOne({
      where: {
        id,
        approver_id: req.user.userId,
        company_id: req.user.company_id,
        status: 'pending'
      },
      include: [{
        model: Expense,
        as: 'expense'
      }],
      transaction
    });

    if (!approval) {
      await transaction.rollback();
      return res.status(404).json({
        error: {
          message: 'Approval not found or already processed'
        }
      });
    }

    const expense = approval.expense;
    
    // Check if expense is still in submitted status
    if (expense.status !== 'submitted') {
      await transaction.rollback();
      return res.status(400).json({
        error: {
          message: 'Expense is not in submitted status'
        }
      });
    }

    // Update approval
    await approval.update({
      status: 'approved',
      approved_at: new Date(),
      comments: comments || null
    }, { transaction });

    // Check if there are more approval levels
    const nextApprover = await getNextApprover(expense, approval.approval_level);
    
    if (nextApprover) {
      // Create next approval level
      const nextApproval = await Approval.create({
        expense_id: expense.id,
        approver_id: nextApprover.id,
        approval_level: approval.approval_level + 1,
        company_id: expense.company_id,
        status: 'pending'
      }, { transaction });

      // Update expense status to indicate more approvals needed
      await expense.update({
        status: 'submitted' // Keep in submitted until all approvals complete
      }, { transaction });

      // Send notification to next approver
      await sendApprovalNotification(nextApproval, 'approval_request');
    } else {
      // All approvals complete - approve expense
      await expense.update({
        status: 'approved',
        approved_at: new Date()
      }, { transaction });
    }

    // Log audit event
    await logAuditEvent('approval', approval.id, 'approve', req.user.userId, req.user.company_id, 
      { status: 'pending' }, 
      { status: 'approved', comments }, 
      req
    );

    await transaction.commit();

    // Send notifications
    await sendApprovalNotification(approval, 'approved');

    res.json({
      success: true,
      message: 'Expense approved successfully',
      data: approval
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error approving expense:', error);
    res.status(500).json({
      error: {
        message: 'Failed to approve expense'
      }
    });
  }
};

// Reject expense
const rejectExpense = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { comments, reason } = req.body;
    
    if (!comments || comments.trim().length < 10) {
      return res.status(400).json({
        error: {
          message: 'Rejection comments are required (minimum 10 characters)'
        }
      });
    }

    // Find the approval
    const approval = await Approval.findOne({
      where: {
        id,
        approver_id: req.user.userId,
        company_id: req.user.company_id,
        status: 'pending'
      },
      include: [{
        model: Expense,
        as: 'expense'
      }],
      transaction
    });

    if (!approval) {
      await transaction.rollback();
      return res.status(404).json({
        error: {
          message: 'Approval not found or already processed'
        }
      });
    }

    const expense = approval.expense;
    
    // Check if expense is still in submitted status
    if (expense.status !== 'submitted') {
      await transaction.rollback();
      return res.status(400).json({
        error: {
          message: 'Expense is not in submitted status'
        }
      });
    }

    // Update approval
    await approval.update({
      status: 'rejected',
      rejected_at: new Date(),
      comments: comments,
      rejection_reason: reason || null
    }, { transaction });

    // Update expense status
    await expense.update({
      status: 'rejected',
      rejected_at: new Date()
    }, { transaction });

    // Reject all other pending approvals for this expense
    await Approval.update({
      status: 'cancelled',
      updated_at: new Date()
    }, {
      where: {
        expense_id: expense.id,
        status: 'pending',
        id: { [Op.ne]: approval.id }
      },
      transaction
    });

    // Log audit event
    await logAuditEvent('approval', approval.id, 'reject', req.user.userId, req.user.company_id, 
      { status: 'pending' }, 
      { status: 'rejected', comments, reason }, 
      req
    );

    await transaction.commit();

    // Send notifications
    await sendApprovalNotification(approval, 'rejected');

    res.json({
      success: true,
      message: 'Expense rejected successfully',
      data: approval
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error rejecting expense:', error);
    res.status(500).json({
      error: {
        message: 'Failed to reject expense'
      }
    });
  }
};

// Bulk approve expenses
const bulkApproveExpenses = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { approval_ids, comments } = req.body;
    
    if (!approval_ids || !Array.isArray(approval_ids) || approval_ids.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Approval IDs array is required'
        }
      });
    }

    const results = {
      approved: [],
      failed: []
    };

    for (const approvalId of approval_ids) {
      try {
        // Find the approval
        const approval = await Approval.findOne({
          where: {
            id: approvalId,
            approver_id: req.user.userId,
            company_id: req.user.company_id,
            status: 'pending'
          },
          include: [{
            model: Expense,
            as: 'expense'
          }],
          transaction
        });

        if (!approval || approval.expense.status !== 'submitted') {
          results.failed.push({
            approval_id: approvalId,
            reason: 'Approval not found or already processed'
          });
          continue;
        }

        const expense = approval.expense;

        // Update approval
        await approval.update({
          status: 'approved',
          approved_at: new Date(),
          comments: comments || null
        }, { transaction });

        // Check if there are more approval levels
        const nextApprover = await getNextApprover(expense, approval.approval_level);
        
        if (!nextApprover) {
          // All approvals complete - approve expense
          await expense.update({
            status: 'approved',
            approved_at: new Date()
          }, { transaction });
        }

        results.approved.push(approvalId);

        // Log audit event
        await logAuditEvent('approval', approval.id, 'bulk_approve', req.user.userId, req.user.company_id, 
          { status: 'pending' }, 
          { status: 'approved', comments }, 
          req
        );

      } catch (error) {
        console.error(`Error processing approval ${approvalId}:`, error);
        results.failed.push({
          approval_id: approvalId,
          reason: error.message
        });
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Bulk approval completed. ${results.approved.length} approved, ${results.failed.length} failed.`,
      data: results
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error in bulk approve:', error);
    res.status(500).json({
      error: {
        message: 'Failed to process bulk approval'
      }
    });
  }
};

// Get approval statistics
const getApprovalStats = async (req, res) => {
  try {
    console.log('getApprovalStats called for user:', req.user?.id, 'company:', req.user?.company_id);
    
    // If user context is missing, return error
    if (!req.user || !req.user.id || !req.user.company_id) {
      console.log('Missing user context in getApprovalStats');
      return res.status(401).json({
        error: {
          message: 'User authentication required'
        }
      });
    }
    
    const stats = await Approval.findAll({
      include: [
        {
          model: Expense,
          as: 'expense',
          where: {
            company_id: req.user.company_id
          },
          attributes: []
        }
      ],
      where: {
        approver_id: req.user.id
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('Approval.id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    console.log('Approval stats query result:', stats);

    const formattedStats = {
      total_approvals: 0,
      by_status: {
        pending: 0,
        approved: 0,
        rejected: 0
      }
    };

    // Handle results
    if (stats && Array.isArray(stats)) {
      stats.forEach(stat => {
        const count = parseInt(stat.count) || 0;
        formattedStats.by_status[stat.status] = count;
        formattedStats.total_approvals += count;
      });
    }

    console.log('Formatted stats:', formattedStats);

    res.json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error('Error fetching approval stats:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch approval statistics'
      }
    });
  }
};

// Delegate approval
const delegateApproval = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { delegate_to, comments } = req.body;
    
    // Validate delegate user
    const delegateUser = await User.findOne({
      where: {
        id: delegate_to,
        company_id: req.user.company_id,
        is_active: true
      }
    });

    if (!delegateUser) {
      return res.status(400).json({
        error: {
          message: 'Invalid delegate user'
        }
      });
    }

    // Find the approval
    const approval = await Approval.findOne({
      where: {
        id,
        approver_id: req.user.userId,
        company_id: req.user.company_id,
        status: 'pending'
      },
      transaction
    });

    if (!approval) {
      await transaction.rollback();
      return res.status(404).json({
        error: {
          message: 'Approval not found'
        }
      });
    }

    // Update approval with delegation
    await approval.update({
      approver_id: delegate_to,
      delegated_by: req.user.userId,
      delegation_comments: comments || null,
      delegated_at: new Date()
    }, { transaction });

    // Log audit event
    await logAuditEvent('approval', approval.id, 'delegate', req.user.userId, req.user.company_id, 
      { approver_id: req.user.userId }, 
      { approver_id: delegate_to, delegated_by: req.user.userId }, 
      req
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Approval delegated successfully',
      data: approval
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error delegating approval:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delegate approval'
      }
    });
  }
};

module.exports = {
  getPendingApprovals,
  getApprovalById,
  approveExpense,
  rejectExpense,
  bulkApproveExpenses,
  getApprovalStats,
  delegateApproval
};
