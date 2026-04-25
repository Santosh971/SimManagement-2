const cron = require('node-cron');
const rechargeService = require('../services/recharge/recharge.service');
const notificationService = require('../services/notification/notification.service');
const Sim = require('../models/sim/sim.model');
const Company = require('../models/company/company.model');
const logger = require('../utils/logger');

class CronService {
  constructor() {
    this.jobs = new Map();
  }

  // Schedule a new job
  schedule(name, expression, callback) {
    if (this.jobs.has(name)) {
      logger.warn(`Job ${name} already exists, replacing...`);
      this.stop(name);
    }

    const job = cron.schedule(expression, callback, {
      scheduled: true,
      timezone: 'Asia/Kolkata',
    });

    this.jobs.set(name, job);
    logger.info(`Job ${name} scheduled: ${expression}`);

    return job;
  }

  // Stop a job
  stop(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      logger.info(`Job ${name} stopped`);
    }
  }

  // Start a stopped job
  start(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      logger.info(`Job ${name} started`);
    }
  }

  // List all jobs
  list() {
    return Array.from(this.jobs.keys());
  }

  // Initialize all jobs
  initJobs() {
    logger.info('Initializing cron jobs...');

    this.scheduleRechargeReminders();
    this.scheduleInactiveSimAlerts();
    this.scheduleSubscriptionExpiryCheck();
    this.scheduleDataCleanup();
    this.scheduleWhatsAppInactiveCheck();
    this.scheduleTelegramInactiveCheck();
    this.scheduleWifiAlertCheck();
    this.scheduleWifiMetricsCleanup();

    logger.info('All cron jobs initialized');
  }

  // Recharge reminder job - runs daily at 9 AM
  scheduleRechargeReminders() {
    this.schedule('recharge-reminder', '0 9 * * *', async () => {
      try {
        logger.info('Starting recharge reminder job');

        const companies = await Company.find({ isActive: true });

        for (const company of companies) {
          const upcomingRecharges = await rechargeService.getUpcomingRecharges(
            company._id,
            company.settings?.rechargeReminderDays || 3
          );

          for (const recharge of upcomingRecharges) {
            await notificationService.sendRechargeReminder(recharge);
          }
        }

        logger.info('Recharge reminder job completed');
      } catch (error) {
        logger.error('Recharge reminder job failed:', error);
      }
    });
  }

  // Inactive SIM alert job - runs daily at 10 AM
  scheduleInactiveSimAlerts() {
    this.schedule('inactive-sim-alert', '0 10 * * *', async () => {
      try {
        logger.info('Starting inactive SIM alert job');

        const companies = await Company.find({ isActive: true });

        for (const company of companies) {
          const inactiveDays = company.settings?.inactiveSimDays || 7;
          const inactiveSims = await Sim.findInactive(company._id, inactiveDays);

          for (const sim of inactiveSims) {
            await notificationService.sendInactiveSimAlert(sim);
          }
        }

        logger.info('Inactive SIM alert job completed');
      } catch (error) {
        logger.error('Inactive SIM alert job failed:', error);
      }
    });
  }

  // Subscription expiry check - runs daily at 8 AM
  scheduleSubscriptionExpiryCheck() {
    this.schedule('subscription-expiry-check', '0 8 * * *', async () => {
      try {
        logger.info('Starting subscription expiry check job');

        // Find companies with subscription expiring in 7, 3, 1 days
        const reminderDays = [7, 3, 1];

        for (const days of reminderDays) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + days);

          const companies = await Company.find({
            isActive: true,
            subscriptionEndDate: {
              $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
              $lt: new Date(targetDate.setHours(23, 59, 59, 999)),
            },
          }).populate('subscriptionId');

          for (const company of companies) {
            await notificationService.sendSubscriptionExpiryNotice(company, days);
          }
        }

        // Deactivate expired subscriptions
        const expiredCompanies = await Company.find({
          subscriptionEndDate: { $lt: new Date() },
          isActive: true,
        });

        for (const company of expiredCompanies) {
          company.isActive = false;
          await company.save();
          logger.info(`Company ${company.name} deactivated due to expired subscription`);
        }

        logger.info('Subscription expiry check job completed');
      } catch (error) {
        logger.error('Subscription expiry check job failed:', error);
      }
    });
  }

  // Data cleanup job - runs weekly on Sunday at 2 AM
  scheduleDataCleanup() {
    this.schedule('data-cleanup', '0 2 * * 0', async () => {
      try {
        logger.info('Starting data cleanup job');

        const Notification = require('../models/notification/notification.model');
        const CallLog = require('../models/callLog/callLog.model');

        // Delete read notifications older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const notificationResult = await Notification.deleteMany({
          isRead: true,
          createdAt: { $lt: thirtyDaysAgo },
        });

        logger.info(`Cleaned up ${notificationResult.deletedCount} old notifications`);
        logger.info('Data cleanup job completed');
      } catch (error) {
        logger.error('Data cleanup job failed:', error);
      }
    });
  }

  // WhatsApp inactive message check - runs every 5 minutes
  // Marks SIMs as inactive if no reply received within 1 hour
  scheduleWhatsAppInactiveCheck() {
    this.schedule('whatsapp-inactive-check', '*/5 * * * *', async () => {
      try {
        logger.info('Starting WhatsApp inactive check job');

        const whatsAppService = require('../services/whatsapp/whatsapp.service');
        const result = await whatsAppService.processInactiveMessages();

        logger.info(`WhatsApp inactive check completed: ${result.processed} messages processed, ${result.simsUpdated} SIMs marked inactive`);
      } catch (error) {
        logger.error('WhatsApp inactive check job failed:', error);
      }
    });
  }

  // Telegram inactive message check - runs every 5 minutes
  // Marks SIMs as inactive if no reply received within 1 hour
  scheduleTelegramInactiveCheck() {
    this.schedule('telegram-inactive-check', '*/5 * * * *', async () => {
      try {
        logger.info('Starting Telegram inactive check job');

        const telegramService = require('../services/telegram/telegram.service');
        const result = await telegramService.processInactiveMessages();

        logger.info(`Telegram inactive check completed: ${result.processed} messages processed, ${result.simsUpdated} SIMs marked inactive`);
      } catch (error) {
        logger.error('Telegram inactive check job failed:', error);
      }
    });
  }

  // WiFi alert check - runs every 5 minutes
  // Checks WiFi speeds against thresholds and creates/resolves alerts
  scheduleWifiAlertCheck() {
    this.schedule('wifi-alert-check', '*/5 * * * *', async () => {
      try {
        logger.info('Starting WiFi alert check job');

        const wifiService = require('../services/wifi/wifi.service');
        await wifiService.checkAndCreateAlerts();

        logger.info('WiFi alert check job completed');
      } catch (error) {
        logger.error('WiFi alert check job failed:', error);
      }
    });
  }

  // WiFi metrics cleanup - runs weekly on Sunday at 3 AM
  // Cleans old metrics data (older than 30 days)
  scheduleWifiMetricsCleanup() {
    this.schedule('wifi-metrics-cleanup', '0 3 * * 0', async () => {
      try {
        logger.info('Starting WiFi metrics cleanup job');

        const wifiService = require('../services/wifi/wifi.service');
        const result = await wifiService.cleanOldMetrics(30);

        logger.info(`WiFi metrics cleanup completed: ${result.deletedCount} old metrics removed`);
      } catch (error) {
        logger.error('WiFi metrics cleanup job failed:', error);
      }
    });
  }
}

module.exports = new CronService();