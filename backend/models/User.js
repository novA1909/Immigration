const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Represents an immigration client in the system
 * Tracks their personal info, progress, and immigration status
 */
const userSchema = new mongoose.Schema(
  {
    // Full name of the immigration client
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    // Email for authentication and notifications
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },

    // Country of immigration destination (references Country model)
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country',
      required: [true, 'Country is required'],
    },

    // Hashed password for authentication
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default in queries
    },

    // Overall progress percentage (0-100)
    // Calculated based on uploaded documents vs required documents
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100'],
    },

    // Last time user data or documents were updated
    // Used for tracking activity and sending reminders
    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    // Current immigration application status
    status: {
      type: String,
      enum: {
        values: ['pending', 'in-progress', 'under-review', 'approved', 'rejected'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
    },

    // Track if user has verified their email
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // User role for access control
    role: {
      type: String,
      enum: ['client', 'admin'],
      default: 'client',
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Convert to JSON and remove sensitive fields
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for faster email lookups during authentication
userSchema.index({ email: 1 });

// Index for filtering users by status
userSchema.index({ status: 1 });

// Index for sorting by last updated
userSchema.index({ lastUpdated: -1 });

/**
 * Pre-save middleware to hash password before saving
 * Only hashes if password is modified (new user or password change)
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Update lastUpdated timestamp before saving
 */
userSchema.pre('save', function (next) {
  this.lastUpdated = Date.now();
  next();
});

/**
 * Method to compare password during login
 * @param {string} candidatePassword - Password provided by user
 * @returns {Promise<boolean>} - True if password matches
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Virtual field to get all documents for this user
 * Not stored in DB, computed on demand
 */
userSchema.virtual('documents', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'userId',
});

/**
 * Static method to calculate and update user progress
 * @param {ObjectId} userId - User ID to update
 * @returns {Promise<number>} - Updated progress percentage
 */
userSchema.statics.updateProgress = async function (userId) {
  const User = this;
  const Country = mongoose.model('Country');
  const Document = mongoose.model('Document');

  try {
    // Get user with country info
    const user = await User.findById(userId).populate('country');
    if (!user) throw new Error('User not found');

    // Get required documents for user's country
    const country = await Country.findById(user.country);
    if (!country || !country.requiredDocuments.length) {
      return 0;
    }

    // Get user's uploaded documents
    const userDocuments = await Document.find({ userId });
    const uploadedTypes = new Set(userDocuments.map((doc) => doc.docType));

    // Calculate progress
    const requiredCount = country.requiredDocuments.length;
    const uploadedCount = country.requiredDocuments.filter((docType) =>
      uploadedTypes.has(docType)
    ).length;

    const progress = Math.round((uploadedCount / requiredCount) * 100);

    // Update user progress
    user.progress = progress;
    await user.save();

    return progress;
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
