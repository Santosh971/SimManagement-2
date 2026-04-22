const Notification = require('../models/notification/notification.model');
const emailService = require('./emailService');
const logger = require('./logger');

/**
 * Notification Helper
 * Provides utility functions to create and send notifications
 */
class NotificationHelper {
  /**
   * Create an in-app notification
   * @param {Object} data - Notification data
   * @returns {Promise<Notification>}
   */
  async createNotification(data) {
    try {
      const notification = await Notification.create({
        companyId: data.companyId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        // [HIGHLIGHT FIX] Include metadata for frontend highlighting
        metadata: data.metadata || {},
        data: data.data || {},
        channels: data.channels || { email: false, sms: false, inApp: true },
      });

      logger.info('Notification created', {
        notificationId: notification._id,
        type: data.type,
        companyId: data.companyId,
        userId: data.userId,
      });

      return notification;
    } catch (error) {
      logger.error('Failed to create notification', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Create notification with email
   * @param {Object} notificationData - Notification data
   * @param {Object} emailData - Email data { to, subject, html }
   * @returns {Promise<Notification>}
   */
  async createWithNotification(notificationData, emailData) {
    try {
      // Create in-app notification
      const notification = await this.createNotification({
        ...notificationData,
        channels: { email: true, sms: false, inApp: true },
      });

      // Send email if configured
      if (emailService.isReady() && emailData) {
        const emailResult = await emailService.sendEmail(emailData);

        if (emailResult.success) {
          await notification.markAsSent('email', true);
          logger.info('Email notification sent', { notificationId: notification._id });
        } else {
          await notification.markAsSent('email', false, emailResult.error);
          logger.warn('Email notification failed', { notificationId: notification._id, error: emailResult.error });
        }
      }

      return notification;
    } catch (error) {
      logger.error('Failed to create notification with email', { error: error.message });
      throw error;
    }
  }

  /**
   * Notify when a company is created
   * @param {Object} company - Company document
   * @param {Object} admin - Admin user document
   */
  async notifyCompanyCreated(company, admin) {
    const notificationData = {
      companyId: company._id,
      userId: admin ? admin._id : null,
      type: 'system',
      title: 'Company Registration Successful',
      message: `Company "${company.name}" has been successfully registered. Your subscription is valid until ${company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toDateString() : 'N/A'}.`,
      priority: 'medium',
      // [HIGHLIGHT FIX] Add metadata for highlighting
      metadata: {
        companyName: company.name,
        expiryDate: company.subscriptionEndDate,
        planName: company.subscriptionId?.name,
      },
    };

    const emailData = admin ? {
      to: admin.email,
      subject: `Welcome to SIM Management - ${company.name}`,
      html: this._generateCompanyCreatedHtml(company, admin),
    } : {
      to: company.email,
      subject: `Welcome to SIM Management - ${company.name}`,
      html: this._generateCompanyCreatedHtml(company, null),
    };

    return this.createWithNotification(notificationData, emailData);
  }

  /**
   * Notify when an admin/user is created
   * @param {Object} user - New user document
   * @param {Object} company - Company document
   * @param {string} tempPassword - Temporary password (if applicable)
   */
  async notifyUserCreated(user, company, tempPassword = null) {
    const notificationData = {
      companyId: company._id,
      userId: user._id,
      type: 'system',
      title: 'Account Created',
      message: `Your account has been created for ${company.name}. You can now log in to access your dashboard.`,
      priority: 'medium',
      // [HIGHLIGHT FIX] Add metadata for highlighting
      metadata: {
        companyName: company.name,
        userName: user.name,
      },
    };

    // Send welcome email
    await emailService.sendWelcomeEmail(user, company, tempPassword);

    return this.createNotification(notificationData);
  }

  /**
   * Notify when a SIM is assigned to a user
   * @param {Object} sim - SIM document
   * @param {Object} user - User document (assigned to)
   * @param {Object} assignedBy - Admin who assigned
   * @param {Object} company - Company document
   */
  async notifySimAssigned(sim, user, assignedBy, company) {
    // Create notification for the assigned user
    const notificationData = {
      companyId: company._id,
      userId: user._id,
      type: 'info',
      title: 'SIM Card Assigned',
      message: `SIM card ${sim.mobileNumber} (${sim.operator}) has been assigned to you by ${assignedBy.name}.`,
      priority: 'medium',
      // [HIGHLIGHT FIX] Add metadata for highlighting
      metadata: {
        companyName: company.name,
        simNumber: sim.mobileNumber,
        userName: user.name,
      },
      data: { simId: sim._id },
    };

    // Send email to user
    await emailService.sendSimAssignmentEmail(user, sim, assignedBy);

    return this.createNotification(notificationData);
  }

  /**
   * Notify about recharge reminder
   * @param {Object} recharge - Recharge document
   * @param {Object} sim - SIM document
   * @param {Object} company - Company document
   * @param {number} daysLeft - Days until recharge
   */
  async notifyRechargeReminder(recharge, sim, company, daysLeft) {
    const notificationData = {
      companyId: company._id,
      type: 'recharge_due',
      title: `Recharge Reminder - ${sim.mobileNumber}`,
      message: `Your SIM ${sim.mobileNumber} (${sim.operator}) recharge is due in ${daysLeft} days. Next recharge date: ${new Date(recharge.nextRechargeDate).toDateString()}`,
      priority: daysLeft <= 1 ? 'critical' : daysLeft <= 3 ? 'high' : 'medium',
      // [HIGHLIGHT FIX] Add metadata for highlighting
      metadata: {
        companyName: company.name,
        simNumber: sim.mobileNumber,
        daysLeft: daysLeft,
        expiryDate: recharge.nextRechargeDate,
      },
      data: { simId: sim._id, rechargeId: recharge._id },
    };

    return this.createNotification(notificationData);
  }

  /**
   * Notify about inactive SIM
   * @param {Object} sim - SIM document
   * @param {Object} company - Company document
   * @param {number} inactiveDays - Days inactive
   */
  async notifyInactiveSim(sim, company, inactiveDays) {
    const notificationData = {
      companyId: company._id,
      type: 'inactive_sim',
      title: `Inactive SIM Alert - ${sim.mobileNumber}`,
      message: `SIM ${sim.mobileNumber} (${sim.operator}) has been inactive for ${inactiveDays} days. Please check the SIM status.`,
      priority: 'high',
      // [HIGHLIGHT FIX] Add metadata for highlighting
      metadata: {
        companyName: company.name,
        simNumber: sim.mobileNumber,
      },
      data: { simId: sim._id },
    };

    return this.createNotification(notificationData);
  }

  /**
   * Notify about subscription expiry
   * @param {Object} company - Company document
   * @param {number} daysLeft - Days until expiry
   */
  async notifySubscriptionExpiry(company, daysLeft) {
    const notificationData = {
      companyId: company._id,
      type: 'subscription_expiry',
      title: 'Subscription Expiring Soon',
      message: `Your subscription will expire in ${daysLeft} days. Please renew to continue using all features.`,
      priority: daysLeft <= 3 ? 'critical' : 'high',
      // [HIGHLIGHT FIX] Add metadata for highlighting
      metadata: {
        companyName: company.name,
        planName: company.subscriptionId?.name,
        daysLeft: daysLeft,
        expiryDate: company.subscriptionEndDate,
      },
      data: { companyId: company._id },
    };

    const emailData = {
      to: company.email,
      subject: `Subscription Expiring Soon - ${daysLeft} days remaining`,
      html: this._generateSubscriptionExpiryHtml(company, daysLeft),
    };

    return this.createWithNotification(notificationData, emailData);
  }

  /**
   * Notify when SIM is unassigned from a user
   * @param {Object} sim - SIM document
   * @param {Object} user - User document (unassigned from)
   * @param {Object} unassignedBy - Admin who unassigned
   * @param {Object} company - Company document
   */
  async notifySimUnassigned(sim, user, unassignedBy, company) {
    // Create notification for the unassigned user
    const notificationData = {
      companyId: company._id,
      userId: user._id,
      type: 'info',
      title: 'SIM Card Unassigned',
      message: `SIM card ${sim.mobileNumber} (${sim.operator}) has been unassigned from you by ${unassignedBy.name}.`,
      priority: 'medium',
      metadata: {
        companyName: company.name,
        simNumber: sim.mobileNumber,
        userName: user.name,
      },
      data: { simId: sim._id },
    };

    // Send email to user
    await emailService.sendSimUnassignmentEmail(user, sim, unassignedBy);

    return this.createNotification(notificationData);
  }

  /**
   * Notify when subscription is renewed
   * @param {Object} company - Company document
   * @param {Date} newEndDate - New subscription end date
   * @param {string} planName - Subscription plan name
   */
  async notifySubscriptionRenewed(company, newEndDate, planName) {
    const notificationData = {
      companyId: company._id,
      type: 'system',
      title: 'Subscription Renewed',
      message: `Your subscription has been renewed successfully. Valid until ${new Date(newEndDate).toDateString()}.`,
      priority: 'medium',
      metadata: {
        companyName: company.name,
        planName: planName,
        expiryDate: newEndDate,
      },
      data: { companyId: company._id },
    };

    // Send email
    await emailService.sendSubscriptionRenewalEmail(company, newEndDate, planName);

    return this.createNotification(notificationData);
  }

  /**
   * Notify when trial is extended
   * @param {Object} company - Company document
   * @param {Date} newEndDate - New trial end date
   * @param {number} additionalDays - Days added to trial
   */
  async notifyTrialExtended(company, newEndDate, additionalDays) {
    const notificationData = {
      companyId: company._id,
      type: 'system',
      title: 'Trial Period Extended',
      message: `Your trial period has been extended by ${additionalDays} days. New expiry: ${new Date(newEndDate).toDateString()}.`,
      priority: 'medium',
      metadata: {
        companyName: company.name,
        additionalDays: additionalDays,
        expiryDate: newEndDate,
      },
      data: { companyId: company._id },
    };

    // Send email
    await emailService.sendTrialExtensionEmail(company, newEndDate, additionalDays);

    return this.createNotification(notificationData);
  }

  /**
   * Notify when password is reset by admin
   * @param {Object} user - User whose password was reset
   * @param {string} newPassword - The new password
   * @param {Object} resetBy - Admin who reset the password
   * @param {Object} company - Company document
   */
  async notifyPasswordResetByAdmin(user, newPassword, resetBy, company) {
    const notificationData = {
      companyId: company._id,
      userId: user._id,
      type: 'security',
      title: 'Password Reset',
      message: `Your password has been reset by ${resetBy.name}. Please log in with your new password.`,
      priority: 'high',
      metadata: {
        userName: user.name,
        resetBy: resetBy.name,
      },
    };

    // Send email with new password
    await emailService.sendAdminPasswordResetEmail(user, newPassword, resetBy);

    return this.createNotification(notificationData);
  }

  /**
   * Notify when user account is activated
   * @param {Object} user - User document
   * @param {Object} company - Company document
   * @param {Object} activatedBy - Admin who activated
   */
  async notifyUserActivated(user, company, activatedBy) {
    const notificationData = {
      companyId: company._id,
      userId: user._id,
      type: 'system',
      title: 'Account Reactivated',
      message: `Your account has been reactivated by ${activatedBy.name}. You can now log in.`,
      priority: 'medium',
      metadata: {
        userName: user.name,
        activatedBy: activatedBy.name,
      },
    };

    // Send email
    await emailService.sendUserActivationEmail(user, company, activatedBy);

    return this.createNotification(notificationData);
  }

  /**
   * Notify when user account is deactivated
   * @param {Object} user - User document
   * @param {Object} company - Company document
   * @param {Object} deactivatedBy - Admin who deactivated
   */
  async notifyUserDeactivated(user, company, deactivatedBy) {
    const notificationData = {
      companyId: company._id,
      userId: user._id,
      type: 'system',
      title: 'Account Deactivated',
      message: `Your account has been deactivated by ${deactivatedBy.name}. Contact your administrator for assistance.`,
      priority: 'high',
      metadata: {
        userName: user.name,
        deactivatedBy: deactivatedBy.name,
      },
    };

    // Send email
    await emailService.sendUserDeactivationEmail(user, company, deactivatedBy);

    return this.createNotification(notificationData);
  }

  // Helper methods for generating HTML
  _generateCompanyCreatedHtml(company, admin) {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0;">Welcome to SIM Management!</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2>Congratulations!</h2>
          <p>Your company <strong>${company.name}</strong> has been successfully registered.</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 0;"><strong>Company Email:</strong> ${company.email}</p>
            <p style="margin: 10px 0 0 0;"><strong>Subscription Ends:</strong> ${company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toDateString() : 'N/A'}</p>
          </div>
          ${admin ? `<p>You can now log in with your email: <strong>${admin.email}</strong></p>` : ''}
          <p>Best regards,<br>SIM Management Team</p>
        </div>
      </div>
    `;
  }

  _generateSubscriptionExpiryHtml(company, daysLeft) {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0;">Subscription Expiry Notice</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2>Dear ${company.name},</h2>
          <p>Your subscription will expire soon.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 0;">${daysLeft} days remaining</p>
            <p style="margin: 10px 0 0 0;">Expiry Date: ${company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toDateString() : 'N/A'}</p>
          </div>
          <p>Please renew your subscription to continue using all features.</p>
          <p>Best regards,<br>SIM Management Team</p>
        </div>
      </div>
    `;
  }
}

module.exports = new NotificationHelper();