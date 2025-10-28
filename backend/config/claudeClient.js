// Import Anthropic SDK for Claude API integration
// @anthropic-ai/sdk is the official SDK from Anthropic
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Claude Client Configuration
 * Initializes and exports the Anthropic SDK client
 * Used throughout the application for Claude AI API calls
 */

// Validate that API key is present in environment variables
// This check prevents the app from running without proper configuration
if (!process.env.ANTHROPIC_API_KEY) {
  // Throw error if API key is missing
  // This will stop the server from starting
  throw new Error(
    'ANTHROPIC_API_KEY is not defined in environment variables. ' +
    'Please add it to your .env file. ' +
    'Get your API key from: https://console.anthropic.com/'
  );
}

/**
 * Initialize Anthropic client
 * Creates a configured instance of the Anthropic SDK
 * All Claude API calls will go through this client
 */
const anthropic = new Anthropic({
  // API key for authentication
  // Should start with 'sk-ant-'
  // Keep this secret and never commit to version control
  apiKey: process.env.ANTHROPIC_API_KEY,

  // Optional: Set custom timeout (in milliseconds)
  // Default is 10 minutes (600000ms)
  // Increase if processing large documents
  timeout: 120000, // 2 minutes

  // Optional: Maximum number of retries on failure
  // Default is 2
  // Automatically retries on network errors or 5xx responses
  maxRetries: 2,
});

/**
 * Claude Model Configuration
 * Define which Claude model to use for different tasks
 * Different models have different capabilities and pricing
 */
const CLAUDE_MODELS = {
  // Claude 3.5 Sonnet - Best for complex analysis and reasoning
  // Use for: Document classification, field extraction, complex summarization
  // Context window: 200K tokens
  // Pricing: $3 per million input tokens, $15 per million output tokens
  SONNET: 'claude-3-5-sonnet-20241022',

  // Claude 3 Haiku - Fastest and most affordable
  // Use for: Simple tasks, quick responses, high-volume operations
  // Context window: 200K tokens
  // Pricing: $0.25 per million input tokens, $1.25 per million output tokens
  HAIKU: 'claude-3-haiku-20240307',

  // Claude 3 Opus - Most capable (if needed for very complex tasks)
  // Use for: Extremely complex analysis, highest accuracy requirements
  // Context window: 200K tokens
  // Pricing: $15 per million input tokens, $75 per million output tokens
  OPUS: 'claude-3-opus-20240229',
};

/**
 * Default Model Selection
 * Choose which model to use by default
 * Can be overridden per request if needed
 */
const DEFAULT_MODEL = CLAUDE_MODELS.SONNET;

/**
 * Token Limits
 * Maximum tokens for input and output
 * 1 token ≈ 4 characters or ≈ 0.75 words
 */
const TOKEN_LIMITS = {
  // Maximum input tokens (context window)
  MAX_INPUT_TOKENS: 200000, // 200K tokens

  // Maximum output tokens (response length)
  // Lower values = faster responses and lower cost
  MAX_OUTPUT_TOKENS: 4096, // ~3000 words

  // Recommended output tokens for different tasks
  CLASSIFICATION: 100, // Short response
  SUMMARY: 500, // Medium paragraph
  EXTRACTION: 1000, // Structured data
  MISSING_DOCS: 300, // List of documents
};

/**
 * Temperature Settings
 * Controls randomness in Claude's responses
 * Range: 0.0 to 1.0
 */
const TEMPERATURE = {
  // Deterministic - same input = same output
  // Use for: Data extraction, classification, structured output
  DETERMINISTIC: 0.0,

  // Low randomness - mostly consistent with slight variation
  // Use for: Summaries that need consistency
  LOW: 0.3,

  // Medium randomness - balanced creativity and consistency
  // Use for: General responses, suggestions
  MEDIUM: 0.7,

  // High randomness - creative and varied responses
  // Use for: Creative writing, brainstorming
  HIGH: 1.0,
};

/**
 * Test Claude API Connection
 * Verifies that the API key is valid and API is accessible
 * Should be called on server startup
 *
 * @returns {Promise<boolean>} - True if connection successful
 */
const testClaudeConnection = async () => {
  try {
    console.log('🧪 Testing Claude API connection...');

    // Send a minimal test request to Claude
    const response = await anthropic.messages.create({
      // Use fastest model for testing
      model: CLAUDE_MODELS.HAIKU,

      // Minimal tokens for quick test
      max_tokens: 10,

      // Simple test message
      messages: [
        {
          role: 'user',
          content: 'Hi',
        },
      ],
    });

    // Check if we got a valid response
    if (response && response.content && response.content.length > 0) {
      console.log('✅ Claude API connection successful');
      console.log(`📋 Model: ${response.model}`);
      console.log(`🆔 Request ID: ${response.id}`);
      return true;
    } else {
      console.error('❌ Claude API returned invalid response');
      return false;
    }
  } catch (error) {
    // Log connection error
    console.error('❌ Claude API connection failed:', error.message);

    // Check for specific error types
    if (error.status === 401) {
      console.error('🔑 Invalid API key. Check ANTHROPIC_API_KEY in .env file');
    } else if (error.status === 429) {
      console.error('⏱️  Rate limit exceeded. Please wait and try again');
    } else if (error.status >= 500) {
      console.error('🔧 Anthropic API server error. Try again later');
    }

    return false;
  }
};

/**
 * Get token count estimate
 * Estimates number of tokens in a text string
 * Useful for checking if text fits within token limits
 *
 * @param {string} text - Text to count tokens for
 * @returns {number} - Estimated token count
 */
const estimateTokens = (text) => {
  // Claude uses approximately:
  // - 1 token ≈ 4 characters (English text)
  // - 1 token ≈ 0.75 words (English text)

  // Estimate based on character count (more accurate)
  const charCount = text.length;
  const tokenEstimate = Math.ceil(charCount / 4);

  return tokenEstimate;
};

/**
 * Check if text exceeds token limit
 * Validates text length before sending to Claude
 *
 * @param {string} text - Text to check
 * @param {number} limit - Maximum allowed tokens
 * @returns {Object} - { withinLimit: boolean, tokens: number, limit: number }
 */
const checkTokenLimit = (text, limit = TOKEN_LIMITS.MAX_INPUT_TOKENS) => {
  // Estimate token count
  const tokens = estimateTokens(text);

  // Check if within limit
  const withinLimit = tokens <= limit;

  return {
    withinLimit,
    tokens,
    limit,
    exceededBy: withinLimit ? 0 : tokens - limit,
  };
};

/**
 * Truncate text to fit token limit
 * Safely reduces text length to fit within token constraints
 *
 * @param {string} text - Text to truncate
 * @param {number} maxTokens - Maximum allowed tokens
 * @returns {string} - Truncated text
 */
const truncateToTokenLimit = (text, maxTokens = TOKEN_LIMITS.MAX_INPUT_TOKENS) => {
  // Estimate current tokens
  const currentTokens = estimateTokens(text);

  // If already within limit, return as-is
  if (currentTokens <= maxTokens) {
    return text;
  }

  // Calculate target character count
  // Use slightly lower value to ensure we're under limit
  const targetChars = maxTokens * 4 * 0.9; // 90% of theoretical max

  // Truncate text
  const truncated = text.substring(0, targetChars);

  // Add truncation indicator
  return truncated + '\n\n[Text truncated to fit token limit]';
};

// Export Claude client and configuration
module.exports = {
  // Main Anthropic client instance
  anthropic,

  // Model identifiers
  CLAUDE_MODELS,
  DEFAULT_MODEL,

  // Token configuration
  TOKEN_LIMITS,
  TEMPERATURE,

  // Utility functions
  testClaudeConnection,
  estimateTokens,
  checkTokenLimit,
  truncateToTokenLimit,
};
