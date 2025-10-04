const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExpenseCategory = sequelize.define('ExpenseCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#3B82F6'
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  company_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'expense_categories',
      key: 'id'
    }
  },
  approval_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  max_amount_without_approval: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  requires_receipt: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'expense_categories',
  indexes: [
    {
      fields: ['company_id']
    },
    {
      fields: ['parent_id']
    },
    {
      fields: ['name', 'company_id'],
      unique: true
    }
  ]
});

module.exports = ExpenseCategory;