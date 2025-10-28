# Services Directory

This directory contains reusable service modules for the Immigration CMS backend.

## OCR Service (`ocrService.js`)

Comprehensive Optical Character Recognition service using Tesseract.js for extracting text from images.

### Features

- ✅ Text extraction from images (JPG, PNG, GIF, WebP, TIFF, PDF)
- ✅ Confidence score calculation (0-100%)
- ✅ Quality assessment (High/Low based on threshold)
- ✅ Word-level and line-level data extraction
- ✅ Text statistics (character count, word count, line count)
- ✅ Multiple input types (file path, Buffer, URL)
- ✅ Progress tracking with callbacks
- ✅ Multi-language support
- ✅ Comprehensive error handling
- ✅ Batch processing support
- ✅ Image validation

### Main Function: `extractTextFromImage()`

Extracts text from an image file with detailed metadata.

#### Parameters

```javascript
extractTextFromImage(input, options)
```

**input** (string | Buffer) - Required
- File path: `'/path/to/image.jpg'`
- URL: `'https://example.com/image.jpg'`
- Buffer: `Buffer.from(imageData)`

**options** (Object) - Optional
- `language` (string) - OCR language code (default: 'eng')
  - Examples: 'eng', 'spa', 'fra', 'eng+spa' (multiple)
  - Full list: https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html
- `onProgress` (Function) - Progress callback
  - Receives: `{ status: string, progress: number }`
- `preserveInterword` (boolean) - Preserve spaces between words (default: true)

#### Return Value

Returns a Promise that resolves to:

```javascript
{
  success: true,              // Operation success
  text: "Extracted text...",  // Full extracted text
  confidence: 85.42,          // Overall confidence (0-100)
  isHighQuality: true,        // Quality flag (confidence >= 60%)

  // Word-level data
  words: [
    {
      index: 0,
      text: "Hello",
      confidence: 92.5,
      bbox: { x: 10, y: 20, width: 50, height: 30 },
      baseline: { ... }
    },
    // ... more words
  ],

  // Line-level data
  lines: [
    {
      index: 0,
      text: "Hello World",
      confidence: 90.0,
      wordCount: 2,
      bbox: { x: 10, y: 20, width: 150, height: 30 }
    },
    // ... more lines
  ],

  // Text statistics
  stats: {
    characterCount: 1234,
    wordCount: 250,
    lineCount: 15,
    averageWordLength: 4.94,
    symbolCount: 1500,
    isEmpty: false
  },

  // Metadata
  metadata: {
    language: "eng",
    processedAt: "2024-03-15T10:30:00.000Z",
    version: "4.1.1"
  }
}
```

On error:

```javascript
{
  success: false,
  text: "",
  confidence: 0,
  isHighQuality: false,
  error: {
    message: "Error message",
    type: "ErrorType",
    stack: "..."
  },
  words: [],
  lines: [],
  stats: { characterCount: 0, wordCount: 0, lineCount: 0 },
  metadata: { language: "eng", processedAt: "...", failed: true }
}
```

### Usage Examples

#### Example 1: Basic Usage (URL)

```javascript
const { extractTextFromImage } = require('./services/ocrService');

// Extract text from Cloudinary URL
const result = await extractTextFromImage(
  'https://res.cloudinary.com/demo/image/upload/passport.jpg'
);

if (result.success) {
  console.log('Extracted Text:', result.text);
  console.log('Confidence:', result.confidence);
  console.log('Word Count:', result.stats.wordCount);
} else {
  console.error('OCR Failed:', result.error.message);
}
```

#### Example 2: With Progress Tracking

```javascript
const result = await extractTextFromImage(
  '/path/to/document.jpg',
  {
    language: 'eng',
    onProgress: (info) => {
      if (info.status === 'recognizing text') {
        const percent = Math.round(info.progress * 100);
        console.log(`Progress: ${percent}%`);
      }
    }
  }
);
```

#### Example 3: Multi-Language

```javascript
// Extract text in English and Spanish
const result = await extractTextFromImage(
  imageBuffer,
  { language: 'eng+spa' }
);
```

#### Example 4: With Quality Check

```javascript
const result = await extractTextFromImage(fileUrl);

if (result.success) {
  if (result.isHighQuality) {
    console.log('✅ High quality OCR');
  } else {
    console.log('⚠️ Low quality - may need manual review');
    console.log('Confidence:', result.confidence);
  }
}
```

#### Example 5: Using in Document Controller

```javascript
// In document.controller.js
const { extractTextFromImage } = require('../services/ocrService');

const processOCR = async (documentId) => {
  const document = await Document.findById(documentId);

  // Extract text from Cloudinary URL
  const ocrResult = await extractTextFromImage(
    document.fileURL,
    {
      language: 'eng',
      onProgress: (info) => {
        console.log(`OCR Progress: ${info.status}`);
      }
    }
  );

  if (ocrResult.success) {
    // Save results
    document.ocrText = ocrResult.text;
    document.ocrStatus = 'completed';

    // Save confidence in admin notes
    document.adminNotes = `Confidence: ${ocrResult.confidence}%`;

    await document.save();

    // Trigger AI processing
    processAIExtraction(documentId);
  } else {
    // Handle error
    document.ocrStatus = 'failed';
    document.ocrError = ocrResult.error.message;
    await document.save();
  }
};
```

### Additional Functions

#### `validateImage(filePath)`

Validates image file before OCR processing.

```javascript
const { validateImage } = require('./services/ocrService');

const validation = await validateImage('/path/to/image.jpg');

if (validation.valid) {
  console.log('Image is valid');
  console.log('Size:', validation.size, 'bytes');
  console.log('Extension:', validation.extension);
} else {
  console.error('Invalid image:', validation.error);
}
```

Returns:
```javascript
{
  valid: true,
  size: 1024000,
  extension: '.jpg'
}
// OR
{
  valid: false,
  error: 'Error message'
}
```

#### `batchExtractText(inputs, options)`

Process multiple images sequentially.

```javascript
const { batchExtractText } = require('./services/ocrService');

const results = await batchExtractText([
  '/path/to/passport.jpg',
  'https://example.com/certificate.jpg',
  imageBuffer
], { language: 'eng' });

results.forEach((result, index) => {
  if (result.success) {
    console.log(`Image ${index + 1}: ${result.stats.wordCount} words`);
  } else {
    console.error(`Image ${index + 1} failed: ${result.error.message}`);
  }
});
```

#### `downloadImageFromURL(url)`

Download image from URL as Buffer.

```javascript
const { downloadImageFromURL } = require('./services/ocrService');

const imageBuffer = await downloadImageFromURL(
  'https://example.com/document.jpg'
);

console.log('Downloaded:', imageBuffer.length, 'bytes');
```

### Integration with Document Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Document Upload Flow                     │
└─────────────────────────────────────────────────────────────┘

1. User uploads file
   POST /api/documents/upload
   ↓
   Multer middleware
   ↓
   File stored in memory (req.file.buffer)

2. Upload to Cloudinary
   uploadDocument() controller
   ↓
   cloudinary.uploader.upload_stream()
   ↓
   Returns secure_url

3. Save document to MongoDB
   Document.create()
   ↓
   Status: 'uploaded'
   ocrStatus: 'pending'

4. Trigger OCR (background)
   setImmediate(() => processOCR(docId))
   ↓
   Status: 'processing'
   ocrStatus: 'processing'

5. Call OCR Service
   extractTextFromImage(cloudinaryURL)
   ↓
   Download from Cloudinary
   ↓
   Run Tesseract.js
   ↓
   Extract text, confidence, words, lines
   ↓
   Calculate statistics

6. Save OCR Results
   document.ocrText = result.text
   document.ocrStatus = 'completed'
   document.adminNotes += confidence score
   ↓
   Save to database

7. Trigger AI Processing (background)
   setImmediate(() => processAIExtraction(docId))
   ↓
   Claude analyzes ocrText
   ↓
   Generates summary + structured fields

8. Complete
   Status: 'completed'
   aiStatus: 'completed'
   ↓
   Ready for dashboard display
```

### Configuration

#### Language Support

Tesseract supports 100+ languages. Common codes:

| Language | Code |
|----------|------|
| English | eng |
| Spanish | spa |
| French | fra |
| German | deu |
| Chinese (Simplified) | chi_sim |
| Arabic | ara |
| Hindi | hin |
| Multiple | eng+spa+fra |

#### Confidence Thresholds

- **High Quality**: >= 60%
- **Medium Quality**: 40-59%
- **Low Quality**: < 40%

You can adjust the threshold in `ocrService.js:398`:
```javascript
const isHighQuality = confidence >= 60; // Change this value
```

### Performance

Typical OCR processing times:

| Image Size | Resolution | Processing Time |
|------------|------------|-----------------|
| 500KB | 1920x1080 | 3-5 seconds |
| 1MB | 2560x1440 | 5-8 seconds |
| 2MB | 3840x2160 | 10-15 seconds |
| PDF (5 pages) | 300 DPI | 30-45 seconds |

### Error Handling

The service returns structured error information:

```javascript
const result = await extractTextFromImage(invalidInput);

if (!result.success) {
  console.error('Error:', result.error.message);
  // Example: "Failed to download image: 404 Not Found"

  console.error('Type:', result.error.type);
  // Example: "Error"

  console.error('Stack:', result.error.stack);
  // Full error stack for debugging
}
```

Common errors:
- "Input is required for OCR processing"
- "Failed to download image: 404 Not Found"
- "Downloaded image is empty"
- "Input must be a file path, URL, or Buffer"

### Best Practices

1. **Always check `success` flag**:
   ```javascript
   if (result.success) {
     // Use result.text
   } else {
     // Handle result.error
   }
   ```

2. **Monitor confidence scores**:
   ```javascript
   if (result.confidence < 60) {
     // Flag for manual review
   }
   ```

3. **Use appropriate language**:
   ```javascript
   // For documents in Spanish
   extractTextFromImage(url, { language: 'spa' })
   ```

4. **Handle progress for long operations**:
   ```javascript
   extractTextFromImage(url, {
     onProgress: (info) => {
       // Update UI or log progress
     }
   })
   ```

5. **Validate images before processing**:
   ```javascript
   const validation = await validateImage(filePath);
   if (validation.valid) {
     const result = await extractTextFromImage(filePath);
   }
   ```

### Testing

```javascript
// Test with sample image
const result = await extractTextFromImage(
  'https://tesseract.projectnaptha.com/img/eng_bw.png'
);

console.log('Text:', result.text);
console.log('Confidence:', result.confidence);
console.log('Words:', result.words.length);
```

### Troubleshooting

**Problem**: Low confidence scores

**Solutions**:
- Ensure image is high resolution (300 DPI recommended)
- Use correct language code
- Check image is not blurry or distorted
- Ensure good contrast between text and background

**Problem**: No text extracted

**Solutions**:
- Verify image contains actual text
- Check image is not corrupted
- Ensure correct file format
- Try with different language code

**Problem**: Processing too slow

**Solutions**:
- Reduce image size before upload
- Process in background (already implemented)
- Consider using worker pool for multiple concurrent OCRs

### Dependencies

- **tesseract.js** (^5.0.4) - OCR engine
- **node-fetch** (^2.7.0) - Download images from URLs

### Related Files

- `backend/services/ocrService.js` - OCR service implementation
- `backend/controllers/document.controller.js` - Uses OCR service (line 169)
- `backend/controllers/ai.controller.js` - Uses OCR results for AI processing
- `backend/models/Document.js` - Stores OCR results

### Future Enhancements

- [ ] Image preprocessing (brightness, contrast, rotation)
- [ ] Multi-page PDF support
- [ ] Parallel processing for batch operations
- [ ] Caching OCR results
- [ ] Alternative OCR engines (Google Vision, AWS Textract)
- [ ] Custom training data for specific document types
- [ ] Spell checking and correction
- [ ] Layout analysis and table extraction
