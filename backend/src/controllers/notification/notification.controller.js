const notificationService = require('../../services/notification/notification.service');
const { successResponse, paginatedResponse } = require('../../utils/response');

class NotificationController {
  async getAll(req, res, next) {
    try {
      const result = await notificationService.getNotifications(req.query, req.user);
      return paginatedResponse(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  async getUserNotifications(req, res, next) {
    try {
      const result = await notificationService.getUserNotifications(req.user.id, req.query);
      return paginatedResponse(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const notification = await notificationService.getNotificationById(req.params.id, req.user);
      return successResponse(res, notification);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(req.params.id, req.user);
      return successResponse(res, notification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const companyId = req.user.role !== 'super_admin' ? req.user.companyId : null;
      const result = await notificationService.markAllAsRead(req.user.id, companyId, req.user.role);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const companyId = req.user.role !== 'super_admin' ? req.user.companyId : null;
      const result = await notificationService.getUnreadCount(req.user.id, companyId, req.user.role);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await notificationService.deleteNotification(req.params.id, req.user);
      return successResponse(res, result);
    } catch (error) {
      next(error)
    }
  }

  async clearRead(req, res, next) {
    try {
      const companyId = req.user.role !== 'super_admin' ? req.user.companyId : null;
      const result = await notificationService.clearReadNotifications(req.user.id, companyId, req.user.role);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req, res, next) {
    try {
      const user = await notificationService.updatePreferences(req.user.id, req.body);
      return successResponse(res, user, 'Preferences updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();