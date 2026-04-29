/**
 * Call Automation Configuration Model
 *
 * This model stores configuration for automated SIM call verification.
 * Used to keep SIMs active by making periodic calls.
 *
 * IMPORTANT: This is ONLY for Private/Enterprise App Mode (APK distribution)
 * NOT for Play Store builds.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const CallAutomationConfigSchema = new Schema({
  // Company that owns this configuration
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },

  // SIMs that will MAKE outgoing calls
  callerSimIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Sim',
    required: true,
  }],

  // SIMs that will RECEIVE calls (targets)
  targetSimIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Sim',
    required: true,
  }],

  // Call duration in seconds (10-60)
  callDuration: {
    type: Number,
    required: [true, 'Call duration is required'],
    default: 10,
    min: [10, 'Call duration must be at least 10 seconds'],
    max: [60, 'Call duration cannot exceed 60 seconds'],
  },

  // How often to make calls
  frequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly'],
    default: 'daily',
  },

  // Scheduled time for calls (HH:MM format, 24-hour)
  scheduledTime: {
    type: String,
    default: '09:00',
    validate: {
      validator: function (v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)`
    }
  },

  // Scheduled day for weekly calls
  scheduledDay: {
    type: String,
    enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    default: 'monday',
  },

  // Enable/disable automation
  isActive: {
    type: Boolean,
    default: true,
  },

  // Tracking timestamps
  lastRunAt: {
    type: Date,
    default: null,
  },

  nextRunAt: {
    type: Date,
    default: null,
  },

  // Rotation tracking for round-robin target selection
  lastTargetIndex: {
    type: Number,
    default: 0,
  },

  // Last run metadata
  lastCallerSim: {
    type: String,
    default: null,
  },
  lastSuccessCount: {
    type: Number,
    default: 0,
  },
  lastFailCount: {
    type: Number,
    default: 0,
  },

  // Audit fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient querying
CallAutomationConfigSchema.index({ companyId: 1, isActive: 1 });
CallAutomationConfigSchema.index({ nextRunAt: 1 });
CallAutomationConfigSchema.index({ 'callerSimIds': 1 });
CallAutomationConfigSchema.index({ 'targetSimIds': 1 });

// Static method to find config by company
CallAutomationConfigSchema.statics.findByCompany = function (companyId) {
  return this.findOne({ companyId, isActive: true })
    .populate('callerSimIds', 'mobileNumber operator status')
    .populate('targetSimIds', 'mobileNumber operator status');
};

// Static method to check if SIM is a caller
CallAutomationConfigSchema.statics.isCaller = async function (simId, companyId) {
  const config = await this.findOne({
    companyId,
    isActive: true,
    callerSimIds: simId
  });
  return config !== null;
};

// Static method to check if SIM is a target (receiver)
CallAutomationConfigSchema.statics.isTarget = async function (simId, companyId) {
  const config = await this.findOne({
    companyId,
    isActive: true,
    targetSimIds: simId
  });
  return config !== null;
};

// Instance method to get next target (round-robin)
CallAutomationConfigSchema.methods.getNextTargetIndex = function () {
  const nextIndex = (this.lastTargetIndex + 1) % this.targetSimIds.length;
  return nextIndex;
};

// Instance method to calculate next run time based on frequency and scheduled time
CallAutomationConfigSchema.methods.calculateNextRunTime = function () {
  const now = new Date();
  const [hours, minutes] = (this.scheduledTime || '09:00').split(':').map(Number);

  switch (this.frequency) {
    case 'hourly':
      // For hourly, just run every hour from now
      return new Date(now.getTime() + 60 * 60 * 1000);

    case 'daily': {
      // Run at the scheduled time today or tomorrow
      const todayScheduled = new Date(now);
      todayScheduled.setHours(hours, minutes, 0, 0);

      // If the scheduled time has already passed today, schedule for tomorrow
      if (todayScheduled <= now) {
        todayScheduled.setDate(todayScheduled.getDate() + 1);
      }
      return todayScheduled;
    }

    case 'weekly': {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(this.scheduledDay || 'monday');
      const currentDay = now.getDay();

      // Calculate days until next scheduled day
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7; // Next week
      if (daysUntil === 0) {
        // Same day - check if time has passed
        const todayScheduled = new Date(now);
        todayScheduled.setHours(hours, minutes, 0, 0);
        if (todayScheduled <= now) {
          daysUntil = 7; // Next week
        }
      }

      const nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + daysUntil);
      nextRun.setHours(hours, minutes, 0, 0);
      return nextRun;
    }

    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
};

module.exports = mongoose.model('CallAutomationConfig', CallAutomationConfigSchema);