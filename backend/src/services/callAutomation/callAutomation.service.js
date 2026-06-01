/**
 * Call Automation Service
 *
 * Business logic for automated SIM call verification system.
 * Handles configuration management, role determination, and target rotation.
 *
 * UPDATED: Now supports per-target caller assignment where each target SIM
 * can have its own set of caller SIMs.
 */

const CallAutomationConfig = require('../../models/callAutomation/callAutomation.model');
const Sim = require('../../models/sim/sim.model');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../utils/errors');
const { buildPhoneQuery } = require('../../utils/response');
const logger = require('../../utils/logger');

class CallAutomationService {
  /**
   * Save or update call automation configuration
   * @param {Object} data - Configuration data
   * @param {Object} user - User making the request
   * @returns {Object} Saved configuration
   */
  async saveConfig(data, user) {
    const { targetCallerMappings, callDuration, frequency, scheduledTime, scheduledDay, isActive } = data;

    // Determine company ID
    const companyId = user.role === 'super_admin' ? data.companyId : user.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID is required');
    }

    // Validate targetCallerMappings
    if (!targetCallerMappings || targetCallerMappings.length === 0) {
      throw new ValidationError('At least one target-caller mapping is required');
    }

    // Validate each mapping
    for (const mapping of targetCallerMappings) {
      if (!mapping.targetSimId) {
        throw new ValidationError('Each mapping must have a target SIM');
      }
      if (!mapping.callerSimIds || mapping.callerSimIds.length === 0) {
        throw new ValidationError('Each target must have at least one caller SIM');
      }
    }

    // Validate call duration
    const globalDuration = callDuration || 10;
    if (globalDuration < 10 || globalDuration > 60) {
      throw new ValidationError('Call duration must be between 10 and 60 seconds');
    }

    // Validate per-target durations
    for (const mapping of targetCallerMappings) {
      if (mapping.callDuration && (mapping.callDuration < 10 || mapping.callDuration > 60)) {
        throw new ValidationError('Per-target call duration must be between 10 and 60 seconds');
      }
    }

    // Validate scheduled time format
    if (scheduledTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(scheduledTime)) {
      throw new ValidationError('Scheduled time must be in HH:MM format');
    }

    // Collect all unique SIM IDs
    const allTargetIds = [...new Set(targetCallerMappings.map(m => m.targetSimId.toString()))];
    const allCallerIds = [...new Set(
      targetCallerMappings.flatMap(m => m.callerSimIds.map(id => id.toString()))
    )];

    // Check for overlap between callers and targets
    const overlap = allTargetIds.filter(id => allCallerIds.includes(id));
    if (overlap.length > 0) {
      throw new ValidationError('A SIM cannot be both a caller and a target');
    }

    // Verify all SIMs belong to the company and are active
    const allSimIds = [...new Set([...allTargetIds, ...allCallerIds])];
    const sims = await Sim.find({
      _id: { $in: allSimIds },
      companyId,
    });

    if (sims.length !== allSimIds.length) {
      const foundIds = sims.map(s => s._id.toString());
      const missingIds = allSimIds.filter(id => !foundIds.includes(id));
      throw new ValidationError(`Some SIMs not found or don't belong to this company: ${missingIds.join(', ')}`);
    }

    // Check for existing config
    let config = await CallAutomationConfig.findOne({ companyId });

    logger.info('[CALL AUTOMATION] saveConfig called with:', {
      companyId,
      mappingsCount: targetCallerMappings.length,
      frequency,
      scheduledTime,
      scheduledDay,
      callDuration: globalDuration,
      isActive,
      existingConfig: config ? config._id : 'new',
    });

    if (config) {
      // Update existing config
      config.targetCallerMappings = targetCallerMappings.map(mapping => ({
        targetSimId: mapping.targetSimId,
        callerSimIds: mapping.callerSimIds,
        callDuration: mapping.callDuration || globalDuration,
      }));

      // Clear old format data
      config.callerSimIds = [];
      config.targetSimIds = [];

      config.callDuration = globalDuration;
      config.frequency = frequency || 'daily';
      config.scheduledTime = scheduledTime || '09:00';
      config.scheduledDay = scheduledDay || 'monday';
      config.isActive = isActive !== undefined ? isActive : true;
      config.updatedBy = user._id;
      config.migrated = true;
      config.nextRunAt = config.calculateNextRunTime();
    } else {
      // Create new config
      config = new CallAutomationConfig({
        companyId,
        targetCallerMappings: targetCallerMappings.map(mapping => ({
          targetSimId: mapping.targetSimId,
          callerSimIds: mapping.callerSimIds,
          callDuration: mapping.callDuration || globalDuration,
        })),
        callerSimIds: [], // Empty, using new format
        targetSimIds: [], // Empty, using new format
        callDuration: globalDuration,
        frequency: frequency || 'daily',
        scheduledTime: scheduledTime || '09:00',
        scheduledDay: scheduledDay || 'monday',
        isActive: isActive !== undefined ? isActive : true,
        createdBy: user._id,
        migrated: true,
        nextRunAt: new Date(Date.now() + 60 * 1000), // First run in 1 minute
      });
    }

    await config.save();

    logger.info('[CALL AUTOMATION] Config saved successfully:', {
      configId: config._id,
      companyId,
      mappingsCount: config.targetCallerMappings.length,
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
    await config.populate('targetCallerMappings.targetSimId', 'mobileNumber operator status assignedTo');
    await config.populate('targetCallerMappings.callerSimIds', 'mobileNumber operator status assignedTo');
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

    let config = await CallAutomationConfig.findByCompany(targetCompanyId);

    if (config) {
      // Check if migration is needed
      if (!config.migrated && config.callerSimIds?.length > 0 && config.targetSimIds?.length > 0) {
        logger.info('[CALL AUTOMATION] Migrating old config format to new format', {
          configId: config._id,
          companyId: targetCompanyId
        });
        config.migrateToNewFormat();
        await config.save();
        config = await CallAutomationConfig.findByCompany(targetCompanyId);
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
        isActive: false,
        simId: sim._id,
        mobileNumber: sim.mobileNumber,
      };
    }

    // Migrate if needed
    if (!config.migrated && config.callerSimIds?.length > 0 && config.targetSimIds?.length > 0) {
      config.migrateToNewFormat();
      await config.save();
    }

    // Determine role based on new mapping structure
    const simIdStr = sim._id.toString();

    // Check if this SIM is a caller (appears in any callerSimIds)
    let isCaller = false;
    let callerTargets = [];

    if (config.targetCallerMappings && config.targetCallerMappings.length > 0) {
      for (const mapping of config.targetCallerMappings) {
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
      }
    } else {
      // Fallback to old format
      isCaller = config.callerSimIds?.some(id => id.toString() === simIdStr);
    }

    // Check if this SIM is a target
    let isTarget = false;
    if (config.targetCallerMappings && config.targetCallerMappings.length > 0) {
      isTarget = config.targetCallerMappings.some(
        m => (m.targetSimId._id || m.targetSimId).toString() === simIdStr
      );
    } else {
      // Fallback to old format
      isTarget = config.targetSimIds?.some(id => id.toString() === simIdStr);
    }

    let role = 'NONE';
    if (isCaller && isTarget) {
      logger.warn('[CALL AUTOMATION] SIM is in both caller and target lists:', {
        simNumber,
        simId: simIdStr,
      });
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
    });

    // If caller, get target phone numbers
    let targets = [];
    if (role === 'CALLER' && callerTargets.length > 0) {
      const targetIds = callerTargets.map(t => t.targetSimId._id || t.targetSimId);
      const targetSims = await Sim.find({
        _id: { $in: targetIds },
      }).select('mobileNumber');

      // Map targets with their call durations
      targets = callerTargets.map(t => {
        const targetId = (t.targetSimId._id || t.targetSimId).toString();
        const targetSim = targetSims.find(s => s._id.toString() === targetId);
        return {
          mobileNumber: targetSim?.mobileNumber,
          callDuration: t.callDuration
        };
      }).filter(t => t.mobileNumber);
    }

    const result = {
      role,
      targets,
      callDuration: config.callDuration,
      frequency: config.frequency,
      scheduledTime: config.scheduledTime || '09:00',
      scheduledDay: config.scheduledDay || 'monday',
      isActive: config.isActive,
      simId: sim._id,
      mobileNumber: sim.mobileNumber,
      configId: config._id,
    };

    logger.info('[CALL AUTOMATION] Returning device config:', {
      simNumber,
      role,
      targetsCount: targets.length,
      isActive: result.isActive,
    });

    return result;
  }

  /**
   * Get target phone numbers with round-robin rotation
   * @param {Object} config - Call automation config
   * @param {String} callerSimId - The caller SIM ID
   * @returns {Array} Array of target phone numbers with call durations
   */
  async getTargetsWithRotation(config, callerSimId) {
    // Get targets for this specific caller
    const callerTargets = config.getTargetsForCaller(callerSimId);

    if (!callerTargets || callerTargets.length === 0) {
      return [];
    }

    // Fetch target SIM details
    const targetIds = callerTargets.map(t => t.targetSimId._id || t.targetSimId);
    const targets = await Sim.find({
      _id: { $in: targetIds },
    }).select('mobileNumber');

    // Return phone numbers with call durations
    return callerTargets.map(t => {
      const targetId = (t.targetSimId._id || t.targetSimId).toString();
      const targetSim = targets.find(s => s._id.toString() === targetId);
      return {
        mobileNumber: targetSim?.mobileNumber,
        callDuration: t.callDuration
      };
    }).filter(t => t.mobileNumber);
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
    config.lastTargetIndex = config.getNextTargetIndex();
    config.nextRunAt = config.calculateNextRunTime();

    // Store metadata about the last run
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