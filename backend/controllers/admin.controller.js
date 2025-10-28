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
    const {
      status,
      country,
      page = 1,
      limit = 10,
      search,
      minProgress,
      maxProgress,
      sortBy = 'lastUpdated',
      order = 'desc'
    } = req.query;

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

    // Add progress filter if provided
    // Filter users by completion percentage (0-100)
    if (minProgress !== undefined || maxProgress !== undefined) {
      // Initialize progress filter object
      filter.progress = {};

      // Add minimum progress filter
      if (minProgress !== undefined) {
        // Convert to number and ensure it's between 0-100
        const min = Math.max(0, Math.min(100, parseInt(minProgress, 10)));
        filter.progress.$gte = min; // Greater than or equal to
      }

      // Add maximum progress filter
      if (maxProgress !== undefined) {
        // Convert to number and ensure it's between 0-100
        const max = Math.max(0, Math.min(100, parseInt(maxProgress, 10)));
        filter.progress.$lte = max; // Less than or equal to
      }
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

    // Build sort object based on query parameters
    // Default: sort by lastUpdated descending
    const sortField = sortBy || 'lastUpdated';
    const sortOrder = order === 'asc' ? 1 : -1; // 1 = ascending, -1 = descending
    const sortObject = { [sortField]: sortOrder };

    // Find users with filter, pagination, and sorting
    const users = await User.find(filter)
      // Populate country details
      .populate('country', 'countryName countryCode')
      // Sort based on query parameters
      // Examples: { lastUpdated: -1 }, { progress: 1 }, { createdAt: -1 }
      .sort(sortObject)
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
      filters: {
        status: status || null,
        country: country || null,
        minProgress: minProgress || null,
        maxProgress: maxProgress || null,
        search: search || null,
        sortBy: sortField,
        order: order,
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
    // Include OCR text and AI-generated fields for admin review
    const documents = await Document.find({ userId: user._id }).sort({
      uploadDate: -1,
    });

    // Format documents with OCR text and AI fields
    // Convert aiFields Map to plain object for JSON response
    const formattedDocuments = documents.map((doc) => {
      return {
        _id: doc._id,
        docType: doc.docType,
        fileURL: doc.fileURL,
        originalFilename: doc.originalFilename,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadDate: doc.uploadDate,
        status: doc.status,

        // OCR data
        ocrText: doc.ocrText || null, // Include full OCR text for admin
        ocrStatus: doc.ocrStatus,
        ocrError: doc.ocrError,

        // AI data
        aiSummary: doc.aiSummary || null,
        aiFields: doc.aiFields ? Object.fromEntries(doc.aiFields) : {},
        aiStatus: doc.aiStatus,
        aiError: doc.aiError,

        // Verification data
        verificationStatus: doc.verificationStatus,
        adminNotes: doc.adminNotes,

        // Timestamps
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    // Get email logs for this user (last 20)
    const emailLogs = await EmailLog.find({ userId: user._id })
      .sort({ sentAt: -1 })
      .limit(20);

    // Calculate document statistics
    const stats = {
      totalDocuments: documents.length,
      completedDocuments: documents.filter((doc) => doc.status === 'completed').length,
      pendingDocuments: documents.filter((doc) => doc.status === 'processing' || doc.status === 'uploaded').length,
      failedDocuments: documents.filter((doc) => doc.status === 'failed').length,
      verifiedDocuments: documents.filter((doc) => doc.verificationStatus === 'verified').length,
      unverifiedDocuments: documents.filter((doc) => doc.verificationStatus === 'unverified').length,
      rejectedDocuments: documents.filter((doc) => doc.verificationStatus === 'rejected').length,
    };

    // Return 200 OK with user details, documents (with OCR), and email logs
    res.status(200).json({
      success: true,
      data: {
        user,
        documents: formattedDocuments, // Documents with OCR text included
        emailLogs,
        stats,
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

/**
 * @desc    Get analytics data (users per country and completion stats)
 * @route   GET /api/admin/analytics
 * @access  Private/Admin
 * @returns Total users per country and completion percentage distribution
 */
const getAnalytics = async (req, res) => {
  try {
    // Log analytics request
    console.log('📊 Admin analytics request');

    // 1. Get total users per country with detailed aggregation
    const usersByCountry = await User.aggregate([
      {
        // Group by country field
        $group: {
          _id: '$country', // Group by country ObjectId
          totalUsers: { $sum: 1 }, // Count users
          averageProgress: { $avg: '$progress' }, // Average completion %
          // Count users by status within each country
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          underReview: {
            $sum: { $cond: [{ $eq: ['$status', 'under-review'] }, 1, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
        },
      },
      {
        // Lookup country details from countries collection
        $lookup: {
          from: 'countries', // MongoDB collection name (pluralized)
          localField: '_id',
          foreignField: '_id',
          as: 'countryInfo',
        },
      },
      {
        // Unwind country array (converts array to object)
        $unwind: {
          path: '$countryInfo',
          preserveNullAndEmptyArrays: true, // Keep users even if country not found
        },
      },
      {
        // Project final shape of data
        $project: {
          _id: 0, // Exclude MongoDB _id
          countryId: '$_id',
          countryName: { $ifNull: ['$countryInfo.countryName', 'Unknown'] },
          countryCode: { $ifNull: ['$countryInfo.countryCode', 'XX'] },
          totalUsers: 1,
          averageProgress: { $round: ['$averageProgress', 2] }, // Round to 2 decimals
          statusBreakdown: {
            pending: '$pending',
            inProgress: '$inProgress',
            underReview: '$underReview',
            approved: '$approved',
            rejected: '$rejected',
          },
        },
      },
      {
        // Sort by total users descending (most popular countries first)
        $sort: { totalUsers: -1 },
      },
    ]);

    // 2. Get completion percentage distribution
    // Group users by progress ranges (0-20%, 21-40%, etc.)
    const completionStats = await User.aggregate([
      {
        // Create progress range buckets
        $bucket: {
          groupBy: '$progress', // Field to bucket
          boundaries: [0, 20, 40, 60, 80, 100, 101], // Define ranges
          default: 'other', // Users outside boundaries
          output: {
            count: { $sum: 1 }, // Count users in each range
            users: {
              // Sample users in this range
              $push: {
                id: '$_id',
                name: '$name',
                progress: '$progress',
                status: '$status',
              },
            },
          },
        },
      },
      {
        // Project with readable labels
        $project: {
          _id: 0,
          range: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 0] }, then: '0-20%' },
                { case: { $eq: ['$_id', 20] }, then: '21-40%' },
                { case: { $eq: ['$_id', 40] }, then: '41-60%' },
                { case: { $eq: ['$_id', 60] }, then: '61-80%' },
                { case: { $eq: ['$_id', 80] }, then: '81-99%' },
                { case: { $eq: ['$_id', 100] }, then: '100%' },
              ],
              default: 'other',
            },
          },
          count: 1,
          percentage: {
            $multiply: [
              { $divide: ['$count', { $literal: await User.countDocuments() }] },
              100,
            ],
          },
          // Only include first 5 sample users (for brevity)
          sampleUsers: { $slice: ['$users', 5] },
        },
      },
      {
        // Sort by range
        $sort: { range: 1 },
      },
    ]);

    // 3. Get overall statistics
    const totalUsers = await User.countDocuments();

    const overallStats = await User.aggregate([
      {
        $group: {
          _id: null,
          averageProgress: { $avg: '$progress' },
          minProgress: { $min: '$progress' },
          maxProgress: { $max: '$progress' },
        },
      },
    ]);

    // 4. Get completion trends (users by progress, grouped)
    const progressDistribution = await User.aggregate([
      {
        $group: {
          _id: '$progress', // Group by exact progress value
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 }, // Sort by progress ascending
      },
    ]);

    // 5. Calculate percentage of users who completed (100% progress)
    const fullyCompletedUsers = await User.countDocuments({ progress: 100 });
    const completionRate = totalUsers > 0 ? ((fullyCompletedUsers / totalUsers) * 100).toFixed(2) : 0;

    // Return 200 OK with comprehensive analytics
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        // Overview statistics
        overview: {
          totalUsers,
          averageProgress: Math.round(overallStats[0]?.averageProgress || 0),
          minProgress: overallStats[0]?.minProgress || 0,
          maxProgress: overallStats[0]?.maxProgress || 0,
          fullyCompletedUsers,
          completionRate: parseFloat(completionRate),
        },

        // Users per country
        usersByCountry,

        // Completion stats by range
        completionStats,

        // Detailed progress distribution (all values)
        progressDistribution: progressDistribution.slice(0, 20), // Limit to first 20 for brevity
      },
    });
  } catch (error) {
    // Log error
    console.error('Get analytics error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics',
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
  getAnalytics, // New analytics endpoint
  deleteUser,
};
