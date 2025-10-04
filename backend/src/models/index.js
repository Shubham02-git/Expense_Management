const { sequelize } = require('../config/database');

// Import all models
const Company = require('./Company');
const User = require('./User');
const ExpenseCategory = require('./ExpenseCategory');
const Expense = require('./Expense');
const ApprovalWorkflow = require('./ApprovalWorkflow');
const Approval = require('./Approval');
const AuditLog = require('./AuditLog');

// Define associations

// Company associations
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
Company.hasMany(ExpenseCategory, { foreignKey: 'company_id', as: 'categories' });
Company.hasMany(Expense, { foreignKey: 'company_id', as: 'expenses' });
Company.hasMany(ApprovalWorkflow, { foreignKey: 'company_id', as: 'workflows' });
Company.hasMany(AuditLog, { foreignKey: 'company_id', as: 'auditLogs' });

// User associations
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
User.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });
User.hasMany(User, { foreignKey: 'manager_id', as: 'directReports' });
User.hasMany(Expense, { foreignKey: 'user_id', as: 'expenses' });
User.hasMany(Approval, { foreignKey: 'approver_id', as: 'approvalsToReview' });
User.hasMany(Approval, { foreignKey: 'escalated_to', as: 'escalatedApprovals' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });

// ExpenseCategory associations
ExpenseCategory.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
ExpenseCategory.belongsTo(ExpenseCategory, { foreignKey: 'parent_id', as: 'parent' });
ExpenseCategory.hasMany(ExpenseCategory, { foreignKey: 'parent_id', as: 'children' });
ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });

// Expense associations
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Expense.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });
Expense.hasMany(Approval, { foreignKey: 'expense_id', as: 'approvals' });

// ApprovalWorkflow associations
ApprovalWorkflow.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
ApprovalWorkflow.hasMany(Approval, { foreignKey: 'workflow_id', as: 'approvals' });

// Approval associations
Approval.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense' });
Approval.belongsTo(ApprovalWorkflow, { foreignKey: 'workflow_id', as: 'workflow' });
Approval.belongsTo(User, { foreignKey: 'approver_id', as: 'approver' });
Approval.belongsTo(User, { foreignKey: 'escalated_to', as: 'escalatedUser' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
AuditLog.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Create database tables
const syncDatabase = async (force = false) => {
  try {
    // Sync in dependency order to handle foreign keys properly
    await Company.sync({ force });
    await User.sync({ force });
    await ExpenseCategory.sync({ force });
    await ApprovalWorkflow.sync({ force });
    await Expense.sync({ force });
    await Approval.sync({ force });
    await AuditLog.sync({ force });
    
    console.log('✅ Database tables synchronized successfully');
    
    // Create default data if force sync
    if (force) {
      await createDefaultData();
    }
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

// Create default data for development
const createDefaultData = async () => {
  try {
    // Create default company
    const [company] = await Company.findOrCreate({
      where: { name: 'Demo Company' },
      defaults: {
        name: 'Demo Company',
        country: 'United States',
        currency: 'USD',
        currency_symbol: '$',
        timezone: 'America/New_York',
        email: 'admin@democompany.com'
      }
    });

    // Create default expense categories
    const categories = [
      { name: 'Travel', color: '#3B82F6', icon: 'airplane' },
      { name: 'Meals', color: '#10B981', icon: 'utensils' },
      { name: 'Office Supplies', color: '#F59E0B', icon: 'briefcase' },
      { name: 'Transportation', color: '#EF4444', icon: 'car' },
      { name: 'Entertainment', color: '#8B5CF6', icon: 'music' },
      { name: 'Training', color: '#06B6D4', icon: 'book' },
      { name: 'Equipment', color: '#84CC16', icon: 'monitor' },
      { name: 'Marketing', color: '#F97316', icon: 'megaphone' }
    ];

    for (const cat of categories) {
      await ExpenseCategory.findOrCreate({
        where: { name: cat.name, company_id: company.id },
        defaults: { ...cat, company_id: company.id }
      });
    }

    // Create default approval workflow
    await ApprovalWorkflow.findOrCreate({
      where: { name: 'Default Workflow', company_id: company.id },
      defaults: {
        name: 'Default Workflow',
        description: 'Standard approval workflow for all expenses',
        company_id: company.id,
        conditions: {
          amount_threshold: 100,
          categories: [],
          departments: [],
          user_roles: []
        },
        steps: [
          {
            step: 1,
            name: 'Manager Approval',
            type: 'manager',
            required: true,
            auto_approve_threshold: 50
          },
          {
            step: 2,
            name: 'Finance Approval',
            type: 'role',
            roles: ['admin'],
            required_for_amount: 500,
            auto_approve_threshold: null
          }
        ],
        priority: 1
      }
    });

    console.log('✅ Default data created successfully');
  } catch (error) {
    console.error('❌ Error creating default data:', error);
  }
};

// Database connection test
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Company,
  User,
  ExpenseCategory,
  Expense,
  ApprovalWorkflow,
  Approval,
  AuditLog,
  testConnection,
  syncDatabase
};