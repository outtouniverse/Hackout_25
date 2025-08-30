const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  // User who uploaded
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Image details
  imageUrl: {
    type: String,
    required: true
  },
  
  // Upload metadata
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  category: {
    type: String,
    enum: ['mangrove_health', 'mangrove_destruction', 'mangrove_conservation', 'mangrove_research', 'other'],
    required: true
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  
  // AI Analysis Results
  aiAnalysis: {
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'failed'],
      default: 'pending'
    },
    
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    mangroveEvidence: {
      type: String,
      default: ''
    },
    
    quality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'fair'
    },
    
    notes: {
      type: String,
      default: ''
    },
    
    issues: {
      type: String,
      default: ''
    },
    
    recommendations: {
      type: String,
      default: ''
    },
    
    analyzedAt: {
      type: Date,
      default: null
    }
  },
  
  // Rewards & Points
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    
    badges: [{
      type: String,
      enum: ['first_upload', 'high_accuracy', 'excellent_quality', 'mangrove_expert', 'conservation_hero']
    }],
    
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    
    approvedAt: {
      type: Date,
      default: null
    },
    
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  
  // Upload status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  
  // Flags for review
  flags: [{
    reason: {
      type: String,
      enum: ['inappropriate', 'low_quality', 'not_mangrove', 'duplicate', 'spam']
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  
  // Metadata
  tags: [String],
  uploadDate: {
    type: Date,
    default: Date.now
  },
  
  // Engagement metrics
  views: {
    type: Number,
    default: 0
  },
  
  likes: {
    type: Number,
    default: 0
  },
  
  shares: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
uploadSchema.index({ userId: 1, uploadDate: -1 });
uploadSchema.index({ location: '2dsphere' });
uploadSchema.index({ 'aiAnalysis.status': 1 });
uploadSchema.index({ 'rewards.status': 1 });
uploadSchema.index({ category: 1 });

// Calculate points based on AI analysis
uploadSchema.methods.calculatePoints = function() {
  let points = 0;
  
  if (this.aiAnalysis.status === 'completed') {
    // Base points for upload
    points += 10;
    
    // Accuracy bonus (0-50 points)
    points += Math.floor(this.aiAnalysis.accuracy / 2);
    
    // Quality bonus
    switch (this.aiAnalysis.quality) {
      case 'excellent': points += 25; break;
      case 'good': points += 15; break;
      case 'fair': points += 10; break;
      case 'poor': points += 5; break;
    }
    
    // Confidence bonus (0-15 points)
    points += Math.floor(this.aiAnalysis.confidence / 7);
    
    // Category bonus
    if (this.category === 'mangrove_destruction') points += 20;
    if (this.category === 'mangrove_conservation') points += 15;
    if (this.category === 'mangrove_health') points += 10;
  }
  
  return Math.min(points, 100); // Cap at 100 points
};

// Assign badges based on performance
uploadSchema.methods.assignBadges = function() {
  const badges = [];
  
  if (this.rewards.points >= 50) badges.push('high_accuracy');
  if (this.aiAnalysis.quality === 'excellent') badges.push('excellent_quality');
  if (this.aiAnalysis.accuracy >= 90) badges.push('mangrove_expert');
  if (this.category === 'mangrove_conservation' && this.aiAnalysis.accuracy >= 80) {
    badges.push('conservation_hero');
  }
  
  return badges;
};

module.exports = mongoose.model('Upload', uploadSchema);
