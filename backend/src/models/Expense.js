const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  expense_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    validate: {
      len: [3, 3]
    }
  },
  amount_in_company_currency: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  exchange_rate: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 1.0
  },
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  merchant_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  merchant_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'other'),
    defaultValue: 'credit_card'
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid'),
    defaultValue: 'draft'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  company_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'expense_categories',
      key: 'id'
    }
  },
  receipt_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receipt_filename: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ocr_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Store OCR extracted data for audit purposes'
  },
  reimbursement_requested: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reimbursed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejected_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional flexible data storage'
  }
}, {
  tableName: 'expenses',
  hooks: {
    beforeCreate: async (expense) => {
      if (!expense.expense_number) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        expense.expense_number = `EXP-${year}${month}${day}-${random}`;
      }
    }
  },
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['expense_date']
    },
    {
      fields: ['expense_number'],
      unique: true
    },
    {
      fields: ['submitted_at']
    },
    {
      fields: ['amount_in_company_currency']
    }
  ]
});

module.exports = Expense;