/**
 * Call Automation Configuration Model
 *
 * This model stores configuration for automated SIM call verification.
 * Used to keep SIMs active by making periodic calls.
 *
 * IMPORTANT: This is ONLY for Private/Enterprise App Mode (APK distribution)
 * NOT for Play Store builds.
 *
 * UPDATED: Now supports per-target caller assignment where each target SIM
 * can have its own set of caller SIMs.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Sub-schema for individual target-caller mapping
const TargetCallerMappingSchema = new Schema({
  // Target SIM that will receive calls
  targetSimId: {
    type: Schema.Types.ObjectId,
    ref: 'Sim',
    required: true,
  },

  // Caller SIMs that will call this target
  callerSimIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Sim',
    required: true,
  }],

  // Per-target call duration (optional, falls back to global)
  callDuration: {
    type: Number,
    min: [10, 'Call duration must be at least 10 seconds'],
    max: [60, 'Call duration cannot exceed 60 seconds'],
  },
}, { _id: true });

const CallAutomationConfigSchema = new Schema({
  // Company that owns this configuration
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },

  // NEW: Per-target caller mappings
  // Each target has its own list of caller SIMs
  targetCallerMappings: [TargetCallerMappingSchema],

  // DEPRECATED: Keeping for backward compatibility and migration
  // These will be migrated to targetCallerMappings on first save
  callerSimIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Sim',
  }],

  targetSimIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Sim',
  }],

  // Global default call duration in seconds (10-60)
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

  // Flag to track if migration has been done
  migrated: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient querying
CallAutomationConfigSchema.index({ companyId: 1, isActive: 1 });
CallAutomationConfigSchema.index({ nextRunAt: 1 });
CallAutomationConfigSchema.index({ 'targetCallerMappings.targetSimId': 1 });
CallAutomationConfigSchema.index({ 'targetCallerMappings.callerSimIds': 1 });

// Virtual to get all unique caller SIM IDs
CallAutomationConfigSchema.virtual('allCallerSimIds').get(function() {
  if (this.targetCallerMappings && this.targetCallerMappings.length > 0) {
    const callerIds = new Set();
    this.targetCallerMappings.forEach(mapping => {
      mapping.callerSimIds.forEach(id => callerIds.add(id.toString()));
    });
    return Array.from(callerIds).map(id => new mongoose.Types.ObjectId(id));
  }
  return this.callerSimIds || [];
});

// Virtual to get all unique target SIM IDs
CallAutomationConfigSchema.virtual('allTargetSimIds').get(function() {
  if (this.targetCallerMappings && this.targetCallerMappings.length > 0) {
    return this.targetCallerMappings.map(m => m.targetSimId);
  }
  return this.targetSimIds || [];
});

// Static method to find config by company
CallAutomationConfigSchema.statics.findByCompany = function (companyId) {
  return this.findOne({ companyId, isActive: true })
    .populate('targetCallerMappings.targetSimId', 'mobileNumber operator status')
    .populate('targetCallerMappings.callerSimIds', 'mobileNumber operator status')
    .populate('callerSimIds', 'mobileNumber operator status')
    .populate('targetSimIds', 'mobileNumber operator status');
};

// Static method to check if SIM is a caller
CallAutomationConfigSchema.statics.isCaller = async function (simId, companyId) {
  const config = await this.findOne({
    companyId,
    isActive: true,
    $or: [
      { 'targetCallerMappings.callerSimIds': simId },
      { callerSimIds: simId } // Backward compatibility
    ]
  });
  return config !== null;
};

// Static method to check if SIM is a target (receiver)
CallAutomationConfigSchema.statics.isTarget = async function (simId, companyId) {
  const config = await this.findOne({
    companyId,
    isActive: true,
    $or: [
      { 'targetCallerMappings.targetSimId': simId },
      { targetSimIds: simId } // Backward compatibility
    ]
  });
  return config !== null;
};

// Instance method to get caller SIMs for a specific target
CallAutomationConfigSchema.methods.getCallersForTarget = function (targetSimId) {
  const mapping = this.targetCallerMappings?.find(
    m => m.targetSimId?.toString() === targetSimId?.toString()
  );
  return mapping?.callerSimIds || [];
};

// Instance method to get targets for a specific caller
CallAutomationConfigSchema.methods.getTargetsForCaller = function (callerSimId) {
  const targets = [];
  this.targetCallerMappings?.forEach(mapping => {
    if (mapping.callerSimIds?.some(id => id?.toString() === callerSimId?.toString())) {
      targets.push({
        targetSimId: mapping.targetSimId,
        callDuration: mapping.callDuration || this.callDuration
      });
    }
  });
  return targets;
};

// Instance method to get next target (round-robin)
CallAutomationConfigSchema.methods.getNextTargetIndex = function () {
  const targetCount = this.targetCallerMappings?.length || this.targetSimIds?.length || 0;
  if (targetCount === 0) return 0;
  const nextIndex = (this.lastTargetIndex + 1) % targetCount;
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

// Instance method to migrate old format to new format
CallAutomationConfigSchema.methods.migrateToNewFormat = function () {
  // Skip if already migrated or no old data
  if (this.migrated || !this.callerSimIds?.length || !this.targetSimIds?.length) {
    return false;
  }

  // Create mappings: each target gets all callers
  this.targetCallerMappings = this.targetSimIds.map(targetId => ({
    targetSimId: targetId,
    callerSimIds: [...this.callerSimIds],
    callDuration: this.callDuration
  }));

  this.migrated = true;
  return true;
};

// Pre-save hook to ensure at least one mapping exists
CallAutomationConfigSchema.pre('save', function(next) {
  // If using new format, ensure mappings exist
  if (this.targetCallerMappings && this.targetCallerMappings.length > 0) {
    // Validate that each mapping has at least one caller
    for (const mapping of this.targetCallerMappings) {
      if (!mapping.callerSimIds || mapping.callerSimIds.length === 0) {
        return next(new Error('Each target must have at least one caller SIM'));
      }
    }
  }
  next();
});

module.exports = mongoose.model('CallAutomationConfig', CallAutomationConfigSchema);