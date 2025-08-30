const User = require("../models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose"); // Added for mongoose.Types.ObjectId

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Upload new image for AI review
// @route   POST /uploads
// @access  Private
const Upload = require("../models/Upload");
const cloudinary = require("cloudinary").v2;

exports.uploadImage = async (req, res) => {
  try {
    const { title, description, imageBase64, category, lat, lng, tags } =
      req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Image data is required",
      });
    }

    // Create a data URI for uploading
    const imageToUpload = `data:image/jpeg;base64,${imageBase64}`;

    // Upload image to Cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(imageToUpload, {
      folder: "mangrove",
      resource_type: "image",
    });

    console.log("successfuly uploaded image to cloudinary");

    const location = {
      type: "Point",
      coordinates: [parseFloat(lng), parseFloat(lat)],
    };

    const upload = await Upload.create({
      userId: req.user.id,
      title,
      description,
      imageUrl: cloudinaryResponse.secure_url, // <-- Store the short URL
      category,
      location,
      tags: tags || [],
    });

    // Pass the Cloudinary URL to the AI analysis
    analyzeUploadWithAI(
      upload._id,
      cloudinaryResponse.secure_url,
      category,
      description
    );

    await upload.populate("userId", "name email role");

    console.log(upload);

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully! AI analysis in progress...",
      data: upload,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading image",
    });
  }
};

// @desc    Get user's uploads
// @route   GET /uploads
// @access  Private
exports.getUserUploads = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 50 } = req.query;

    const filter = { userId: req.user.id };
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;

    console.log(
      `Fetching uploads for user ${req.user.id} with filter:`,
      filter
    );

    const uploads = await Upload.find(filter)
      .populate("userId", "name email role")
      .sort({ uploadDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Upload.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: uploads.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: uploads,
    });
  } catch (error) {
    console.error("Get uploads error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching uploads",
    });
  }
};

// @desc    Get user upload statistics
// @route   GET /uploads/stats
// @access  Private
exports.getUserUploadStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic counts
    const totalUploads = await Upload.countDocuments({ userId });
    const pendingUploads = await Upload.countDocuments({
      userId,
      status: "pending",
    });
    const approvedUploads = await Upload.countDocuments({
      userId,
      status: "approved",
    });
    const rejectedUploads = await Upload.countDocuments({
      userId,
      status: "rejected",
    });

    // Get points and rewards
    const uploadsWithRewards = await Upload.find({
      userId,
      "rewards.points": { $gt: 0 },
    });
    const totalPoints = uploadsWithRewards.reduce(
      (sum, upload) => sum + (upload.rewards.points || 0),
      0
    );

    // Get AI analysis stats
    const completedAnalysis = await Upload.find({
      userId,
      "aiAnalysis.status": "completed",
    });

    const avgAccuracy =
      completedAnalysis.length > 0
        ? completedAnalysis.reduce(
            (sum, upload) => sum + (upload.aiAnalysis.accuracy || 0),
            0
          ) / completedAnalysis.length
        : 0;

    // Get category distribution
    const categoryStats = await Upload.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const recentActivity = await Upload.find({ userId })
      .sort({ uploadDate: -1 })
      .limit(5)
      .select("title status uploadDate category");

    const stats = {
      totalUploads,
      pendingUploads,
      approvedUploads,
      rejectedUploads,
      totalPoints: Math.round(totalPoints),
      avgAccuracy: Math.round(avgAccuracy),
      categoryDistribution: categoryStats,
      recentActivity,
    };

    console.log(`Upload stats for user ${userId}:`, stats);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get upload stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upload statistics",
    });
  }
};

// @desc    Get specific upload
// @route   GET /uploads/:id
// @access  Private
exports.getUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id).populate(
      "userId",
      "name email role"
    );

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    // Check if user owns the upload or is admin
    if (
      upload.userId._id.toString() !== req.user.id &&
      req.user.role !== "govt"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to view this upload",
      });
    }

    res.status(200).json({
      success: true,
      data: upload,
    });
  } catch (error) {
    console.error("Get upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upload",
    });
  }
};

// @desc    Get AI analysis results
// @route   GET /uploads/:id/ai-analysis
// @access  Private
exports.getAIAnalysis = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id).select(
      "aiAnalysis rewards userId"
    );

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    // Check if user owns the upload or is admin
    if (upload.userId.toString() !== req.user.id && req.user.role !== "govt") {
      return res.status(401).json({
        success: false,
        message: "Not authorized to view this analysis",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        aiAnalysis: upload.aiAnalysis,
        rewards: upload.rewards,
      },
    });
  } catch (error) {
    console.error("Get AI analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching AI analysis",
    });
  }
};

// @desc    Get upload leaderboard
// @route   GET /uploads/leaderboard
// @access  Private
exports.getUploadLeaderboard = async (req, res) => {
  try {
    const { timeframe = "month", category } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (timeframe) {
      case "week":
        dateFilter = {
          uploadDate: {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case "month":
        dateFilter = {
          uploadDate: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        };
        break;
      case "year":
        dateFilter = {
          uploadDate: { $gte: new Date(now.getFullYear(), 0, 1) },
        };
        break;
    }

    const filter = { ...dateFilter, "rewards.status": "approved" };
    if (category) filter.category = category;

    const leaderboard = await Upload.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$userId",
          totalPoints: { $sum: "$rewards.points" },
          totalUploads: { $sum: 1 },
          avgAccuracy: { $avg: "$aiAnalysis.accuracy" },
          avgQuality: {
            $avg: {
              $cond: [
                { $eq: ["$aiAnalysis.quality", "excellent"] },
                4,
                {
                  $cond: [
                    { $eq: ["$aiAnalysis.quality", "good"] },
                    3,
                    { $cond: [{ $eq: ["$aiAnalysis.quality", "fair"] }, 2, 1] },
                  ],
                },
              ],
            },
          },
          badges: { $addToSet: "$rewards.badges" },
        },
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 20 },
    ]);

    // Populate user details
    const populatedLeaderboard = await Upload.populate(leaderboard, {
      path: "_id",
      select: "name email role",
      model: "User",
    });

    res.status(200).json({
      success: true,
      timeframe,
      category: category || "all",
      data: populatedLeaderboard,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching leaderboard",
    });
  }
};

// ===== AI ANALYSIS FUNCTIONS =====

// @desc    Analyze upload with Gemini AI
// @access  Private
// async function analyzeUploadWithAI(uploadId, imageUrl, category, description) {
//   try {
//     // Update status to analyzing
//     await Upload.findByIdAndUpdate(uploadId, {
//       "aiAnalysis.status": "analyzing",
//     });

//     // Check if Gemini API key is available
//     if (!process.env.GEMINI_API_KEY) {
//       await handleAIFailure(uploadId, "Gemini API key not configured");
//       return;
//     }

//     const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

//     // Convert base64 to image data for AI analysis
//     const imageData = {
//       fileData: {
//         fileUri: imageUrl, // direct Cloudinary URL
//         mimeType: "image/jpeg",
//       },
//     };

//     const prompt = `
//     You are a mangrove conservation expert. Analyze this image for mangrove-related content.

//     Category: ${category}
//     Description: ${description}

//     CRITICAL: Only analyze for MANGROVE-related content. Ignore other trees, plants, or unrelated content.

//     Please analyze this image and provide:
//     1. Accuracy score (0-100): How well this image represents the described category
//     2. Confidence score (0-100): How confident you are in your analysis
//     3. Quality assessment: excellent/good/fair/poor
//     4. Mangrove evidence: Describe what mangrove features you see
//     5. Notes: Detailed analysis of the image
//     6. Issues: Any problems with the image
//     7. Recommendations: How to improve the image

//     Respond with JSON format only:
//     {
//       "accuracy": 85,
//       "confidence": 90,
//       "quality": "good",
//       "mangroveEvidence": "Clear prop roots visible, coastal environment",
//       "notes": "Image shows healthy mangrove ecosystem with clear identification features",
//       "issues": "Slight blur in background",
//       "recommendations": "Image is good quality, shows clear mangrove features"
//     }

//     IMPORTANT: If this is NOT a mangrove ecosystem, set accuracy to 0 and explain why.
//     `;

//     const result = await model.generateContent([prompt, imageData]);
//     const response = await result.response;
//     const text = response.text();

//     // Parse AI response
//     let aiResponse;
//     try {
//       const jsonMatch = text.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         aiResponse = JSON.parse(jsonMatch[0]);
//       } else {
//         throw new Error("No JSON found in response");
//       }
//     } catch (parseError) {
//       // Fallback parsing
//       const lowerText = text.toLowerCase();
//       aiResponse = {
//         accuracy: lowerText.includes("mangrove") ? 60 : 0,
//         confidence: 70,
//         quality: "fair",
//         mangroveEvidence: "Response parsing failed",
//         notes: text,
//         issues: "Could not parse AI response properly",
//         recommendations: "Manual review recommended",
//       };
//     }

//     // Validate and process AI response
//     const validatedAnalysis = {
//       status: "completed",
//       accuracy: Math.min(Math.max(Number(aiResponse.accuracy) || 0, 0), 100),
//       confidence: Math.min(
//         Math.max(Number(aiResponse.confidence) || 70, 0),
//         100
//       ),
//       quality: ["excellent", "good", "fair", "poor"].includes(
//         aiResponse.quality
//       )
//         ? aiResponse.quality
//         : "fair",
//       mangroveEvidence: String(
//         aiResponse.mangroveEvidence ||
//           "Mangrove evidence not clearly identified"
//       ),
//       notes: String(aiResponse.notes || "AI analysis completed"),
//       issues: String(aiResponse.issues || "None identified"),
//       recommendations: String(
//         aiResponse.recommendations || "Image appears suitable"
//       ),
//       analyzedAt: new Date(),
//     };

//     // Calculate rewards
//     const upload = await Upload.findById(uploadId);
//     const points = upload.calculatePoints();
//     const badges = upload.assignBadges();

//     // Update upload with AI analysis and rewards
//     await Upload.findByIdAndUpdate(uploadId, {
//       aiAnalysis: validatedAnalysis,
//       "rewards.points": points,
//       "rewards.badges": badges,
//       "rewards.status": points >= 30 ? "approved" : "rejected",
//       "rewards.approvedAt": points >= 30 ? new Date() : null,
//       status: points >= 30 ? "approved" : "rejected",
//     });

//     // Update user's total points
//     await User.findByIdAndUpdate(upload.userId, {
//       $inc: { totalPoints: points },
//     });

//     console.log(
//       `AI analysis completed for upload ${uploadId}: ${points} points, ${badges.length} badges`
//     );
//   } catch (error) {
//     console.error("AI analysis error:", error);
//     await handleAIFailure(uploadId, error.message);
//   }
// }

const axios = require("axios");

async function analyzeUploadWithAI(uploadId, imageUrl, category, description) {
  try {
    await Upload.findByIdAndUpdate(uploadId, {
      "aiAnalysis.status": "analyzing",
    });

    if (!process.env.GEMINI_API_KEY) {
      await handleAIFailure(uploadId, "Gemini API key not configured");
      return;
    }

    // NOTE: 'gemini-1.5-flash' is a valid model. 'gemini-2.0-flash' may not be available.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. Fetch the image data from the URL
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBase64 = Buffer.from(imageResponse.data, "binary").toString(
      "base64"
    );

    // 2. Prepare the image data for the AI in the correct format
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: imageResponse.headers["content-type"] || "image/jpeg",
      },
    };

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

    // 3. Send the prompt and the image data to the model
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // ... The rest of your parsing and database update logic remains the same
    let aiResponse;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      const lowerText = text.toLowerCase();
      aiResponse = {
        accuracy: lowerText.includes("mangrove") ? 60 : 0,
        confidence: 70,
        quality: "fair",
        mangroveEvidence: "Response parsing failed",
        notes: text,
        issues: "Could not parse AI response properly",
        recommendations: "Manual review recommended",
      };
    }

    const validatedAnalysis = {
      status: "completed",
      accuracy: Math.min(Math.max(Number(aiResponse.accuracy) || 0, 0), 100),
      confidence: Math.min(
        Math.max(Number(aiResponse.confidence) || 70, 0),
        100
      ),
      quality: ["excellent", "good", "fair", "poor"].includes(
        aiResponse.quality
      )
        ? aiResponse.quality
        : "fair",
      mangroveEvidence: String(
        aiResponse.mangroveEvidence ||
          "Mangrove evidence not clearly identified"
      ),
      notes: String(aiResponse.notes || "AI analysis completed"),
      issues: String(aiResponse.issues || "None identified"),
      recommendations: String(
        aiResponse.recommendations || "Image appears suitable"
      ),
      analyzedAt: new Date(),
    };

    const upload = await Upload.findById(uploadId);
    const points = upload.calculatePoints();
    const badges = upload.assignBadges();

    await Upload.findByIdAndUpdate(uploadId, {
      aiAnalysis: validatedAnalysis,
      "rewards.points": points,
      "rewards.badges": badges,
      "rewards.status": points >= 30 ? "approved" : "rejected",
      "rewards.approvedAt": points >= 30 ? new Date() : null,
      status: points >= 30 ? "approved" : "rejected",
    });

    await User.findByIdAndUpdate(upload.userId, {
      $inc: { totalPoints: points },
    });

    console.log(
      `AI analysis completed for upload ${uploadId}: ${points} points, ${badges.length} badges`
    );
  } catch (error) {
    console.error("AI analysis error:", error);
    await handleAIFailure(uploadId, error.message);
  }
}

// @desc    Handle AI analysis failure
// @access  Private
async function handleAIFailure(uploadId, errorMessage) {
  try {
    await Upload.findByIdAndUpdate(uploadId, {
      "aiAnalysis.status": "failed",
      "aiAnalysis.notes": `AI analysis failed: ${errorMessage}`,
      "aiAnalysis.analyzedAt": new Date(),
      "rewards.status": "rejected",
      status: "rejected",
    });
  } catch (updateError) {
    console.error("Failed to update upload status:", updateError);
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
      .populate("userId", "name email role")
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
      data: uploads,
    });
  } catch (error) {
    console.error("Get all uploads error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching uploads",
    });
  }
};

// @desc    Approve/reject upload manually
// @route   PUT /uploads/:id/review
// @access  Private (Admin only)
exports.reviewUpload = async (req, res) => {
  try {
    const { action, notes } = req.body;

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"',
      });
    }

    const upload = await Upload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    const isApproved = action === "approve";

    // Update upload status
    await Upload.findByIdAndUpdate(req.params.id, {
      status: isApproved ? "approved" : "rejected",
      "rewards.status": isApproved ? "approved" : "rejected",
      "rewards.approvedAt": isApproved ? new Date() : null,
      "rewards.approvedBy": req.user.id,
    });

    // If approved, ensure user gets points
    if (isApproved && upload.rewards.points === 0) {
      const points = upload.calculatePoints();
      await Upload.findByIdAndUpdate(req.params.id, {
        "rewards.points": points,
      });

      // Update user's total points
      await User.findByIdAndUpdate(upload.userId, {
        $inc: { totalPoints: points },
      });
    }

    res.status(200).json({
      success: true,
      message: `Upload ${action}d successfully`,
      data: {
        status: isApproved ? "approved" : "rejected",
        points: upload.rewards.points,
      },
    });
  } catch (error) {
    console.error("Review upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while reviewing upload",
    });
  }
};
