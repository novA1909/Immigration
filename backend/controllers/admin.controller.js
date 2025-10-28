// Import required models
const User = require('../models/User');
const Document = require('../models/Document');
const Country = require('../models/Country');
const EmailLog = require('../models/EmailLog');

/**
 * @desc    Get all users with filtering and pagination
 * @route   GET /api/admin/users
 * @access  Private/Admin
 * @query   status, country, page, limit, search
 */
const getAllUsers = async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { status, country, page = 1, limit = 10, search } = req.query;

    // Build filter object for MongoDB query
    const filter = {};

    // Add status filter if provided
    if (status) {
      // Filter by application status (pending, in-progress, etc.)
      filter.status = status;
    }

    // Add country filter if provided
    if (country) {
      // Filter by country ObjectId
      filter.country = country;
    }

    // Add search filter if provided
    // Search in name or email fields using regex (case-insensitive)
    if (search) {
      filter.$or = [
        // $regex allows pattern matching, $options: 'i' makes it case-insensitive
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination values
    // Convert page and limit to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    // Calculate how many documents to skip
    const skip = (pageNum - 1) * limitNum;

    // Get total count of users matching filter (for pagination info)
    const totalUsers = await User.countDocuments(filter);

    // Find users with filter, pagination, and sorting
    const users = await User.find(filter)
      // Populate country details
      .populate('country', 'countryName countryCode')
      // Sort by most recently updated first
      .sort({ lastUpdated: -1 })
      // Skip documents for pagination
      .skip(skip)
      // Limit number of documents returned
      .limit(limitNum)
      // Exclude password field
      .select('-password');

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / limitNum);

    // Return 200 OK with users and pagination info
    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      data: {
        users,
      },
    });
  } catch (error) {
    // Log error
    console.error('Get all users error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all documents with filtering and pagination
 * @route   GET /api/admin/documents
 * @access  Private/Admin
 * @query   userId, docType, status, verificationStatus, page, limit
 */
const getAllDocuments = async (req, res) => {
  try {
    // Extract query parameters
    const {
      userId,
      docType,
      status,
      verificationStatus,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter object
    const filter = {};

    // Add filters if provided
    if (userId) {
      filter.userId = userId;
    }

    if (docType) {
      filter.docType = docType;
    }

    if (status) {
      filter.status = status;
    }

    if (verificationStatus) {
      filter.verificationStatus = verificationStatus;
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalDocuments = await Document.countDocuments(filter);

    // Find documents with filter and pagination
    const documents = await Document.find(filter)
      // Populate user details
      .populate('userId', 'name email country')
      // Sort by upload date (newest first)
      .sort({ uploadDate: -1 })
      // Pagination
      .skip(skip)
      .limit(limitNum);

    // Calculate total pages
    const totalPages = Math.ceil(totalDocuments / limitNum);

    // Return 200 OK
    res.status(200).json({
      success: true,
      count: documents.length,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalDocuments,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      data: {
        documents,
      },
    });
  } catch (error) {
    // Log error
    console.error('Get all documents error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching documents',
      error: error.message,
    });
  }
};

/**
 * @desc    Get user details with all documents
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
const getUserDetails = async (req, res) => {
  try {
    // Find user by ID from URL parameter
    const user = await User.findById(req.params.id)
      // Populate country with full details
      .populate('country');

    // Check if user exists
    if (!user) {
      // Return 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get all documents for this user
    const documents = await Document.find({ userId: user._id }).sort({
      uploadDate: -1,
    });

    // Get email logs for this user (last 20)
    const emailLogs = await EmailLog.find({ userId: user._id })
      .sort({ sentAt: -1 })
      .limit(20);

    // Return 200 OK with user details, documents, and email logs
    res.status(200).json({
      success: true,
      data: {
        user,
        documents,
        emailLogs,
        stats: {
          totalDocuments: documents.length,
          completedDocuments: documents.filter((doc) => doc.status === 'completed').length,
          pendingDocuments: documents.filter((doc) => doc.status === 'processing' || doc.status === 'uploaded').length,
          failedDocuments: documents.filter((doc) => doc.status === 'failed').length,
        },
      },
    });
  } catch (error) {
    // Log error
    console.error('Get user details error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching user details',
      error: error.message,
    });
  }
};

/**
 * @desc    Update user status
 * @route   PUT /api/admin/users/:id/status
 * @access  Private/Admin
 */
const updateUserStatus = async (req, res) => {
  try {
    // Extract new status from request body
    const { status } = req.body;

    // Validate status is provided
    if (!status) {
      // Return 400 Bad Request
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    // Find user by ID
    const user = await User.findById(req.params.id);

    // Check if user exists
    if (!user) {
      // Return 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user status
    user.status = status;

    // Save user (triggers validation and middleware)
    await user.save();

    // Return 200 OK
    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    // Log error
    console.error('Update user status error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error updating user status',
      error: error.message,
    });
  }
};

/**
 * @desc    Verify or reject document
 * @route   PUT /api/admin/documents/:id/verify
 * @access  Private/Admin
 */
const verifyDocument = async (req, res) => {
  try {
    // Extract verification status and notes from request body
    const { verificationStatus, adminNotes } = req.body;

    // Validate verification status
    if (!verificationStatus) {
      // Return 400 Bad Request
      return res.status(400).json({
        success: false,
        message: 'Verification status is required',
      });
    }

    // Find document by ID
    const document = await Document.findById(req.params.id);

    // Check if document exists
    if (!document) {
      // Return 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Update document verification status
    document.verificationStatus = verificationStatus;

    // Update admin notes if provided
    if (adminNotes) {
      document.adminNotes = adminNotes;
    }

    // Save document
    await document.save();

    // Return 200 OK
    res.status(200).json({
      success: true,
      message: 'Document verification updated successfully',
      data: {
        document,
      },
    });
  } catch (error) {
    // Log error
    console.error('Verify document error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error verifying document',
      error: error.message,
    });
  }
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get users by status
    const usersByStatus = await User.aggregate([
      {
        // Group users by status field
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get total documents count
    const totalDocuments = await Document.countDocuments();

    // Get documents by status
    const documentsByStatus = await Document.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get documents by verification status
    const documentsByVerification = await Document.aggregate([
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get users by country
    const usersByCountry = await User.aggregate([
      {
        // Group users by country
        $group: {
          _id: '$country',
          count: { $sum: 1 },
        },
      },
      {
        // Lookup country details
        $lookup: {
          from: 'countries', // MongoDB collection name (pluralized)
          localField: '_id',
          foreignField: '_id',
          as: 'country',
        },
      },
      {
        // Unwind country array
        $unwind: '$country',
      },
      {
        // Project desired fields
        $project: {
          countryName: '$country.countryName',
          countryCode: '$country.countryCode',
          count: 1,
        },
      },
      {
        // Sort by count descending
        $sort: { count: -1 },
      },
    ]);

    // Get recent users (last 10)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email country status createdAt')
      .populate('country', 'countryName countryCode');

    // Get email statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const emailStats = await EmailLog.aggregate([
      {
        // Filter emails from last 30 days
        $match: {
          sentAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        // Group by status
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate average progress
    const avgProgressResult = await User.aggregate([
      {
        $group: {
          _id: null,
          averageProgress: { $avg: '$progress' },
        },
      },
    ]);

    const averageProgress = avgProgressResult[0]?.averageProgress || 0;

    // Return 200 OK with all statistics
    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byStatus: usersByStatus,
          byCountry: usersByCountry,
          averageProgress: Math.round(averageProgress),
          recent: recentUsers,
        },
        documents: {
          total: totalDocuments,
          byStatus: documentsByStatus,
          byVerification: documentsByVerification,
        },
        emails: {
          last30Days: emailStats,
        },
      },
    });
  } catch (error) {
    // Log error
    console.error('Get dashboard stats error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard statistics',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);

    // Check if user exists
    if (!user) {
      // Return 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete all user's documents from database
    await Document.deleteMany({ userId: user._id });

    // Delete all user's email logs
    await EmailLog.deleteMany({ userId: user._id });

    // Delete user
    await user.deleteOne();

    // Return 200 OK
    res.status(200).json({
      success: true,
      message: 'User and all associated data deleted successfully',
    });
  } catch (error) {
    // Log error
    console.error('Delete user error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error deleting user',
      error: error.message,
    });
  }
};

// Export all controller functions
module.exports = {
  getAllUsers,
  getAllDocuments,
  getUserDetails,
  updateUserStatus,
  verifyDocument,
  getDashboardStats,
  deleteUser,
};
