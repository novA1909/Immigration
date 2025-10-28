// Import Tesseract.js for Optical Character Recognition
// Tesseract is an open-source OCR engine that recognizes text in images
const Tesseract = require('tesseract.js');

// Import node-fetch for downloading images from URLs
const fetch = require('node-fetch');

// Import file system module for reading local files
const fs = require('fs').promises;

// Import path module for file path operations
const path = require('path');

/**
 * OCR Service
 * Provides text extraction from images using Tesseract.js
 * Supports multiple input types: file path, buffer, URL
 * Returns extracted text with confidence scores
 */

/**
 * Extract text from an image file
 * Main function for OCR processing
 *
 * @param {string|Buffer} input - File path, Buffer, or URL of the image
 * @param {Object} options - OCR configuration options
 * @param {string} options.language - Language(s) to recognize (default: 'eng')
 *                                   Examples: 'eng', 'spa', 'eng+spa' (multiple)
 * @param {Function} options.onProgress - Progress callback function
 * @param {boolean} options.preserveInterword - Preserve spaces between words
 * @returns {Promise<Object>} - OCR result with text, confidence, and metadata
 */
const extractTextFromImage = async (input, options = {}) => {
  try {
    // Validate input parameter
    // Input must be either a string (path/URL) or Buffer (file data)
    if (!input) {
      throw new Error('Input is required for OCR processing');
    }

    // Set default options
    // language: Language code for OCR (eng = English)
    const language = options.language || 'eng';

    // onProgress: Callback function to track OCR progress
    // Called at different stages: loading, recognizing, etc.
    const onProgress = options.onProgress || defaultProgressHandler;

    // preserveInterword: Keep spaces between words (default: true)
    const preserveInterword =
      options.preserveInterword !== undefined ? options.preserveInterword : true;

    // Log OCR start
    console.log('🔍 Starting OCR processing...');
    console.log(`📄 Input type: ${typeof input === 'string' ? 'File/URL' : 'Buffer'}`);
    console.log(`🌐 Language: ${language}`);

    // Determine input type and prepare image data
    let imageInput;

    // Check if input is a Buffer (file data in memory)
    if (Buffer.isBuffer(input)) {
      // Use buffer directly
      imageInput = input;
      console.log(`📦 Using Buffer input (${input.length} bytes)`);
    }
    // Check if input is a string (file path or URL)
    else if (typeof input === 'string') {
      // Check if input is a URL (starts with http:// or https://)
      if (input.startsWith('http://') || input.startsWith('https://')) {
        // Download image from URL
        console.log(`🌐 Downloading image from URL: ${input}`);
        imageInput = await downloadImageFromURL(input);
      }
      // Otherwise, treat as local file path
      else {
        // Read file from local file system
        console.log(`📁 Reading file from path: ${input}`);
        imageInput = await fs.readFile(input);
      }
    }
    // Invalid input type
    else {
      throw new Error(
        'Input must be a file path (string), URL (string), or Buffer'
      );
    }

    // Configure Tesseract worker
    // Worker is a separate process that handles OCR
    const workerConfig = {
      // Logger: Function to track OCR progress and status
      logger: (info) => {
        // info.status: Current operation (loading, recognizing, etc.)
        // info.progress: Progress percentage (0 to 1)
        onProgress(info);

        // Log significant progress updates
        if (info.status === 'recognizing text') {
          // Convert progress to percentage (0-100)
          const progressPercent = Math.round(info.progress * 100);
          console.log(`⚙️  OCR Progress: ${progressPercent}%`);
        }
      },
    };

    // Perform OCR using Tesseract.recognize()
    // This is the main OCR function that extracts text from image
    console.log('🚀 Running Tesseract OCR...');
    const result = await Tesseract.recognize(
      imageInput, // Image data (Buffer, path, or URL)
      language, // Language to recognize
      workerConfig // Configuration with progress logger
    );

    // Extract OCR results from Tesseract response
    // result.data contains all OCR information
    const ocrData = result.data;

    // Extract text from OCR result
    // ocrData.text: Full extracted text with line breaks
    const extractedText = ocrData.text;

    // Calculate overall confidence score
    // Confidence indicates how certain Tesseract is about the recognition
    // Range: 0-100 (higher is better)
    const confidence = calculateConfidence(ocrData);

    // Extract word-level data for detailed analysis
    // Each word has its own text, confidence, and bounding box
    const words = extractWordData(ocrData);

    // Extract line-level data
    // Groups words into lines
    const lines = extractLineData(ocrData);

    // Get text statistics
    const stats = getTextStatistics(extractedText, ocrData);

    // Determine if OCR quality is acceptable
    // Low confidence might indicate poor image quality or wrong language
    const isHighQuality = confidence >= 60; // 60% confidence threshold

    // Log OCR completion
    console.log('✅ OCR processing completed');
    console.log(`📊 Confidence: ${confidence.toFixed(2)}%`);
    console.log(`📝 Extracted ${words.length} words in ${lines.length} lines`);
    console.log(`🔤 Character count: ${stats.characterCount}`);

    // Return comprehensive OCR result
    return {
      // Success indicator
      success: true,

      // Extracted text (full text from the image)
      text: extractedText,

      // Overall confidence score (0-100)
      // Indicates OCR accuracy
      confidence: confidence,

      // Quality flag based on confidence threshold
      isHighQuality: isHighQuality,

      // Word-level data (array of word objects)
      // Each word includes: text, confidence, bounding box coordinates
      words: words,

      // Line-level data (array of line objects)
      // Each line includes: text, confidence, word count
      lines: lines,

      // Text statistics
      stats: stats,

      // OCR metadata
      metadata: {
        // Language used for OCR
        language: language,

        // Processing timestamp
        processedAt: new Date().toISOString(),

        // Tesseract version info
        version: ocrData.version || 'unknown',
      },
    };
  } catch (error) {
    // Log error details
    console.error('❌ OCR processing failed:', error.message);

    // Return error result
    return {
      // Failure indicator
      success: false,

      // Empty text on error
      text: '',

      // Zero confidence on error
      confidence: 0,

      // Not high quality on error
      isHighQuality: false,

      // Error information
      error: {
        // Error message
        message: error.message,

        // Error type/name
        type: error.name,

        // Full error stack (for debugging)
        stack: error.stack,
      },

      // Empty arrays for data fields
      words: [],
      lines: [],
      stats: {
        characterCount: 0,
        wordCount: 0,
        lineCount: 0,
      },

      // Metadata even on error
      metadata: {
        language: options.language || 'eng',
        processedAt: new Date().toISOString(),
        failed: true,
      },
    };
  }
};

/**
 * Download image from URL
 * Helper function to fetch images from remote URLs
 *
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>} - Image data as Buffer
 */
const downloadImageFromURL = async (url) => {
  try {
    // Send HTTP GET request to image URL
    const response = await fetch(url);

    // Check if request was successful
    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`
      );
    }

    // Get response as Buffer (binary data)
    const buffer = await response.buffer();

    // Validate buffer size
    if (buffer.length === 0) {
      throw new Error('Downloaded image is empty');
    }

    // Log download success
    console.log(`✅ Image downloaded: ${buffer.length} bytes`);

    // Return image buffer
    return buffer;
  } catch (error) {
    // Wrap and rethrow error with context
    throw new Error(`Image download failed: ${error.message}`);
  }
};

/**
 * Calculate overall confidence score from OCR data
 * Averages the confidence scores of all recognized words
 *
 * @param {Object} ocrData - Tesseract OCR result data
 * @returns {number} - Average confidence score (0-100)
 */
const calculateConfidence = (ocrData) => {
  // Check if words data exists
  if (!ocrData.words || ocrData.words.length === 0) {
    // Return 0 if no words were recognized
    return 0;
  }

  // Sum up all word confidence scores
  // Each word has a confidence property (0-100)
  const totalConfidence = ocrData.words.reduce((sum, word) => {
    // Add word confidence to sum
    // Use 0 if confidence is undefined
    return sum + (word.confidence || 0);
  }, 0);

  // Calculate average confidence
  // Divide total by number of words
  const averageConfidence = totalConfidence / ocrData.words.length;

  // Return rounded confidence score
  return Math.round(averageConfidence * 100) / 100;
};

/**
 * Extract word-level data from OCR results
 * Provides detailed information about each recognized word
 *
 * @param {Object} ocrData - Tesseract OCR result data
 * @returns {Array} - Array of word objects
 */
const extractWordData = (ocrData) => {
  // Check if words data exists
  if (!ocrData.words || ocrData.words.length === 0) {
    return [];
  }

  // Map each word to simplified object
  return ocrData.words.map((word, index) => {
    return {
      // Word index (position in text)
      index: index,

      // Word text content
      text: word.text,

      // Confidence score for this word (0-100)
      confidence: Math.round(word.confidence * 100) / 100,

      // Bounding box coordinates (x, y, width, height)
      // Useful for highlighting words in the original image
      bbox: {
        x: word.bbox.x0, // Left edge
        y: word.bbox.y0, // Top edge
        width: word.bbox.x1 - word.bbox.x0, // Width
        height: word.bbox.y1 - word.bbox.y0, // Height
      },

      // Base line coordinate (for text alignment)
      baseline: word.baseline,
    };
  });
};

/**
 * Extract line-level data from OCR results
 * Groups words into lines of text
 *
 * @param {Object} ocrData - Tesseract OCR result data
 * @returns {Array} - Array of line objects
 */
const extractLineData = (ocrData) => {
  // Check if lines data exists
  if (!ocrData.lines || ocrData.lines.length === 0) {
    return [];
  }

  // Map each line to simplified object
  return ocrData.lines.map((line, index) => {
    return {
      // Line index
      index: index,

      // Line text content
      text: line.text,

      // Average confidence for this line
      confidence: Math.round(line.confidence * 100) / 100,

      // Number of words in this line
      wordCount: line.words ? line.words.length : 0,

      // Bounding box for entire line
      bbox: {
        x: line.bbox.x0,
        y: line.bbox.y0,
        width: line.bbox.x1 - line.bbox.x0,
        height: line.bbox.y1 - line.bbox.y0,
      },
    };
  });
};

/**
 * Get text statistics from OCR results
 * Calculates various metrics about the extracted text
 *
 * @param {string} text - Extracted text
 * @param {Object} ocrData - Tesseract OCR result data
 * @returns {Object} - Statistics object
 */
const getTextStatistics = (text, ocrData) => {
  // Trim whitespace from text
  const trimmedText = text.trim();

  // Count characters (excluding whitespace)
  const characterCount = trimmedText.replace(/\s/g, '').length;

  // Count words (split by whitespace and filter empty strings)
  const words = trimmedText.split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;

  // Count lines (split by newline character)
  const lines = trimmedText.split('\n').filter((line) => line.trim().length > 0);
  const lineCount = lines.length;

  // Calculate average word length
  const avgWordLength =
    wordCount > 0
      ? Math.round(
          (words.reduce((sum, word) => sum + word.length, 0) / wordCount) * 100
        ) / 100
      : 0;

  // Count symbols (OCR sometimes recognizes symbols)
  const symbolCount = ocrData.symbols ? ocrData.symbols.length : 0;

  // Return statistics object
  return {
    // Total characters (excluding spaces)
    characterCount: characterCount,

    // Total words
    wordCount: wordCount,

    // Total lines
    lineCount: lineCount,

    // Average word length
    averageWordLength: avgWordLength,

    // Total symbols recognized
    symbolCount: symbolCount,

    // Text is empty
    isEmpty: characterCount === 0,
  };
};

/**
 * Default progress handler
 * Logs OCR progress to console
 *
 * @param {Object} info - Progress information from Tesseract
 */
const defaultProgressHandler = (info) => {
  // info.status: Current operation stage
  // info.progress: Progress value (0 to 1)

  // Only log important status updates
  if (
    info.status === 'loading tesseract core' ||
    info.status === 'initializing tesseract' ||
    info.status === 'loading language traineddata' ||
    info.status === 'initializing api' ||
    info.status === 'recognizing text'
  ) {
    // Calculate percentage
    const percent = info.progress ? Math.round(info.progress * 100) : 0;

    // Log status with progress bar
    const progressBar = '█'.repeat(percent / 5) + '░'.repeat(20 - percent / 5);
    console.log(`⚙️  ${info.status}: [${progressBar}] ${percent}%`);
  }
};

/**
 * Validate image before OCR
 * Checks if file is a valid image format
 *
 * @param {string} filePath - Path to image file
 * @returns {Promise<Object>} - Validation result
 */
const validateImage = async (filePath) => {
  try {
    // Check if file exists
    const stats = await fs.stat(filePath);

    // Check if it's a file (not directory)
    if (!stats.isFile()) {
      return {
        valid: false,
        error: 'Path is not a file',
      };
    }

    // Check file size (should be > 0 and < 50MB)
    if (stats.size === 0) {
      return {
        valid: false,
        error: 'File is empty',
      };
    }

    if (stats.size > 50 * 1024 * 1024) {
      // 50MB limit
      return {
        valid: false,
        error: 'File is too large (max 50MB)',
      };
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.pdf'];

    if (!validExtensions.includes(ext)) {
      return {
        valid: false,
        error: `Invalid file extension: ${ext}. Allowed: ${validExtensions.join(', ')}`,
      };
    }

    // All checks passed
    return {
      valid: true,
      size: stats.size,
      extension: ext,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
};

/**
 * Batch OCR processing for multiple images
 * Processes multiple images sequentially
 *
 * @param {Array} inputs - Array of file paths, URLs, or Buffers
 * @param {Object} options - OCR options
 * @returns {Promise<Array>} - Array of OCR results
 */
const batchExtractText = async (inputs, options = {}) => {
  // Validate inputs array
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('Inputs must be a non-empty array');
  }

  console.log(`📚 Starting batch OCR for ${inputs.length} images...`);

  // Process each image sequentially
  const results = [];
  for (let i = 0; i < inputs.length; i++) {
    console.log(`📄 Processing image ${i + 1}/${inputs.length}...`);

    // Process single image
    const result = await extractTextFromImage(inputs[i], options);

    // Add to results array
    results.push(result);

    // Log progress
    console.log(`✅ Completed ${i + 1}/${inputs.length}`);
  }

  console.log('🎉 Batch OCR completed');

  return results;
};

// Export all functions
module.exports = {
  extractTextFromImage, // Main OCR function
  validateImage, // Image validation
  batchExtractText, // Batch processing
  downloadImageFromURL, // URL download helper
};
