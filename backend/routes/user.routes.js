// Import Express router
const express = require('express');

// Create router instance
// Router allows us to create modular route handlers
const router = express.Router();

// Import controller functions
// These functions contain the actual logic for handling requests
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
} = require('../controllers/user.controller');

// Import middleware
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/users/register
 * @desc    Register a new user
 * @access  Public (no authentication required)
 * @body    { name, email, password, country }
 */
router.post('/register', registerUser);
// POST request to /api/users/register
// Calls registerUser controller function
// Public route - anyone can register

/**
 * @route   POST /api/users/login
 * @desc    Authenticate user and get token
 * @access  Public (no authentication required)
 * @body    { email, password }
 */
router.post('/login', loginUser);
// POST request to /api/users/login
// Calls loginUser controller function
// Public route - anyone can login
// Returns JWT token on success

/**
 * @route   GET /api/users/profile
 * @desc    Get current user's profile
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 */
router.get('/profile', protect, getUserProfile);
// GET request to /api/users/profile
// protect middleware verifies JWT token first
// Then calls getUserProfile controller function
// User must be authenticated (valid token required)

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @body    { name?, email?, country? } (all fields optional)
 */
router.put('/profile', protect, updateUserProfile);
// PUT request to /api/users/profile
// protect middleware verifies authentication
// Then calls updateUserProfile controller function
// Allows partial updates (can update just name, or just email, etc.)

/**
 * @route   PUT /api/users/password
 * @desc    Change user password
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @body    { currentPassword, newPassword }
 */
router.put('/password', protect, changePassword);
// PUT request to /api/users/password
// protect middleware verifies authentication
// Then calls changePassword controller function
// Requires both current and new password

// Export router to be used in server.js
module.exports = router;

/**
 * Usage in server.js:
 * const userRoutes = require('./routes/user.routes');
 * app.use('/api/users', userRoutes);
 *
 * This will create the following endpoints:
 * - POST   /api/users/register
 * - POST   /api/users/login
 * - GET    /api/users/profile
 * - PUT    /api/users/profile
 * - PUT    /api/users/password
 */
