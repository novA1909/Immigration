// Import mongoose ODM for MongoDB operations
const mongoose = require('mongoose');

/**
 * Connect to MongoDB Database
 * Establishes connection using connection string from environment variables
 * Handles both successful connections and errors
 */
const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variables
    // Format: mongodb://localhost:27017/immigration-cms
    // Or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/immigration-cms
    const mongoURI = process.env.MONGODB_URI;

    // Check if MongoDB URI is provided in environment variables
    if (!mongoURI) {
      // Throw error if URI is missing - prevents app from running without DB
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Attempt to connect to MongoDB with configuration options
    const conn = await mongoose.connect(mongoURI, {
      // Use new URL parser - required for MongoDB driver 4.0+
      useNewUrlParser: true,

      // Use new Server Discovery and Monitoring engine - required for MongoDB driver 4.0+
      useUnifiedTopology: true,
    });

    // Log successful connection with host information
    // conn.connection.host provides the MongoDB server hostname
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Return the connection object for potential use in other modules
    return conn;
  } catch (error) {
    // Log detailed error message if connection fails
    console.error('❌ MongoDB Connection Error:', error.message);

    // Exit process with failure code (1) to prevent app from running without database
    // In production, you might want to implement retry logic instead
    process.exit(1);
  }
};

/**
 * Handle MongoDB connection events
 * Sets up listeners for various connection states
 */
const setupConnectionEvents = () => {
  // Event: Connection disconnected
  // Fires when mongoose loses connection to MongoDB
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
  });

  // Event: Connection error after initial connection
  // Fires when there's an error with an established connection
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });

  // Event: Connection reconnected
  // Fires when mongoose successfully reconnects after disconnection
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully');
  });

  // Event: Process termination (SIGINT)
  // Gracefully close MongoDB connection when app is terminated
  process.on('SIGINT', async () => {
    // Close mongoose connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed due to app termination');
    // Exit process
    process.exit(0);
  });
};

// Export the connectDB function for use in server.js
module.exports = { connectDB, setupConnectionEvents };
