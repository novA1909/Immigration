// Import Express router
const express = require('express');

// Create router instance
const router = express.Router();

// Import controller functions
const {
  manualAIProcess,
  getAIProcessingStatus,
} = require('../controllers/ai.controller');

// Import middleware
const { protect } = require('../middleware/auth');

/**
 * AI Routes
 * Handles Claude API integration for document analysis
 * All routes require authentication
 */

/**
 * @route   POST /api/ai/process/:id
 * @desc    Manually trigger AI processing for a document
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @params  id - Document ObjectId
 * @note    OCR must be completed before AI processing can start
 */
router.post('/process/:id', protect, manualAIProcess);
// POST request to /api/ai/process/:id
// protect middleware verifies authentication
// Manually triggers Claude API analysis
// Useful for:
// - Retrying failed AI processing
// - Processing documents where AI was skipped
// - Re-analyzing documents with updated prompts
// Requires document.ocrStatus === 'completed'

/**
 * @route   GET /api/ai/status/:id
 * @desc    Get AI processing status for a document
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @params  id - Document ObjectId
 * @returns Processing status including OCR and AI stages
 */
router.get('/status/:id', protect, getAIProcessingStatus);
// GET request to /api/ai/status/:id
// protect middleware verifies authentication
// Returns detailed processing status:
// - ocrStatus: pending/processing/completed/failed
// - aiStatus: pending/processing/completed/failed
// - overallStatus: uploaded/processing/completed/failed
// - Error messages if any stage failed
// - Counts of extracted fields
// Useful for polling status during processing

// Export router
module.exports = router;

/**
 * Usage in server.js:
 * const aiRoutes = require('./routes/ai.routes');
 * app.use('/api/ai', aiRoutes);
 *
 * This will create the following endpoints:
 * - POST /api/ai/process/:id
 * - GET  /api/ai/status/:id
 *
 * Complete Processing Flow:
 *
 * 1. User uploads document
 *    POST /api/documents/upload
 *    - Saves to Cloudinary
 *    - Creates document record
 *    - Status: 'uploaded'
 *
 * 2. OCR processing starts automatically
 *    (Internal, no API call needed)
 *    - Downloads from Cloudinary
 *    - Runs Tesseract.js
 *    - Saves ocrText
 *    - ocrStatus: 'processing' -> 'completed'
 *
 * 3. AI processing starts automatically after OCR
 *    (Internal, no API call needed)
 *    - Sends ocrText to Claude API
 *    - Gets summary and structured fields
 *    - Saves aiSummary and aiFields
 *    - aiStatus: 'processing' -> 'completed'
 *    - Status: 'completed'
 *
 * 4. Frontend polls for status
 *    GET /api/ai/status/:id
 *    - Check if processing complete
 *    - Display progress to user
 *
 * 5. If processing fails, retry manually
 *    POST /api/ai/process/:id
 *    - Restarts AI processing
 *    - Only if OCR completed
 *
 * Data Flow: Upload → OCR → Claude → Dashboard
 *
 * Document Fields After Processing:
 * - fileURL: Cloudinary URL
 * - ocrText: Raw text from Tesseract
 * - aiSummary: Human-readable summary from Claude
 * - aiFields: Map of extracted data (name, dates, numbers, etc.)
 *
 * Example Frontend Usage:
 *
 * // After upload, poll status
 * const checkStatus = async (docId) => {
 *   const response = await fetch(`/api/ai/status/${docId}`, {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 *   const data = await response.json();
 *
 *   if (data.data.overallStatus === 'completed') {
 *     // Processing done, display document
 *     displayDocument(docId);
 *   } else if (data.data.overallStatus === 'failed') {
 *     // Processing failed, offer retry
 *     showRetryButton(docId);
 *   } else {
 *     // Still processing, poll again
 *     setTimeout(() => checkStatus(docId), 2000);
 *   }
 * };
 *
 * // Retry AI processing if failed
 * const retryAI = async (docId) => {
 *   await fetch(`/api/ai/process/${docId}`, {
 *     method: 'POST',
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 *   // Start polling status again
 *   checkStatus(docId);
 * };
 */
