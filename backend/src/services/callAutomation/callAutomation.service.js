/**
 * Call Automation Service
 *
 * Business logic for automated SIM call verification system.
 * Handles configuration management, role determination, and target rotation.
 *
 * UPDATED: Now supports per-target caller assignment where each target SIM
 * can have its own set of caller SIMs.
 *
 * BACKWARD COMPATIBLE: Works with both old format (callerSimIds/targetSimIds)
 * and new format (targetCallerMappings).
 */

const CallAutomationConfig = require('../../models/callAutomation/callAutomation.model');
const Sim = require('../../models/sim/sim.model');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../utils/errors');
const { buildPhoneQuery } = require('../../utils/response');
const logger = require('../../utils/logger');

class CallAutomationService {
  /**
   * Save or update call automation configuration
   * Supports both old format (callerSimIds/targetSimIds) and new format (targetCallerMappings)
   * @param {Object} data - Configuration data
   * @param {Object} user - User making the request
   * @returns {Object} Saved configuration
   */
  async saveConfig(data, user) {
    const companyId = user.role === 'super_admin' ? data.companyId : user.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID is required');
    }

    // Determine which format we're receiving
    const isNewFormat = data.targetCallerMappings && Array.isArray(data.targetCallerMappings) && data.targetCallerMappings.length > 0;
    const isOldFormat = data.callerSimIds && Array.isArray(data.callerSimIds) && data.callerSimIds.length > 0 &&
                        data.targetSimIds && Array.isArray(data.targetSimIds) && data.targetSimIds.length > 0;

    // Validate based on format
    if (isNewFormat) {
      // Validate new format
      for (const mapping of data.targetCallerMappings) {
        if (!mapping.targetSimId) {
          throw new ValidationError('Each mapping must have a target SIM');
        }
        if (!mapping.callerSimIds || mapping.callerSimIds.length === 0) {
          throw new ValidationError('Each target must have at least one caller SIM');
        }
      }

      // Check for overlap
      const allTargetIds = data.targetCallerMappings.map(m => m.targetSimId.toString());
      const allCallerIds = data.targetCallerMappings.flatMap(m => m.callerSimIds.map(id => id.toString()));
      const overlap = allTargetIds.filter(id => allCallerIds.includes(id));
      if (overlap.length > 0) {
        throw new ValidationError('A SIM cannot be both a caller and a target');
      }

      // Verify all SIMs exist and belong to company
      const allSimIds = [...new Set([...allTargetIds, ...allCallerIds])];
      const sims = await Sim.find({ _id: { $in: allSimIds }, companyId });
      if (sims.length !== allSimIds.length) {
        throw new ValidationError('One or more SIMs not found or not active');
      }

    } else if (isOldFormat) {
      // Validate old format
      if (data.callerSimIds.length === 0) {
        throw new ValidationError('At least one caller SIM is required');
      }
      if (data.targetSimIds.length === 0) {
        throw new ValidationError('At least one target SIM is required');
      }

      // Check for overlap
      const overlap = data.callerSimIds.filter(id =>
        data.targetSimIds.some(targetId => targetId.toString() === id.toString())
      );
      if (overlap.length > 0) {
        throw new ValidationError('A SIM cannot be both Caller and Target');
      }

      // Verify all SIMs exist and belong to company
      const allSimIds = [...data.callerSimIds, ...data.targetSimIds];
      const sims = await Sim.find({ _id: { $in: allSimIds }, companyId });
      if (sims.length !== allSimIds.length) {
        throw new ValidationError('One or more SIMs not found or not active');
      }
    } else {
      throw new ValidationError('Either targetCallerMappings or callerSimIds/targetSimIds are required');
    }

    // Validate call duration
    const callDuration = data.callDuration || 10;
    if (callDuration < 10 || callDuration > 60) {
      throw new ValidationError('Call duration must be between 10 and 60 seconds');
    }

    // Validate scheduled time format
    if (data.scheduledTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.scheduledTime)) {
      throw new ValidationError('Scheduled time must be in HH:MM format');
    }

    // Validate hourly shift times
    if (data.hourlyShiftStartTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.hourlyShiftStartTime)) {
      throw new ValidationError('Hourly shift start time must be in HH:MM format');
    }
    if (data.hourlyShiftEndTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.hourlyShiftEndTime)) {
      throw new ValidationError('Hourly shift end time must be in HH:MM format');
    }
    if (data.hourlyShiftStartTime && data.hourlyShiftEndTime && data.hourlyShiftStartTime === data.hourlyShiftEndTime) {
      throw new ValidationError('Hourly shift start time and end time cannot be the same');
    }

    // Check for existing config
    let config = await CallAutomationConfig.findOne({ companyId });

    logger.info('[CALL AUTOMATION] saveConfig called with:', {
      companyId,
      isNewFormat,
      isOldFormat,
      frequency: data.frequency,
      scheduledTime: data.scheduledTime,
      scheduledDay: data.scheduledDay,
      callDuration,
      isActive: data.isActive,
      existingConfig: config ? config._id : 'new',
    });

    if (config) {
      // Update existing config
      if (isNewFormat) {
        // Use new format
        config.targetCallerMappings = data.targetCallerMappings.map(mapping => ({
          targetSimId: mapping.targetSimId,
          callerSimIds: mapping.callerSimIds,
          callDuration: mapping.callDuration || callDuration,
        }));
        config.migrated = true;
      } else {
        // Convert old format to new format
        config.targetCallerMappings = data.targetSimIds.map(targetId => ({
          targetSimId: targetId,
          callerSimIds: data.callerSimIds,
          callDuration: callDuration,
        }));
        config.migrated = true;
      }

      config.callDuration = callDuration;
      config.frequency = data.frequency || 'daily';
      config.scheduledTime = data.scheduledTime || '09:00';
      config.scheduledDay = data.scheduledDay || 'monday';
      config.hourlyShiftStartTime = data.hourlyShiftStartTime || config.hourlyShiftStartTime || '08:00';
      config.hourlyShiftEndTime = data.hourlyShiftEndTime || config.hourlyShiftEndTime || '20:00';
      config.isActive = data.isActive !== undefined ? data.isActive : true;
      config.updatedBy = user._id;
      config.nextRunAt = config.calculateNextRunTime();
    } else {
      // Create new config
      let targetCallerMappings;
      if (isNewFormat) {
        targetCallerMappings = data.targetCallerMappings.map(mapping => ({
          targetSimId: mapping.targetSimId,
          callerSimIds: mapping.callerSimIds,
          callDuration: mapping.callDuration || callDuration,
        }));
      } else {
        // Convert old format to new format
        targetCallerMappings = data.targetSimIds.map(targetId => ({
          targetSimId: targetId,
          callerSimIds: data.callerSimIds,
          callDuration: callDuration,
        }));
      }

      config = new CallAutomationConfig({
        companyId,
        targetCallerMappings,
        callerSimIds: [], // Keep empty, using new format
        targetSimIds: [], // Keep empty, using new format
        callDuration,
        frequency: data.frequency || 'daily',
        scheduledTime: data.scheduledTime || '09:00',
        scheduledDay: data.scheduledDay || 'monday',
        hourlyShiftStartTime: data.hourlyShiftStartTime || '08:00',
        hourlyShiftEndTime: data.hourlyShiftEndTime || '20:00',
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdBy: user._id,
        migrated: true,
        nextRunAt: new Date(Date.now() + 60 * 1000),
      });
    }

    await config.save();

    logger.info('[CALL AUTOMATION] Config saved successfully:', {
      configId: config._id,
      companyId,
      mappingsCount: config.targetCallerMappings?.length || 0,
      frequency: config.frequency,
      scheduledTime: config.scheduledTime,
      isActive: config.isActive,
    });

    // Populate for response
    await this.populateConfig(config);

    return config;
  }

  /**
   * Populate config with SIM details
   * @param {Object} config - Config document
   */
  async populateConfig(config) {
    try {
      if (config.targetCallerMappings && config.targetCallerMappings.length > 0) {
        await config.populate('targetCallerMappings.targetSimId', 'mobileNumber operator status assignedTo');
        await config.populate('targetCallerMappings.callerSimIds', 'mobileNumber operator status assignedTo');
      }
      await config.populate('callerSimIds', 'mobileNumber operator status');
      await config.populate('targetSimIds', 'mobileNumber operator status');
    } catch (error) {
      logger.warn('[CALL AUTOMATION] Could not populate config', { error: error.message });
    }
    return config;
  }

  /**
   * Get configuration for a company
   * @param {Object} user - User making the request
   * @param {String} companyId - Optional company ID (for super admin)
   * @returns {Object|null} Configuration or null
   */
  async getConfig(user, companyId = null) {
    const targetCompanyId = user.role === 'super_admin' ? companyId : user.companyId;

    if (!targetCompanyId) {
      throw new ForbiddenError('Company ID is required');
    }

    let config = await CallAutomationConfig.findOne({ companyId: targetCompanyId });

    if (config) {
      // Populate
      await this.populateConfig(config);

      // Check if migration is needed (old format to new format)
      if (!config.migrated && config.callerSimIds?.length > 0 && config.targetSimIds?.length > 0) {
        logger.info('[CALL AUTOMATION] Migrating old config format to new format', {
          configId: config._id,
          companyId: targetCompanyId
        });

        // Convert old format to new format
        config.targetCallerMappings = config.targetSimIds.map(targetId => ({
          targetSimId: targetId,
          callerSimIds: [...config.callerSimIds],
          callDuration: config.callDuration || 10,
        }));
        config.migrated = true;
        await config.save();
      }

      logger.info('[CALL AUTOMATION] getConfig returning:', {
        configId: config._id,
        companyId: config.companyId,
        mappingsCount: config.targetCallerMappings?.length || 0,
        frequency: config.frequency,
        scheduledTime: config.scheduledTime,
        isActive: config.isActive,
      });
    } else {
      logger.info('[CALL AUTOMATION] No config found for company:', targetCompanyId);
    }

    return config;
  }

  /**
   * Get configuration for mobile device
   * Determines role based on SIM number and returns appropriate data
   * @param {String} simNumber - SIM phone number from device
   * @returns {Object} Device configuration with role and targets
   */
  async getDeviceConfig(simNumber) {
    if (!simNumber) {
      throw new ValidationError('SIM number is required');
    }

    logger.info('[CALL AUTOMATION] Getting device config for SIM:', simNumber);

    // Build phone query to handle different formats
    const phoneQuery = buildPhoneQuery(simNumber);
    if (!phoneQuery) {
      logger.warn('[CALL AUTOMATION] Invalid SIM number format:', simNumber);
      return {
        role: 'NONE',
        targets: [],
        callDuration: 10,
        frequency: 'daily',
        hourlyShiftStartTime: '08:00',
        hourlyShiftEndTime: '20:00',
        isActive: false,
      };
    }

    // Find the SIM
    const sim = await Sim.findOne(phoneQuery).populate('companyId');

    if (!sim) {
      logger.warn('[CALL AUTOMATION] SIM not found:', simNumber);
      return {
        role: 'NONE',
        targets: [],
        callDuration: 10,
        frequency: 'daily',
        scheduledTime: '09:00',
        scheduledDay: 'monday',
        hourlyShiftStartTime: '08:00',
        hourlyShiftEndTime: '20:00',
        isActive: false,
      };
    }

    logger.info('[CALL AUTOMATION] SIM found:', {
      simId: sim._id,
      mobileNumber: sim.mobileNumber,
      isActive: sim.isActive,
      status: sim.status,
      companyId: sim.companyId?._id || sim.companyId,
    });

    if (!sim.isActive || sim.status !== 'active') {
      logger.warn('[CALL AUTOMATION] SIM not active:', simNumber, {
        isActive: sim.isActive,
        status: sim.status,
      });
      return {
        role: 'NONE',
        targets: [],
        callDuration: 10,
        frequency: 'daily',
        scheduledTime: '09:00',
        scheduledDay: 'monday',
        hourlyShiftStartTime: '08:00',
        hourlyShiftEndTime: '20:00',
        isActive: false,
        simId: sim._id,
        mobileNumber: sim.mobileNumber,
      };
    }

    // Get company's call automation config
    const configCompanyId = sim.companyId?._id || sim.companyId;
    logger.info('[CALL AUTOMATION] Looking for config with companyId:', configCompanyId);

    const config = await CallAutomationConfig.findOne({
      companyId: configCompanyId,
      isActive: true
    });

    if (!config) {
      logger.info('[CALL AUTOMATION] No active config for company:', configCompanyId);
      return {
        role: 'NONE',
        targets: [],
        callDuration: 10,
        frequency: 'daily',
        scheduledTime: '09:00',
        scheduledDay: 'monday',
        hourlyShiftStartTime: '08:00',
        hourlyShiftEndTime: '20:00',
        isActive: false,
        simId: sim._id,
        mobileNumber: sim.mobileNumber,
      };
    }

    // Migrate if needed
    if (!config.migrated && config.callerSimIds?.length > 0 && config.targetSimIds?.length > 0) {
      config.targetCallerMappings = config.targetSimIds.map(targetId => ({
        targetSimId: targetId,
        callerSimIds: [...config.callerSimIds],
        callDuration: config.callDuration || 10,
      }));
      config.migrated = true;
      await config.save();
    }

    // Determine role
    const simIdStr = sim._id.toString();
    let isCaller = false;
    let isTarget = false;
    let callerTargets = [];

    // Check new format
    if (config.targetCallerMappings && config.targetCallerMappings.length > 0) {
      for (const mapping of config.targetCallerMappings) {
        const targetId = (mapping.targetSimId._id || mapping.targetSimId).toString();
        const isCallerForThisTarget = mapping.callerSimIds.some(
          id => (id._id || id).toString() === simIdStr
        );

        if (isCallerForThisTarget) {
          isCaller = true;
          callerTargets.push({
            targetSimId: mapping.targetSimId,
            callDuration: mapping.callDuration || config.callDuration
          });
        }

        if (targetId === simIdStr) {
          isTarget = true;
        }
      }
    } else {
      // Fallback to old format
      isCaller = config.callerSimIds?.some(id => id.toString() === simIdStr);
      isTarget = config.targetSimIds?.some(id => id.toString() === simIdStr);
    }

    let role = 'NONE';
    if (isCaller && isTarget) {
      role = 'CALLER'; // Caller takes precedence
    } else if (isCaller) {
      role = 'CALLER';
    } else if (isTarget) {
      role = 'RECEIVER';
    }

    logger.info('[CALL AUTOMATION] Role determined:', {
      simNumber,
      role,
      isCaller,
      isTarget,
      callerTargetsCount: callerTargets.length,
    });

    // If caller, get target phone numbers
    let targets = [];
    if (role === 'CALLER' && callerTargets.length > 0) {
      const targetIds = callerTargets.map(t => (t.targetSimId._id || t.targetSimId));
      logger.info('[CALL AUTOMATION] Fetching mobile numbers for target IDs:', {
        targetIds: targetIds.map(id => id.toString()),
      });

      const targetSims = await Sim.find({
        _id: { $in: targetIds },
      }).select('mobileNumber');

      logger.info('[CALL AUTOMATION] Found target SIMs:', {
        foundCount: targetSims.length,
        mobileNumbers: targetSims.map(s => s.mobileNumber),
      });

      targets = callerTargets.map(t => {
        const targetId = (t.targetSimId._id || t.targetSimId).toString();
        const targetSim = targetSims.find(s => s._id.toString() === targetId);
        const result = {
          mobileNumber: targetSim?.mobileNumber,
          callDuration: t.callDuration
        };
        logger.info('[CALL AUTOMATION] Mapping target:', {
          targetId,
          mobileNumber: targetSim?.mobileNumber,
          callDuration: t.callDuration,
        });
        return result;
      }).filter(t => {
        const hasNumber = !!t.mobileNumber;
        if (!hasNumber) {
          logger.warn('[CALL AUTOMATION] Filtered out target without mobileNumber');
        }
        return hasNumber;
      });
    }

    const result = {
      role,
      targets,
      callDuration: config.callDuration,
      frequency: config.frequency,
      scheduledTime: config.scheduledTime || '09:00',
      scheduledDay: config.scheduledDay || 'monday',
      hourlyShiftStartTime: config.hourlyShiftStartTime || '08:00',
      hourlyShiftEndTime: config.hourlyShiftEndTime || '20:00',
      isActive: config.isActive,
      simId: sim._id,
      mobileNumber: sim.mobileNumber,
      configId: config._id,
    };

    logger.info('[CALL AUTOMATION] Returning device config:', {
      simNumber,
      role,
      targetsCount: targets.length,
      targets: targets.map(t => ({ mobileNumber: t.mobileNumber, callDuration: t.callDuration })),
      isActive: result.isActive,
    });

    return result;
  }

  /**
   * Update last run timestamp
   * @param {String} configId - Configuration ID
   * @param {Object} metadata - Additional metadata (simNumber, successCount, failCount)
   */
  async updateLastRun(configId, metadata = {}) {
    const config = await CallAutomationConfig.findById(configId);

    if (!config) {
      logger.warn('[CALL AUTOMATION] Config not found for updateLastRun', { configId });
      return { lastRunAt: null, nextRunAt: null };
    }

    config.lastRunAt = new Date();
    config.lastTargetIndex = config.getNextTargetIndex ? config.getNextTargetIndex() : 0;
    config.nextRunAt = config.calculateNextRunTime();

    if (metadata.simNumber) {
      config.lastCallerSim = metadata.simNumber;
    }
    if (metadata.successCount !== undefined) {
      config.lastSuccessCount = metadata.successCount;
    }
    if (metadata.failCount !== undefined) {
      config.lastFailCount = metadata.failCount;
    }

    await config.save();

    logger.info('[CALL AUTOMATION] Last run updated', {
      configId,
      simNumber: metadata.simNumber,
      successCount: metadata.successCount,
      failCount: metadata.failCount,
      lastRunAt: config.lastRunAt,
      nextRunAt: config.nextRunAt
    });

    return {
      lastRunAt: config.lastRunAt,
      nextRunAt: config.nextRunAt
    };
  }

  /**
   * Get eligible SIMs for selection (active SIMs)
   * @param {Object} user - User making the request
   * @returns {Object} Object with callers array and potentialTargets array
   */
  async getEligibleSims(user) {
    const companyId = user.role === 'super_admin' ? user.queryCompanyId : user.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID is required');
    }

    // Get all active SIMs
    const sims = await Sim.find({
      companyId,
      status: 'active'
    }).select('mobileNumber operator status assignedTo isAdminCaller')
      .populate('assignedTo', 'name email')
      .sort({ mobileNumber: 1 });

    // Separate into callers (isAdminCaller = true) and potential targets (all active SIMs)
    const callers = sims.filter(sim => sim.isAdminCaller === true);
    const potentialTargets = sims; // All active SIMs can be targets

    return {
      callers,
      potentialTargets,
      all: sims
    };
  }

  /**
   * Toggle automation active status
   * @param {Object} user - User making the request
   * @param {Boolean} isActive - Active status
   * @returns {Object} Updated configuration
   */
  async toggleActive(user, isActive) {
    const companyId = user.role === 'super_admin' ? user.queryCompanyId : user.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID is required');
    }

    const config = await CallAutomationConfig.findOne({ companyId });

    if (!config) {
      throw new NotFoundError('Call automation configuration not found');
    }

    config.isActive = isActive;
    config.updatedBy = user._id;

    if (isActive) {
      config.nextRunAt = config.calculateNextRunTime();
    } else {
      config.nextRunAt = null;
    }

    await config.save();

    await this.populateConfig(config);

    logger.info('[CALL AUTOMATION] Active status toggled', {
      companyId,
      isActive
    });

    return config;
  }

  /**
   * Delete a target-caller mapping
   * @param {Object} user - User making the request
   * @param {String} targetSimId - Target SIM ID to remove
   * @returns {Object} Updated configuration
   */
  async removeTargetMapping(user, targetSimId) {
    const companyId = user.role === 'super_admin' ? user.queryCompanyId : user.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID is required');
    }

    const config = await CallAutomationConfig.findOne({ companyId });

    if (!config) {
      throw new NotFoundError('Call automation configuration not found');
    }

    // Remove the mapping
    config.targetCallerMappings = config.targetCallerMappings.filter(
      m => (m.targetSimId._id || m.targetSimId).toString() !== targetSimId
    );

    if (config.targetCallerMappings.length === 0) {
      throw new ValidationError('Cannot remove the last target. At least one target is required.');
    }

    config.updatedBy = user._id;
    await config.save();

    await this.populateConfig(config);

    logger.info('[CALL AUTOMATION] Target mapping removed', {
      companyId,
      targetSimId,
      remainingMappings: config.targetCallerMappings.length
    });

    return config;
  }

  /**
   * Add a new target-caller mapping
   * @param {Object} user - User making the request
   * @param {Object} mapping - Mapping with targetSimId and callerSimIds
   * @returns {Object} Updated configuration
   */
  async addTargetMapping(user, mapping) {
    const companyId = user.role === 'super_admin' ? user.queryCompanyId : user.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID is required');
    }

    const config = await CallAutomationConfig.findOne({ companyId });

    if (!config) {
      throw new NotFoundError('Call automation configuration not found. Please create one first.');
    }

    // Validate mapping
    if (!mapping.targetSimId) {
      throw new ValidationError('Target SIM ID is required');
    }
    if (!mapping.callerSimIds || mapping.callerSimIds.length === 0) {
      throw new ValidationError('At least one caller SIM is required');
    }

    // Check if target already exists
    const existingIndex = config.targetCallerMappings.findIndex(
      m => (m.targetSimId._id || m.targetSimId).toString() === mapping.targetSimId
    );

    if (existingIndex >= 0) {
      // Update existing mapping
      config.targetCallerMappings[existingIndex].callerSimIds = mapping.callerSimIds;
      config.targetCallerMappings[existingIndex].callDuration = mapping.callDuration || config.callDuration;
    } else {
      // Add new mapping
      config.targetCallerMappings.push({
        targetSimId: mapping.targetSimId,
        callerSimIds: mapping.callerSimIds,
        callDuration: mapping.callDuration || config.callDuration
      });
    }

    config.updatedBy = user._id;
    await config.save();

    await this.populateConfig(config);

    logger.info('[CALL AUTOMATION] Target mapping added/updated', {
      companyId,
      targetSimId: mapping.targetSimId,
      callersCount: mapping.callerSimIds.length
    });

    return config;
  }
}

module.exports = new CallAutomationService();