// Import Express router
const express = require('express');

// Create router instance
const router = express.Router();

// Import multer for handling multipart/form-data (file uploads)
const multer = require('multer');

// Import controller functions
const {
  uploadDocument,
  getUserDocuments,
  getDocumentById,
  deleteDocument,
  getDocumentChecklist,
  retryOCR,
} = require('../controllers/document.controller');

// Import middleware
const { protect } = require('../middleware/auth');

/**
 * Configure multer for file uploads
 * Using memory storage to keep files in buffer (not save to disk)
 * Files will be uploaded directly to Cloudinary from memory
 */
const storage = multer.memoryStorage();
// memoryStorage keeps file in memory as Buffer
// Accessible via req.file.buffer in controller

/**
 * File filter function
 * Validates file types before upload
 * Only allows images and PDFs
 */
const fileFilter = (req, file, cb) => {
  // Get file MIME type from uploaded file
  const allowedTypes = [
    'image/jpeg',      // .jpg, .jpeg
    'image/png',       // .png
    'image/gif',       // .gif
    'image/webp',      // .webp
    'application/pdf', // .pdf
  ];

  // Check if file MIME type is in allowed list
  if (allowedTypes.includes(file.mimetype)) {
    // Accept file (null = no error, true = accept)
    cb(null, true);
  } else {
    // Reject file with error message
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF files are allowed.'
      ),
      false
    );
  }
};

/**
 * Configure multer upload with storage and file filter
 */
const upload = multer({
  // Storage configuration (memory storage)
  storage: storage,

  // File filter for validation
  fileFilter: fileFilter,

  // Limit file size to 10MB
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB in bytes
  },
});
// upload is now a middleware that can be used in routes
// upload.single('file') expects a single file with field name 'file'

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a document with OCR processing
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @body    Multipart form data:
 *          - file: Document file (image or PDF)
 *          - docType: Type of document (passport, birth-certificate, etc.)
 */
router.post('/upload', protect, upload.single('file'), uploadDocument);
// POST request to /api/documents/upload
// Middleware chain:
// 1. protect - Verify JWT token
// 2. upload.single('file') - Handle file upload (stores in req.file)
// 3. uploadDocument - Process upload and save to database
// File must be sent with field name 'file'
// docType must be sent as text field in form data

/**
 * @route   GET /api/documents
 * @desc    Get all documents for authenticated user
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 */
router.get('/', protect, getUserDocuments);
// GET request to /api/documents
// protect middleware verifies authentication
// Returns array of all user's documents

/**
 * @route   GET /api/documents/checklist
 * @desc    Get document checklist for user's country
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 */
router.get('/checklist', protect, getDocumentChecklist);
// GET request to /api/documents/checklist
// protect middleware verifies authentication
// Returns required documents list with completion status
// NOTE: This route must come BEFORE /:id route to avoid conflicts
// (otherwise 'checklist' would be treated as an ID)

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document by ID
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @params  id - Document ObjectId
 */
router.get('/:id', protect, getDocumentById);
// GET request to /api/documents/:id
// protect middleware verifies authentication
// Verifies user owns the document
// Returns single document details

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document by ID
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @params  id - Document ObjectId
 */
router.delete('/:id', protect, deleteDocument);
// DELETE request to /api/documents/:id
// protect middleware verifies authentication
// Deletes document from Cloudinary and database
// Updates user progress automatically

/**
 * @route   POST /api/documents/:id/retry-ocr
 * @desc    Retry OCR processing for failed document
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @params  id - Document ObjectId
 */
router.post('/:id/retry-ocr', protect, retryOCR);
// POST request to /api/documents/:id/retry-ocr
// protect middleware verifies authentication
// Resets OCR status and restarts processing
// Useful when OCR fails and needs to be retried

// Export router
module.exports = router;

/**
 * Usage in server.js:
 * const documentRoutes = require('./routes/document.routes');
 * app.use('/api/documents', documentRoutes);
 *
 * This will create the following endpoints:
 * - POST   /api/documents/upload
 * - GET    /api/documents
 * - GET    /api/documents/checklist
 * - GET    /api/documents/:id
 * - DELETE /api/documents/:id
 * - POST   /api/documents/:id/retry-ocr
 *
 * Example file upload using FormData (frontend):
 * const formData = new FormData();
 * formData.append('file', fileObject);
 * formData.append('docType', 'passport');
 *
 * fetch('/api/documents/upload', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer <token>'
 *   },
 *   body: formData
 * });
 */
