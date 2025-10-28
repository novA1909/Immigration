const mongoose = require('mongoose');

/**
 * Country Schema
 * Represents immigration destination countries
 * Stores required documents list for each country
 * Used to calculate user progress and validate document uploads
 */
const countrySchema = new mongoose.Schema(
  {
    // Name of the immigration destination country
    countryName: {
      type: String,
      required: [true, 'Country name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Country name must be at least 2 characters'],
      maxlength: [100, 'Country name cannot exceed 100 characters'],
    },

    // ISO country code (e.g., "US", "CA", "UK", "AU")
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Country code must be 2 characters'],
      maxlength: [2, 'Country code must be 2 characters'],
    },

    // Array of required document types for immigration to this country
    // Must match the enum values in Document model's docType field
    // Used to:
    // 1. Display checklist to users
    // 2. Calculate progress percentage
    // 3. Validate document uploads
    requiredDocuments: {
      type: [
        {
          type: String,
          enum: [
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
        },
      ],
      validate: {
        validator: function (docs) {
          return docs.length > 0;
        },
        message: 'At least one required document must be specified',
      },
      required: [true, 'Required documents list is required'],
    },

    // Human-readable description of each document type
    // Helps users understand what each document is
    documentDescriptions: {
      type: Map,
      of: String,
      default: new Map(),
      // Example structure:
      // {
      //   "passport": "Valid passport with at least 6 months validity",
      //   "birth-certificate": "Original or certified copy of birth certificate",
      //   "police-clearance": "Police clearance certificate from country of residence"
      // }
    },

    // Processing time estimate in days
    processingTimeDays: {
      type: Number,
      min: [1, 'Processing time must be at least 1 day'],
      max: [730, 'Processing time cannot exceed 2 years'],
      default: 90,
    },

    // Application fees in USD
    applicationFee: {
      type: Number,
      min: [0, 'Application fee cannot be negative'],
      default: 0,
    },

    // Additional requirements or notes
    additionalRequirements: {
      type: String,
      maxlength: [2000, 'Additional requirements too long'],
      default: '',
    },

    // Country-specific immigration website URL
    officialWebsite: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+/,
        'Please provide a valid URL',
      ],
    },

    // Contact email for immigration queries
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },

    // Whether this country is currently accepting applications
    isActive: {
      type: Boolean,
      default: true,
    },

    // Popularity ranking (for sorting in UI)
    popularityRank: {
      type: Number,
      default: 999,
      min: [1, 'Rank must be positive'],
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Convert Map to plain object in JSON responses
    toJSON: {
      transform: function (doc, ret) {
        if (ret.documentDescriptions instanceof Map) {
          ret.documentDescriptions = Object.fromEntries(ret.documentDescriptions);
        }
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        if (ret.documentDescriptions instanceof Map) {
          ret.documentDescriptions = Object.fromEntries(ret.documentDescriptions);
        }
        return ret;
      },
    },
  }
);

// Index for faster country name lookups
countrySchema.index({ countryName: 1 });

// Index for country code lookups
countrySchema.index({ countryCode: 1 });

// Index for filtering active countries and sorting by popularity
countrySchema.index({ isActive: 1, popularityRank: 1 });

/**
 * Static method to get all active countries sorted by popularity
 * @returns {Promise<Array>} - Active countries
 */
countrySchema.statics.getActiveCountries = async function () {
  return this.find({ isActive: true }).sort({ popularityRank: 1 });
};

/**
 * Static method to find country by code
 * @param {string} code - Country code (e.g., "US")
 * @returns {Promise<Object>} - Country document
 */
countrySchema.statics.findByCode = async function (code) {
  return this.findOne({ countryCode: code.toUpperCase() });
};

/**
 * Instance method to get user count for this country
 * @returns {Promise<number>} - Number of users immigrating to this country
 */
countrySchema.methods.getUserCount = async function () {
  const User = mongoose.model('User');
  return await User.countDocuments({ country: this._id });
};

/**
 * Instance method to check if a document type is required
 * @param {string} docType - Document type to check
 * @returns {boolean} - True if document is required for this country
 */
countrySchema.methods.isDocumentRequired = function (docType) {
  return this.requiredDocuments.includes(docType);
};

/**
 * Instance method to get checklist for user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Array>} - Checklist with completion status
 */
countrySchema.methods.getChecklistForUser = async function (userId) {
  const Document = mongoose.model('Document');

  // Get user's uploaded documents
  const userDocuments = await Document.find({ userId });
  const uploadedTypes = new Set(userDocuments.map((doc) => doc.docType));

  // Build checklist
  return this.requiredDocuments.map((docType) => ({
    docType,
    description: this.documentDescriptions.get(docType) || '',
    completed: uploadedTypes.has(docType),
    document: userDocuments.find((doc) => doc.docType === docType) || null,
  }));
};

/**
 * Static method to seed initial country data
 * Useful for setting up the database with common immigration destinations
 */
countrySchema.statics.seedCountries = async function () {
  const countries = [
    {
      countryName: 'United States',
      countryCode: 'US',
      requiredDocuments: [
        'passport',
        'birth-certificate',
        'photos',
        'visa-application',
        'sponsor-letter',
        'bank-statement',
      ],
      processingTimeDays: 180,
      applicationFee: 535,
      popularityRank: 1,
    },
    {
      countryName: 'Canada',
      countryCode: 'CA',
      requiredDocuments: [
        'passport',
        'birth-certificate',
        'educational-certificate',
        'employment-letter',
        'bank-statement',
        'police-clearance',
        'medical-certificate',
        'photos',
      ],
      processingTimeDays: 240,
      applicationFee: 1325,
      popularityRank: 2,
    },
    {
      countryName: 'United Kingdom',
      countryCode: 'GB',
      requiredDocuments: [
        'passport',
        'birth-certificate',
        'employment-letter',
        'bank-statement',
        'photos',
      ],
      processingTimeDays: 90,
      applicationFee: 625,
      popularityRank: 3,
    },
    {
      countryName: 'Australia',
      countryCode: 'AU',
      requiredDocuments: [
        'passport',
        'birth-certificate',
        'educational-certificate',
        'employment-letter',
        'bank-statement',
        'police-clearance',
        'medical-certificate',
        'photos',
      ],
      processingTimeDays: 365,
      applicationFee: 4045,
      popularityRank: 4,
    },
  ];

  for (const countryData of countries) {
    await this.findOneAndUpdate(
      { countryCode: countryData.countryCode },
      countryData,
      { upsert: true, new: true }
    );
  }

  console.log('Countries seeded successfully');
};

const Country = mongoose.model('Country', countrySchema);

module.exports = Country;
