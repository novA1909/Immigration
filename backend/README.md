# Immigration CMS - Backend API

Complete backend API for Immigration Client Management System with OCR, AI document analysis, and automated email reminders.

## 🏗️ Architecture

```
backend/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── user.controller.js    # User auth & profile management
│   ├── document.controller.js # Document upload & OCR
│   ├── admin.controller.js   # Admin dashboard & management
│   └── ai.controller.js      # Claude AI integration
├── middleware/
│   └── auth.js              # JWT authentication & authorization
├── models/
│   ├── User.js              # User model
│   ├── Document.js          # Document model
│   ├── Country.js           # Country model
│   └── EmailLog.js          # Email log model
├── routes/
│   ├── user.routes.js       # User routes
│   ├── document.routes.js   # Document routes
│   ├── admin.routes.js      # Admin routes
│   └── ai.routes.js         # AI routes
├── server.js                # Express app entry point
├── package.json             # Dependencies
└── .env.example             # Environment variables template
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment Variables

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and fill in your credentials
nano .env
```

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `ANTHROPIC_API_KEY` - Claude AI API key
- `EMAIL_FROM` - Email sender address
- `EMAIL_PASSWORD` - Email password/app password

### 3. Start Server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server will start on `http://localhost:5000`

## 📋 API Endpoints

### Public Routes (No Authentication)

```
POST   /api/users/register     Register new user
POST   /api/users/login        Login user
GET    /health                 Health check
```

### User Routes (Authentication Required)

```
GET    /api/users/profile      Get user profile
PUT    /api/users/profile      Update user profile
PUT    /api/users/password     Change password
```

### Document Routes (Authentication Required)

```
POST   /api/documents/upload           Upload document
GET    /api/documents                  Get all user documents
GET    /api/documents/checklist        Get document checklist
GET    /api/documents/:id              Get single document
DELETE /api/documents/:id              Delete document
POST   /api/documents/:id/retry-ocr    Retry OCR processing
```

### AI Routes (Authentication Required)

```
POST   /api/ai/process/:id    Manually trigger AI processing
GET    /api/ai/status/:id     Get AI processing status
```

### Admin Routes (Admin Role Required)

```
GET    /api/admin/stats                    Dashboard statistics
GET    /api/admin/users                    Get all users (with filters)
GET    /api/admin/users/:id                Get user details
PUT    /api/admin/users/:id/status         Update user status
DELETE /api/admin/users/:id                Delete user
GET    /api/admin/documents                Get all documents (with filters)
PUT    /api/admin/documents/:id/verify     Verify/reject document
```

## 🔄 Data Flow: OCR → Claude → Dashboard

1. **Document Upload**
   - User uploads file via `POST /api/documents/upload`
   - File saved to Cloudinary
   - Document record created in MongoDB
   - Status: `uploaded`

2. **OCR Processing (Automatic)**
   - Tesseract.js extracts text from image/PDF
   - `ocrText` field populated
   - `ocrStatus`: `processing` → `completed`

3. **AI Processing (Automatic)**
   - Claude 3.5 Sonnet analyzes `ocrText`
   - Generates `aiSummary` (2-3 sentence overview)
   - Extracts `aiFields` (structured data: name, dates, IDs, etc.)
   - `aiStatus`: `processing` → `completed`
   - Overall `status`: `completed`

4. **Dashboard Display**
   - Frontend fetches document
   - Displays `aiSummary` and `aiFields`
   - User sees extracted information without manual entry

## 🔐 Authentication

All protected routes require JWT token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Login Flow

1. User registers: `POST /api/users/register`
2. Receive JWT token in response
3. Include token in all subsequent requests
4. Token expires after 30 days (configurable in `.env`)

### Admin Access

Admin routes require:
1. Valid JWT token (authentication)
2. User role = 'admin' (authorization)

## 📝 Request Examples

### Register User

```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123",
    "country": "65f1234567890abcdef12345"
  }'
```

### Upload Document

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/passport.jpg" \
  -F "docType=passport"
```

### Get User Documents

```bash
curl -X GET http://localhost:5000/api/documents \
  -H "Authorization: Bearer <token>"
```

## 🔧 Dependencies

### Core Dependencies

- **express** (^4.18.2) - Web framework
- **mongoose** (^8.2.0) - MongoDB ODM
- **bcryptjs** (^2.4.3) - Password hashing
- **jsonwebtoken** (^9.0.2) - JWT authentication
- **cors** (^2.8.5) - CORS middleware
- **dotenv** (^16.4.5) - Environment variables

### File & Media

- **multer** (^1.4.5) - File upload handling
- **cloudinary** (^1.41.0) - Cloud storage

### AI & OCR

- **@anthropic-ai/sdk** (^0.20.0) - Claude AI integration
- **tesseract.js** (^5.0.4) - OCR text extraction

### Email

- **nodemailer** (^6.9.9) - Email sending
- **node-fetch** (^2.7.0) - HTTP requests

### Development

- **nodemon** (^3.0.3) - Auto-restart on changes

## 📦 Installation Command

```bash
npm install express mongoose bcryptjs jsonwebtoken cors dotenv multer cloudinary @anthropic-ai/sdk tesseract.js nodemailer node-fetch
```

Development:
```bash
npm install -D nodemon
```

## 🧪 Testing

Health check:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Immigration CMS API is running",
  "timestamp": "2024-03-15T10:30:00.000Z"
}
```

## 🔒 Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token authentication
- Role-based authorization (client/admin)
- File type validation (images and PDFs only)
- File size limits (10MB max)
- CORS protection
- MongoDB injection prevention (via Mongoose)
- Error handling with appropriate status codes

## 🐛 Error Handling

All errors return consistent format:

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error (development only)"
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## 📊 MongoDB Indexes

All models include optimized indexes for common queries:

**User Model:**
- `email` (unique)
- `status`
- `lastUpdated`

**Document Model:**
- `userId, docType` (compound)
- `userId, uploadDate` (compound)
- `status`
- `verificationStatus`

**EmailLog Model:**
- `userId, sentAt` (compound)
- `emailType`
- `status`
- `batchId`

## 🚨 Troubleshooting

### MongoDB Connection Failed

```
Error: MONGODB_URI is not defined
```

**Solution:** Add `MONGODB_URI` to `.env` file

### Cloudinary Upload Failed

```
Error: Must supply api_key
```

**Solution:** Add Cloudinary credentials to `.env`

### OCR Processing Stuck

Check console for Tesseract errors. Ensure:
- File is valid image or PDF
- File size < 10MB
- Tesseract.js installed correctly

### AI Processing Failed

```
Error: Invalid API key
```

**Solution:** Add valid `ANTHROPIC_API_KEY` to `.env`

## 📚 Additional Resources

- [Express Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)

## 📄 License

ISC
