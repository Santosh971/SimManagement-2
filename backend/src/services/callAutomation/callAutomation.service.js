/**
 * Call Automation Service
 *
 * Business logic for automated SIM call verification system.
 * Handles configuration management, role determination, and target rotation.
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
    const { callerSimIds, targetSimIds, callDuration, frequency, scheduledTime, scheduledDay, isActive } = data;

    // Determine company ID
    const companyId = user.role === 'super_admin' ? data.companyId : user.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID is required');
    }

    // Validate caller SIMs
    if (!callerSimIds || callerSimIds.length === 0) {
      throw new ValidationError('At least one caller SIM is required');
    }

    // Validate target SIMs
    if (!targetSimIds || targetSimIds.length === 0) {
      throw new ValidationError('At least one target SIM is required');
    }

    // Validate call duration
    if (callDuration < 10 || callDuration > 60) {
      throw new ValidationError('Call duration must be between 10 and 60 seconds');
    }

    // Validate scheduled time format
    if (scheduledTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(scheduledTime)) {
      throw new ValidationError('Scheduled time must be in HH:MM format');
    }

    // Verify all SIMs belong to the company
    // [HARD DELETE] Removed isActive: true filter - SIMs are now hard deleted
    const callerSimDocs = await Sim.find({
      _id: { $in: callerSimIds },
      companyId,
    });

    if (callerSimDocs.length !== callerSimIds.length) {
      throw new ValidationError('One or more caller SIMs not found or not active');
    }

    const targetSimDocs = await Sim.find({
      _id: { $in: targetSimIds },
      companyId,
    });

    if (targetSimDocs.length !== targetSimIds.length) {
      throw new ValidationError('One or more target SIMs not found or not active');
    }

    // Check for existing config
    let config = await CallAutomationConfig.findOne({ companyId });

    if (config) {
      // Update existing config
      config.callerSimIds = callerSimIds;
      config.targetSimIds = targetSimIds;
      config.callDuration = callDuration;
      config.frequency = frequency || 'daily';
      config.scheduledTime = scheduledTime || '09:00';
      config.scheduledDay = scheduledDay || 'monday';
      config.isActive = isActive !== undefined ? isActive : true;
      config.updatedBy = user._id;
      config.nextRunAt = config.calculateNextRunTime();
    } else {
      // Create new config
      config = new CallAutomationConfig({
        companyId,
        callerSimIds,
        targetSimIds,
        callDuration,
        frequency: frequency || 'daily',
        scheduledTime: scheduledTime || '09:00',
        scheduledDay: scheduledDay || 'monday',
        isActive: isActive !== undefined ? isActive : true,
        createdBy: user._id,
        nextRunAt: new Date(Date.now() + 60 * 1000), // First run in 1 minute
      });
    }

    await config.save();

    // Populate for response
    await config.populate('callerSimIds', 'mobileNumber operator status');
    await config.populate('targetSimIds', 'mobileNumber operator status');

    logger.info('[CALL AUTOMATION] Config saved', {
      companyId,
      callerCount: callerSimIds.length,
      targetCount: targetSimIds.length,
      isActive: config.isActive
    });

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

    const config = await CallAutomationConfig.findByCompany(targetCompanyId);

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
        isActive: false,
      };
    }

    if (!sim.isActive || sim.status !== 'active') {
      logger.warn('[CALL AUTOMATION] SIM not active:', simNumber);
      return {
        role: 'NONE',
        targets: [],
        callDuration: 10,
        frequency: 'daily',
        isActive: false,
      };
    }

    // Get company's call automation config
    const config = await CallAutomationConfig.findOne({
      companyId: sim.companyId._id || sim.companyId,
      isActive: true
    }).populate('targetSimIds', 'mobileNumber');

    if (!config) {
      logger.info('[CALL AUTOMATION] No active config for company:', sim.companyId._id || sim.companyId);
      return {
        role: 'NONE',
        targets: [],
        callDuration: 10,
        frequency: 'daily',
        isActive: false,
        simId: sim._id,
        mobileNumber: sim.mobileNumber,
      };
    }

    // Determine role
    const simIdStr = sim._id.toString();
    const isCaller = config.callerSimIds.some(id => id.toString() === simIdStr);
    const isTarget = config.targetSimIds.some(id => id.toString() === simIdStr);

    let role = 'NONE';
    if (isCaller) {
      role = 'CALLER';
    } else if (isTarget) {
      role = 'RECEIVER';
    }

    logger.info('[CALL AUTOMATION] Role determined:', {
      simNumber,
      role,
      isCaller,
      isTarget
    });

    // If caller, get target phone numbers with rotation
    let targets = [];
    if (role === 'CALLER') {
      targets = await this.getTargetsWithRotation(config, sim._id);
    }

    return {
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
  }

  /**
   * Get target phone numbers with round-robin rotation
   * @param {Object} config - Call automation config
   * @param {String} callerSimId - The caller SIM ID
   * @returns {Array} Array of target phone numbers
   */
  async getTargetsWithRotation(config, callerSimId) {
    // Get all target phone numbers
    const targetSimIds = config.targetSimIds.map(id =>
      id._id ? id._id.toString() : id.toString()
    );

    // Fetch target SIMs to get phone numbers
    // [HARD DELETE] Removed isActive: true filter - SIMs are now hard deleted
    const targets = await Sim.find({
      _id: { $in: targetSimIds },
    }).select('mobileNumber');

    // Sort by _id for consistent ordering
    targets.sort((a, b) => a._id.toString().localeCompare(b._id.toString()));

    // Return phone numbers
    return targets.map(t => t.mobileNumber);
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
   * @returns {Array} Array of eligible SIMs
   */
  async getEligibleSims(user) {
    const companyId = user.role === 'super_admin' ? user.queryCompanyId : user.companyId;

    if (!companyId) {
      throw new ForbiddenError('Company ID is required');
    }

    // [HARD DELETE] Removed isActive: true filter - SIMs are now hard deleted
    const sims = await Sim.find({
      companyId,
      status: 'active'
    }).select('mobileNumber operator status assignedTo')
      .populate('assignedTo', 'name email')
      .sort({ mobileNumber: 1 });

    return sims;
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
}

module.exports = new CallAutomationService();