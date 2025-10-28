// Import required models
const Document = require('../models/Document');
const User = require('../models/User');
const Country = require('../models/Country');

// Import cloudinary for file upload and management
const cloudinary = require('cloudinary').v2;

// Import OCR service for text extraction from images
// This service wraps Tesseract.js with additional features
const { extractTextFromImage } = require('../services/ocrService');

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
 * @desc    Process OCR on uploaded document using OCR service
 * @param   {ObjectId} documentId - Document ID to process
 * @access  Internal function (not an API endpoint)
 *
 * This function:
 * 1. Finds the document in database
 * 2. Downloads image from Cloudinary
 * 3. Calls OCR service to extract text
 * 4. Saves OCR results (text, confidence score)
 * 5. Triggers AI processing if OCR succeeds
 */
const processOCR = async (documentId) => {
  try {
    // Step 1: Find document by ID
    // We need the document to get the Cloudinary URL and update status
    const document = await Document.findById(documentId);

    // Validate document exists
    if (!document) {
      console.error('❌ Document not found for OCR processing');
      return;
    }

    // Log OCR start
    console.log(`🔍 Starting OCR for document: ${documentId}`);
    console.log(`📄 Document type: ${document.docType}`);
    console.log(`🔗 File URL: ${document.fileURL}`);

    // Step 2: Update document status to "processing"
    // This tells the frontend that OCR is in progress
    document.ocrStatus = 'processing';
    document.status = 'processing';
    await document.save();

    // Step 3: Call OCR service to extract text from image
    // The service handles downloading from URL, running Tesseract, and error handling
    const ocrResult = await extractTextFromImage(
      document.fileURL, // Cloudinary URL (service will download it)
      {
        // Language for OCR (default: English)
        // Can use 'spa' for Spanish, 'fra' for French, etc.
        // Can use multiple: 'eng+spa' for English and Spanish
        language: 'eng',

        // Progress callback - logs OCR progress to console
        onProgress: (info) => {
          // info contains: { status, progress }
          // status: Current operation (loading, recognizing, etc.)
          // progress: Progress value (0 to 1)

          // Only log important updates to avoid console spam
          if (info.status === 'recognizing text') {
            const percent = Math.round(info.progress * 100);
            console.log(`⚙️  OCR Progress [${documentId}]: ${percent}%`);
          }
        },
      }
    );

    // Step 4: Check if OCR was successful
    if (!ocrResult.success) {
      // OCR failed - throw error to trigger catch block
      throw new Error(
        ocrResult.error?.message || 'OCR processing failed without error message'
      );
    }

    // Log OCR success with confidence score
    console.log(`✅ OCR completed for document ${documentId}`);
    console.log(`📊 Confidence Score: ${ocrResult.confidence.toFixed(2)}%`);
    console.log(`📝 Extracted ${ocrResult.stats.wordCount} words`);
    console.log(`📏 Character count: ${ocrResult.stats.characterCount}`);

    // Check if OCR quality is acceptable
    // Low confidence might indicate poor image quality or wrong language
    if (!ocrResult.isHighQuality) {
      console.warn(
        `⚠️  Low OCR confidence (${ocrResult.confidence.toFixed(2)}%). Consider manual review.`
      );
    }

    // Step 5: Save OCR results to document
    // Store extracted text in document for AI processing
    document.ocrText = ocrResult.text;

    // Save confidence score in adminNotes for reference
    // This helps admins assess OCR quality
    const confidenceNote = `OCR Confidence: ${ocrResult.confidence.toFixed(2)}% | Words: ${ocrResult.stats.wordCount} | Quality: ${ocrResult.isHighQuality ? 'High' : 'Low'}`;

    // Append to existing admin notes or create new
    if (document.adminNotes) {
      document.adminNotes += `\n${confidenceNote}`;
    } else {
      document.adminNotes = confidenceNote;
    }

    // Update OCR status to completed
    document.ocrStatus = 'completed';

    // Clear any previous OCR error
    document.ocrError = null;

    // Save document with OCR results
    await document.save();

    // Step 6: Trigger AI processing after successful OCR
    // AI processing uses the extracted text to generate summary and extract fields
    console.log(`🤖 Triggering AI processing for document ${documentId}`);

    // Import AI controller function
    const { processAIExtraction } = require('./ai.controller');

    // Call AI processing in background (non-blocking)
    // Using setImmediate ensures this runs after current operation completes
    setImmediate(() => {
      processAIExtraction(documentId);
    });

    // Log completion
    console.log(`🎉 OCR pipeline completed for document ${documentId}`);
  } catch (error) {
    // OCR processing failed - log detailed error
    console.error('❌ OCR processing error:', error.message);
    console.error('Stack trace:', error.stack);

    // Update document with error status
    // This allows user to see what went wrong and retry if needed
    try {
      // Re-fetch document in case it changed
      const document = await Document.findById(documentId);

      if (document) {
        // Set OCR status to failed
        document.ocrStatus = 'failed';

        // Store error message for user/admin reference
        document.ocrError = error.message;

        // Set overall document status to failed
        document.status = 'failed';

        // Save error state
        await document.save();

        console.log(`💾 Document ${documentId} marked as failed`);
      } else {
        console.error('Cannot update document status: document not found');
      }
    } catch (updateError) {
      // Error updating error status (rare, but possible)
      console.error('Error updating document status:', updateError.message);
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
