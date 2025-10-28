const mongoose = require('mongoose');

/**
 * EmailLog Schema
 * Tracks all emails sent by the system (reminders, notifications, etc.)
 * Used for:
 * 1. Preventing duplicate emails
 * 2. Debugging email delivery issues
 * 3. Analytics on email engagement
 * 4. Compliance and audit trail
 */
const emailLogSchema = new mongoose.Schema(
  {
    // Reference to the user who received the email
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true, // Index for faster queries by user
    },

    // Type of email sent
    // Used to categorize emails and prevent sending too many of the same type
    emailType: {
      type: String,
      required: [true, 'Email type is required'],
      enum: {
        values: [
          'welcome',              // Sent when user registers
          'email-verification',   // Sent to verify email address
          'password-reset',       // Sent when user requests password reset
          'daily-reminder',       // Daily reminder to upload missing documents
          'document-uploaded',    // Confirmation when document is uploaded
          'document-verified',    // Notification when admin verifies document
          'document-rejected',    // Notification when admin rejects document
          'progress-update',      // Weekly progress update
          'application-approved', // Notification when application is approved
          'application-rejected', // Notification when application is rejected
          'deadline-warning',     // Warning about upcoming deadlines
          'custom',               // Custom admin-sent email
        ],
        message: '{VALUE} is not a valid email type',
      },
    },

    // Recipient email address
    // Stored separately from user in case user changes their email
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },

    // Email subject line
    subject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },

    // Email body content (can be HTML or plain text)
    body: {
      type: String,
      required: [true, 'Email body is required'],
      maxlength: [10000, 'Email body too long'],
    },

    // Whether the email contains HTML
    isHtml: {
      type: Boolean,
      default: true,
    },

    // When the email was sent
    sentAt: {
      type: Date,
      default: Date.now,
      index: true, // Index for sorting and filtering by date
    },

    // Email delivery status
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'sent', 'failed', 'bounced'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
    },

    // Error message if email failed to send
    errorMessage: {
      type: String,
      default: null,
      maxlength: [1000, 'Error message too long'],
    },

    // NodeMailer response data
    // Contains messageId, response, and other transport-specific info
    mailerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Number of retry attempts if sending failed
    retryCount: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative'],
      max: [5, 'Maximum 5 retry attempts allowed'],
    },

    // When the next retry should be attempted (if failed)
    nextRetryAt: {
      type: Date,
      default: null,
    },

    // Email engagement tracking
    opened: {
      type: Boolean,
      default: false,
    },

    openedAt: {
      type: Date,
      default: null,
    },

    clicked: {
      type: Boolean,
      default: false,
    },

    clickedAt: {
      type: Date,
      default: null,
    },

    // Additional metadata (e.g., which documents were mentioned in reminder)
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
      // Example structure for daily-reminder:
      // {
      //   "missingDocuments": ["passport", "birth-certificate"],
      //   "progress": 60,
      //   "daysInactive": 5
      // }
    },

    // Priority level for sending (high priority emails sent first)
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },

    // Track if this email is part of a batch send
    batchId: {
      type: String,
      default: null,
      index: true, // Index for batch operations
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Convert Map to plain object in JSON responses
    toJSON: {
      transform: function (doc, ret) {
        if (ret.metadata instanceof Map) {
          ret.metadata = Object.fromEntries(ret.metadata);
        }
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        if (ret.metadata instanceof Map) {
          ret.metadata = Object.fromEntries(ret.metadata);
        }
        return ret;
      },
    },
  }
);

// Compound index for finding user's email history sorted by date
emailLogSchema.index({ userId: 1, sentAt: -1 });

// Index for filtering by email type
emailLogSchema.index({ emailType: 1 });

// Index for filtering by status
emailLogSchema.index({ status: 1 });

// Compound index for retry queue (failed emails that need retry)
emailLogSchema.index({ status: 1, nextRetryAt: 1 });

// Index for batch operations
emailLogSchema.index({ batchId: 1 });

/**
 * Static method to create and log an email
 * @param {Object} emailData - Email data object
 * @returns {Promise<Object>} - Created email log
 */
emailLogSchema.statics.logEmail = async function (emailData) {
  const emailLog = new this(emailData);
  await emailLog.save();
  return emailLog;
};

/**
 * Static method to check if user received an email type today
 * Prevents sending duplicate daily reminders
 * @param {ObjectId} userId - User ID
 * @param {string} emailType - Email type to check
 * @returns {Promise<boolean>} - True if email was sent today
 */
emailLogSchema.statics.sentTodayToUser = async function (userId, emailType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await this.countDocuments({
    userId,
    emailType,
    sentAt: { $gte: today },
    status: 'sent',
  });

  return count > 0;
};

/**
 * Static method to get emails pending retry
 * Used by background job to retry failed emails
 * @returns {Promise<Array>} - Emails that need retry
 */
emailLogSchema.statics.getPendingRetries = async function () {
  const now = new Date();

  return this.find({
    status: 'failed',
    retryCount: { $lt: 5 },
    nextRetryAt: { $lte: now },
  })
    .populate('userId', 'name email')
    .limit(50);
};

/**
 * Static method to get email statistics
 * @param {Date} startDate - Start date for statistics
 * @param {Date} endDate - End date for statistics
 * @returns {Promise<Object>} - Statistics object
 */
emailLogSchema.statics.getStatistics = async function (startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        sentAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          status: '$status',
          emailType: '$emailType',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Calculate engagement metrics
  const engagement = await this.aggregate([
    {
      $match: {
        sentAt: { $gte: startDate, $lte: endDate },
        status: 'sent',
      },
    },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        totalOpened: { $sum: { $cond: ['$opened', 1, 0] } },
        totalClicked: { $sum: { $cond: ['$clicked', 1, 0] } },
      },
    },
  ]);

  return {
    byStatusAndType: stats,
    engagement: engagement[0] || { totalSent: 0, totalOpened: 0, totalClicked: 0 },
  };
};

/**
 * Instance method to mark email as sent
 * @param {Object} mailerResponse - Response from NodeMailer
 * @returns {Promise<void>}
 */
emailLogSchema.methods.markAsSent = async function (mailerResponse) {
  this.status = 'sent';
  this.sentAt = new Date();
  this.mailerResponse = mailerResponse;
  this.errorMessage = null;
  await this.save();
};

/**
 * Instance method to mark email as failed and schedule retry
 * @param {string} errorMessage - Error message
 * @returns {Promise<void>}
 */
emailLogSchema.methods.markAsFailed = async function (errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.retryCount += 1;

  // Calculate exponential backoff for retry (2^retryCount minutes)
  const backoffMinutes = Math.pow(2, this.retryCount);
  this.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

  await this.save();
};

/**
 * Instance method to mark email as opened
 * @returns {Promise<void>}
 */
emailLogSchema.methods.markAsOpened = async function () {
  if (!this.opened) {
    this.opened = true;
    this.openedAt = new Date();
    await this.save();
  }
};

/**
 * Instance method to mark email as clicked
 * @returns {Promise<void>}
 */
emailLogSchema.methods.markAsClicked = async function () {
  if (!this.clicked) {
    this.clicked = true;
    this.clickedAt = new Date();
    await this.save();
  }
};

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
