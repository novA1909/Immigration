# Admin API Documentation

## Table of Contents
1. [JWT Authentication & Security](#jwt-authentication--security)
2. [API Endpoints](#api-endpoints)
   - [GET /api/admin/users](#1-get-apiadminusers)
   - [GET /api/admin/users/:id](#2-get-apiadminusersid)
   - [GET /api/admin/analytics](#3-get-apiadminanalytics)
3. [Sample JSON Outputs](#sample-json-outputs)
4. [Testing Guide](#testing-guide)

---

## JWT Authentication & Security

### How JWT Middleware Secures Admin Routes

All admin routes are protected by **two middleware functions** that run in sequence:

#### 1. `protect` Middleware (Authentication)
**Location:** `/backend/middleware/auth.js`

**Purpose:** Verifies that the user is logged in with a valid JWT token.

**How it works:**
```javascript
const protect = async (req, res, next) => {
  // 1. Extract JWT token from Authorization header
  let token = req.headers.authorization?.split(' ')[1];

  // 2. Verify token is valid and not expired
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3. Fetch user from database (without password)
  req.user = await User.findById(decoded.id).select('-password');

  // 4. If all checks pass, proceed to next middleware
  next();
};
```

**Security checks:**
- ✅ Token exists in Authorization header
- ✅ Token is properly formatted: `Bearer <token>`
- ✅ Token signature is valid (signed with JWT_SECRET)
- ✅ Token is not expired (30-day expiration)
- ✅ User still exists in database
- ✅ Attaches `req.user` object for downstream use

**Rejection scenarios:**
- ❌ No Authorization header → 401 Unauthorized
- ❌ Invalid token format → 401 Unauthorized
- ❌ Expired token → 401 Unauthorized
- ❌ User deleted from database → 401 Unauthorized

---

#### 2. `admin` Middleware (Authorization)
**Location:** `/backend/middleware/auth.js`

**Purpose:** Verifies that the authenticated user has admin privileges.

**How it works:**
```javascript
const admin = (req, res, next) => {
  // 1. Check if req.user exists (set by protect middleware)
  if (req.user && req.user.role === 'admin') {
    // 2. User is admin, proceed to controller
    next();
  } else {
    // 3. User is not admin, deny access
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};
```

**Security checks:**
- ✅ User is authenticated (req.user exists)
- ✅ User role is 'admin' (not 'client')

**Rejection scenarios:**
- ❌ User role is 'client' → 403 Forbidden
- ❌ req.user is null → 403 Forbidden

---

### Middleware Chain Example

```javascript
router.get('/analytics', protect, admin, getAnalytics);
```

**Execution order:**
1. **protect** → Verifies JWT token, sets req.user
2. **admin** → Checks req.user.role === 'admin'
3. **getAnalytics** → Controller function executes

**Security guarantee:**
Controller functions only execute if:
- User is authenticated (valid JWT)
- User has admin role

---

### JWT Token Structure

**Token generation (login/register):**
```javascript
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token valid for 30 days
  });
};
```

**Token payload (decoded):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "iat": 1704067200,
  "exp": 1706659200
}
```

**Client must send token in every request:**
```http
GET /api/admin/users HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## API Endpoints

### 1. GET /api/admin/users

**Description:** Retrieve all users with filtering, sorting, and pagination.

**Authentication:** Required (Admin only)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by application status (`pending`, `in-progress`, `under-review`, `approved`, `rejected`) |
| `country` | string | - | Filter by country ObjectId |
| `search` | string | - | Search in name or email (case-insensitive, partial match) |
| `minProgress` | number | - | Filter by minimum completion percentage (0-100) |
| `maxProgress` | number | - | Filter by maximum completion percentage (0-100) |
| `sortBy` | string | `lastUpdated` | Sort field (`createdAt`, `lastUpdated`, `progress`, `name`, `email`) |
| `order` | string | `desc` | Sort order (`asc` or `desc`) |
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Results per page (max 100) |

**Example Requests:**

```bash
# Get all users (first page, default sorting)
GET /api/admin/users

# Get users with 50-100% completion
GET /api/admin/users?minProgress=50&maxProgress=100

# Get pending users, sorted by name
GET /api/admin/users?status=pending&sortBy=name&order=asc

# Search for users with "john" in name/email
GET /api/admin/users?search=john

# Get approved users for Canada, page 2
GET /api/admin/users?country=65a1b2c3d4e5f6789012345&status=approved&page=2
```

**Response Format:**

```json
{
  "success": true,
  "count": 25,
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 3,
    "totalUsers": 25
  },
  "filters": {
    "status": "in-progress",
    "minProgress": 50,
    "maxProgress": 100
  },
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "John Michael Doe",
      "email": "john.doe@example.com",
      "phone": "+1-234-567-8900",
      "country": {
        "_id": "65a1b2c3d4e5f6789012345",
        "name": "Canada",
        "code": "CA",
        "flagUrl": "https://flagcdn.com/ca.svg"
      },
      "status": "in-progress",
      "progress": 75,
      "role": "client",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastUpdated": "2024-01-20T14:22:35.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "fullName": "Jane Mary Smith",
      "email": "jane.smith@example.com",
      "phone": "+1-234-567-8901",
      "country": {
        "_id": "65a1b2c3d4e5f6789012345",
        "name": "Canada",
        "code": "CA",
        "flagUrl": "https://flagcdn.com/ca.svg"
      },
      "status": "in-progress",
      "progress": 62,
      "role": "client",
      "createdAt": "2024-01-16T09:15:00.000Z",
      "lastUpdated": "2024-01-21T11:45:12.000Z"
    }
  ]
}
```

---

### 2. GET /api/admin/users/:id

**Description:** Retrieve detailed information about a specific user, including all documents with OCR text, AI analysis, and statistics.

**Authentication:** Required (Admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User's MongoDB ObjectId |

**Example Requests:**

```bash
GET /api/admin/users/507f1f77bcf86cd799439011
```

**Response Format:**

```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "John Michael Doe",
    "email": "john.doe@example.com",
    "phone": "+1-234-567-8900",
    "country": {
      "_id": "65a1b2c3d4e5f6789012345",
      "name": "Canada",
      "code": "CA",
      "flagUrl": "https://flagcdn.com/ca.svg",
      "requiredDocuments": [
        "passport",
        "birth-certificate",
        "educational-certificate",
        "employment-letter",
        "bank-statement",
        "police-clearance",
        "medical-certificate"
      ]
    },
    "status": "in-progress",
    "progress": 71,
    "role": "client",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "lastUpdated": "2024-01-20T14:22:35.000Z"
  },
  "documents": [
    {
      "_id": "65b2c3d4e5f67890123456a",
      "docType": "passport",
      "fileName": "passport_john_doe.jpg",
      "fileUrl": "https://res.cloudinary.com/demo/image/upload/v1234567890/passports/passport_john_doe.jpg",
      "fileSize": 2458123,
      "mimeType": "image/jpeg",
      "processingStatus": "completed",
      "verificationStatus": "verified",
      "ocrText": "PASSPORT\nUnited States of America\n\nType: P\nCode: USA\nPassport No: AB1234567\nSurname: DOE\nGiven Names: JOHN MICHAEL\nNationality: UNITED STATES OF AMERICA\nDate of birth: 22 MAR 1990\nPlace of birth: NEW YORK, USA\nSex: M\nDate of issue: 15 JAN 2020\nDate of expiry: 15 JAN 2030\nAuthority: U.S. DEPARTMENT OF STATE\n\nP<USADOE<<JOHN<MICHAEL<<<<<<<<<<<<<<<<<<\nAB12345670USA9003224M3001158<<<<<<<<<<<<<<<",
      "aiSummary": "This is a United States passport issued to John Michael Doe (passport number AB1234567) on January 15, 2020, with an expiry date of January 15, 2030. The passport holder is a U.S. citizen born on March 22, 1990. The document appears valid and current.",
      "aiFields": {
        "fullName": "John Michael Doe",
        "passportNumber": "AB1234567",
        "dateOfBirth": "1990-03-22",
        "placeOfBirth": "New York, USA",
        "nationality": "United States of America",
        "gender": "M",
        "issueDate": "2020-01-15",
        "expiryDate": "2030-01-15",
        "issuingAuthority": "United States"
      },
      "adminNotes": "Passport verified. Clear photo page, all details legible. OCR Confidence: 94.2%",
      "uploadedAt": "2024-01-15T11:20:00.000Z",
      "processedAt": "2024-01-15T11:21:15.000Z"
    },
    {
      "_id": "65b2c3d4e5f67890123456b",
      "docType": "birth-certificate",
      "fileName": "birth_certificate_scan.pdf",
      "fileUrl": "https://res.cloudinary.com/demo/image/upload/v1234567891/certificates/birth_certificate.pdf",
      "fileSize": 1856432,
      "mimeType": "application/pdf",
      "processingStatus": "completed",
      "verificationStatus": "verified",
      "ocrText": "CERTIFICATE OF LIVE BIRTH\n\nState of New York\nCity of New York\nDepartment of Health\n\nCERTIFICATE NUMBER: BC-1990-123456\n\nName of Child: JOHN MICHAEL DOE\nDate of Birth: March 22, 1990\nPlace of Birth: Mount Sinai Hospital, New York, NY\nSex: Male\n\nFather's Name: ROBERT JAMES DOE\nFather's Place of Birth: New York, USA\n\nMother's Name: MARIA ELIZABETH DOE\nMother's Maiden Name: SMITH\nMother's Place of Birth: New York, USA\n\nDate of Registration: March 25, 1990\nRegistrar's Signature: [Signature]\nRegistration Number: 1990-NY-123456",
      "aiSummary": "This birth certificate confirms the birth of John Michael Doe on March 22, 1990, in New York, New York. Parents listed are Robert James Doe (father) and Maria Elizabeth Doe (mother, maiden name Smith). Registration number BC-1990-123456.",
      "aiFields": {
        "fullName": "John Michael Doe",
        "dateOfBirth": "1990-03-22",
        "placeOfBirth": "Mount Sinai Hospital, New York, NY",
        "gender": "Male",
        "fatherName": "Robert James Doe",
        "motherName": "Maria Elizabeth Doe",
        "registrationNumber": "BC-1990-123456",
        "registrationDate": "1990-03-25",
        "issuingAuthority": "New York Department of Health"
      },
      "adminNotes": "Birth certificate verified. Official NYC certificate. OCR Confidence: 88.7%",
      "uploadedAt": "2024-01-16T09:45:00.000Z",
      "processedAt": "2024-01-16T09:46:33.000Z"
    },
    {
      "_id": "65b2c3d4e5f67890123456c",
      "docType": "educational-certificate",
      "fileName": "diploma_bachelor.jpg",
      "fileUrl": "https://res.cloudinary.com/demo/image/upload/v1234567892/education/diploma.jpg",
      "fileSize": 3124567,
      "mimeType": "image/jpeg",
      "processingStatus": "completed",
      "verificationStatus": "unverified",
      "ocrText": "NEW YORK UNIVERSITY\nTandon School of Engineering\n\nThis is to certify that\nJOHN MICHAEL DOE\n\nhas satisfied all requirements for the degree of\nBACHELOR OF SCIENCE\nIN COMPUTER SCIENCE\n\nAwarded on the Fifteenth Day of May\nTwo Thousand and Twelve\n\nWith Honors: Magna Cum Laude\n\nPresident's Signature: [Signature]\nDean's Signature: [Signature]\n\nCertificate Number: NYU-2012-CS-45678",
      "aiSummary": "Bachelor of Science degree in Computer Science from New York University Tandon School of Engineering, awarded to John Michael Doe on May 15, 2012, with Magna Cum Laude honors. Certificate number NYU-2012-CS-45678.",
      "aiFields": {
        "fullName": "John Michael Doe",
        "degree": "Bachelor of Science",
        "major": "Computer Science",
        "institution": "New York University - Tandon School of Engineering",
        "completionDate": "2012-05-15",
        "grade": "Magna Cum Laude",
        "certificateNumber": "NYU-2012-CS-45678"
      },
      "adminNotes": "Pending verification with NYU registrar. OCR Confidence: 91.3%",
      "uploadedAt": "2024-01-17T14:30:00.000Z",
      "processedAt": "2024-01-17T14:31:42.000Z"
    },
    {
      "_id": "65b2c3d4e5f67890123456d",
      "docType": "employment-letter",
      "fileName": "employment_verification_2024.pdf",
      "fileUrl": "https://res.cloudinary.com/demo/image/upload/v1234567893/employment/verification.pdf",
      "fileSize": 945621,
      "mimeType": "application/pdf",
      "processingStatus": "completed",
      "verificationStatus": "verified",
      "ocrText": "TECH INNOVATIONS INC.\n123 Silicon Valley Blvd, San Francisco, CA 94105\nPhone: (415) 555-0123 | Email: hr@techinnovations.com\n\nJanuary 10, 2024\n\nTO WHOM IT MAY CONCERN\n\nRE: EMPLOYMENT VERIFICATION FOR JOHN MICHAEL DOE\n\nThis letter confirms that Mr. John Michael Doe has been employed at Tech Innovations Inc. as a Senior Software Engineer since September 1, 2018.\n\nEmployment Details:\n- Position: Senior Software Engineer\n- Department: Cloud Infrastructure\n- Start Date: September 1, 2018\n- Employment Status: Full-time, Active\n- Annual Salary: $145,000 USD\n\nMr. Doe is a valued member of our engineering team and has consistently demonstrated excellent performance in his role. His employment with our company is ongoing and in good standing.\n\nIf you require any additional information, please contact our Human Resources department at the details provided above.\n\nSincerely,\n\nSarah Johnson\nHR Director\nTech Innovations Inc.\nEmployee ID: TI-2024-HR-042",
      "aiSummary": "This employment verification letter from Tech Innovations Inc. confirms that John Michael Doe has been employed as a Senior Software Engineer since September 1, 2018, with an annual salary of $145,000 USD. The letter is dated January 10, 2024, and signed by the HR Director Sarah Johnson.",
      "aiFields": {
        "fullName": "John Michael Doe",
        "position": "Senior Software Engineer",
        "companyName": "Tech Innovations Inc.",
        "startDate": "2018-09-01",
        "endDate": "current",
        "salary": "$145,000 USD",
        "letterDate": "2024-01-10",
        "signatoryName": "Sarah Johnson",
        "signatoryTitle": "HR Director"
      },
      "adminNotes": "Employment letter verified via company website. OCR Confidence: 96.1%",
      "uploadedAt": "2024-01-18T10:15:00.000Z",
      "processedAt": "2024-01-18T10:16:28.000Z"
    },
    {
      "_id": "65b2c3d4e5f67890123456e",
      "docType": "bank-statement",
      "fileName": "bank_statement_dec_2023.pdf",
      "fileUrl": "https://res.cloudinary.com/demo/image/upload/v1234567894/financial/statement.pdf",
      "fileSize": 1234567,
      "mimeType": "application/pdf",
      "processingStatus": "completed",
      "verificationStatus": "verified",
      "ocrText": "CHASE BANK\nPersonal Checking Account Statement\n\nAccount Holder: JOHN M DOE\nAccount Number: ****5678\nStatement Period: December 1-31, 2023\n\nAddress: 456 Park Avenue, Apt 12B\nNew York, NY 10022\n\nACCOUNT SUMMARY\nOpening Balance (Dec 1): $48,234.56\nTotal Deposits: $12,500.00\nTotal Withdrawals: $8,342.18\nClosing Balance (Dec 31): $52,392.38\n\nDETAILED TRANSACTIONS\n[Transaction details omitted for brevity]\n\nAverage Daily Balance: $50,418.22\nInterest Earned: $12.45\n\nFor questions, contact Chase Customer Service: 1-800-935-9935",
      "aiSummary": "Chase Bank personal checking account statement for John M Doe (account ending in 5678) for December 2023. Opening balance of $48,234.56, total deposits of $12,500.00, and closing balance of $52,392.38 USD.",
      "aiFields": {
        "accountHolderName": "John M Doe",
        "accountNumber": "****5678",
        "bankName": "Chase Bank",
        "statementPeriod": "December 1-31, 2023",
        "openingBalance": "$48,234.56 USD",
        "closingBalance": "$52,392.38 USD",
        "currency": "USD"
      },
      "adminNotes": "Bank statement verified. Sufficient funds demonstrated. OCR Confidence: 93.8%",
      "uploadedAt": "2024-01-19T16:20:00.000Z",
      "processedAt": "2024-01-19T16:21:55.000Z"
    }
  ],
  "statistics": {
    "totalDocuments": 5,
    "uploadedDocuments": 5,
    "requiredDocuments": 7,
    "remainingDocuments": 2,
    "verificationStats": {
      "verified": 4,
      "unverified": 1,
      "rejected": 0
    }
  },
  "recentEmails": [
    {
      "_id": "65c3d4e5f6789012345678a",
      "type": "welcome",
      "subject": "Welcome to Immigration CMS",
      "status": "delivered",
      "sentAt": "2024-01-15T10:35:00.000Z",
      "openedAt": "2024-01-15T11:02:15.000Z",
      "clickedAt": null
    },
    {
      "_id": "65c3d4e5f6789012345678b",
      "type": "document-reminder",
      "subject": "Document Upload Reminder",
      "status": "delivered",
      "sentAt": "2024-01-20T09:00:00.000Z",
      "openedAt": "2024-01-20T10:15:22.000Z",
      "clickedAt": "2024-01-20T10:16:05.000Z"
    }
  ]
}
```

**Key Features:**
- ✅ Complete user profile with country details
- ✅ All uploaded documents with full OCR text (admin-only)
- ✅ AI-generated summaries and extracted fields
- ✅ Verification status and admin notes
- ✅ Document statistics (uploaded vs required)
- ✅ Recent email logs with engagement tracking

---

### 3. GET /api/admin/analytics

**Description:** Retrieve comprehensive analytics data for the admin dashboard, including users per country, completion distribution, and overall statistics.

**Authentication:** Required (Admin only)

**Query Parameters:** None

**Example Request:**

```bash
GET /api/admin/analytics
```

**Response Format:**

```json
{
  "success": true,
  "usersByCountry": [
    {
      "country": {
        "_id": "65a1b2c3d4e5f6789012345",
        "name": "Canada",
        "code": "CA",
        "flagUrl": "https://flagcdn.com/ca.svg"
      },
      "totalUsers": 127,
      "averageProgress": 68.4,
      "statusBreakdown": {
        "pending": 15,
        "inProgress": 82,
        "underReview": 18,
        "approved": 10,
        "rejected": 2
      }
    },
    {
      "country": {
        "_id": "65a1b2c3d4e5f6789012346",
        "name": "United States",
        "code": "US",
        "flagUrl": "https://flagcdn.com/us.svg"
      },
      "totalUsers": 94,
      "averageProgress": 71.2,
      "statusBreakdown": {
        "pending": 8,
        "inProgress": 56,
        "underReview": 20,
        "approved": 8,
        "rejected": 2
      }
    },
    {
      "country": {
        "_id": "65a1b2c3d4e5f6789012347",
        "name": "United Kingdom",
        "code": "GB",
        "flagUrl": "https://flagcdn.com/gb.svg"
      },
      "totalUsers": 76,
      "averageProgress": 64.8,
      "statusBreakdown": {
        "pending": 12,
        "inProgress": 48,
        "underReview": 10,
        "approved": 5,
        "rejected": 1
      }
    },
    {
      "country": {
        "_id": "65a1b2c3d4e5f6789012348",
        "name": "Australia",
        "code": "AU",
        "flagUrl": "https://flagcdn.com/au.svg"
      },
      "totalUsers": 58,
      "averageProgress": 73.5,
      "statusBreakdown": {
        "pending": 5,
        "inProgress": 35,
        "underReview": 12,
        "approved": 5,
        "rejected": 1
      }
    },
    {
      "country": {
        "_id": "65a1b2c3d4e5f6789012349",
        "name": "Germany",
        "code": "DE",
        "flagUrl": "https://flagcdn.com/de.svg"
      },
      "totalUsers": 42,
      "averageProgress": 59.3,
      "statusBreakdown": {
        "pending": 8,
        "inProgress": 28,
        "underReview": 4,
        "approved": 2,
        "rejected": 0
      }
    }
  ],
  "completionStats": {
    "distribution": [
      {
        "range": "0-20%",
        "count": 45,
        "percentage": 11.3
      },
      {
        "range": "21-40%",
        "count": 68,
        "percentage": 17.1
      },
      {
        "range": "41-60%",
        "count": 92,
        "percentage": 23.1
      },
      {
        "range": "61-80%",
        "count": 124,
        "percentage": 31.2
      },
      {
        "range": "81-99%",
        "count": 58,
        "percentage": 14.6
      },
      {
        "range": "100%",
        "count": 10,
        "percentage": 2.5
      }
    ],
    "labels": ["0-20%", "21-40%", "41-60%", "61-80%", "81-99%", "100%"],
    "counts": [45, 68, 92, 124, 58, 10]
  },
  "overview": {
    "totalUsers": 397,
    "averageProgress": 67.8,
    "completionRate": 2.5,
    "completedUsers": 10
  }
}
```

**Analytics Breakdown:**

1. **usersByCountry** - Sorted by total users (descending)
   - Country details (name, code, flag)
   - Total users per country
   - Average completion progress (0-100%)
   - Status breakdown (pending, in-progress, under-review, approved, rejected)

2. **completionStats** - Distribution of users across completion ranges
   - Six ranges: 0-20%, 21-40%, 41-60%, 61-80%, 81-99%, 100%
   - Count and percentage for each range
   - Formatted for chart visualization (labels + counts arrays)

3. **overview** - Overall platform statistics
   - Total users across all countries
   - Average progress (weighted mean)
   - Completion rate (percentage with 100% progress)
   - Number of users with complete applications

---

## Sample JSON Outputs

### Scenario 1: Filter Users with 50%+ Completion

**Request:**
```bash
GET /api/admin/users?minProgress=50&sortBy=progress&order=desc&limit=5
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "count": 234,
  "pagination": {
    "page": 1,
    "limit": 5,
    "totalPages": 47,
    "totalUsers": 234
  },
  "filters": {
    "minProgress": 50
  },
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "Alice Johnson",
      "email": "alice@example.com",
      "phone": "+1-555-0101",
      "country": {
        "_id": "65a1b2c3d4e5f6789012345",
        "name": "Canada",
        "code": "CA",
        "flagUrl": "https://flagcdn.com/ca.svg"
      },
      "status": "under-review",
      "progress": 100,
      "role": "client",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "lastUpdated": "2024-01-22T16:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "fullName": "Bob Smith",
      "email": "bob@example.com",
      "phone": "+1-555-0102",
      "country": {
        "_id": "65a1b2c3d4e5f6789012346",
        "name": "United States",
        "code": "US",
        "flagUrl": "https://flagcdn.com/us.svg"
      },
      "status": "in-progress",
      "progress": 85,
      "role": "client",
      "createdAt": "2024-01-11T09:30:00.000Z",
      "lastUpdated": "2024-01-21T11:15:00.000Z"
    }
  ]
}
```

---

### Scenario 2: Search for User "John"

**Request:**
```bash
GET /api/admin/users?search=john&limit=3
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "count": 8,
  "pagination": {
    "page": 1,
    "limit": 3,
    "totalPages": 3,
    "totalUsers": 8
  },
  "filters": {
    "search": "john"
  },
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1-234-567-8900",
      "country": {
        "_id": "65a1b2c3d4e5f6789012345",
        "name": "Canada",
        "code": "CA"
      },
      "status": "in-progress",
      "progress": 71,
      "role": "client",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastUpdated": "2024-01-20T14:22:35.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "fullName": "Sarah Johnson",
      "email": "sarah.j@example.com",
      "phone": "+1-555-0103",
      "country": {
        "_id": "65a1b2c3d4e5f6789012346",
        "name": "United States",
        "code": "US"
      },
      "status": "approved",
      "progress": 100,
      "role": "client",
      "createdAt": "2024-01-12T14:00:00.000Z",
      "lastUpdated": "2024-01-23T09:45:00.000Z"
    }
  ]
}
```

---

### Scenario 3: Unauthorized Access (Non-Admin User)

**Request:**
```bash
GET /api/admin/analytics
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[CLIENT_TOKEN]
```

**Response:**
```json
{
  "message": "Access denied. Admin only."
}
```
**HTTP Status:** 403 Forbidden

---

### Scenario 4: Invalid JWT Token

**Request:**
```bash
GET /api/admin/users
Authorization: Bearer invalid_token_here
```

**Response:**
```json
{
  "message": "Not authorized, token failed"
}
```
**HTTP Status:** 401 Unauthorized

---

### Scenario 5: Missing Authorization Header

**Request:**
```bash
GET /api/admin/users
```

**Response:**
```json
{
  "message": "Not authorized, no token"
}
```
**HTTP Status:** 401 Unauthorized

---

## Testing Guide

### Prerequisites

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Obtain an admin JWT token:**
   - Login as admin user via POST `/api/users/login`
   - Copy the token from response

### Using curl

```bash
# Set your admin token
ADMIN_TOKEN="your_admin_jwt_token_here"

# Test 1: Get all users
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test 2: Filter by completion percentage
curl -X GET "http://localhost:5000/api/admin/users?minProgress=60&maxProgress=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test 3: Search for users
curl -X GET "http://localhost:5000/api/admin/users?search=john" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test 4: Get specific user details
curl -X GET http://localhost:5000/api/admin/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test 5: Get analytics
curl -X GET http://localhost:5000/api/admin/analytics \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test 6: Test without token (should fail)
curl -X GET http://localhost:5000/api/admin/users
```

### Using Postman

1. **Create a new collection:** "Admin API Tests"

2. **Set collection variables:**
   - `base_url`: `http://localhost:5000`
   - `admin_token`: Your admin JWT token

3. **Create requests:**

   **Request 1: Get All Users**
   - Method: GET
   - URL: `{{base_url}}/api/admin/users`
   - Headers: `Authorization: Bearer {{admin_token}}`

   **Request 2: Filter by Progress**
   - Method: GET
   - URL: `{{base_url}}/api/admin/users?minProgress=50&maxProgress=100`
   - Headers: `Authorization: Bearer {{admin_token}}`

   **Request 3: Get User Details**
   - Method: GET
   - URL: `{{base_url}}/api/admin/users/:userId`
   - Headers: `Authorization: Bearer {{admin_token}}`
   - Path Variables: `userId` (replace with actual user ID)

   **Request 4: Get Analytics**
   - Method: GET
   - URL: `{{base_url}}/api/admin/analytics`
   - Headers: `Authorization: Bearer {{admin_token}}`

### Using Thunder Client (VS Code Extension)

1. Install Thunder Client extension
2. Create new request
3. Set method and URL
4. Add Authorization header: `Bearer your_token_here`
5. Send request and view response

---

## Security Best Practices

### For Admins

1. **Keep JWT tokens secure:**
   - Never share tokens
   - Store tokens in secure storage (not localStorage for production)
   - Tokens expire after 30 days - re-login when expired

2. **Use HTTPS in production:**
   - All API calls should use HTTPS to encrypt tokens in transit
   - Never send tokens over HTTP

3. **Monitor unauthorized access attempts:**
   - Check server logs for 401/403 errors
   - Implement rate limiting for failed auth attempts

4. **Regular password updates:**
   - Change admin passwords regularly
   - Use strong passwords (min 8 characters, mixed case, numbers, symbols)

### For Developers

1. **JWT Secret protection:**
   - Use strong, random JWT_SECRET in .env
   - Never commit .env files to git
   - Rotate secrets periodically

2. **Token expiration:**
   - Current: 30 days
   - Adjust based on security requirements

3. **Middleware order matters:**
   ```javascript
   // Correct order
   router.get('/users', protect, admin, getAllUsers);

   // Wrong - admin would run before authentication
   router.get('/users', admin, protect, getAllUsers);
   ```

4. **Database query optimization:**
   - All admin routes use `.select('-password')` to exclude passwords
   - Pagination prevents server overload
   - Indexes on frequently queried fields (email, country, status)

---

## Error Reference

| HTTP Status | Error Message | Cause | Solution |
|-------------|---------------|-------|----------|
| 401 | "Not authorized, no token" | No Authorization header | Include `Authorization: Bearer <token>` header |
| 401 | "Not authorized, token failed" | Invalid or expired token | Login again to get new token |
| 403 | "Access denied. Admin only." | User is not admin | Login with admin account |
| 404 | "User not found" | Invalid user ID | Check user ID is correct |
| 500 | "Server Error" | Database or server issue | Check server logs, verify MongoDB connection |

---

## Contact & Support

For questions or issues with the Admin API:

- **Backend Developer:** Check `/backend/controllers/admin.controller.js`
- **Middleware:** Check `/backend/middleware/auth.js`
- **Routes:** Check `/backend/routes/admin.routes.js`
- **Server Logs:** Run `npm run dev` to see detailed logs

---

**Document Version:** 1.0
**Last Updated:** January 28, 2025
**API Version:** 1.0.0
