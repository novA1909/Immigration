// Import Express router
const express = require('express');

// Create router instance
const router = express.Router();

// Import controller functions
const {
  getAllUsers,
  getAllDocuments,
  getUserDetails,
  updateUserStatus,
  verifyDocument,
  getDashboardStats,
  deleteUser,
} = require('../controllers/admin.controller');

// Import middleware
const { protect, admin } = require('../middleware/auth');

/**
 * All routes in this file require admin privileges
 * protect middleware: Verifies JWT token and sets req.user
 * admin middleware: Checks if req.user.role === 'admin'
 *
 * Middleware chain: protect -> admin -> controller
 * Both middlewares must pass for request to reach controller
 */

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Private/Admin
 * @headers Authorization: Bearer <token>
 * @returns Overall statistics (users, documents, emails, etc.)
 */
router.get('/stats', protect, admin, getDashboardStats);
// GET request to /api/admin/stats
// protect verifies authentication
// admin verifies admin role
// Returns comprehensive dashboard statistics

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Private/Admin
 * @headers Authorization: Bearer <token>
 * @query   status - Filter by application status (pending, in-progress, etc.)
 * @query   country - Filter by country ObjectId
 * @query   search - Search in name or email
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 10)
 */
router.get('/users', protect, admin, getAllUsers);
// GET request to /api/admin/users
// Supports filtering by status, country, search term
// Supports pagination with page and limit query params
// Example: /api/admin/users?status=in-progress&page=2&limit=20

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get detailed user information
 * @access  Private/Admin
 * @headers Authorization: Bearer <token>
 * @params  id - User ObjectId
 * @returns User details, all documents, email logs, and statistics
 */
router.get('/users/:id', protect, admin, getUserDetails);
// GET request to /api/admin/users/:id
// Returns comprehensive user data including:
// - User profile
// - All documents
// - Recent email logs
// - Document statistics

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user's application status
 * @access  Private/Admin
 * @headers Authorization: Bearer <token>
 * @params  id - User ObjectId
 * @body    { status: 'pending'|'in-progress'|'under-review'|'approved'|'rejected' }
 */
router.put('/users/:id/status', protect, admin, updateUserStatus);
// PUT request to /api/admin/users/:id/status
// Allows admin to change user's application status
// Status must be valid enum value from User model

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user and all associated data
 * @access  Private/Admin
 * @headers Authorization: Bearer <token>
 * @params  id - User ObjectId
 * @warning This permanently deletes user, documents, and email logs
 */
router.delete('/users/:id', protect, admin, deleteUser);
// DELETE request to /api/admin/users/:id
// Permanently deletes:
// - User record
// - All user's documents
// - All user's email logs
// Cannot be undone - use with caution

/**
 * @route   GET /api/admin/documents
 * @desc    Get all documents with filtering and pagination
 * @access  Private/Admin
 * @headers Authorization: Bearer <token>
 * @query   userId - Filter by user ObjectId
 * @query   docType - Filter by document type
 * @query   status - Filter by processing status
 * @query   verificationStatus - Filter by verification status
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 20)
 */
router.get('/documents', protect, admin, getAllDocuments);
// GET request to /api/admin/documents
// Supports multiple filters for document management
// Example: /api/admin/documents?verificationStatus=unverified&page=1

/**
 * @route   PUT /api/admin/documents/:id/verify
 * @desc    Verify or reject a document
 * @access  Private/Admin
 * @headers Authorization: Bearer <token>
 * @params  id - Document ObjectId
 * @body    {
 *            verificationStatus: 'verified'|'rejected'|'unverified',
 *            adminNotes?: 'Optional notes about verification'
 *          }
 */
router.put('/documents/:id/verify', protect, admin, verifyDocument);
// PUT request to /api/admin/documents/:id/verify
// Allows admin to:
// - Verify documents as authentic
// - Reject documents with reasons
// - Add notes about verification decision

// Export router
module.exports = router;

/**
 * Usage in server.js:
 * const adminRoutes = require('./routes/admin.routes');
 * app.use('/api/admin', adminRoutes);
 *
 * This will create the following endpoints (all require admin role):
 * - GET    /api/admin/stats
 * - GET    /api/admin/users
 * - GET    /api/admin/users/:id
 * - PUT    /api/admin/users/:id/status
 * - DELETE /api/admin/users/:id
 * - GET    /api/admin/documents
 * - PUT    /api/admin/documents/:id/verify
 *
 * Authorization:
 * All routes require:
 * 1. Valid JWT token in Authorization header
 * 2. User role must be 'admin'
 *
 * Example request:
 * GET /api/admin/users?status=pending&page=1
 * Headers: { Authorization: 'Bearer <admin-token>' }
 */
