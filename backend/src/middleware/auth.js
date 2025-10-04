const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Access token is required'
        }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    // Get user with company information
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'currency', 'currency_symbol', 'settings']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: {
          message: 'User not found or inactive'
        }
      });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: {
        message: 'Invalid authentication token'
      }
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

// Company access middleware (ensures user belongs to the company)
const checkCompanyAccess = (req, res, next) => {
  const companyId = req.params.companyId || req.body.company_id || req.query.company_id;
  
  if (companyId && companyId !== req.user.company_id) {
    return res.status(403).json({
      error: {
        message: 'Access denied to this company'
      }
    });
  }
  
  next();
};

// Admin or owner access middleware
const adminOrOwner = (req, res, next) => {
  const userId = req.params.id || req.params.userId;
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    return next();
  }
  
  return res.status(403).json({
    error: {
      message: 'Access denied. Admin role or resource ownership required.'
    }
  });
};

// Manager access middleware (manager can access their direct reports)
const managerAccess = async (req, res, next) => {
  try {
    const userId = req.params.id || req.params.userId;
    
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // User can access their own data
    if (req.user.id === userId) {
      return next();
    }
    
    // Manager can access their direct reports
    if (req.user.role === 'manager') {
      const employee = await User.findByPk(userId);
      if (employee && employee.manager_id === req.user.id) {
        return next();
      }
    }
    
    return res.status(403).json({
      error: {
        message: 'Access denied. Insufficient permissions.'
      }
    });
  } catch (error) {
    console.error('Manager access check error:', error);
    return res.status(500).json({
      error: {
        message: 'Internal server error during authorization'
      }
    });
  }
};

// Optional authentication (doesn't require login but adds user if available)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyToken(token);
      
      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'currency', 'currency_symbol']
          }
        ],
        attributes: { exclude: ['password'] }
      });

      if (user && user.is_active) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  checkCompanyAccess,
  adminOrOwner,
  managerAccess,
  optionalAuth
};