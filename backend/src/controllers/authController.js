const { User, Company } = require('../models');
const { generateToken } = require('../middleware/auth');
const { AuditLog } = require('../models');
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

// Get country currency information
const getCountryCurrency = async (countryName) => {
  try {
    const response = await axios.get(`${process.env.COUNTRIES_API_URL || 'https://restcountries.com/v3.1/all'}?fields=name,currencies`);
    const countries = response.data;
    
    const country = countries.find(c => 
      c.name.common.toLowerCase() === countryName.toLowerCase() ||
      c.name.official.toLowerCase() === countryName.toLowerCase()
    );
    
    if (country && country.currencies) {
      const currencyCode = Object.keys(country.currencies)[0];
      const currency = country.currencies[currencyCode];
      return {
        currency: currencyCode,
        currency_symbol: currency.symbol || currencyCode,
        currency_name: currency.name || currencyCode
      };
    }
    
    // Default fallback
    return {
      currency: 'USD',
      currency_symbol: '$',
      currency_name: 'US Dollar'
    };
  } catch (error) {
    console.error('Error fetching country currency:', error);
    // Return default currency on error
    return {
      currency: 'USD',
      currency_symbol: '$',
      currency_name: 'US Dollar'
    };
  }
};

// Register new user with company setup
const register = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      company_name, 
      country = 'United States' 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        error: {
          message: 'User with this email already exists'
        }
      });
    }

    // Get currency information for the country
    const currencyInfo = await getCountryCurrency(country);
    
    // Create company (auto-created on first signup)
    const company = await Company.create({
      name: company_name || `${first_name} ${last_name}'s Company`,
      country,
      ...currencyInfo,
      email: email, // Use user's email as company contact
      settings: {
        approval_threshold: 1000,
        require_receipts: true,
        auto_approve_under: 50,
        notification_enabled: true
      }
    });

    // Create admin user
    const user = await User.create({
      email,
      password,
      first_name,
      last_name,
      role: 'admin', // First user is automatically admin
      company_id: company.id,
      is_active: true,
      hire_date: new Date()
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: company.id
    });

    // Log audit event
    await logAuditEvent('user', user.id, 'create', user.id, company.id, null, {
      email: user.email,
      role: user.role,
      company_id: company.id
    }, req);

    // Return user data (excluding password) with token
    const userData = await User.findByPk(user.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'currency', 'currency_symbol', 'country']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    res.status(201).json({
      message: 'Registration successful',
      data: {
        user: userData,
        token,
        company_created: true
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        message: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with company information
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'currency', 'currency_symbol', 'country', 'settings']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password'
        }
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: {
          message: 'Account is deactivated. Please contact your administrator.'
        }
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password'
        }
      });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    });

    // Log audit event
    await logAuditEvent('user', user.id, 'login', user.id, user.company_id, null, {
      last_login: new Date(),
      ip_address: req.ip
    }, req);

    // Return user data (excluding password) with token
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'currency', 'currency_symbol', 'country', 'settings']
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

    res.json({
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch user profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      department,
      position,
      preferences
    } = req.body;

    const oldValues = {
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      phone: req.user.phone,
      department: req.user.department,
      position: req.user.position,
      preferences: req.user.preferences
    };

    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (preferences !== undefined) updateData.preferences = preferences;

    await req.user.update(updateData);

    // Log audit event
    await logAuditEvent('user', req.user.id, 'update', req.user.id, req.user.company_id, oldValues, updateData, req);

    // Return updated user
    const updatedUser = await User.findByPk(req.user.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'currency', 'currency_symbol']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(current_password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: {
          message: 'Current password is incorrect'
        }
      });
    }

    // Update password
    await req.user.update({ password: new_password });

    // Log audit event
    await logAuditEvent('user', req.user.id, 'update', req.user.id, req.user.company_id, null, {
      password_changed: true
    }, req);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to change password',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Logout (invalidate token on client side)
const logout = async (req, res) => {
  try {
    // Log audit event
    await logAuditEvent('user', req.user.id, 'logout', req.user.id, req.user.company_id, null, {
      logout_time: new Date(),
      ip_address: req.ip
    }, req);

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: {
        message: 'Logout failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
};