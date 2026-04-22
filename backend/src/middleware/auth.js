const jwt = require('jsonwebtoken');
const User = require('../models/auth/user.model');
const { AppError, UnauthorizedError } = require('../utils/errors');
const config = require('../config');

const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('No token provided. Please log in.');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid token. Please log in again.');
    }

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      throw new UnauthorizedError('User no longer exists.');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('User account is deactivated.');
    }

    // Add user to request
    req.user = user;
    req.tokenId = decoded.tokenId;
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

const checkCompanyAccess = async (req, res, next) => {
  try {
    const requestedCompanyId = req.params.companyId || req.body.companyId;

    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!requestedCompanyId) {
      req.companyId = req.user.companyId;
      return next();
    }

    if (requestedCompanyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own company data.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      return authenticate(req, res, next);
    }
    req.user = null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  checkCompanyAccess,
  optionalAuth,
};