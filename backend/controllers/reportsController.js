const Report = require('../models/Report');

// @desc    Create new incident report
// @route   POST /reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const { type, description, photo, lat, lng } = req.body;

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
      userId: req.user.id
    });

    // Populate user details
    await report.populate('userId', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating report'
    });
  }
};

// @desc    Get all reports (filterable)
// @route   GET /reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const { status, userId, type } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (type) filter.type = type;

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

    // Update fields
    const fieldsToUpdate = {};
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
      message: 'Server error while fetching pending reports'
    });
  }
};
