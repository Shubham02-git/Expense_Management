const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  entity_type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['expense', 'approval', 'user', 'company', 'workflow']]
    }
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['create', 'update', 'delete', 'approve', 'reject', 'submit', 'escalate']]
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
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
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  indexes: [
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = AuditLog;