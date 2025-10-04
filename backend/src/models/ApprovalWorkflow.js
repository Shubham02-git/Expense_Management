const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovalWorkflow = sequelize.define('ApprovalWorkflow', {
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
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
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
  conditions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: JSON.stringify({
      amount_threshold: null,
      categories: [],
      departments: [],
      user_roles: []
    }),
    comment: 'Conditions that trigger this workflow'
  },
  steps: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: '[]',
    comment: 'Array of approval steps with rules'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Higher priority workflows are checked first'
  }
}, {
  tableName: 'approval_workflows',
  indexes: [
    {
      fields: ['company_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['priority']
    }
  ]
});

module.exports = ApprovalWorkflow;