const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Company = sequelize.define('Company', {
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
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 3]
    }
  },
  currency_symbol: {
    type: DataTypes.STRING(5),
    allowNull: true
  },
  timezone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'UTC'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  logo_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: JSON.stringify({
      approval_threshold: 1000,
      require_receipts: true,
      auto_approve_under: 50,
      notification_enabled: true
    })
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'companies',
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['country']
    },
    {
      fields: ['currency']
    }
  ]
});

module.exports = Company;