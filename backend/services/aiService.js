// Import Zod for schema validation
// Zod validates that Claude's responses match expected structure
const { z } = require('zod');

// Import Claude client configuration
const {
  anthropic,
  DEFAULT_MODEL,
  TOKEN_LIMITS,
  TEMPERATURE,
  checkTokenLimit,
  truncateToTokenLimit,
} = require('../config/claudeClient');

// Import prompt templates
const {
  classifyDocPrompt,
  summarizeDocPrompt,
  extractFieldsPrompt,
  missingDocsPrompt,
  generalQuestionPrompt,
} = require('../prompts/immigrationPrompts');

/**
 * AI Service
 * Handles all Claude API interactions with validation
 * Provides high-level functions for immigration document analysis
 */

// ============================================================
// ZOD VALIDATION SCHEMAS
// Define expected structure for Claude responses
// ============================================================

/**
 * Classification Response Schema
 * Validates document classification results from Claude
 */
const ClassificationSchema = z.object({
  // Document type must be one of the valid types
  documentType: z.enum([
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
  ]),

  // Confidence must be a number between 0 and 100
  confidence: z.number().min(0).max(100),

  // Reasoning is optional but helpful for debugging
  reasoning: z.string().optional(),
});

/**
 * Summary Response Schema
 * Validates document summarization results from Claude
 */
const SummarySchema = z.object({
  // Summary must be a non-empty string
  summary: z.string().min(10, 'Summary too short').max(1000, 'Summary too long'),
});

/**
 * Extracted Fields Schema
 * Validates extracted document fields from Claude
 * Fields can be any string key-value pairs
 */
const ExtractedFieldsSchema = z.record(
  // Key: field name (any string)
  z.string(),
  // Value: field value (string, number, or null)
  z.union([z.string(), z.number(), z.null()])
);

/**
 * Missing Document Item Schema
 * Represents a single missing document with guidance
 */
const MissingDocItemSchema = z.object({
  // Document type that's missing
  documentType: z.string(),

  // Priority level for this document
  priority: z.enum(['critical', 'high', 'medium', 'low']),

  // Guidance on how to obtain this document
  guidance: z.string(),
});

/**
 * Missing Documents Response Schema
 * Validates missing documents analysis from Claude
 */
const MissingDocsSchema = z.object({
  // Array of missing documents with guidance
  missingDocuments: z.array(MissingDocItemSchema),

  // Message about completion status
  completionMessage: z.string(),

  // Next steps for the user
  nextSteps: z.string(),
});

/**
 * General Answer Schema
 * Validates general Q&A responses from Claude
 */
const GeneralAnswerSchema = z.object({
  // Answer to the question
  answer: z.string().min(10, 'Answer too short'),

  // Disclaimer about the advice
  disclaimer: z.string().optional(),
});

// ============================================================
// CORE AI FUNCTION
// Main function to call Claude API
// ============================================================

/**
 * Ask Claude
 * Generic function to send prompts to Claude and get responses
 * Handles API calls, error handling, and response parsing
 *
 * @param {string} prompt - The prompt to send to Claude
 * @param {Object} options - Configuration options
 * @param {string} options.model - Which Claude model to use
 * @param {number} options.maxTokens - Maximum response tokens
 * @param {number} options.temperature - Response randomness (0-1)
 * @param {string} options.systemPrompt - System instruction for Claude
 * @returns {Promise<Object>} - Claude's response with metadata
 */
const askClaude = async (prompt, options = {}) => {
  try {
    // Extract options with defaults
    const {
      // Model selection (default: Sonnet 3.5)
      model = DEFAULT_MODEL,

      // Max tokens for response (default: 4096 tokens ~3000 words)
      maxTokens = TOKEN_LIMITS.MAX_OUTPUT_TOKENS,

      // Temperature for randomness (default: 0.0 for deterministic)
      temperature = TEMPERATURE.DETERMINISTIC,

      // Optional system prompt to set Claude's behavior
      systemPrompt = 'You are a helpful AI assistant specializing in immigration document analysis.',
    } = options;

    // Validate and truncate prompt if needed
    // Claude has a 200K token limit for input
    const tokenCheck = checkTokenLimit(prompt);

    // If prompt is too long, truncate it
    let finalPrompt = prompt;
    if (!tokenCheck.withinLimit) {
      console.warn(
        `⚠️ Prompt exceeds token limit by ${tokenCheck.exceededBy} tokens. Truncating...`
      );
      finalPrompt = truncateToTokenLimit(prompt);
    }

    // Log API call for debugging
    console.log('🤖 Calling Claude API...');
    console.log(`📋 Model: ${model}`);
    console.log(`🎲 Temperature: ${temperature}`);
    console.log(`🔢 Max Tokens: ${maxTokens}`);
    console.log(`📏 Prompt Length: ${finalPrompt.length} characters`);

    // Record start time for performance tracking
    const startTime = Date.now();

    // Call Claude API
    const response = await anthropic.messages.create({
      // Which Claude model to use
      model: model,

      // Maximum tokens in response
      max_tokens: maxTokens,

      // Temperature controls randomness
      // 0.0 = deterministic, 1.0 = creative
      temperature: temperature,

      // System prompt sets Claude's role and behavior
      // Separate from the user message
      system: systemPrompt,

      // Messages array (conversation history)
      // For single request, we just have one user message
      messages: [
        {
          // Role: 'user' for user messages, 'assistant' for Claude's responses
          role: 'user',

          // The actual prompt content
          content: finalPrompt,
        },
      ],
    });

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Extract text from Claude's response
    // response.content is an array of content blocks
    // For text responses, we take the first block's text
    const responseText = response.content[0]?.text || '';

    // Log success
    console.log('✅ Claude API call successful');
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log(`📝 Response length: ${responseText.length} characters`);

    // Return structured response
    return {
      // Success flag
      success: true,

      // Claude's response text
      text: responseText,

      // Metadata about the API call
      metadata: {
        // Model used
        model: response.model,

        // Processing time in milliseconds
        processingTimeMs: processingTime,

        // Token usage information
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },

        // Unique request ID for debugging
        requestId: response.id,

        // When the response was generated
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    // Log error details
    console.error('❌ Claude API call failed:', error.message);

    // Check for specific error types
    if (error.status === 401) {
      console.error('🔑 Authentication error: Invalid API key');
    } else if (error.status === 429) {
      console.error('⏱️  Rate limit exceeded: Too many requests');
    } else if (error.status === 500) {
      console.error('🔧 Server error: Anthropic API issue');
    }

    // Return error response
    return {
      success: false,
      error: {
        message: error.message,
        status: error.status || 500,
        type: error.name || 'Error',
      },
    };
  }
};

// ============================================================
// DOCUMENT CLASSIFICATION
// Identify document type from OCR text
// ============================================================

/**
 * Classify Document
 * Uses Claude to determine what type of document it is
 * Returns document type and confidence score
 *
 * @param {string} ocrText - Text extracted from document
 * @returns {Promise<Object>} - Classification result with validation
 */
const classifyDocument = async (ocrText) => {
  try {
    // Validate input
    if (!ocrText || ocrText.trim().length === 0) {
      throw new Error('OCR text is empty or invalid');
    }

    // Generate prompt using template
    const prompt = classifyDocPrompt(ocrText);

    // Call Claude API
    const response = await askClaude(prompt, {
      maxTokens: TOKEN_LIMITS.CLASSIFICATION,
      temperature: TEMPERATURE.DETERMINISTIC,
    });

    // Check if API call failed
    if (!response.success) {
      throw new Error(response.error.message);
    }

    // Parse JSON response
    // Claude returns JSON as text, we need to parse it
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    // Validate response structure using Zod
    const validated = ClassificationSchema.parse(parsed);

    // Return validated result
    return {
      success: true,
      data: validated,
      metadata: response.metadata,
    };
  } catch (error) {
    // Handle validation errors specifically
    if (error.name === 'ZodError') {
      console.error('Validation error:', error.errors);
      return {
        success: false,
        error: {
          message: 'Invalid classification response format',
          details: error.errors,
        },
      };
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      console.error('JSON parse error:', error.message);
      return {
        success: false,
        error: {
          message: 'Failed to parse Claude response as JSON',
          details: error.message,
        },
      };
    }

    // Handle other errors
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
};

// ============================================================
// DOCUMENT SUMMARIZATION
// Create concise summary of document
// ============================================================

/**
 * Summarize Document
 * Uses Claude to create a 2-3 sentence summary
 * Focuses on key immigration-relevant information
 *
 * @param {string} ocrText - Text extracted from document
 * @param {string} docType - Type of document
 * @returns {Promise<Object>} - Summary with validation
 */
const summarizeDocument = async (ocrText, docType) => {
  try {
    // Validate inputs
    if (!ocrText || ocrText.trim().length === 0) {
      throw new Error('OCR text is empty or invalid');
    }

    if (!docType) {
      throw new Error('Document type is required');
    }

    // Generate prompt using template
    const prompt = summarizeDocPrompt(ocrText, docType);

    // Call Claude API
    const response = await askClaude(prompt, {
      maxTokens: TOKEN_LIMITS.SUMMARY,
      temperature: TEMPERATURE.LOW,
    });

    // Check if API call failed
    if (!response.success) {
      throw new Error(response.error.message);
    }

    // Parse JSON response
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    // Validate response structure using Zod
    const validated = SummarySchema.parse(parsed);

    // Return validated result
    return {
      success: true,
      data: validated,
      metadata: response.metadata,
    };
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      console.error('Validation error:', error.errors);
      return {
        success: false,
        error: {
          message: 'Invalid summary response format',
          details: error.errors,
        },
      };
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      console.error('JSON parse error:', error.message);
      return {
        success: false,
        error: {
          message: 'Failed to parse Claude response as JSON',
          details: error.message,
        },
      };
    }

    // Handle other errors
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
};

// ============================================================
// FIELD EXTRACTION
// Extract structured data from document
// ============================================================

/**
 * Extract Fields
 * Uses Claude to extract specific fields from document
 * Returns structured key-value pairs
 *
 * @param {string} ocrText - Text extracted from document
 * @param {string} docType - Type of document (determines which fields to extract)
 * @returns {Promise<Object>} - Extracted fields with validation
 */
const extractFields = async (ocrText, docType) => {
  try {
    // Validate inputs
    if (!ocrText || ocrText.trim().length === 0) {
      throw new Error('OCR text is empty or invalid');
    }

    if (!docType) {
      throw new Error('Document type is required');
    }

    // Generate prompt using template
    const prompt = extractFieldsPrompt(ocrText, docType);

    // Call Claude API
    const response = await askClaude(prompt, {
      maxTokens: TOKEN_LIMITS.EXTRACTION,
      temperature: TEMPERATURE.DETERMINISTIC,
    });

    // Check if API call failed
    if (!response.success) {
      throw new Error(response.error.message);
    }

    // Parse JSON response
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    // Validate response structure using Zod
    const validated = ExtractedFieldsSchema.parse(parsed);

    // Return validated result
    return {
      success: true,
      data: validated,
      metadata: response.metadata,
    };
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      console.error('Validation error:', error.errors);
      return {
        success: false,
        error: {
          message: 'Invalid extracted fields response format',
          details: error.errors,
        },
      };
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      console.error('JSON parse error:', error.message);
      return {
        success: false,
        error: {
          message: 'Failed to parse Claude response as JSON',
          details: error.message,
        },
      };
    }

    // Handle other errors
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
};

// ============================================================
// MISSING DOCUMENTS ANALYSIS
// Suggest which documents user still needs to upload
// ============================================================

/**
 * Analyze Missing Documents
 * Uses Claude to identify missing documents and provide guidance
 * Returns prioritized list with actionable advice
 *
 * @param {Array<string>} uploadedDocs - Document types already uploaded
 * @param {Array<string>} requiredDocs - Required document types for country
 * @param {string} countryName - Destination country name
 * @param {number} userProgress - Current progress percentage
 * @returns {Promise<Object>} - Missing documents analysis with validation
 */
const analyzeMissingDocs = async (uploadedDocs, requiredDocs, countryName, userProgress) => {
  try {
    // Validate inputs
    if (!Array.isArray(uploadedDocs)) {
      throw new Error('Uploaded documents must be an array');
    }

    if (!Array.isArray(requiredDocs) || requiredDocs.length === 0) {
      throw new Error('Required documents must be a non-empty array');
    }

    if (!countryName) {
      throw new Error('Country name is required');
    }

    if (typeof userProgress !== 'number' || userProgress < 0 || userProgress > 100) {
      throw new Error('User progress must be a number between 0 and 100');
    }

    // Generate prompt using template
    const prompt = missingDocsPrompt(uploadedDocs, requiredDocs, countryName, userProgress);

    // Call Claude API
    const response = await askClaude(prompt, {
      maxTokens: TOKEN_LIMITS.MISSING_DOCS,
      temperature: TEMPERATURE.LOW,
    });

    // Check if API call failed
    if (!response.success) {
      throw new Error(response.error.message);
    }

    // Parse JSON response
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    // Validate response structure using Zod
    const validated = MissingDocsSchema.parse(parsed);

    // Return validated result
    return {
      success: true,
      data: validated,
      metadata: response.metadata,
    };
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      console.error('Validation error:', error.errors);
      return {
        success: false,
        error: {
          message: 'Invalid missing documents response format',
          details: error.errors,
        },
      };
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      console.error('JSON parse error:', error.message);
      return {
        success: false,
        error: {
          message: 'Failed to parse Claude response as JSON',
          details: error.message,
        },
      };
    }

    // Handle other errors
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
};

// ============================================================
// GENERAL Q&A
// Answer immigration-related questions
// ============================================================

/**
 * Answer General Question
 * Uses Claude to answer general immigration questions
 * NOT for analyzing specific documents
 *
 * @param {string} question - User's question
 * @param {string} context - Additional context (optional)
 * @returns {Promise<Object>} - Answer with validation
 */
const answerQuestion = async (question, context = '') => {
  try {
    // Validate input
    if (!question || question.trim().length === 0) {
      throw new Error('Question is required');
    }

    // Generate prompt using template
    const prompt = generalQuestionPrompt(question, context);

    // Call Claude API
    const response = await askClaude(prompt, {
      maxTokens: 500,
      temperature: TEMPERATURE.MEDIUM,
    });

    // Check if API call failed
    if (!response.success) {
      throw new Error(response.error.message);
    }

    // Parse JSON response
    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    // Validate response structure using Zod
    const validated = GeneralAnswerSchema.parse(parsed);

    // Return validated result
    return {
      success: true,
      data: validated,
      metadata: response.metadata,
    };
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      console.error('Validation error:', error.errors);
      return {
        success: false,
        error: {
          message: 'Invalid answer response format',
          details: error.errors,
        },
      };
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      console.error('JSON parse error:', error.message);
      return {
        success: false,
        error: {
          message: 'Failed to parse Claude response as JSON',
          details: error.message,
        },
      };
    }

    // Handle other errors
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
      },
    };
  }
};

// Export all AI service functions
module.exports = {
  // Core function
  askClaude,

  // Document analysis functions
  classifyDocument,
  summarizeDocument,
  extractFields,
  analyzeMissingDocs,

  // General Q&A
  answerQuestion,

  // Validation schemas (exported for testing)
  schemas: {
    ClassificationSchema,
    SummarySchema,
    ExtractedFieldsSchema,
    MissingDocsSchema,
    GeneralAnswerSchema,
  },
};
