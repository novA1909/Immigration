// Import User and Country models for database operations
const User = require('../models/User');
const Country = require('../models/Country');

// Import generateToken function to create JWT tokens
const { generateToken } = require('../middleware/auth');

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    // Extract user data from request body
    // Destructuring: pulls specific properties from req.body object
    const { name, email, password, country } = req.body;

    // Validate required fields
    // Check if all required fields are provided
    if (!name || !email || !password || !country) {
      // Return 400 Bad Request if any required field is missing
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, country',
      });
    }

    // Check if user already exists with this email
    // findOne() returns first matching document or null
    const existingUser = await User.findOne({ email });

    // If user found, return error (email must be unique)
    if (existingUser) {
      // Return 400 Bad Request - user already registered
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Validate that the country exists in database
    // Ensures user can't register with invalid country ID
    const countryExists = await Country.findById(country);

    // If country not found, return error
    if (!countryExists) {
      // Return 400 Bad Request - invalid country ID
      return res.status(400).json({
        success: false,
        message: 'Invalid country selected',
      });
    }

    // Create new user in database
    // Password will be automatically hashed by User model's pre-save middleware
    const user = await User.create({
      name,
      email,
      password, // Will be hashed before saving
      country,
    });

    // Check if user was created successfully
    if (user) {
      // Generate JWT token for the new user
      // Token contains user ID and expires based on JWT_EXPIRE env variable
      const token = generateToken(user._id);

      // Return 201 Created with user data and token
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          // Return user data (password excluded by User model's toJSON)
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            country: user.country,
            progress: user.progress,
            status: user.status,
            role: user.role,
          },
          // JWT token for immediate authentication
          token,
        },
      });
    } else {
      // Return 400 Bad Request if user creation failed
      return res.status(400).json({
        success: false,
        message: 'Failed to create user',
      });
    }
  } catch (error) {
    // Log error for debugging
    console.error('Register error:', error);

    // Return 500 Internal Server Error for any unexpected errors
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/users/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    // Extract login credentials from request body
    const { email, password } = req.body;

    // Validate that both fields are provided
    if (!email || !password) {
      // Return 400 Bad Request if credentials missing
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user by email and include password field
    // .select('+password') is needed because password is excluded by default
    const user = await User.findOne({ email }).select('+password').populate('country', 'countryName countryCode');

    // Check if user exists
    if (!user) {
      // Return 401 Unauthorized if user not found
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare provided password with hashed password in database
    // comparePassword() is a method defined in User model
    // Returns true if passwords match, false otherwise
    const isPasswordMatch = await user.comparePassword(password);

    // Check if password matches
    if (!isPasswordMatch) {
      // Return 401 Unauthorized if password doesn't match
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token for authenticated user
    const token = generateToken(user._id);

    // Return 200 OK with user data and token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        // Return user data (password already excluded by toJSON)
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          country: user.country,
          progress: user.progress,
          status: user.status,
          role: user.role,
          lastUpdated: user.lastUpdated,
        },
        // JWT token for authentication in subsequent requests
        token,
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Login error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private (requires authentication)
 */
const getUserProfile = async (req, res) => {
  try {
    // req.user is set by protect middleware after token verification
    // Find user by ID and populate country details
    const user = await User.findById(req.user._id).populate('country', 'countryName countryCode requiredDocuments');

    // Check if user exists
    if (!user) {
      // Return 404 Not Found if user doesn't exist
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Return 200 OK with user profile data
    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          country: user.country,
          progress: user.progress,
          status: user.status,
          role: user.role,
          lastUpdated: user.lastUpdated,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Get profile error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: error.message,
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private (requires authentication)
 */
const updateUserProfile = async (req, res) => {
  try {
    // Find user by ID (from req.user set by protect middleware)
    const user = await User.findById(req.user._id);

    // Check if user exists
    if (!user) {
      // Return 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Extract fields to update from request body
    const { name, email, country } = req.body;

    // Update fields only if provided in request
    // This allows partial updates (update only name, or only email, etc.)
    if (name) {
      // Update name field
      user.name = name;
    }

    if (email) {
      // Check if new email is different from current email
      if (email !== user.email) {
        // Check if new email is already taken by another user
        const emailExists = await User.findOne({ email });

        if (emailExists) {
          // Return 400 Bad Request if email already in use
          return res.status(400).json({
            success: false,
            message: 'Email already in use',
          });
        }

        // Update email
        user.email = email;
        // Reset email verification status
        user.isEmailVerified = false;
      }
    }

    if (country) {
      // Validate that new country exists
      const countryExists = await Country.findById(country);

      if (!countryExists) {
        // Return 400 Bad Request if country invalid
        return res.status(400).json({
          success: false,
          message: 'Invalid country selected',
        });
      }

      // Update country
      user.country = country;
    }

    // Save updated user to database
    // Triggers pre-save middleware (lastUpdated will be updated)
    await user.save();

    // Populate country details for response
    await user.populate('country', 'countryName countryCode');

    // Return 200 OK with updated user data
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          country: user.country,
          progress: user.progress,
          status: user.status,
          role: user.role,
          lastUpdated: user.lastUpdated,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Update profile error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: error.message,
    });
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/users/password
 * @access  Private (requires authentication)
 */
const changePassword = async (req, res) => {
  try {
    // Extract passwords from request body
    const { currentPassword, newPassword } = req.body;

    // Validate that both fields are provided
    if (!currentPassword || !newPassword) {
      // Return 400 Bad Request
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password',
      });
    }

    // Find user with password field included
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      // Return 401 Unauthorized if current password is wrong
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    // Will be hashed automatically by pre-save middleware
    user.password = newPassword;

    // Save user with new password
    await user.save();

    // Return 200 OK
    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    // Log error for debugging
    console.error('Change password error:', error);

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Server error changing password',
      error: error.message,
    });
  }
};

// Export all controller functions for use in routes
module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
};
