/**
 * Call Automation Controller
 *
 * Handles HTTP requests for call automation configuration.
 * UPDATED: Now supports per-target caller assignment.
 */

const callAutomationService = require('../../services/callAutomation/callAutomation.service');
const auditLogService = require('../../services/auditLog/auditLog.service');
const { successResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

class CallAutomationController {
  /**
   * Save or update call automation configuration
   * POST /api/call-automation/config
   */
  async saveConfig(req, res, next) {
    try {
      logger.info('[CALL AUTOMATION CONTROLLER] saveConfig request body:', {
        mappingsCount: req.body.targetCallerMappings?.length || 0,
        frequency: req.body.frequency,
        isActive: req.body.isActive,
      });

      const config = await callAutomationService.saveConfig(req.body, req.user);

      // Audit log
      await auditLogService.logAction({
        action: 'CALL_AUTOMATION_CONFIG_SAVE',
        module: 'CALL_AUTOMATION',
        description: `Saved call automation configuration with ${config.targetCallerMappings.length} target-caller mappings`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: config.companyId,
        entityId: config._id,
        entityType: 'CallAutomationConfig',
        metadata: {
          mappingsCount: config.targetCallerMappings.length,
          callDuration: config.callDuration,
          frequency: config.frequency,
          scheduledTime: config.scheduledTime,
          scheduledDay: config.scheduledDay,
          isActive: config.isActive
        },
        req,
      });

      return successResponse(res, config, 'Call automation configuration saved successfully');
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Save config error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get call automation configuration
   * GET /api/call-automation/config
   */
  async getConfig(req, res, next) {
    try {
      const { companyId } = req.query;
      const config = await callAutomationService.getConfig(req.user, companyId);

      return successResponse(res, config);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Get config error', { error: error.message });
      next(error);
    }
  }

  /**
   * Toggle automation active status
   * PUT /api/call-automation/toggle
   */
  async toggleActive(req, res, next) {
    try {
      const { isActive } = req.body;
      const config = await callAutomationService.toggleActive(req.user, isActive);

      // Audit log
      await auditLogService.logAction({
        action: 'CALL_AUTOMATION_TOGGLE',
        module: 'CALL_AUTOMATION',
        description: `Call automation ${isActive ? 'enabled' : 'disabled'}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: config.companyId,
        entityId: config._id,
        entityType: 'CallAutomationConfig',
        metadata: { isActive },
        req,
      });

      return successResponse(res, config, `Call automation ${isActive ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Toggle error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get eligible SIMs for selection
   * GET /api/call-automation/eligible-sims
   */
  async getEligibleSims(req, res, next) {
    try {
      const sims = await callAutomationService.getEligibleSims(req.user);
      return successResponse(res, sims);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Get eligible SIMs error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get device configuration for mobile app
   * GET /api/device/call-config
   * Public endpoint - no JWT required (uses SIM number for auth)
   */
  async getDeviceConfig(req, res, next) {
    try {
      const { simNumber } = req.query;

      if (!simNumber) {
        return successResponse(res, {
          role: 'NONE',
          targets: [],
          callDuration: 10,
          frequency: 'daily',
          isActive: false,
        });
      }

      const config = await callAutomationService.getDeviceConfig(simNumber);

      return successResponse(res, config);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Get device config error', { error: error.message });
      next(error);
    }
  }

  /**
   * Update last run timestamp (called by mobile app)
   * POST /api/device/call-complete
   */
  async updateLastRun(req, res, next) {
    try {
      const { configId, simNumber, successCount, failCount } = req.body;

      logger.info('[CALL AUTOMATION CONTROLLER] Call complete notification received', {
        configId,
        simNumber,
        successCount,
        failCount
      });

      if (!configId) {
        return successResponse(res, { success: false, message: 'configId is required' });
      }

      const result = await callAutomationService.updateLastRun(configId, {
        simNumber,
        successCount: successCount || 0,
        failCount: failCount || 0
      });

      return successResponse(res, {
        success: true,
        data: {
          lastRunAt: result.lastRunAt,
          nextRunAt: result.nextRunAt
        }
      });
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Update last run error', { error: error.message });
      next(error);
    }
  }

  /**
   * Add a new target-caller mapping
   * POST /api/call-automation/mapping
   */
  async addTargetMapping(req, res, next) {
    try {
      const { targetSimId, callerSimIds, callDuration } = req.body;

      logger.info('[CALL AUTOMATION CONTROLLER] Add target mapping request:', {
        targetSimId,
        callersCount: callerSimIds?.length || 0,
      });

      const config = await callAutomationService.addTargetMapping(req.user, {
        targetSimId,
        callerSimIds,
        callDuration
      });

      // Audit log
      await auditLogService.logAction({
        action: 'CALL_AUTOMATION_MAPPING_ADD',
        module: 'CALL_AUTOMATION',
        description: `Added target-caller mapping`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: config.companyId,
        entityId: config._id,
        entityType: 'CallAutomationConfig',
        metadata: { targetSimId, callersCount: callerSimIds?.length },
        req,
      });

      return successResponse(res, config, 'Target mapping added successfully');
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Add mapping error', { error: error.message });
      next(error);
    }
  }

  /**
   * Delete call automation configuration
   * DELETE /api/call-automation/config
   */
  async deleteConfig(req, res, next) {
    try {
      const result = await callAutomationService.deleteConfig(req.user);

      // Audit log
      await auditLogService.logAction({
        action: 'CALL_AUTOMATION_CONFIG_DELETE',
        module: 'CALL_AUTOMATION',
        description: 'Deleted call automation configuration',
        performedBy: req.user._id,
        role: req.user.role,
        companyId: req.user.role === 'super_admin' ? req.user.queryCompanyId : req.user.companyId,
        req,
      });

      return successResponse(res, null, result.message);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Delete config error', { error: error.message });
      next(error);
    }
  }

  /**
   * Remove a target-caller mapping
   * DELETE /api/call-automation/mapping/:targetSimId
   */
  async removeTargetMapping(req, res, next) {
    try {
      const { targetSimId } = req.params;

      logger.info('[CALL AUTOMATION CONTROLLER] Remove target mapping request:', {
        targetSimId,
      });

      const config = await callAutomationService.removeTargetMapping(req.user, targetSimId);

      // Audit log
      await auditLogService.logAction({
        action: 'CALL_AUTOMATION_MAPPING_REMOVE',
        module: 'CALL_AUTOMATION',
        description: `Removed target-caller mapping`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: config.companyId,
        entityId: config._id,
        entityType: 'CallAutomationConfig',
        metadata: { targetSimId },
        req,
      });

      return successResponse(res, config, 'Target mapping removed successfully');
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Remove mapping error', { error: error.message });
      next(error);
    }
  }
}

module.exports = new CallAutomationController();