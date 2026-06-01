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
 *
 * BACKWARD COMPATIBLE: Works with both old format (callerSimIds/targetSimIds)
 * and new format (targetCallerMappings).
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

  // OLD FORMAT (kept for backward compatibility)
  // These will be migrated to targetCallerMappings on first load
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
  try {
    if (this.targetCallerMappings && this.targetCallerMappings.length > 0) {
      const callerIds = new Set();
      this.targetCallerMappings.forEach(mapping => {
        if (mapping.callerSimIds && Array.isArray(mapping.callerSimIds)) {
          mapping.callerSimIds.forEach(id => {
            if (id) callerIds.add(id.toString());
          });
        }
      });
      return Array.from(callerIds).map(id => new mongoose.Types.ObjectId(id));
    }
    return this.callerSimIds || [];
  } catch (e) {
    return this.callerSimIds || [];
  }
});

// Virtual to get all unique target SIM IDs
CallAutomationConfigSchema.virtual('allTargetSimIds').get(function() {
  try {
    if (this.targetCallerMappings && this.targetCallerMappings.length > 0) {
      return this.targetCallerMappings.map(m => m.targetSimId).filter(id => id);
    }
    return this.targetSimIds || [];
  } catch (e) {
    return this.targetSimIds || [];
  }
});

// Static method to find config by company
CallAutomationConfigSchema.statics.findByCompany = async function (companyId) {
  try {
    const config = await this.findOne({ companyId, isActive: true })
      .populate('targetCallerMappings.targetSimId', 'mobileNumber operator status assignedTo')
      .populate('targetCallerMappings.callerSimIds', 'mobileNumber operator status assignedTo')
      .populate('callerSimIds', 'mobileNumber operator status')
      .populate('targetSimIds', 'mobileNumber operator status');
    return config;
  } catch (error) {
    // If populate fails, try without populate
    console.error('[CALL AUTOMATION] Populate failed, returning without populate:', error.message);
    return await this.findOne({ companyId, isActive: true });
  }
};

// Static method to check if SIM is a caller
CallAutomationConfigSchema.statics.isCaller = async function (simId, companyId) {
  const config = await this.findOne({
    companyId,
    isActive: true,
    $or: [
      { 'targetCallerMappings.callerSimIds': simId },
      { callerSimIds: simId }
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
      { targetSimIds: simId }
    ]
  });
  return config !== null;
};

// Instance method to get caller SIMs for a specific target
CallAutomationConfigSchema.methods.getCallersForTarget = function (targetSimId) {
  try {
    const mapping = this.targetCallerMappings?.find(
      m => (m.targetSimId?._id || m.targetSimId)?.toString() === targetSimId?.toString()
    );
    return mapping?.callerSimIds || [];
  } catch (e) {
    return [];
  }
};

// Instance method to get targets for a specific caller
CallAutomationConfigSchema.methods.getTargetsForCaller = function (callerSimId) {
  try {
    const targets = [];
    this.targetCallerMappings?.forEach(mapping => {
      if (mapping.callerSimIds?.some(id => (id._id || id)?.toString() === callerSimId?.toString())) {
        targets.push({
          targetSimId: mapping.targetSimId,
          callDuration: mapping.callDuration || this.callDuration
        });
      }
    });
    return targets;
  } catch (e) {
    return [];
  }
};

// Instance method to get next target (round-robin)
CallAutomationConfigSchema.methods.getNextTargetIndex = function () {
  try {
    const targetCount = this.targetCallerMappings?.length || this.targetSimIds?.length || 0;
    if (targetCount === 0) return 0;
    return (this.lastTargetIndex + 1) % targetCount;
  } catch (e) {
    return 0;
  }
};

// Instance method to calculate next run time based on frequency and scheduled time
CallAutomationConfigSchema.methods.calculateNextRunTime = function () {
  const now = new Date();
  const [hours, minutes] = (this.scheduledTime || '09:00').split(':').map(Number);

  switch (this.frequency) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000);

    case 'daily': {
      const todayScheduled = new Date(now);
      todayScheduled.setHours(hours, minutes, 0, 0);
      if (todayScheduled <= now) {
        todayScheduled.setDate(todayScheduled.getDate() + 1);
      }
      return todayScheduled;
    }

    case 'weekly': {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(this.scheduledDay || 'monday');
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7;
      if (daysUntil === 0) {
        const todayScheduled = new Date(now);
        todayScheduled.setHours(hours, minutes, 0, 0);
        if (todayScheduled <= now) {
          daysUntil = 7;
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
  try {
    if (this.migrated) return false;
    if (!this.callerSimIds?.length && !this.targetSimIds?.length) return false;

    // Create mappings: each target gets all callers
    this.targetCallerMappings = this.targetSimIds.map(targetId => ({
      targetSimId: targetId,
      callerSimIds: [...this.callerSimIds],
      callDuration: this.callDuration
    }));

    this.migrated = true;
    return true;
  } catch (e) {
    console.error('[CALL AUTOMATION] Migration error:', e.message);
    return false;
  }
};

// Pre-save hook to ensure data integrity
CallAutomationConfigSchema.pre('save', function(next) {
  try {
    // If using new format, ensure mappings exist
    if (this.targetCallerMappings && this.targetCallerMappings.length > 0) {
      for (const mapping of this.targetCallerMappings) {
        if (!mapping.callerSimIds || mapping.callerSimIds.length === 0) {
          // Remove empty mappings instead of throwing error
          this.targetCallerMappings = this.targetCallerMappings.filter(m => m !== mapping);
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('CallAutomationConfig', CallAutomationConfigSchema);