const Upload = require('../models/Upload');
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Upload new image for AI review
// @route   POST /uploads
// @access  Private
exports.uploadImage = async (req, res) => {
  try {
    const { title, description, imageUrl, category, lat, lng, tags } = req.body;

    // Create location coordinates
    const location = {
      type: 'Point',
      coordinates: [lng, lat]
    };

    // Create upload
    const upload = await Upload.create({
      userId: req.user.id,
      title,
      description,
      imageUrl,
      category,
      location,
      tags: tags || []
    });

    // Start AI analysis in background
    analyzeUploadWithAI(upload._id, imageUrl, category, description);

    // Populate user details
    await upload.populate('userId', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully! AI analysis in progress...',
      data: upload
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading image'
    });
  }
};

// @desc    Get user's uploads
// @route   GET /uploads
// @access  Private
exports.getUserUploads = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    
    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const uploads = await Upload.find(filter)
      .populate('userId', 'name email role')
      .sort({ uploadDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Upload.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: uploads.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: uploads
    });

  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching uploads'
    });
  }
};

// @desc    Get specific upload
// @route   GET /uploads/:id
// @access  Private
exports.getUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id)
      .populate('userId', 'name email role');

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    // Check if user owns the upload or is admin
    if (upload.userId._id.toString() !== req.user.id && req.user.role !== 'govt') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view this upload'
      });
    }

    res.status(200).json({
      success: true,
      data: upload
    });

  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching upload'
    });
  }
};

// @desc    Get AI analysis results
// @route   GET /uploads/:id/ai-analysis
// @access  Private
exports.getAIAnalysis = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id)
      .select('aiAnalysis rewards userId');

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    // Check if user owns the upload or is admin
    if (upload.userId.toString() !== req.user.id && req.user.role !== 'govt') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view this analysis'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        aiAnalysis: upload.aiAnalysis,
        rewards: upload.rewards
      }
    });

  } catch (error) {
    console.error('Get AI analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching AI analysis'
    });
  }
};

// @desc    Get upload leaderboard
// @route   GET /uploads/leaderboard
// @access  Private
exports.getUploadLeaderboard = async (req, res) => {
  try {
    const { timeframe = 'month', category } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case 'week':
        dateFilter = { uploadDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { uploadDate: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
        break;
      case 'year':
        dateFilter = { uploadDate: { $gte: new Date(now.getFullYear(), 0, 1) } };
        break;
    }

    const filter = { ...dateFilter, 'rewards.status': 'approved' };
    if (category) filter.category = category;

    const leaderboard = await Upload.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$rewards.points' },
          totalUploads: { $sum: 1 },
          avgAccuracy: { $avg: '$aiAnalysis.accuracy' },
          avgQuality: { $avg: { $cond: [
            { $eq: ['$aiAnalysis.quality', 'excellent'] }, 4,
            { $cond: [
              { $eq: ['$aiAnalysis.quality', 'good'] }, 3,
              { $cond: [
                { $eq: ['$aiAnalysis.quality', 'fair'] }, 2, 1
              ]}
            ]}
          ]}},
          badges: { $addToSet: '$rewards.badges' }
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 20 }
    ]);

    // Populate user details
    const populatedLeaderboard = await Upload.populate(leaderboard, {
      path: '_id',
      select: 'name email role',
      model: 'User'
    });

    res.status(200).json({
      success: true,
      timeframe,
      category: category || 'all',
      data: populatedLeaderboard
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaderboard'
    });
  }
};

// ===== AI ANALYSIS FUNCTIONS =====

// @desc    Analyze upload with Gemini AI
// @access  Private
async function analyzeUploadWithAI(uploadId, imageUrl, category, description) {
  try {
    // Update status to analyzing
    await Upload.findByIdAndUpdate(uploadId, {
      'aiAnalysis.status': 'analyzing'
    });

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      await handleAIFailure(uploadId, 'Gemini API key not configured');
      return;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `
    You are a mangrove conservation expert. Analyze this image for mangrove-related content.
    
    Category: ${category}
    Description: ${description}
    
    CRITICAL: Only analyze for MANGROVE-related content. Ignore other trees, plants, or unrelated content.
    
    Please analyze this image and provide:
    1. Accuracy score (0-100): How well this image represents the described category
    2. Confidence score (0-100): How confident you are in your analysis
    3. Quality assessment: excellent/good/fair/poor
    4. Mangrove evidence: Describe what mangrove features you see
    5. Notes: Detailed analysis of the image
    6. Issues: Any problems with the image
    7. Recommendations: How to improve the image
    
    Respond with JSON format only:
    {
      "accuracy": 85,
      "confidence": 90,
      "quality": "good",
      "mangroveEvidence": "Clear prop roots visible, coastal environment",
      "notes": "Image shows healthy mangrove ecosystem with clear identification features",
      "issues": "Slight blur in background",
      "recommendations": "Image is good quality, shows clear mangrove features"
    }
    
    IMPORTANT: If this is NOT a mangrove ecosystem, set accuracy to 0 and explain why.
    `;

    const result = await model.generateContent([prompt, imageUrl]);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiResponse;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback parsing
      const lowerText = text.toLowerCase();
      aiResponse = {
        accuracy: lowerText.includes('mangrove') ? 60 : 0,
        confidence: 70,
        quality: 'fair',
        mangroveEvidence: 'Response parsing failed',
        notes: text,
        issues: 'Could not parse AI response properly',
        recommendations: 'Manual review recommended'
      };
    }

    // Validate and process AI response
    const validatedAnalysis = {
      status: 'completed',
      accuracy: Math.min(Math.max(Number(aiResponse.accuracy) || 0, 0), 100),
      confidence: Math.min(Math.max(Number(aiResponse.confidence) || 70, 0), 100),
      quality: ['excellent', 'good', 'fair', 'poor'].includes(aiResponse.quality) ? aiResponse.quality : 'fair',
      mangroveEvidence: String(aiResponse.mangroveEvidence || 'Mangrove evidence not clearly identified'),
      notes: String(aiResponse.notes || 'AI analysis completed'),
      issues: String(aiResponse.issues || 'None identified'),
      recommendations: String(aiResponse.recommendations || 'Image appears suitable'),
      analyzedAt: new Date()
    };

    // Calculate rewards
    const upload = await Upload.findById(uploadId);
    const points = upload.calculatePoints();
    const badges = upload.assignBadges();

    // Update upload with AI analysis and rewards
    await Upload.findByIdAndUpdate(uploadId, {
      aiAnalysis: validatedAnalysis,
      'rewards.points': points,
      'rewards.badges': badges,
      'rewards.status': points >= 30 ? 'approved' : 'rejected',
      'rewards.approvedAt': points >= 30 ? new Date() : null,
      status: points >= 30 ? 'approved' : 'rejected'
    });

    // Update user's total points
    await User.findByIdAndUpdate(upload.userId, {
      $inc: { totalPoints: points }
    });

    console.log(`AI analysis completed for upload ${uploadId}: ${points} points, ${badges.length} badges`);

  } catch (error) {
    console.error('AI analysis error:', error);
    await handleAIFailure(uploadId, error.message);
  }
}

// @desc    Handle AI analysis failure
// @access  Private
async function handleAIFailure(uploadId, errorMessage) {
  try {
    await Upload.findByIdAndUpdate(uploadId, {
      'aiAnalysis.status': 'failed',
      'aiAnalysis.notes': `AI analysis failed: ${errorMessage}`,
      'aiAnalysis.analyzedAt': new Date(),
      'rewards.status': 'rejected',
      status: 'rejected'
    });
  } catch (updateError) {
    console.error('Failed to update upload status:', updateError);
  }
}

// ===== ADMIN FUNCTIONS =====

// @desc    Get all uploads for admin review
// @route   GET /uploads/admin/all
// @access  Private (Admin only)
exports.getAllUploads = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const uploads = await Upload.find(filter)
      .populate('userId', 'name email role')
      .sort({ uploadDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Upload.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: uploads.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: uploads
    });

  } catch (error) {
    console.error('Get all uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching uploads'
    });
  }
};

// @desc    Approve/reject upload manually
// @route   PUT /uploads/:id/review
// @access  Private (Admin only)
exports.reviewUpload = async (req, res) => {
  try {
    const { action, notes } = req.body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    const upload = await Upload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    const isApproved = action === 'approve';
    
    // Update upload status
    await Upload.findByIdAndUpdate(req.params.id, {
      status: isApproved ? 'approved' : 'rejected',
      'rewards.status': isApproved ? 'approved' : 'rejected',
      'rewards.approvedAt': isApproved ? new Date() : null,
      'rewards.approvedBy': req.user.id
    });

    // If approved, ensure user gets points
    if (isApproved && upload.rewards.points === 0) {
      const points = upload.calculatePoints();
      await Upload.findByIdAndUpdate(req.params.id, {
        'rewards.points': points
      });
      
      // Update user's total points
      await User.findByIdAndUpdate(upload.userId, {
        $inc: { totalPoints: points }
      });
    }

    res.status(200).json({
      success: true,
      message: `Upload ${action}d successfully`,
      data: {
        status: isApproved ? 'approved' : 'rejected',
        points: upload.rewards.points
      }
    });

  } catch (error) {
    console.error('Review upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reviewing upload'
    });
  }
};

