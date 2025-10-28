const mongoose = require('mongoose');

/**
 * Document Schema
 * Represents uploaded immigration documents
 * Stores file metadata, OCR text, and AI-extracted information
 * Core part of the OCR → Claude → Dashboard flow
 */
const documentSchema = new mongoose.Schema(
  {
    // Reference to the user who owns this document
    // Used for filtering and displaying user-specific documents
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true, // Index for faster queries by user
    },

    // Type of document (passport, birth certificate, etc.)
    // Must match one of the required documents from Country model
    docType: {
      type: String,
      required: [true, 'Document type is required'],
      trim: true,
      enum: {
        values: [
          'passport',
          'birth-certificate',
          'marriage-certificate',
          'educational-certificate',
          'employment-letter',
          'bank-statement',
          'police-clearance',
          'medical-certificate',
          'photos',
          'visa-application',
          'sponsor-letter',
          'other',
        ],
        message: '{VALUE} is not a valid document type',
      },
    },

    // Cloudinary URL where the actual file is stored
    // Contains the publicly accessible link to the uploaded document
    fileURL: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true,
      match: [
        /^https?:\/\/.+/,
        'Please provide a valid URL',
      ],
    },

    // Cloudinary public ID for file management
    // Used to delete or update files in Cloudinary
    cloudinaryId: {
      type: String,
      required: [true, 'Cloudinary ID is required'],
    },

    // Original filename uploaded by user
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
    },

    // File size in bytes
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },

    // MIME type of the uploaded file
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },

    // Raw text extracted from the document using Tesseract.js OCR
    // Step 1 in the OCR → Claude → Dashboard flow
    ocrText: {
      type: String,
      default: '',
      maxlength: [50000, 'OCR text too long'],
    },

    // OCR processing status
    ocrStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },

    // Error message if OCR fails
    ocrError: {
      type: String,
      default: null,
    },

    // AI-generated summary of the document content using Claude 3.5 Sonnet
    // Step 2 in the OCR → Claude → Dashboard flow
    // Provides a human-readable overview of what the document contains
    aiSummary: {
      type: String,
      default: '',
      maxlength: [2000, 'AI summary too long'],
    },

    // Structured data extracted from the document by Claude AI
    // Step 3 in the OCR → Claude → Dashboard flow
    // Contains key-value pairs of important information (name, date, ID numbers, etc.)
    // Displayed in the dashboard for quick reference
    aiFields: {
      type: Map,
      of: String,
      default: new Map(),
      // Example structure:
      // {
      //   "fullName": "John Doe",
      //   "passportNumber": "AB1234567",
      //   "dateOfBirth": "1990-01-15",
      //   "expiryDate": "2030-01-15",
      //   "nationality": "USA"
      // }
    },

    // AI processing status
    aiStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },

    // Error message if AI processing fails
    aiError: {
      type: String,
      default: null,
    },

    // When the document was uploaded
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true, // Index for sorting by upload date
    },

    // Overall document processing status
    // Reflects the combined status of upload, OCR, and AI processing
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'completed', 'failed'],
      default: 'uploaded',
    },

    // Document verification status (for admin review)
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'rejected'],
      default: 'unverified',
    },

    // Admin notes on the document
    adminNotes: {
      type: String,
      default: '',
      maxlength: [1000, 'Admin notes too long'],
    },

    // Track if this document has been included in email reminders
    includedInReminder: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Convert Map to plain object in JSON responses
    toJSON: {
      transform: function (doc, ret) {
        if (ret.aiFields instanceof Map) {
          ret.aiFields = Object.fromEntries(ret.aiFields);
        }
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        if (ret.aiFields instanceof Map) {
          ret.aiFields = Object.fromEntries(ret.aiFields);
        }
        return ret;
      },
    },
  }
);

// Compound index for efficient queries by user and document type
documentSchema.index({ userId: 1, docType: 1 });

// Index for filtering by status
documentSchema.index({ status: 1 });

// Index for admin verification workflow
documentSchema.index({ verificationStatus: 1 });

// Compound index for user's documents sorted by upload date
documentSchema.index({ userId: 1, uploadDate: -1 });

/**
 * Pre-save middleware to update user's lastUpdated timestamp
 * Whenever a document is saved, update the associated user's lastUpdated field
 */
documentSchema.pre('save', async function (next) {
  try {
    if (this.isNew || this.isModified()) {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(this.userId, {
        lastUpdated: Date.now(),
      });
    }
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Post-save middleware to update user progress
 * After a document is saved, recalculate the user's overall progress
 */
documentSchema.post('save', async function (doc) {
  try {
    const User = mongoose.model('User');
    await User.updateProgress(doc.userId);
  } catch (error) {
    console.error('Error updating user progress:', error);
  }
});

/**
 * Pre-remove middleware to update user progress after deletion
 */
documentSchema.pre('remove', async function (next) {
  try {
    const User = mongoose.model('User');
    await User.updateProgress(this.userId);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Static method to get document processing statistics
 * @returns {Promise<Object>} - Statistics object
 */
documentSchema.statics.getProcessingStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

/**
 * Static method to find documents pending AI processing
 * @returns {Promise<Array>} - Documents with OCR completed but AI pending
 */
documentSchema.statics.findPendingAIProcessing = async function () {
  return this.find({
    ocrStatus: 'completed',
    aiStatus: 'pending',
  }).populate('userId', 'name email');
};

/**
 * Instance method to check if document is fully processed
 * @returns {boolean} - True if OCR and AI processing are complete
 */
documentSchema.methods.isFullyProcessed = function () {
  return this.ocrStatus === 'completed' && this.aiStatus === 'completed';
};

/**
 * Instance method to extract key fields for dashboard display
 * @returns {Object} - Formatted data for dashboard
 */
documentSchema.methods.getDashboardData = function () {
  return {
    id: this._id,
    docType: this.docType,
    uploadDate: this.uploadDate,
    status: this.status,
    verificationStatus: this.verificationStatus,
    summary: this.aiSummary,
    fields: this.aiFields instanceof Map ? Object.fromEntries(this.aiFields) : this.aiFields,
    fileURL: this.fileURL,
  };
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
