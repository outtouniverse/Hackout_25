const User = require('../models/User');
const Report = require('../models/Report');

// @desc    Register new user (community, NGO, govt)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      location
    });

    // Create token
    const token = user.getSignedJwtToken();

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    User login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    const token = user.getSignedJwtToken();

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, location, photo } = req.body;

    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    if (location !== undefined) fieldsToUpdate.location = location;
    if (photo !== undefined) fieldsToUpdate.photo = photo;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// ===== ADMIN FUNCTIONS =====

// @desc    Get all users (filterable)
// @route   GET /admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status } = req.query;
    
    // Build filter object - exclude current admin user
    const filter = { _id: { $ne: req.user.id } };
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Ban user
// @route   PUT /admin/users/:id/ban
// @access  Private (Admin only)
exports.banUser = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Ban reason is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'banned',
        banReason: reason,
        bannedAt: Date.now()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User banned successfully',
      data: user
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while banning user'
    });
  }
};

// @desc    Get system-wide stats
// @route   GET /admin/stats
// @access  Private (Admin only)
exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalReports = await Report.countDocuments();
    const validatedReports = await Report.countDocuments({ status: 'validated' });
    
    // Calculate mangroves saved (example metric)
    const mangrovesSaved = validatedReports * 10; // Assuming each validated report saves 10 mangroves

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalReports,
        validatedReports,
        mangrovesSaved
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stats'
    });
  }
};

// @desc    Get heatmap view data
// @route   GET /admin/map
// @access  Private (Admin only)
exports.getMapData = async (req, res) => {
  try {
    const reports = await Report.find({})
      .select('lat lng type status')
      .sort({ createdAt: -1 });

    const mapData = reports.map(report => ({
      lat: report.lat,
      lng: report.lng,
      type: report.type,
      status: report.status
    }));

    res.status(200).json({
      success: true,
      count: mapData.length,
      data: mapData
    });
  } catch (error) {
    console.error('Get map data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching map data'
    });
  }
};

// ===== NOTIFICATION FUNCTIONS =====

// @desc    Send push/SMS/email notification
// @route   POST /notifications/send
// @access  Private (Admin only)
exports.sendNotification = async (req, res) => {
  try {
    const { userId, message, type } = req.body;

    if (!userId || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'userId, message, and type are required'
      });
    }

    if (!['push', 'sms', 'email'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be push, sms, or email'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Here you would integrate with actual notification services
    // For now, we'll simulate successful notification
    const notification = {
      id: Date.now().toString(),
      userId,
      message,
      type,
      sentAt: new Date(),
      status: 'sent'
    };

    res.status(200).json({
      success: true,
      message: `${type.toUpperCase()} notification sent successfully`,
      data: notification
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending notification'
    });
  }
};

// @desc    Get user's notifications
// @route   GET /notifications/:userId
// @access  Private (Admin only)
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Here you would fetch actual notifications from database
    // For now, we'll return mock data
    const notifications = [
      {
        id: '1',
        userId,
        message: 'Your report has been validated',
        type: 'push',
        sentAt: new Date(),
        status: 'read'
      },
      {
        id: '2',
        userId,
        message: 'New mangrove cutting incident reported nearby',
        type: 'email',
        sentAt: new Date(Date.now() - 86400000), // 1 day ago
        status: 'unread'
      }
    ];

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications'
    });
  }
};

// ===== GAMIFICATION FUNCTIONS =====

// @desc    Get top users by points
// @route   GET /gamification/leaderboard
// @access  Private
exports.getLeaderboard = async (req, res) => {
  try {
    const { region } = req.query;
    
    // Build filter for region if specified
    const filter = {};
    if (region) filter.location = { $regex: region, $options: 'i' };

    // Get users with their points and rank them
    const users = await User.find(filter)
      .select('name role location points reportsCount badges')
      .sort({ points: -1 })
      .limit(50); // Top 50 users

    // Add ranking
    const rankedUsers = users.map((user, index) => ({
      rank: index + 1,
      ...user.toObject()
    }));

    res.status(200).json({
      success: true,
      count: rankedUsers.length,
      data: rankedUsers
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaderboard'
    });
  }
};

// @desc    Get gamification details of a user
// @route   GET /gamification/user/:id
// @access  Private
exports.getUserGamification = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('name role points badges reportsCount achievements');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's reports count
    const reportsCount = await Report.countDocuments({ userId: id });

    // Calculate points based on reports and validations
    const validReports = await Report.countDocuments({ 
      userId: id, 
      status: 'validated' 
    });

    const points = (validReports * 100) + (reportsCount * 10);

    // Generate badges based on activity
    const badges = [];
    if (reportsCount >= 10) badges.push('Dedicated Reporter');
    if (validReports >= 5) badges.push('Trusted Source');
    if (reportsCount >= 50) badges.push('Mangrove Guardian');
    if (validReports >= 20) badges.push('Expert Validator');

    const gamificationData = {
      points,
      badges,
      reportsCount,
      validReports,
      achievements: {
        totalReports: reportsCount,
        validatedReports: validReports,
        accuracy: validReports > 0 ? Math.round((validReports / reportsCount) * 100) : 0
      }
    };

    res.status(200).json({
      success: true,
      data: gamificationData
    });
  } catch (error) {
    console.error('Get user gamification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user gamification'
    });
  }
};

// @desc    Redeem reward
// @route   POST /gamification/rewards/redeem
// @access  Private
exports.redeemReward = async (req, res) => {
  try {
    const { rewardId } = req.body;

    if (!rewardId) {
      return res.status(400).json({
        success: false,
        message: 'Reward ID is required'
      });
    }

    // Check if user has enough points
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Mock reward system - in real app, you'd have a rewards database
    const availableRewards = {
      'eco_merch': { name: 'Eco-friendly Merchandise', cost: 500, available: true },
      'tree_planting': { name: 'Tree Planting Certificate', cost: 1000, available: true },
      'conservation_workshop': { name: 'Conservation Workshop', cost: 2000, available: true }
    };

    const reward = availableRewards[rewardId];
    if (!reward || !reward.available) {
      return res.status(400).json({
        success: false,
        message: 'Reward not available'
      });
    }

    // Calculate user points (same logic as above)
    const reportsCount = await Report.countDocuments({ userId: req.user.id });
    const validReports = await Report.countDocuments({ 
      userId: req.user.id, 
      status: 'validated' 
    });
    const userPoints = (validReports * 100) + (reportsCount * 10);

    if (userPoints < reward.cost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient points to redeem this reward'
      });
    }

    // Redeem reward (in real app, you'd update user's rewards and points)
    const rewardDetails = {
      rewardId,
      rewardName: reward.name,
      redeemedAt: new Date(),
      pointsSpent: reward.cost,
      remainingPoints: userPoints - reward.cost
    };

    res.status(200).json({
      success: true,
      message: 'Reward redeemed successfully',
      data: rewardDetails
    });
  } catch (error) {
    console.error('Redeem reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while redeeming reward'
    });
  }
};
