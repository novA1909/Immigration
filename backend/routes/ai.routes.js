// Import Express router
const express = require('express');

// Create router instance
const router = express.Router();

// Import controller functions
const {
  manualAIProcess,
  getAIProcessingStatus,
  classifyDoc,
  summarizeDoc,
  extractDocFields,
  suggestMissingDocs,
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

/**
 * NEW AI SERVICE ENDPOINTS
 * These endpoints use the comprehensive AI service with Zod validation
 * All endpoints require authentication via protect middleware
 */

/**
 * @route   POST /api/ai/classify
 * @desc    Classify document type from OCR text
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @body    { ocrText: string }
 * @returns { documentType: string, confidence: number, reasoning: string }
 */
router.post('/classify', protect, classifyDoc);
// POST request to /api/ai/classify
// protect middleware verifies JWT token
// Request body must contain:
// - ocrText: Text extracted from document (string, required)
// Response includes:
// - documentType: One of 12 document types (passport, certificate, etc.)
// - confidence: Confidence score 0-100
// - reasoning: Why Claude classified it this way
// Uses Claude 3.5 Sonnet with temperature=0 for deterministic results
// Validates response using Zod ClassificationSchema

/**
 * @route   POST /api/ai/summarize
 * @desc    Generate 2-3 sentence summary of document
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @body    { ocrText: string, docType: string }
 * @returns { summary: string, docType: string }
 */
router.post('/summarize', protect, summarizeDoc);
// POST request to /api/ai/summarize
// protect middleware verifies JWT token
// Request body must contain:
// - ocrText: Text extracted from document (string, required)
// - docType: Type of document (string, required)
// Response includes:
// - summary: 2-3 sentence summary focusing on key immigration details
// - docType: Echo of the document type
// Uses Claude 3.5 Sonnet with temperature=0.3 for consistent summaries
// Validates response using Zod SummarySchema

/**
 * @route   POST /api/ai/extract
 * @desc    Extract structured fields from document
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @body    { ocrText: string, docType: string }
 * @returns { fields: object, docType: string, fieldCount: number }
 */
router.post('/extract', protect, extractDocFields);
// POST request to /api/ai/extract
// protect middleware verifies JWT token
// Request body must contain:
// - ocrText: Text extracted from document (string, required)
// - docType: Type of document (string, required)
// Response includes:
// - fields: Key-value pairs of extracted data
//   - For passport: fullName, passportNumber, dateOfBirth, nationality, etc.
//   - For certificate: fullName, degree, institution, etc.
//   - For employment: fullName, position, company, salary, etc.
// - docType: Echo of the document type
// - fieldCount: Number of fields extracted
// Uses Claude 3.5 Sonnet with temperature=0 for accurate extraction
// Validates response using Zod ExtractedFieldsSchema

/**
 * @route   GET /api/ai/suggest-missing
 * @desc    Analyze user's uploaded documents and suggest what's missing
 * @access  Private (requires authentication)
 * @headers Authorization: Bearer <token>
 * @returns Missing documents with priority and guidance
 */
router.get('/suggest-missing', protect, suggestMissingDocs);
// GET request to /api/ai/suggest-missing
// protect middleware verifies JWT token
// No body required - uses authenticated user's data
// Automatically:
// - Fetches user's uploaded documents
// - Gets required documents for user's destination country
// - Calculates what's missing
// - Calls Claude to provide prioritized guidance
// Response includes:
// - country: User's destination country info
// - progress: Current completion percentage
// - uploadedCount: Number of documents uploaded
// - requiredCount: Number of documents required
// - missingDocuments: Array of missing documents with:
//   - documentType: Type of document missing
//   - priority: critical/high/medium/low
//   - guidance: Actionable advice on obtaining the document
// - completionMessage: Encouraging message about progress
// - nextSteps: What to do after uploading all documents
// Uses Claude 3.5 Sonnet with temperature=0.3 for helpful guidance
// Validates response using Zod MissingDocsSchema

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
