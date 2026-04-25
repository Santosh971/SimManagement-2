const mongoose = require('mongoose');
const { Schema } = mongoose;

const WifiNetworkSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },
  wifiName: {
    type: String,
    required: [true, 'WiFi name is required'],
    trim: true,
    maxlength: [100, 'WiFi name cannot exceed 100 characters'],
  },
  expectedSpeed: {
    type: Number,
    required: [true, 'Expected speed is required'],
    min: [0, 'Expected speed cannot be negative'],
  },
  alertThreshold: {
    type: Number,
    required: [true, 'Alert threshold is required'],
    min: [0, 'Alert threshold cannot be negative'],
  },
  emailAlertEnabled: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
WifiNetworkSchema.index({ companyId: 1, wifiName: 1 }, { unique: true });
WifiNetworkSchema.index({ companyId: 1, isActive: 1 });
WifiNetworkSchema.index({ createdAt: -1 });

// Virtual for status based on latest metrics
WifiNetworkSchema.virtual('status').get(function () {
  return this._status || 'unknown';
});

// Static method to find by company
WifiNetworkSchema.statics.findByCompany = function (companyId) {
  return this.find({ companyId, isActive: true }).sort({ createdAt: -1 });
};

// Static method to count by company
WifiNetworkSchema.statics.countByCompany = function (companyId) {
  return this.countDocuments({ companyId, isActive: true });
};

module.exports = mongoose.model('WifiNetwork', WifiNetworkSchema);