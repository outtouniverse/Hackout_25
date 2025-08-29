const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Please provide a report type'],
    enum: ['cutting', 'dumping', 'pollution', 'land_reclamation', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  photo: {
    type: String,
    required: [true, 'Please provide a photo']
  },
  lat: {
    type: Number,
    required: [true, 'Please provide latitude coordinates']
  },
  lng: {
    type: Number,
    required: [true, 'Please provide longitude coordinates']
  },
  status: {
    type: String,
    enum: ['open', 'validated', 'resolved', 'rejected'],
    default: 'open'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [Number]
  },
  validationNotes: {
    type: String,
    default: ''
  },
  validatedAt: {
    type: Date,
    default: null
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index for location-based queries
reportSchema.index({ location: '2dsphere' });

// Update timestamp on save
reportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Report', reportSchema);
