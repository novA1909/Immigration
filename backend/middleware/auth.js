// Import jsonwebtoken library for JWT operations (sign, verify, decode)
const jwt = require('jsonwebtoken');

// Import User model to fetch user details after token verification
const User = require('../models/User');

/**
 * Protect Middleware
 * Verifies JWT token from request headers
 * Attaches authenticated user to req.user for use in route handlers
 * Usage: Add as middleware to any protected route
 * Example: router.get('/profile', protect, getUserProfile)
 */
const protect = async (req, res, next) => {
  // Initialize token variable
  let token;

  // Check if Authorization header exists and starts with 'Bearer'
  // Expected format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from "Bearer TOKEN" format
      // Split by space and take second element [0]="Bearer", [1]="TOKEN"
      token = req.headers.authorization.split(' ')[1];

      // Verify token using JWT_SECRET from environment variables
      // jwt.verify() decodes the token and validates signature
      // Returns decoded payload if valid, throws error if invalid/expired
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // decoded contains: { id: userId, iat: issuedAt, exp: expirationTime }
      // Fetch user from database using ID from token payload
      // .select('-password') excludes password field from returned user object
      req.user = await User.findById(decoded.id).select('-password');

      // Check if user exists in database
      // User might be deleted after token was issued
      if (!req.user) {
        // Return 401 Unauthorized if user not found
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      // Call next() to pass control to the next middleware or route handler
      // req.user is now available in subsequent handlers
      next();
    } catch (error) {
      // Catch any errors during token verification
      console.error('Token verification error:', error.message);

      // Return 401 Unauthorized with error message
      // Common errors: TokenExpiredError, JsonWebTokenError, invalid signature
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
        error: error.message,
      });
    }
  } else {
    // No token provided in Authorization header
    // Return 401 Unauthorized
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }
};

/**
 * Admin Middleware
 * Restricts access to admin users only
 * Must be used AFTER protect middleware
 * Usage: router.delete('/user/:id', protect, admin, deleteUser)
 */
const admin = (req, res, next) => {
  // Check if user exists (should be set by protect middleware)
  if (!req.user) {
    // Return 401 if protect middleware wasn't called first
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Check if user role is 'admin'
  // User.role is set in User model (enum: ['client', 'admin'])
  if (req.user.role === 'admin') {
    // User is admin, proceed to next middleware/handler
    next();
  } else {
    // User is not admin, return 403 Forbidden
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
};

/**
 * Generate JWT Token
 * Creates a signed JWT token for authenticated user
 * Token contains user ID and expires after specified time
 * @param {string} userId - MongoDB ObjectId of user
 * @returns {string} - Signed JWT token
 */
const generateToken = (userId) => {
  // Create and sign JWT token
  return jwt.sign(
    // Payload: Data to encode in token (only include non-sensitive data)
    { id: userId },

    // Secret: Used to sign the token (must be kept secure)
    // Should be a long, random string stored in environment variables
    process.env.JWT_SECRET,

    // Options: Token configuration
    {
      // expiresIn: Token expiration time
      // Can be: '30d', '24h', '60m', '3600' (seconds)
      // After expiration, token becomes invalid and user must login again
      expiresIn: process.env.JWT_EXPIRE || '30d', // Default 30 days
    }
  );
};

/**
 * Optional Auth Middleware
 * Attaches user to req.user if valid token provided, but doesn't require it
 * Useful for routes that behave differently for authenticated vs public users
 * Usage: router.get('/posts', optionalAuth, getPosts)
 */
const optionalAuth = async (req, res, next) => {
  // Initialize token variable
  let token;

  // Check if Authorization header exists and starts with 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user and attach to request
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // If token verification fails, just continue without user
      // Don't return error, as authentication is optional
      console.log('Optional auth failed:', error.message);
    }
  }

  // Continue to next middleware regardless of token validity
  next();
};

// Export middleware functions for use in route files
module.exports = {
  protect,      // Require authentication
  admin,        // Require admin role
  generateToken, // Generate JWT token
  optionalAuth, // Optional authentication
};
