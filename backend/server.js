// Load environment variables from .env file
// Must be called FIRST before other imports
require('dotenv').config();

// Import Express framework
const express = require('express');

// Import CORS middleware for cross-origin requests
const cors = require('cors');

// Import Cloudinary SDK and configure
const cloudinary = require('cloudinary').v2;

// Import database connection functions
const { connectDB, setupConnectionEvents } = require('./config/db');

// Import route modules
const userRoutes = require('./routes/user.routes');
const documentRoutes = require('./routes/document.routes');
const adminRoutes = require('./routes/admin.routes');
const aiRoutes = require('./routes/ai.routes');

/**
 * Configure Cloudinary
 * Required for document file uploads
 * Credentials from environment variables
 */
cloudinary.config({
  // Cloudinary cloud name from dashboard
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  // API key from dashboard
  api_key: process.env.CLOUDINARY_API_KEY,
  // API secret from dashboard (keep secure!)
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Initialize Express application
 */
const app = express();

/**
 * Connect to MongoDB database
 * Async function, but we don't await here - connection happens in background
 */
connectDB();

/**
 * Setup MongoDB connection event listeners
 * Handles disconnections, errors, and graceful shutdowns
 */
setupConnectionEvents();

/**
 * CORS Middleware
 * Allows frontend (React) to make requests to backend API
 * Configure origin based on environment
 */
app.use(
  cors({
    // Allow requests from frontend URL
    // In development: http://localhost:3000
    // In production: your deployed frontend URL
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    // Allow credentials (cookies, authorization headers)
    credentials: true,
    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    // Allowed headers in requests
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/**
 * Body Parser Middleware
 * Parses incoming request bodies
 */
// Parse JSON bodies (application/json)
app.use(express.json());
// Parses JSON and makes it available in req.body

// Parse URL-encoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
// extended: true allows nested objects in URL-encoded data

/**
 * Request Logging Middleware (Development only)
 * Logs all incoming requests for debugging
 */
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    // Log request method and URL
    console.log(`${req.method} ${req.path}`);
    // Continue to next middleware
    next();
  });
}

/**
 * Health Check Route
 * Simple endpoint to verify server is running
 */
app.get('/health', (req, res) => {
  // Return 200 OK with server status
  res.status(200).json({
    success: true,
    message: 'Immigration CMS API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 * Mount route modules under /api prefix
 */

// User routes: /api/users/*
// Handles registration, login, profile management
app.use('/api/users', userRoutes);

// Document routes: /api/documents/*
// Handles document upload, OCR, retrieval
app.use('/api/documents', documentRoutes);

// Admin routes: /api/admin/*
// Handles admin dashboard, user management
app.use('/api/admin', adminRoutes);

// AI routes: /api/ai/*
// Handles Claude API integration for document analysis
app.use('/api/ai', aiRoutes);

/**
 * Root Route
 * Welcome message for API
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Immigration Client Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users',
      documents: '/api/documents',
      admin: '/api/admin',
      ai: '/api/ai',
    },
  });
});

/**
 * 404 Handler
 * Catches all requests to undefined routes
 * Must be AFTER all other routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

/**
 * Global Error Handler
 * Catches all errors thrown in routes or middleware
 * Must be LAST middleware (after all routes)
 */
app.use((err, req, res, next) => {
  // Log error stack for debugging
  console.error('Error:', err.stack);

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    // Extract validation error messages
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  // Handle MongoDB duplicate key errors (unique constraint)
  if (err.code === 11000) {
    // Extract field name from error
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    // Only show error stack in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/**
 * Server Configuration
 * Get port from environment or use default
 */
const PORT = process.env.PORT || 5000;

/**
 * Start Server
 * Listen for incoming requests on specified port
 */
app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 Immigration CMS API Server Started');
  console.log('========================================');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log('========================================');
  console.log('📋 Available Endpoints:');
  console.log(`   GET  /health`);
  console.log(`   POST /api/users/register`);
  console.log(`   POST /api/users/login`);
  console.log(`   GET  /api/users/profile`);
  console.log(`   POST /api/documents/upload`);
  console.log(`   GET  /api/documents`);
  console.log(`   GET  /api/admin/stats`);
  console.log(`   POST /api/ai/process/:id`);
  console.log('========================================');
});

/**
 * Handle unhandled promise rejections
 * Catches any unhandled async errors
 */
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server and exit process
  process.exit(1);
});

/**
 * Handle uncaught exceptions
 * Catches any synchronous errors not handled
 */
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Close server and exit process
  process.exit(1);
});

// Export app for testing purposes
module.exports = app;
