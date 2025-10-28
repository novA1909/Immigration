// Import required models
const Document = require('../models/Document');
const User = require('../models/User');
const Country = require('../models/Country');

// Import cloudinary for file upload and management
const cloudinary = require('cloudinary').v2;

// Import Tesseract.js for OCR (Optical Character Recognition)
const Tesseract = require('tesseract.js');

// Import node-fetch for downloading images from URLs
const fetch = require('node-fetch');

/**
 * @desc    Upload document to Cloudinary and create document record
 * @route   POST /api/documents/upload
 * @access  Private (requires authentication)
 * @expects Multipart form data with file
 */
const uploadDocument = async (req, res) => {
  try {
    // Extract document type from request body
    const { docType } = req.body;

    // Validate that document type is provided
    if (!docType) {
      // Return 400 Bad Request
      return res.status(400).json({
        success: false,
        message: 'Document type is required',
      });
    }

    // Check if file was uploaded
    // req.file is set by multer middleware (should be configured in routes)
    if (!req.file) {
      // Return 400 Bad Request if no file
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    // Get user's country to validate document type
    const user = await User.findById(req.user._id).populate('country');

    // Check if document type is required for user's country
    if (!user.country.isDocumentRequired(docType)) {
      // Return 400 Bad Request if document not required
      return res.status(400).json({
        success: false,
        message: `${docType} is not required for ${user.country.countryName}`,
      });
    }

    // Upload file to Cloudinary
    // Use upload stream for buffer data from multer
    const uploadResult = await new Promise((resolve, reject) => {
      // Create upload stream to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          // Specify folder in Cloudinary for organization
          folder: `immigration/${req.user._id}/${docType}`,
          // Resource type: image, video, raw (PDF), auto
          resource_type: 'auto',
          // Add tags for easier searching
          tags: [docType, req.user._id.toString()],
        },
        (error, result) => {
          // Callback function after upload completes
          if (error) {
            // Reject promise if upload fails
            reject(error);
          } else {
            // Resolve promise with upload result
            resolve(result);
          }
        }
      );

      // Pipe file buffer to upload stream
      uploadStream.end(req.file.buffer);
    });

    // Create document record in database
    const document = await Document.create({
      // User ID from authenticated request
      userId: req.user._id,
      // Document type from request body
      docType,
      // Cloudinary secure URL (HTTPS)
      fileURL: uploadResult.secure_url,
      // Cloudinary public ID for file management (update/delete)
      cloudinaryId: uploadResult.public_id,
      // Original filename from uploaded file
      originalFilename: req.file.originalname,
      // File size in bytes
      fileSize: req.file.size,
      // MIME type (image/jpeg, application/pdf, etc.)
      mimeType: req.file.mimetype,
      // Initial status
      status: 'uploaded',
    });

    // Trigger OCR processing in background (don't wait for it)
    // Using setImmediate to process after response is sent
    setImmediate(() => {
      // Call OCR function asynchronously
      processOCR(document._id);
    });

    // Return 201 Created with document data
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. OCR processing started.',
      data: {
        document,
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Upload document error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error uploading document',
      error: error.message,
    });
  }
};

/**
 * @desc    Process OCR on uploaded document
 * @param   {ObjectId} documentId - Document ID to process
 * @access  Internal function (not an API endpoint)
 */
const processOCR = async (documentId) => {
  try {
    // Find document by ID
    const document = await Document.findById(documentId);

    // Check if document exists
    if (!document) {
      console.error('Document not found for OCR processing');
      return;
    }

    // Update OCR status to processing
    document.ocrStatus = 'processing';
    document.status = 'processing';
    await document.save();

    // Download image from Cloudinary URL
    // Tesseract needs image buffer or local path
    const response = await fetch(document.fileURL);
    const imageBuffer = await response.buffer();

    // Run OCR using Tesseract.js
    // recognize() extracts text from image
    const ocrResult = await Tesseract.recognize(
      imageBuffer, // Image data
      'eng', // Language (eng = English, can use 'eng+spa' for multiple)
      {
        // Logger for progress tracking
        logger: (info) => {
          console.log(`OCR Progress for ${documentId}:`, info.status, info.progress);
        },
      }
    );

    // Extract text from OCR result
    // ocrResult.data.text contains the recognized text
    const extractedText = ocrResult.data.text;

    // Update document with OCR results
    document.ocrText = extractedText;
    document.ocrStatus = 'completed';
    await document.save();

    console.log(`✅ OCR completed for document ${documentId}`);

    // Trigger AI processing after OCR completes
    // Import AI controller function
    const { processAIExtraction } = require('./ai.controller');
    // Call AI processing in background
    setImmediate(() => {
      processAIExtraction(documentId);
    });
  } catch (error) {
    // Log error
    console.error('OCR processing error:', error);

    // Update document with error status
    try {
      const document = await Document.findById(documentId);
      if (document) {
        document.ocrStatus = 'failed';
        document.ocrError = error.message;
        document.status = 'failed';
        await document.save();
      }
    } catch (updateError) {
      console.error('Error updating document status:', updateError);
    }
  }
};

/**
 * @desc    Get all documents for authenticated user
 * @route   GET /api/documents
 * @access  Private
 */
const getUserDocuments = async (req, res) => {
  try {
    // Find all documents for authenticated user
    // Sort by upload date (newest first)
    const documents = await Document.find({ userId: req.user._id }).sort({ uploadDate: -1 });

    // Return 200 OK with documents array
    res.status(200).json({
      success: true,
      count: documents.length,
      data: {
        documents,
      },
    });
  } catch (error) {
    // Log error
    console.error('Get documents error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching documents',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single document by ID
 * @route   GET /api/documents/:id
 * @access  Private
 */
const getDocumentById = async (req, res) => {
  try {
    // Find document by ID from URL parameter
    const document = await Document.findById(req.params.id);

    // Check if document exists
    if (!document) {
      // Return 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check if document belongs to authenticated user
    // document.userId is ObjectId, req.user._id is ObjectId
    // Use .toString() to compare as strings
    if (document.userId.toString() !== req.user._id.toString()) {
      // Return 403 Forbidden if user doesn't own document
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this document',
      });
    }

    // Return 200 OK with document data
    res.status(200).json({
      success: true,
      data: {
        document,
      },
    });
  } catch (error) {
    // Log error
    console.error('Get document error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching document',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete document
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
const deleteDocument = async (req, res) => {
  try {
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

    // Check if document belongs to authenticated user
    if (document.userId.toString() !== req.user._id.toString()) {
      // Return 403 Forbidden
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this document',
      });
    }

    // Delete file from Cloudinary
    // Use cloudinary.uploader.destroy() with public_id
    await cloudinary.uploader.destroy(document.cloudinaryId);

    // Delete document from database
    // Use deleteOne() or remove()
    await document.deleteOne();

    // User progress will be automatically updated by Document model's pre-remove middleware

    // Return 200 OK
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    // Log error
    console.error('Delete document error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error deleting document',
      error: error.message,
    });
  }
};

/**
 * @desc    Get user's document checklist
 * @route   GET /api/documents/checklist
 * @access  Private
 */
const getDocumentChecklist = async (req, res) => {
  try {
    // Get user with country information
    const user = await User.findById(req.user._id).populate('country');

    // Check if user has country assigned
    if (!user.country) {
      // Return 400 Bad Request
      return res.status(400).json({
        success: false,
        message: 'User does not have a country assigned',
      });
    }

    // Get checklist using Country model method
    const checklist = await user.country.getChecklistForUser(req.user._id);

    // Return 200 OK with checklist
    res.status(200).json({
      success: true,
      data: {
        country: {
          _id: user.country._id,
          countryName: user.country.countryName,
          countryCode: user.country.countryCode,
        },
        progress: user.progress,
        checklist,
      },
    });
  } catch (error) {
    // Log error
    console.error('Get checklist error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching checklist',
      error: error.message,
    });
  }
};

/**
 * @desc    Retry OCR processing for failed document
 * @route   POST /api/documents/:id/retry-ocr
 * @access  Private
 */
const retryOCR = async (req, res) => {
  try {
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

    // Check if document belongs to authenticated user
    if (document.userId.toString() !== req.user._id.toString()) {
      // Return 403 Forbidden
      return res.status(403).json({
        success: false,
        message: 'Not authorized to retry OCR for this document',
      });
    }

    // Reset OCR status
    document.ocrStatus = 'pending';
    document.ocrError = null;
    await document.save();

    // Trigger OCR processing
    setImmediate(() => {
      processOCR(document._id);
    });

    // Return 200 OK
    res.status(200).json({
      success: true,
      message: 'OCR processing restarted',
    });
  } catch (error) {
    // Log error
    console.error('Retry OCR error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error retrying OCR',
      error: error.message,
    });
  }
};

// Export all controller functions
module.exports = {
  uploadDocument,
  processOCR,
  getUserDocuments,
  getDocumentById,
  deleteDocument,
  getDocumentChecklist,
  retryOCR,
};
