const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Audit Log Model
 * Tracks all user actions and system events for compliance and debugging
 */
const AuditLogSchema = new Schema({
  // Action performed (e.g., "SIM_CREATE", "USER_LOGIN")
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    uppercase: true,
    index: true,
  },

  // Module/Feature (e.g., "AUTH", "SIM", "RECHARGE")
  module: {
    type: String,
    required: [true, 'Module is required'],
    trim: true,
    uppercase: true,
    enum: ['AUTH', 'SIM', 'RECHARGE', 'USER', 'REPORT', 'COMPANY', 'SUBSCRIPTION', 'PAYMENT', 'CALL_LOG', 'NOTIFICATION', 'DASHBOARD', 'SETTINGS'],
    index: true,
  },

  // Human-readable description
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },

  // User who performed the action (null for anonymous actions like OTP_SEND)
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // [AUDIT LOG FIX] - Allow null for anonymous actions
    index: true,
  },

  // Role of the user at the time of action
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'user', 'anonymous'],
    required: false, // [AUDIT LOG FIX] - Allow null for anonymous actions
  },

  // Company (null for super admin)
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  },

  // Related entity
  entityId: {
    type: Schema.Types.ObjectId,
    index: true,
  },

  // Type of the related entity
  entityType: {
    type: String,
    trim: true,
    enum: ['SIM', 'USER', 'RECHARGE', 'COMPANY', 'SUBSCRIPTION', 'PAYMENT', 'REPORT', 'CALL_LOG', 'NOTIFICATION', null],
  },

  // Additional metadata (flexible key-value store)
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },

  // IP address of the request
  ipAddress: {
    type: String,
    trim: true,
  },

  // User agent string
  userAgent: {
    type: String,
    trim: true,
  },

  // Timestamp (REQUIRED)
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },
}, {
  timestamps: false, // We only use createdAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for efficient querying
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ module: 1, action: 1 });
AuditLogSchema.index({ createdAt: -1 });

// Static method to create audit log
AuditLogSchema.statics.createLog = async function(data) {
  try {
    const log = new this({
      action: data.action,
      module: data.module,
      description: data.description,
      performedBy: data.performedBy || null, // [AUDIT LOG FIX] - Allow null for anonymous actions
      role: data.role || 'anonymous', // [AUDIT LOG FIX] - Default to anonymous
      companyId: data.companyId || null,
      entityId: data.entityId,
      entityType: data.entityType,
      metadata: data.metadata || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: new Date(), // Explicit timestamp
    });

    await log.save();
    return log;
  } catch (error) {
    // Fail-safe: don't throw error, just log it
    console.error('AuditLog creation failed:', error.message);
    return null;
  }
};

// Static method to get logs with filters
AuditLogSchema.statics.getLogsWithFilters = async function(filters = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = -1,
  } = options;

  const query = {};

  // Handle $or queries (for admin to see AUTH logs from all users)
  if (filters.$or) {
    query.$or = filters.$or;
  }

  // Apply filters
  // [AUDIT LOG FIX] - Ensure companyId is properly converted to ObjectId for accurate comparison
  if (filters.companyId) {
    // If already an ObjectId, use as-is; otherwise convert
    query.companyId = filters.companyId instanceof mongoose.Types.ObjectId
      ? filters.companyId
      : new mongoose.Types.ObjectId(filters.companyId);
  }

  if (filters.performedBy) {
    query.performedBy = filters.performedBy;
  }

  if (filters.module) {
    query.module = filters.module.toUpperCase();
  }

  if (filters.action) {
    query.action = filters.action.toUpperCase();
  }

  if (filters.entityType) {
    query.entityType = filters.entityType.toUpperCase();
  }

  if (filters.role) {
    query.role = filters.role.toLowerCase();
  }

  // Date range filtering
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      // Include the entire end day
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  // Text search on description
  if (filters.search) {
    query.description = { $regex: filters.search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const logs = await this.find(query)
    .populate('performedBy', 'name email role mobileNumber phone')
    .populate('companyId', 'name')
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await this.countDocuments(query);

  return {
    data: logs,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

// Static method to get log by ID
AuditLogSchema.statics.getLogById = async function(logId) {
  return this.findOne({ _id: logId })
    .populate('performedBy', 'name email role mobileNumber phone')
    .populate('companyId', 'name')
    .lean();
};

// Static method to get action counts by module
AuditLogSchema.statics.getActionCounts = async function(filters = {}) {
  const matchStage = {};

  if (filters.companyId) {
    matchStage.companyId = new mongoose.Types.ObjectId(filters.companyId);
  }

  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) {
      matchStage.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      matchStage.createdAt.$lte = new Date(filters.endDate);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { module: '$module', action: '$action' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.module',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count',
          },
        },
        total: { $sum: '$count' },
      },
    },
    { $sort: { total: -1 } },
  ]);
};

// Virtual for formatted timestamp
AuditLogSchema.virtual('formattedTime').get(function() {
  return this.createdAt ? this.createdAt.toISOString() : null;
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);