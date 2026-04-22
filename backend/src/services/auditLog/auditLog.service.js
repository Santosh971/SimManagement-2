const AuditLog = require('../../models/auditLog/auditLog.model');
const logger = require('../../utils/logger');
const mongoose = require('mongoose');

/**
 * Audit Log Service
 * Provides reusable logging functionality for all modules
 */
class AuditLogService {
  /**
   * Log an action to the audit trail
   * @param {Object} params - Log parameters
   * @param {string} params.action - Action type (e.g., "SIM_CREATE")
   * @param {string} params.module - Module name (e.g., "SIM")
   * @param {string} params.description - Human-readable description
   * @param {ObjectId} [params.performedBy] - User ID who performed the action (null for anonymous)
   * @param {string} [params.role] - User's role (defaults to 'anonymous')
   * @param {ObjectId} [params.companyId] - Company ID (null for super admin)
   * @param {ObjectId} [params.entityId] - Related entity ID
   * @param {string} [params.entityType] - Type of the entity
   * @param {Object} [params.metadata] - Additional metadata
   * @param {Object} [params.req] - Express request object (for IP and user agent)
   * @returns {Promise<Object|null>} - Created log or null on failure
   */
  async logAction({
    action,
    module,
    description,
    performedBy,
    role,
    companyId,
    entityId,
    entityType,
    metadata,
    req,
  }) {
    try {
      // Extract IP address
      let ipAddress = null;
      if (req) {
        ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    req.ip ||
                    req.connection?.remoteAddress ||
                    null;
      }

      // Extract user agent
      let userAgent = null;
      if (req) {
        userAgent = req.headers['user-agent'] || null;
      }

      // Create audit log
      const log = await AuditLog.createLog({
        action,
        module,
        description,
        performedBy: performedBy || null, // [AUDIT LOG FIX] - Allow null
        role: role || 'anonymous', // [AUDIT LOG FIX] - Default to anonymous
        companyId: companyId || null,
        entityId: entityId || null,
        entityType: entityType || null,
        metadata: metadata || {},
        ipAddress,
        userAgent,
      });

      if (log) {
        logger.info(`Audit log created: ${module}.${action}`, {
          logId: log._id,
          performedBy: performedBy || 'anonymous',
          companyId: companyId || null,
        });
      }

      return log;
    } catch (error) {
      // Fail-safe: logging failure should NOT break main functionality
      logger.error('Failed to create audit log', {
        action,
        module,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get audit logs with filters and pagination
   * @param {Object} query - Filter query
   * @param {Object} user - Current user for access control
   * @returns {Promise<Object>} - Paginated logs
   */
  async getLogs(query, user) {
    try {
      const filters = { ...query };
      const options = {
        page: parseInt(query.page) || 1,
        limit: Math.min(parseInt(query.limit) || 20, 100),
        sortBy: 'createdAt',
        sortOrder: -1,
      };

      // Role-based filtering
      if (user.role === 'super_admin') {
        // Super admin can see all logs (no filter)
        // companyId will be null for super admin logs
      } else if (user.role === 'admin') {
        // Admin sees ONLY their company's logs
        // They should NOT see:
        // - Super admin logs (companyId: null)
        // - Other companies' logs

        // IMPORTANT: If admin has no company, return empty results
        if (!user.companyId) {
          logger.warn('Admin user has no company assigned', { userId: user._id });
          return {
            data: [],
            total: 0,
            page: 1,
            limit: options.limit,
            totalPages: 0,
          };
        }

        // [AUDIT LOG FIX] - Convert companyId to ObjectId for proper comparison
        // This ensures string companyIds are properly compared with ObjectId in database
        filters.companyId = user.companyId instanceof mongoose.Types.ObjectId
          ? user.companyId
          : new mongoose.Types.ObjectId(user.companyId);
      } else {
        // Regular user sees only their own logs
        filters.performedBy = user._id;
      }

      // Remove pagination params from filters
      delete filters.page;
      delete filters.limit;
      delete filters.sortBy;
      delete filters.sortOrder;

      const result = await AuditLog.getLogsWithFilters(filters, options);

      logger.info('Fetched audit logs', {
        userId: user._id,
        userRole: user.role,
        companyId: user.companyId,
        filters: filters,
        count: result.data.length,
        total: result.total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch audit logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get single audit log by ID
   * @param {string} logId - Log ID
   * @param {Object} user - Current user for access control
   * @returns {Promise<Object>} - Log document
   */
  async getLogById(logId, user) {
    try {
      const log = await AuditLog.getLogById(logId);

      if (!log) {
        return null;
      }

      // Role-based access control
      if (user.role === 'super_admin') {
        // Super admin can see all logs
        return log;
      } else if (user.role === 'admin') {
        // Admin can only see logs from their company
        // [AUDIT LOG FIX] - Ensure proper ObjectId comparison
        const adminCompanyId = user.companyId instanceof mongoose.Types.ObjectId
          ? user.companyId.toString()
          : user.companyId;
        if (log.companyId && log.companyId.toString() !== adminCompanyId) {
          return null;
        }
        return log;
      } else {
        // Regular user can only see their own logs
        if (!log.performedBy || log.performedBy._id.toString() !== user._id.toString()) {
          return null;
        }
        return log;
      }
    } catch (error) {
      logger.error('Failed to fetch audit log by ID', { error: error.message, logId });
      throw error;
    }
  }

  /**
   * Get statistics for audit logs
   * @param {Object} query - Filter query
   * @param {Object} user - Current user for access control
   * @returns {Promise<Object>} - Statistics
   */
  async getStats(query, user) {
    try {
      const filters = {};

      // Role-based filtering
      if (user.role === 'super_admin') {
        // Super admin can see all stats
        // No company filter needed
      } else if (user.role === 'admin') {
        // Admin can only see their company's stats
        // [AUDIT LOG FIX] - Convert companyId to ObjectId for proper comparison
        filters.companyId = user.companyId instanceof mongoose.Types.ObjectId
          ? user.companyId
          : new mongoose.Types.ObjectId(user.companyId);
      } else {
        // Regular user can only see their own stats
        filters.performedBy = user._id;
      }

      // Date range
      if (query.startDate) {
        filters.startDate = query.startDate;
      }
      if (query.endDate) {
        filters.endDate = query.endDate;
      }

      const stats = await AuditLog.getActionCounts(filters);

      // Get total count with same filters
      const totalResult = await AuditLog.getLogsWithFilters(filters, { limit: 1 });

      return {
        modules: stats,
        totalLogs: totalResult.total,
      };
    } catch (error) {
      logger.error('Failed to fetch audit log stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get available actions for a module
   * @param {string} module - Module name
   * @returns {Array<string>} - List of actions
   */
  getModuleActions(module) {
    const moduleActions = {
      AUTH: ['USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'OTP_SEND', 'OTP_VERIFY'],
      SIM: ['SIM_CREATE', 'SIM_UPDATE', 'SIM_DELETE', 'SIM_ASSIGN', 'SIM_UNASSIGN', 'SIM_STATUS_CHANGE', 'SIM_BULK_CREATE', 'SIM_BULK_IMPORT', 'SIM_EXPORT', 'SIM_MESSAGING_UPDATE'],
      RECHARGE: ['RECHARGE_ADD', 'RECHARGE_UPDATE', 'RECHARGE_DELETE', 'RECHARGE_EXPIRE', 'RECHARGE_REMINDER_SENT'],
      USER: ['USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_PASSWORD_RESET', 'USER_STATUS_CHANGE'],
      REPORT: ['REPORT_EXPORT', 'REPORT_IMPORT', 'REPORT_DOWNLOAD', 'REPORT_GENERATE'],
      COMPANY: ['COMPANY_CREATE', 'COMPANY_UPDATE', 'COMPANY_DELETE', 'COMPANY_ADMIN_CREATE', 'COMPANY_ADMIN_UPDATE', 'COMPANY_ADMIN_DELETE', 'COMPANY_SUBSCRIPTION_RENEW'],
      SUBSCRIPTION: ['SUBSCRIPTION_CREATE', 'SUBSCRIPTION_UPDATE', 'SUBSCRIPTION_DELETE', 'SUBSCRIPTION_TOGGLE'],
      PAYMENT: ['PAYMENT_INITIATE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_REFUND'],
      CALL_LOG: ['CALL_LOG_SYNC', 'CALL_LOG_EXPORT', 'CALL_LOG_FLAG'],
      NOTIFICATION: ['NOTIFICATION_CREATE', 'NOTIFICATION_READ', 'NOTIFICATION_DELETE', 'NOTIFICATION_BULK_READ'],
      DASHBOARD: ['DASHBOARD_VIEW'],
      SETTINGS: ['SETTINGS_UPDATE', 'PREFERENCES_UPDATE'],
    };

    return moduleActions[module?.toUpperCase()] || [];
  }

  /**
   * Get all modules
   * @returns {Array<string>} - List of modules
   */
  getAllModules() {
    return ['AUTH', 'SIM', 'RECHARGE', 'USER', 'REPORT', 'COMPANY', 'SUBSCRIPTION', 'PAYMENT', 'CALL_LOG', 'NOTIFICATION', 'DASHBOARD', 'SETTINGS'];
  }
}

module.exports = new AuditLogService();