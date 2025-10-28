# Immigration CMS - Database Models

This directory contains all Mongoose models for the Immigration Client Management System.

## Models Overview

### 1. User Model (`User.js`)
Represents immigration clients in the system.

**Fields:**
- `name` - Client's full name (required, 2-100 chars)
- `email` - Unique email for authentication (required, validated)
- `country` - Reference to Country model (required)
- `password` - Hashed password (required, min 6 chars, not returned in queries)
- `progress` - Document upload progress percentage (0-100)
- `lastUpdated` - Last activity timestamp
- `status` - Application status (pending/in-progress/under-review/approved/rejected)
- `isEmailVerified` - Email verification status
- `role` - User role (client/admin)

**Features:**
- Automatic password hashing using bcrypt
- Password comparison method for authentication
- Progress calculation based on uploaded documents
- Virtual field to access user's documents
- Auto-update lastUpdated timestamp on changes

**Relations:**
- Belongs to one Country
- Has many Documents (virtual)
- Has many EmailLogs

---

### 2. Document Model (`Document.js`)
Represents uploaded immigration documents with OCR and AI processing.

**Fields:**
- `userId` - Reference to User (required, indexed)
- `docType` - Type of document (required, enum validated)
- `fileURL` - Cloudinary URL (required)
- `cloudinaryId` - Cloudinary public ID (required)
- `originalFilename` - Original filename (required)
- `fileSize` - File size in bytes (required)
- `mimeType` - File MIME type (required)
- `ocrText` - Extracted text from Tesseract.js (max 50,000 chars)
- `ocrStatus` - OCR processing status (pending/processing/completed/failed)
- `ocrError` - OCR error message
- `aiSummary` - AI-generated summary from Claude (max 2,000 chars)
- `aiFields` - Structured data extracted by Claude (Map)
- `aiStatus` - AI processing status (pending/processing/completed/failed)
- `aiError` - AI error message
- `uploadDate` - When document was uploaded
- `status` - Overall status (uploaded/processing/completed/failed)
- `verificationStatus` - Admin verification (unverified/verified/rejected)
- `adminNotes` - Admin notes (max 1,000 chars)
- `includedInReminder` - Email reminder tracking

**Features:**
- Automatic user progress update on save/delete
- Methods to check processing status
- Dashboard data formatting method
- Static method to find documents pending AI processing
- Converts Map fields to plain objects in JSON

**Relations:**
- Belongs to one User
- Updates User's lastUpdated and progress automatically

**Data Flow:**
```
1. Document Upload → Cloudinary
2. OCR Processing → Tesseract.js extracts ocrText
3. AI Processing → Claude analyzes ocrText
4. AI Output → aiSummary + aiFields (structured data)
5. Dashboard → Displays aiFields and aiSummary
```

---

### 3. Country Model (`Country.js`)
Represents immigration destination countries and their requirements.

**Fields:**
- `countryName` - Country name (required, unique, 2-100 chars)
- `countryCode` - ISO code (required, unique, 2 chars, uppercase)
- `requiredDocuments` - Array of required doc types (required, min 1 item)
- `documentDescriptions` - Human-readable descriptions (Map)
- `processingTimeDays` - Estimated processing time (1-730 days)
- `applicationFee` - Fee in USD (min 0)
- `additionalRequirements` - Extra notes (max 2,000 chars)
- `officialWebsite` - Immigration website URL
- `contactEmail` - Contact email
- `isActive` - Whether accepting applications
- `popularityRank` - Display order (default 999)

**Features:**
- Get all active countries sorted by popularity
- Find country by code
- Get user count for country
- Check if document type is required
- Generate checklist for specific user
- Seed method to populate common countries (US, CA, GB, AU)

**Relations:**
- Has many Users
- Defines document requirements for Users

---

### 4. EmailLog Model (`EmailLog.js`)
Tracks all emails sent by the system.

**Fields:**
- `userId` - Reference to User (required, indexed)
- `emailType` - Type of email (required, enum validated)
  - welcome, email-verification, password-reset
  - daily-reminder, document-uploaded, document-verified, document-rejected
  - progress-update, application-approved, application-rejected
  - deadline-warning, custom
- `recipientEmail` - Recipient email (required)
- `subject` - Email subject (required, max 200 chars)
- `body` - Email content (required, max 10,000 chars)
- `isHtml` - Whether body is HTML (default true)
- `sentAt` - When email was sent (indexed)
- `status` - Delivery status (pending/sent/failed/bounced)
- `errorMessage` - Error if failed (max 1,000 chars)
- `mailerResponse` - NodeMailer response data
- `retryCount` - Number of retry attempts (max 5)
- `nextRetryAt` - When to retry if failed
- `opened` - Email opened tracking
- `openedAt` - When email was opened
- `clicked` - Link clicked tracking
- `clickedAt` - When link was clicked
- `metadata` - Additional data (Map)
- `priority` - Send priority (low/normal/high)
- `batchId` - Batch send tracking

**Features:**
- Log email method
- Check if email type sent today (prevents duplicates)
- Get emails pending retry with exponential backoff
- Email statistics and engagement metrics
- Methods to mark as sent/failed/opened/clicked

**Relations:**
- Belongs to one User

---

## Model Relationships Diagram

```
┌─────────────┐
│   Country   │
│             │
│ - name      │
│ - code      │
│ - required  │
│   Docs[]    │
└──────┬──────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐          ┌──────────────┐
│    User     │◄─────────│  Document    │
│             │  1:N     │              │
│ - name      │          │ - docType    │
│ - email     │          │ - fileURL    │
│ - country   │          │ - ocrText    │
│ - progress  │          │ - aiSummary  │
│ - status    │          │ - aiFields   │
└──────┬──────┘          └──────────────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐
│  EmailLog   │
│             │
│ - userId    │
│ - type      │
│ - sentAt    │
│ - status    │
└─────────────┘
```

---

## OCR → Claude → Dashboard Data Flow

### Step-by-Step Process

1. **Document Upload**
   ```javascript
   // User uploads document
   const doc = new Document({
     userId: user._id,
     docType: 'passport',
     fileURL: cloudinaryUrl,
     cloudinaryId: cloudinaryId,
     // ... other file metadata
   });
   await doc.save();
   ```

2. **OCR Processing (Tesseract.js)**
   ```javascript
   // Extract text from uploaded image/PDF
   doc.ocrStatus = 'processing';
   await doc.save();

   const ocrResult = await Tesseract.recognize(imageBuffer);
   doc.ocrText = ocrResult.data.text;
   doc.ocrStatus = 'completed';
   await doc.save();
   ```

3. **AI Processing (Claude 3.5 Sonnet)**
   ```javascript
   // Send ocrText to Claude API
   doc.aiStatus = 'processing';
   await doc.save();

   const prompt = `Analyze this ${doc.docType} document and extract key information:

   ${doc.ocrText}

   Provide:
   1. A brief summary
   2. Structured data (name, ID numbers, dates, etc.)`;

   const claudeResponse = await callClaudeAPI(prompt);

   doc.aiSummary = claudeResponse.summary;
   doc.aiFields = new Map(Object.entries(claudeResponse.fields));
   doc.aiStatus = 'completed';
   doc.status = 'completed';
   await doc.save();
   ```

4. **Dashboard Display**
   ```javascript
   // Fetch document for dashboard
   const doc = await Document.findById(docId);
   const dashboardData = doc.getDashboardData();

   // dashboardData contains:
   // {
   //   id: '...',
   //   docType: 'passport',
   //   uploadDate: '...',
   //   status: 'completed',
   //   summary: 'US Passport issued to John Doe...',
   //   fields: {
   //     fullName: 'John Doe',
   //     passportNumber: 'AB1234567',
   //     dateOfBirth: '1990-01-15',
   //     expiryDate: '2030-01-15',
   //     nationality: 'USA'
   //   },
   //   fileURL: 'https://cloudinary.com/...'
   // }
   ```

5. **Progress Update**
   ```javascript
   // Automatically triggered after document save
   await User.updateProgress(userId);

   // Calculates: (uploaded required docs / total required docs) * 100
   // Updates user.progress field
   ```

---

## Usage Examples

### Import Models

```javascript
// Import all models
const { User, Document, Country, EmailLog } = require('./models');

// Or import individually
const User = require('./models/User');
```

### Create User

```javascript
const user = new User({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepass123',
  country: countryId, // ObjectId of Country
});
await user.save(); // Password automatically hashed
```

### Authenticate User

```javascript
const user = await User.findOne({ email }).select('+password');
const isMatch = await user.comparePassword(providedPassword);
```

### Create Document

```javascript
const doc = new Document({
  userId: user._id,
  docType: 'passport',
  fileURL: 'https://cloudinary.com/...',
  cloudinaryId: 'public_id',
  originalFilename: 'passport.jpg',
  fileSize: 1024000,
  mimeType: 'image/jpeg',
});
await doc.save(); // Triggers user progress update
```

### Get User's Document Checklist

```javascript
const user = await User.findById(userId).populate('country');
const checklist = await user.country.getChecklistForUser(userId);

// Returns array like:
// [
//   { docType: 'passport', description: '...', completed: true, document: {...} },
//   { docType: 'birth-certificate', description: '...', completed: false, document: null },
//   ...
// ]
```

### Log and Send Email

```javascript
const emailLog = await EmailLog.logEmail({
  userId: user._id,
  emailType: 'daily-reminder',
  recipientEmail: user.email,
  subject: 'Upload Missing Documents',
  body: '<p>You have 3 documents pending...</p>',
  metadata: new Map([
    ['missingDocuments', ['passport', 'birth-certificate']],
    ['progress', user.progress]
  ])
});

// Send via NodeMailer
const info = await transporter.sendMail({...});

// Update log
await emailLog.markAsSent(info);
```

### Check if Email Sent Today

```javascript
const sentToday = await EmailLog.sentTodayToUser(userId, 'daily-reminder');
if (!sentToday) {
  // Send reminder email
}
```

### Seed Countries

```javascript
await Country.seedCountries();
// Populates US, CA, GB, AU with default data
```

---

## Indexes

All models have optimized indexes for common query patterns:

**User:**
- `{ email: 1 }` - Authentication lookups
- `{ status: 1 }` - Filter by status
- `{ lastUpdated: -1 }` - Sort by activity

**Document:**
- `{ userId: 1, docType: 1 }` - User's documents by type
- `{ userId: 1, uploadDate: -1 }` - User's documents by date
- `{ status: 1 }` - Filter by status
- `{ verificationStatus: 1 }` - Admin verification queue

**Country:**
- `{ countryName: 1 }` - Name lookups
- `{ countryCode: 1 }` - Code lookups
- `{ isActive: 1, popularityRank: 1 }` - Active countries list

**EmailLog:**
- `{ userId: 1, sentAt: -1 }` - User's email history
- `{ emailType: 1 }` - Filter by type
- `{ status: 1, nextRetryAt: 1 }` - Retry queue
- `{ batchId: 1 }` - Batch operations

---

## Validation Rules

All models include comprehensive validation:
- Required fields
- String length constraints
- Email format validation
- URL format validation
- Enum value restrictions
- Numeric range constraints
- Custom validators

Validation errors are caught and returned with descriptive messages.

---

## Timestamps

All models automatically include:
- `createdAt` - When record was created
- `updatedAt` - When record was last modified

Managed by Mongoose `timestamps: true` option.

---

## Dependencies Required

```bash
npm install mongoose bcryptjs
```

**mongoose** - ODM for MongoDB
**bcryptjs** - Password hashing

---

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/immigration-cms
```

---

## Connection Example

```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));
```

---

## Notes

- All password operations use bcrypt with salt rounds = 10
- User progress is automatically calculated when documents change
- User lastUpdated is automatically updated when documents change
- Maps (aiFields, metadata, etc.) are converted to plain objects in JSON responses
- Email retry uses exponential backoff (2^retryCount minutes)
- Maximum 5 email retry attempts before giving up
- Document type enum values must match between Document and Country models
