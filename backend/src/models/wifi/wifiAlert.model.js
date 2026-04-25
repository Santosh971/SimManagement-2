const mongoose = require('mongoose');
const { Schema } = mongoose;

const WifiAlertSchema = new Schema({
  wifiId: {
    type: Schema.Types.ObjectId,
    ref: 'WifiNetwork',
    required: [true, 'WiFi ID is required'],
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },
  avgSpeed: {
    type: Number,
    required: [true, 'Average speed is required'],
  },
  threshold: {
    type: Number,
    required: [true, 'Threshold is required'],
  },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active',
    index: true,
  },
  alertType: {
    type: String,
    enum: ['low_speed', 'high_latency', 'device_offline'],
    default: 'low_speed',
  },
  message: {
    type: String,
    trim: true,
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
WifiAlertSchema.index({ wifiId: 1, status: 1 });
WifiAlertSchema.index({ companyId: 1, status: 1 });
WifiAlertSchema.index({ createdAt: -1 });
WifiAlertSchema.index({ status: 1, createdAt: -1 });

// Virtual for duration
WifiAlertSchema.virtual('duration').get(function () {
  if (this.status === 'active') {
    return Date.now() - this.createdAt;
  }
  if (this.resolvedAt) {
    return this.resolvedAt - this.createdAt;
  }
  return null;
});

// Virtual for duration in minutes
WifiAlertSchema.virtual('durationMinutes').get(function () {
  const duration = this.duration;
  if (duration) {
    return Math.floor(duration / (1000 * 60));
  }
  return null;
});

// Static method to find active alerts by company
WifiAlertSchema.statics.findActiveByCompany = function (companyId) {
  return this.find({ companyId, status: 'active' })
    .populate('wifiId', 'wifiName expectedSpeed alertThreshold')
    .sort({ createdAt: -1 });
};

// Static method to find active alert for a wifi
WifiAlertSchema.statics.findActiveByWifi = function (wifiId) {
  return this.findOne({ wifiId, status: 'active' });
};

// Static method to count active alerts by company
WifiAlertSchema.statics.countActiveByCompany = function (companyId) {
  return this.countDocuments({ companyId, status: 'active' });
};

// Static method to get alerts by company
WifiAlertSchema.statics.getByCompany = function (companyId, limit = 50) {
  return this.find({ companyId })
    .populate('wifiId', 'wifiName expectedSpeed alertThreshold')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get alert stats for dashboard
WifiAlertSchema.statics.getStatsByCompany = async function (companyId) {
  const result = await this.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
  return result.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, { active: 0, resolved: 0 });
};

// Method to resolve alert
WifiAlertSchema.methods.resolve = function () {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  return this.save();
};

// Static method to create or get active alert
WifiAlertSchema.statics.createOrGetActive = async function (wifiId, companyId, avgSpeed, threshold, alertType = 'low_speed') {
  let alert = await this.findOne({ wifiId, status: 'active' });

  if (!alert) {
    alert = await this.create({
      wifiId,
      companyId,
      avgSpeed,
      threshold,
      alertType,
      message: `Average speed ${avgSpeed.toFixed(2)} Mbps is below threshold ${threshold} Mbps`,
    });
  }

  return alert;
};

module.exports = mongoose.model('WifiAlert', WifiAlertSchema);