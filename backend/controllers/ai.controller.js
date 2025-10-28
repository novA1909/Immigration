// Import Anthropic SDK for Claude API
const Anthropic = require('@anthropic-ai/sdk');

// Import Document model
const Document = require('../models/Document');

// Initialize Anthropic client with API key from environment
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * @desc    Process AI extraction for document (summarization + field extraction)
 * @param   {ObjectId} documentId - Document ID to process
 * @access  Internal function (called after OCR completes)
 */
const processAIExtraction = async (documentId) => {
  try {
    // Find document by ID
    const document = await Document.findById(documentId);

    // Check if document exists
    if (!document) {
      console.error('Document not found for AI processing');
      return;
    }

    // Check if OCR text is available
    if (!document.ocrText || document.ocrText.trim() === '') {
      console.error('No OCR text available for AI processing');
      // Update AI status to failed
      document.aiStatus = 'failed';
      document.aiError = 'No OCR text available';
      await document.save();
      return;
    }

    // Update AI status to processing
    document.aiStatus = 'processing';
    await document.save();

    // Build prompt for Claude based on document type
    const prompt = buildPromptForDocType(document.docType, document.ocrText);

    // Call Claude API
    const message = await anthropic.messages.create({
      // Model: Claude 3.5 Sonnet - best for complex analysis
      model: 'claude-3-5-sonnet-20241022',

      // Max tokens: Maximum length of response (4096 = ~3000 words)
      max_tokens: 4096,

      // Temperature: 0 = deterministic, 1 = creative (0 for data extraction)
      temperature: 0,

      // System prompt: Sets context and instructions for Claude
      system: 'You are an expert immigration document analyst. Extract key information accurately and provide clear summaries.',

      // Messages: Conversation history (user message with OCR text)
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract response text from Claude's message
    // message.content is an array of content blocks
    // We take the first block's text
    const responseText = message.content[0].text;

    // Parse the response to extract summary and fields
    const { summary, fields } = parseAIResponse(responseText, document.docType);

    // Update document with AI results
    document.aiSummary = summary;
    // Convert fields object to Map for storage
    document.aiFields = new Map(Object.entries(fields));
    document.aiStatus = 'completed';
    document.status = 'completed'; // Overall status

    // Save document
    await document.save();

    console.log(`✅ AI processing completed for document ${documentId}`);
  } catch (error) {
    // Log error
    console.error('AI processing error:', error);

    // Update document with error status
    try {
      const document = await Document.findById(documentId);
      if (document) {
        document.aiStatus = 'failed';
        document.aiError = error.message;
        document.status = 'failed';
        await document.save();
      }
    } catch (updateError) {
      console.error('Error updating document status:', updateError);
    }
  }
};

/**
 * Build prompt for Claude based on document type
 * @param {string} docType - Type of document
 * @param {string} ocrText - OCR extracted text
 * @returns {string} - Formatted prompt for Claude
 */
const buildPromptForDocType = (docType, ocrText) => {
  // Base prompt structure
  let prompt = `Analyze this ${docType} document and extract key information.\n\n`;
  prompt += `OCR Text:\n${ocrText}\n\n`;
  prompt += `Please provide:\n`;
  prompt += `1. SUMMARY: A brief 2-3 sentence summary of the document\n`;
  prompt += `2. FIELDS: Key information extracted as field-value pairs\n\n`;

  // Document type-specific field extraction instructions
  switch (docType) {
    case 'passport':
      prompt += `Extract these fields if available:\n`;
      prompt += `- fullName: Full name as it appears\n`;
      prompt += `- passportNumber: Passport number\n`;
      prompt += `- dateOfBirth: Date of birth (YYYY-MM-DD format)\n`;
      prompt += `- nationality: Nationality/Country\n`;
      prompt += `- issueDate: Date of issue (YYYY-MM-DD format)\n`;
      prompt += `- expiryDate: Date of expiry (YYYY-MM-DD format)\n`;
      prompt += `- gender: Gender\n`;
      prompt += `- placeOfBirth: Place of birth\n`;
      break;

    case 'birth-certificate':
      prompt += `Extract these fields if available:\n`;
      prompt += `- fullName: Full name of person\n`;
      prompt += `- dateOfBirth: Date of birth (YYYY-MM-DD format)\n`;
      prompt += `- placeOfBirth: Place of birth (city, country)\n`;
      prompt += `- fatherName: Father's full name\n`;
      prompt += `- motherName: Mother's full name\n`;
      prompt += `- registrationNumber: Certificate/Registration number\n`;
      prompt += `- issueDate: Date of issue (YYYY-MM-DD format)\n`;
      break;

    case 'educational-certificate':
      prompt += `Extract these fields if available:\n`;
      prompt += `- fullName: Student's full name\n`;
      prompt += `- degree: Degree/Qualification obtained\n`;
      prompt += `- institution: Institution/University name\n`;
      prompt += `- graduationDate: Graduation/Completion date (YYYY-MM-DD format)\n`;
      prompt += `- fieldOfStudy: Field/Major of study\n`;
      prompt += `- grade: Grade/GPA/Result\n`;
      prompt += `- certificateNumber: Certificate number\n`;
      break;

    case 'employment-letter':
      prompt += `Extract these fields if available:\n`;
      prompt += `- fullName: Employee's full name\n`;
      prompt += `- position: Job position/title\n`;
      prompt += `- companyName: Company/Employer name\n`;
      prompt += `- startDate: Employment start date (YYYY-MM-DD format)\n`;
      prompt += `- endDate: Employment end date (YYYY-MM-DD format) or "Present"\n`;
      prompt += `- salary: Salary mentioned (if any)\n`;
      prompt += `- issueDate: Letter issue date (YYYY-MM-DD format)\n`;
      break;

    case 'bank-statement':
      prompt += `Extract these fields if available:\n`;
      prompt += `- accountHolder: Account holder's name\n`;
      prompt += `- accountNumber: Account number (last 4 digits only)\n`;
      prompt += `- bankName: Bank name\n`;
      prompt += `- statementPeriod: Statement period (e.g., "Jan 2024 - Mar 2024")\n`;
      prompt += `- closingBalance: Closing/Final balance\n`;
      prompt += `- currency: Currency (USD, EUR, etc.)\n`;
      break;

    case 'police-clearance':
      prompt += `Extract these fields if available:\n`;
      prompt += `- fullName: Person's full name\n`;
      prompt += `- dateOfBirth: Date of birth (YYYY-MM-DD format)\n`;
      prompt += `- certificateNumber: Certificate/Reference number\n`;
      prompt += `- issueDate: Date of issue (YYYY-MM-DD format)\n`;
      prompt += `- expiryDate: Date of expiry (YYYY-MM-DD format)\n`;
      prompt += `- issuingAuthority: Issuing authority/department\n`;
      prompt += `- clearanceStatus: Clearance status (Clear/No Records/etc.)\n`;
      break;

    case 'medical-certificate':
      prompt += `Extract these fields if available:\n`;
      prompt += `- fullName: Patient's full name\n`;
      prompt += `- dateOfBirth: Date of birth (YYYY-MM-DD format)\n`;
      prompt += `- examinationDate: Date of examination (YYYY-MM-DD format)\n`;
      prompt += `- doctorName: Doctor's name\n`;
      prompt += `- facilityName: Medical facility/Clinic name\n`;
      prompt += `- certificateNumber: Certificate number\n`;
      prompt += `- medicalStatus: Overall medical status/Fitness declaration\n`;
      break;

    default:
      // Generic extraction for other document types
      prompt += `Extract any relevant fields you can identify, such as:\n`;
      prompt += `- Names, dates, numbers, addresses, amounts, etc.\n`;
  }

  prompt += `\n---\n\n`;
  prompt += `Format your response EXACTLY as follows:\n\n`;
  prompt += `SUMMARY:\n[Your 2-3 sentence summary here]\n\n`;
  prompt += `FIELDS:\n`;
  prompt += `fieldName1: value1\n`;
  prompt += `fieldName2: value2\n`;
  prompt += `...\n\n`;
  prompt += `If a field is not found, omit it. Only include fields with clear values.`;

  return prompt;
};

/**
 * Parse AI response to extract summary and fields
 * @param {string} responseText - Response from Claude
 * @param {string} docType - Document type
 * @returns {Object} - { summary, fields }
 */
const parseAIResponse = (responseText, docType) => {
  // Initialize result object
  const result = {
    summary: '',
    fields: {},
  };

  // Split response into lines
  const lines = responseText.split('\n');

  // Track which section we're parsing
  let currentSection = null;
  let summaryLines = [];

  // Parse each line
  for (const line of lines) {
    // Check for section markers
    if (line.trim().toUpperCase().startsWith('SUMMARY:')) {
      currentSection = 'summary';
      // Check if summary is on same line as marker
      const summaryOnSameLine = line.substring(8).trim();
      if (summaryOnSameLine) {
        summaryLines.push(summaryOnSameLine);
      }
      continue;
    }

    if (line.trim().toUpperCase().startsWith('FIELDS:')) {
      currentSection = 'fields';
      continue;
    }

    // Parse based on current section
    if (currentSection === 'summary' && line.trim() !== '') {
      // Add to summary lines (until we hit FIELDS section)
      if (!line.trim().toUpperCase().startsWith('FIELDS:')) {
        summaryLines.push(line.trim());
      }
    }

    if (currentSection === 'fields' && line.trim() !== '') {
      // Parse field lines (format: "fieldName: value")
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        // Extract field name and value
        const fieldName = line.substring(0, colonIndex).trim();
        const fieldValue = line.substring(colonIndex + 1).trim();

        // Only add if both name and value exist
        if (fieldName && fieldValue) {
          // Convert field name to camelCase (remove spaces, capitalize words)
          const camelCaseFieldName = fieldName
            .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));

          result.fields[camelCaseFieldName] = fieldValue;
        }
      }
    }
  }

  // Join summary lines into single string
  result.summary = summaryLines.join(' ').trim();

  // If summary is empty, create a default one
  if (!result.summary) {
    result.summary = `${docType} document successfully processed and analyzed.`;
  }

  return result;
};

/**
 * @desc    Manually trigger AI processing for a document
 * @route   POST /api/ai/process/:id
 * @access  Private
 */
const manualAIProcess = async (req, res) => {
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

    // Check if document belongs to authenticated user (or user is admin)
    if (
      document.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      // Return 403 Forbidden
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process this document',
      });
    }

    // Check if OCR is completed
    if (document.ocrStatus !== 'completed') {
      // Return 400 Bad Request
      return res.status(400).json({
        success: false,
        message: 'OCR must be completed before AI processing',
      });
    }

    // Reset AI status
    document.aiStatus = 'pending';
    document.aiError = null;
    await document.save();

    // Trigger AI processing
    setImmediate(() => {
      processAIExtraction(document._id);
    });

    // Return 200 OK
    res.status(200).json({
      success: true,
      message: 'AI processing started',
    });
  } catch (error) {
    // Log error
    console.error('Manual AI process error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error starting AI processing',
      error: error.message,
    });
  }
};

/**
 * @desc    Get AI processing status for document
 * @route   GET /api/ai/status/:id
 * @access  Private
 */
const getAIProcessingStatus = async (req, res) => {
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

    // Check authorization
    if (
      document.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      // Return 403 Forbidden
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this document',
      });
    }

    // Return processing status
    res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        ocrStatus: document.ocrStatus,
        ocrError: document.ocrError,
        aiStatus: document.aiStatus,
        aiError: document.aiError,
        overallStatus: document.status,
        hasOcrText: !!document.ocrText,
        hasSummary: !!document.aiSummary,
        fieldCount: document.aiFields ? document.aiFields.size : 0,
      },
    });
  } catch (error) {
    // Log error
    console.error('Get AI status error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching AI status',
      error: error.message,
    });
  }
};

/**
 * NEW AI ENDPOINTS using aiService.js
 * These endpoints use the comprehensive AI service with Zod validation
 */

// Import AI service functions
const {
  classifyDocument,
  summarizeDocument,
  extractFields,
  analyzeMissingDocs,
} = require('../services/aiService');

// Import User model for missing docs analysis
const User = require('../models/User');

/**
 * @desc    Classify a document type from OCR text
 * @route   POST /api/ai/classify
 * @access  Private
 * @body    { ocrText: string }
 */
const classifyDoc = async (req, res) => {
  try {
    // Extract OCR text from request body
    const { ocrText } = req.body;

    // Validate OCR text is provided
    if (!ocrText || ocrText.trim().length === 0) {
      // Return 400 Bad Request if OCR text missing
      return res.status(400).json({
        success: false,
        message: 'OCR text is required',
      });
    }

    // Log classification request
    console.log(`📋 Classification request from user ${req.user._id}`);

    // Call AI service to classify document
    // This uses Claude to identify document type
    const result = await classifyDocument(ocrText);

    // Check if classification failed
    if (!result.success) {
      // Return 500 Internal Server Error
      return res.status(500).json({
        success: false,
        message: 'Failed to classify document',
        error: result.error,
      });
    }

    // Return 200 OK with classification result
    res.status(200).json({
      success: true,
      message: 'Document classified successfully',
      data: {
        // Document type (passport, certificate, etc.)
        documentType: result.data.documentType,

        // Confidence score (0-100)
        confidence: result.data.confidence,

        // Reasoning for classification
        reasoning: result.data.reasoning,
      },
      metadata: result.metadata,
    });
  } catch (error) {
    // Log error
    console.error('Classification error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error during classification',
      error: error.message,
    });
  }
};

/**
 * @desc    Summarize a document from OCR text
 * @route   POST /api/ai/summarize
 * @access  Private
 * @body    { ocrText: string, docType: string }
 */
const summarizeDoc = async (req, res) => {
  try {
    // Extract data from request body
    const { ocrText, docType } = req.body;

    // Validate required fields
    if (!ocrText || ocrText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'OCR text is required',
      });
    }

    if (!docType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required',
      });
    }

    // Log summarization request
    console.log(`📝 Summarization request for ${docType} from user ${req.user._id}`);

    // Call AI service to summarize document
    // This uses Claude to create a 2-3 sentence summary
    const result = await summarizeDocument(ocrText, docType);

    // Check if summarization failed
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to summarize document',
        error: result.error,
      });
    }

    // Return 200 OK with summary
    res.status(200).json({
      success: true,
      message: 'Document summarized successfully',
      data: {
        // 2-3 sentence summary
        summary: result.data.summary,

        // Document type
        docType: docType,
      },
      metadata: result.metadata,
    });
  } catch (error) {
    // Log error
    console.error('Summarization error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error during summarization',
      error: error.message,
    });
  }
};

/**
 * @desc    Extract structured fields from document
 * @route   POST /api/ai/extract
 * @access  Private
 * @body    { ocrText: string, docType: string }
 */
const extractDocFields = async (req, res) => {
  try {
    // Extract data from request body
    const { ocrText, docType } = req.body;

    // Validate required fields
    if (!ocrText || ocrText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'OCR text is required',
      });
    }

    if (!docType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required',
      });
    }

    // Log extraction request
    console.log(`🔍 Field extraction request for ${docType} from user ${req.user._id}`);

    // Call AI service to extract fields
    // This uses Claude to extract specific data fields
    const result = await extractFields(ocrText, docType);

    // Check if extraction failed
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to extract fields',
        error: result.error,
      });
    }

    // Return 200 OK with extracted fields
    res.status(200).json({
      success: true,
      message: 'Fields extracted successfully',
      data: {
        // Structured key-value pairs
        fields: result.data,

        // Document type
        docType: docType,

        // Number of fields extracted
        fieldCount: Object.keys(result.data).length,
      },
      metadata: result.metadata,
    });
  } catch (error) {
    // Log error
    console.error('Extraction error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error during extraction',
      error: error.message,
    });
  }
};

/**
 * @desc    Suggest missing documents for user
 * @route   GET /api/ai/suggest-missing
 * @access  Private
 * @query   None (uses authenticated user's data)
 */
const suggestMissingDocs = async (req, res) => {
  try {
    // Get authenticated user with populated data
    // Need country information and documents
    const user = await User.findById(req.user._id).populate('country');

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user has country assigned
    if (!user.country) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a destination country assigned',
      });
    }

    // Get user's uploaded documents
    const documents = await Document.find({ userId: user._id });

    // Extract document types from uploaded documents
    const uploadedDocTypes = documents.map((doc) => doc.docType);

    // Get required documents from country
    const requiredDocTypes = user.country.requiredDocuments;

    // Get country name
    const countryName = user.country.countryName;

    // Get user progress
    const userProgress = user.progress;

    // Log missing docs analysis request
    console.log(`📊 Missing docs analysis for user ${user._id} (${countryName})`);
    console.log(`📈 Progress: ${userProgress}%`);
    console.log(`📤 Uploaded: ${uploadedDocTypes.length}/${requiredDocTypes.length}`);

    // Call AI service to analyze missing documents
    // This uses Claude to provide guidance on what's missing
    const result = await analyzeMissingDocs(
      uploadedDocTypes,
      requiredDocTypes,
      countryName,
      userProgress
    );

    // Check if analysis failed
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to analyze missing documents',
        error: result.error,
      });
    }

    // Return 200 OK with missing documents analysis
    res.status(200).json({
      success: true,
      message: 'Missing documents analyzed successfully',
      data: {
        // User's current country
        country: {
          _id: user.country._id,
          name: countryName,
          code: user.country.countryCode,
        },

        // Current progress
        progress: userProgress,

        // Uploaded vs required count
        uploadedCount: uploadedDocTypes.length,
        requiredCount: requiredDocTypes.length,

        // Missing documents with guidance
        missingDocuments: result.data.missingDocuments,

        // Completion message
        completionMessage: result.data.completionMessage,

        // Next steps
        nextSteps: result.data.nextSteps,
      },
      metadata: result.metadata,
    });
  } catch (error) {
    // Log error
    console.error('Missing docs analysis error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error analyzing missing documents',
      error: error.message,
    });
  }
};

// Export all controller functions
module.exports = {
  // Original functions
  processAIExtraction,
  manualAIProcess,
  getAIProcessingStatus,
  buildPromptForDocType,
  parseAIResponse,

  // New AI service endpoints
  classifyDoc,
  summarizeDoc,
  extractDocFields,
  suggestMissingDocs,
};
