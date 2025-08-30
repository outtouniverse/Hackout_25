const Report = require('../models/Report');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Create new incident report
// @route   POST /reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const { type, description, photo, lat, lng } = req.body;

    // AI Image Analysis
    let aiAnalysis = null;
    let aiStatus = 'pending';
    let aiNotes = '';

    if (photo) {
      try {
        aiAnalysis = await analyzeImageWithAI(photo, type, description);
        aiStatus = aiAnalysis.isValid ? 'ai_approved' : 'ai_rejected';
        aiNotes = aiAnalysis.notes;
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        aiStatus = 'ai_error';
        aiNotes = 'AI analysis failed, manual review required';
      }
    }

    // Create location coordinates array for geospatial queries
    const location = {
      type: 'Point',
      coordinates: [lng, lat] // MongoDB expects [longitude, latitude]
    };

    const report = await Report.create({
      type,
      description,
      photo,
      lat,
      lng,
      location,
      userId: req.user.id,
      aiStatus,
      aiNotes,
      aiAnalysis
    });

    // Populate user details
    await report.populate('userId', 'name email role');

    // Send notification to user about AI analysis result
    if (aiAnalysis) {
      await sendAIAnalysisNotification(req.user.id, aiStatus, aiNotes);
    }

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: {
        ...report.toObject(),
        aiAnalysis: {
          status: aiStatus,
          notes: aiNotes,
          isValid: aiAnalysis?.isValid || false
        }
      }
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating report'
    });
  }
};

// ===== AI IMAGE ANALYSIS FUNCTIONS =====

// @desc    Analyze image with Gemini AI
// @access  Private
async function analyzeImageWithAI(imageUrl, reportType, description) {
  try {
    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    You are a mangrove conservation expert. Analyze this image specifically for mangrove-related incidents.
    
    Report Type: ${reportType}
    User Description: ${description}
    
    CRITICAL: Only analyze for MANGROVE-related incidents. Ignore other trees, plants, or unrelated content.
    
    Please determine if this image:
    1. Shows a valid MANGROVE incident (cutting, dumping, pollution, land reclamation of mangrove areas)
    2. Contains actual mangrove trees/ecosystem (not other types of trees)
    3. Is clear and identifiable for mangrove conservation purposes
    4. Shows evidence of mangrove destruction or threats
    
    MANGROVE IDENTIFICATION: Look for:
    - Prop roots (aerial roots above water)
    - Salt-tolerant leaves
    - Coastal/wetland environment
    - Intertidal zone characteristics
    
    Respond with JSON format only:
    {
      "isValid": true/false,
      "confidence": 0-100,
      "notes": "What you see in the image",
      "issues": "Any problems (blurry, not mangroves, irrelevant, etc.)",
      "recommendations": "How to improve the image for mangrove conservation",
      "mangroveEvidence": "Describe mangrove features or lack thereof"
    }
    
    IMPORTANT: If this is NOT a mangrove ecosystem, set isValid to false and explain why.
    `;

    // Create image part for Gemini
    // For now, we'll use the image URL directly since Gemini can handle URLs
    // In production, you might want to convert images to base64 for better security
    const result = await model.generateContent([prompt, imageUrl]);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiResponse;
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback parsing for non-JSON responses
      const lowerText = text.toLowerCase();
      aiResponse = {
        isValid: lowerText.includes('mangrove') && (lowerText.includes('valid') || lowerText.includes('appropriate')),
        confidence: 60,
        notes: text,
        issues: 'Could not parse AI response properly',
        recommendations: 'Manual review recommended for mangrove verification',
        mangroveEvidence: 'Response parsing failed - manual review needed'
      };
    }

    // Validate AI response structure
    const validatedResponse = {
      isValid: Boolean(aiResponse.isValid),
      confidence: Math.min(Math.max(Number(aiResponse.confidence) || 70, 0), 100),
      notes: String(aiResponse.notes || 'AI analysis completed'),
      issues: String(aiResponse.issues || 'None identified'),
      recommendations: String(aiResponse.recommendations || 'Image appears suitable'),
      mangroveEvidence: String(aiResponse.mangroveEvidence || 'Mangrove evidence not clearly identified'),
      timestamp: new Date(),
      model: 'gemini-2.0-flash'
    };

    return validatedResponse;

  } catch (error) {
    console.error('Gemini AI error:', error);
    
    // Provide specific error messages
    if (error.message.includes('API key')) {
      throw new Error('AI analysis not configured - please set GEMINI_API_KEY');
    } else if (error.message.includes('quota')) {
      throw new Error('AI analysis quota exceeded - please try again later');
    } else {
      throw new Error('AI analysis failed: ' + error.message);
    }
  }
}

// @desc    Send AI analysis notification to user
// @access  Private
async function sendAIAnalysisNotification(userId, aiStatus, aiNotes) {
  try {
    // This would integrate with your notification system
    // For now, we'll just log it
    console.log(`AI Analysis Notification for User ${userId}:`, {
      status: aiStatus,
      notes: aiNotes,
      timestamp: new Date()
    });

    // In a real implementation, you would:
    // 1. Send push notification
    // 2. Send email
    // 3. Store in notifications collection
    // 4. Update user's uploads section

  } catch (error) {
    console.error('Notification error:', error);
  }
}

// @desc    Get all reports (filterable)
// @route   GET /reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const { status, userId, type, aiStatus } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (type) filter.type = type;
    if (aiStatus) filter.aiStatus = aiStatus;

    const reports = await Report.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports'
    });
  }
};

// @desc    Get specific report
// @route   GET /reports/:id
// @access  Private
exports.getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('userId', 'name email role');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching report'
    });
  }
};

// @desc    Update a report (by user before validation)
// @route   PUT /reports/:id
// @access  Private
exports.updateReport = async (req, res) => {
  try {
    const { description, photo } = req.body;

    // Find report and check ownership
    let report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user owns the report
    if (report.userId.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this report'
      });
    }

    // Only allow updates if report is still open
    if (report.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update report after validation'
      });
    }

    // If photo is updated, re-run AI analysis
    let aiAnalysis = report.aiAnalysis;
    let aiStatus = report.aiStatus;
    let aiNotes = report.aiNotes;

    if (photo && photo !== report.photo) {
      try {
        aiAnalysis = await analyzeImageWithAI(photo, report.type, description || report.description);
        aiStatus = aiAnalysis.isValid ? 'ai_approved' : 'ai_rejected';
        aiNotes = aiAnalysis.notes;
      } catch (aiError) {
        console.error('AI analysis error on update:', aiError);
        aiStatus = 'ai_error';
        aiNotes = 'AI analysis failed, manual review required';
      }
    }

    // Update fields
    const fieldsToUpdate = {
      aiStatus,
      aiNotes,
      aiAnalysis
    };
    if (description !== undefined) fieldsToUpdate.description = description;
    if (photo !== undefined) fieldsToUpdate.photo = photo;

    report = await Report.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).populate('userId', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating report'
    });
  }
};

// @desc    Delete user's report
// @route   DELETE /reports/:id
// @access  Private
exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user owns the report
    if (report.userId.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this report'
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting report'
    });
  }
};

// ===== VALIDATION FUNCTIONS =====

// @desc    Validate report (AI-assisted + manual)
// @route   POST /reports/:id/validate
// @access  Private (Admin only)
exports.validateReport = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status || !['valid', 'invalid'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "valid" or "invalid"'
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Update report status and add validation notes
    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status: status === 'valid' ? 'validated' : 'rejected',
        validationNotes: notes || '',
        validatedAt: Date.now(),
        validatedBy: req.user.id
      },
      { new: true }
    ).populate('userId', 'name email role');

    res.status(200).json({
      success: true,
      message: `Report ${status === 'valid' ? 'validated' : 'rejected'} successfully`,
      data: updatedReport
    });
  } catch (error) {
    console.error('Validate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating report'
    });
  }
};

// @desc    Get all pending reports for validation
// @route   GET /reports/pending
// @access  Private (Admin only)
exports.getPendingReports = async (req, res) => {
  try {
    const pendingReports = await Report.find({ status: 'open' })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingReports.length,
      data: pendingReports
    });
  } catch (error) {
    console.error('Get pending reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports'
    });
  }
};

// @desc    Get AI analysis status for a report
// @route   GET /reports/:id/ai-analysis
// @access  Private
exports.getAIAnalysis = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .select('aiStatus aiNotes aiAnalysis userId');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user owns the report or is admin
    if (report.userId.toString() !== req.user.id && req.user.role !== 'govt') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view this analysis'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        aiStatus: report.aiStatus,
        aiNotes: report.aiNotes,
        aiAnalysis: report.aiAnalysis
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
