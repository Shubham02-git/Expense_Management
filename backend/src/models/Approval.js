const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Approval = sequelize.define('Approval', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  expense_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'expenses',
      key: 'id'
    }
  },
  workflow_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'approval_workflows',
      key: 'id'
    }
  },
  approver_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  step_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'skipped'),
    defaultValue: 'pending'
  },
  decision_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approval_method: {
    type: DataTypes.ENUM('manual', 'auto_amount', 'auto_role', 'auto_rule'),
    defaultValue: 'manual'
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  escalated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  escalated_to: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  escalated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional approval context data'
  }
}, {
  tableName: 'approvals',
  indexes: [
    {
      fields: ['expense_id']
    },
    {
      fields: ['approver_id']
    },
    {
      fields: ['workflow_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['step_number']
    },
    {
      fields: ['due_date']
    },
    {
      fields: ['expense_id', 'step_number'],
      unique: true
    }
  ]
});

module.exports = Approval;