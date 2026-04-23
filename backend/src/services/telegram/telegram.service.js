const mongoose = require('mongoose');
const axios = require('axios');
const TelegramMessage = require('../../models/telegram/telegram.model');
const Sim = require('../../models/sim/sim.model');
const { AppError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const auditLogService = require('../auditLog/auditLog.service');

// Telegram Bot Token from environment
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

class TelegramService {
  constructor() {
    // Check if bot token is configured
    this.isConfigured = !!TELEGRAM_BOT_TOKEN;

    if (this.isConfigured) {
      logger.info('[Telegram] Bot token configured, service ready');
    } else {
      logger.warn('[Telegram] Bot token not configured. Telegram features will be simulated.');
    }
  }

  /**
   * Send Telegram message to a single chat
   * @param {string} chatId - Telegram chat ID
   * @param {string} message - Message content
   * @returns {Object} - Result with success status and message ID
   */
  async sendTelegramMessage(chatId, message) {
    // If not configured, simulate success (for development)
    if (!this.isConfigured) {
      logger.info(`[Telegram SIMULATION] Would send to chat ${chatId}: ${message.substring(0, 50)}...`);
      return {
        success: true,
        messageId: Date.now(),
        simulated: true,
      };
    }

    try {
      const response = await axios.post(`${TELEGRAM_API_BASE}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      });

      logger.info(`[Telegram] Message sent to chat ${chatId}`, {
        messageId: response.data.result.message_id,
      });

      return {
        success: true,
        messageId: response.data.result.message_id,
        status: 'sent',
      };
    } catch (error) {
      logger.error(`[Telegram] Failed to send message to chat ${chatId}`, {
        error: error.response?.data || error.message,
      });

      return {
        success: false,
        error: error.response?.data?.description || error.message,
        errorCode: error.response?.data?.error_code,
      };
    }
  }

  /**
   * Send Telegram messages to multiple SIMs
   * @param {Object} data - { simIds, message, updateSimStatus }
   * @param {Object} user - Current authenticated user
   * @returns {Object} - Results with sent/failed counts
   */
  async sendToSIMs(data, user) {
    const { simIds = [], message, updateSimStatus = false } = data;
    const companyId = user.companyId;
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      messages: [],
      errors: [],
    };

    // Generate batch ID for this bulk send
    const batchId = `TG_BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (simIds.length === 0) {
      throw new AppError('No SIMs provided', 400);
    }

    // Fetch SIMs with telegramChatId
    const sims = await Sim.find({
      _id: { $in: simIds },
      companyId,
      isActive: true,
    }).populate('assignedTo', 'name email');

    results.total = sims.length;

    for (const sim of sims) {
      try {
        // Skip if no telegramChatId linked
        if (!sim.telegramChatId) {
          results.skipped++;
          results.messages.push({
            simId: sim._id,
            mobileNumber: sim.mobileNumber,
            status: 'skipped',
            reason: 'SIM not linked to Telegram',
          });
          continue;
        }

        // Send Telegram message
        const sendResult = await this.sendTelegramMessage(sim.telegramChatId, message);

        // Save message record
        const messageRecord = new TelegramMessage({
          companyId,
          simId: sim._id,
          chatId: sim.telegramChatId,
          message,
          status: sendResult.success ? 'sent' : 'failed',
          telegramMessageId: sendResult.messageId || null,
          sentAt: new Date(),
          batchId,
          createdBy: user._id,
          errorMessage: sendResult.error || null,
          updateSimStatus,
        });

        await messageRecord.save();

        results.messages.push({
          simId: sim._id,
          mobileNumber: sim.mobileNumber,
          chatId: sim.telegramChatId,
          status: sendResult.success ? 'sent' : 'failed',
          messageId: messageRecord._id,
        });

        if (sendResult.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            simId: sim._id,
            mobileNumber: sim.mobileNumber,
            error: sendResult.error,
          });
        }
      } catch (error) {
        logger.error(`[Telegram] Error processing SIM ${sim.mobileNumber}`, {
          error: error.message,
        });
        results.failed++;
        results.errors.push({
          simId: sim._id,
          mobileNumber: sim.mobileNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Send Telegram messages to multiple SIMs with audit logging
   * @param {Object} data - { simIds, message }
   * @param {Object} user - Current authenticated user
   * @param {Object} req - Express request object (for audit log)
   * @returns {Object} - Results with sent/failed counts
   */
  async sendToSIMsWithAudit(data, user, req) {
    const results = await this.sendToSIMs(data, user);

    // Create audit log
    await auditLogService.logAction({
      action: 'TELEGRAM_MESSAGE_SEND_BULK',
      module: 'TELEGRAM',
      description: `Sent bulk Telegram messages: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`,
      performedBy: user._id,
      role: user.role,
      companyId: user.companyId,
      metadata: {
        totalSims: results.total,
        sent: results.sent,
        failed: results.failed,
        skipped: results.skipped,
        messageLength: data.message?.length || 0,
      },
      req,
    });

    return results;
  }

  /**
   * Handle incoming Telegram webhook
   * @param {Object} update - Telegram update object
   * @returns {Object} - Processing result
   */
  async handleWebhook(update) {
    logger.info('[Telegram Webhook] Received update:', JSON.stringify(update));

    // Handle message updates
    if (update.message) {
      return this.handleMessage(update.message);
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      return this.handleCallbackQuery(update.callback_query);
    }

    return { success: true, message: 'Update acknowledged' };
  }

  /**
   * Handle incoming message
   * @param {Object} message - Telegram message object
   */
  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    const from = message.from;

    logger.info(`[Telegram] Message from chat ${chatId}:`, {
      text: text.substring(0, 100),
      from: from.username || from.first_name,
    });

    // Handle /start command with SIM linking
    if (text.startsWith('/start')) {
      return this.handleStartCommand(chatId, text, from);
    }

    // Handle regular message (potential reply)
    return this.handleReply(chatId, text);
  }

  /**
   * Handle /start command for SIM linking
   * @param {string} chatId - Telegram chat ID
   * @param {string} text - Command text
   * @param {Object} from - Sender info
   */
  async handleStartCommand(chatId, text, from) {
    // Extract SIM ID from deep link
    // Format: /start SIM_<SIM_ID>
    const parts = text.split(' ');

    if (parts.length < 2 || !parts[1].startsWith('SIM_')) {
      // No SIM ID provided, send welcome message
      await this.sendTelegramMessage(chatId,
        '👋 Welcome to <b>SimTrack Bot</b>!\n\n' +
        'This bot helps track your SIM activity.\n\n' +
        'To link your SIM, please use the link provided by your administrator.'
      );
      return { success: true, message: 'Welcome message sent' };
    }

    const simId = parts[1].replace('SIM_', '');
    const userName = from.username || `${from.first_name} ${from.last_name || ''}`.trim();

    // Validate SIM ID
    if (!mongoose.Types.ObjectId.isValid(simId)) {
      await this.sendTelegramMessage(chatId,
        '❌ Invalid SIM link. Please contact your administrator.'
      );
      return { success: false, message: 'Invalid SIM ID' };
    }

    // Find the SIM
    const sim = await Sim.findById(simId);

    if (!sim || !sim.isActive) {
      await this.sendTelegramMessage(chatId,
        '❌ SIM not found. Please contact your administrator.'
      );
      return { success: false, message: 'SIM not found' };
    }

    // Check if already linked to another chat
    if (sim.telegramChatId && sim.telegramChatId !== String(chatId)) {
      // Optionally update to new chat or warn
      logger.warn(`[Telegram] SIM ${sim.mobileNumber} already linked to another chat`, {
        oldChatId: sim.telegramChatId,
        newChatId: chatId,
      });
    }

    // Link SIM with Telegram chat
    sim.telegramChatId = String(chatId);
    sim.telegramEnabled = true;
    sim.telegramLastActive = new Date();
    await sim.save();

    logger.info(`[Telegram] SIM ${sim.mobileNumber} linked to chat ${chatId}`, {
      simId: sim._id,
      linkedBy: userName,
    });

    // Create audit log for SIM linking
    await auditLogService.logAction({
      action: 'TELEGRAM_SIM_LINK',
      module: 'TELEGRAM',
      description: `SIM ${sim.mobileNumber} linked to Telegram via bot by ${userName}`,
      companyId: sim.companyId,
      entityId: sim._id,
      entityType: 'SIM',
      metadata: {
        simMobileNumber: sim.mobileNumber,
        chatId: String(chatId),
        telegramUsername: userName,
        telegramUserId: from.id,
      },
    });

    // Send confirmation message
    await this.sendTelegramMessage(chatId,
      `✅ <b>Successfully Linked!</b>\n\n` +
      `📱 SIM: <b>${sim.mobileNumber}</b>\n` +
      `📡 Operator: ${sim.operator}\n\n` +
      `You will receive activity check messages for this SIM. ` +
      `Reply to any message within 1 hour to mark the SIM as active.`
    );

    return {
      success: true,
      message: 'SIM linked successfully',
      simId: sim._id,
      mobileNumber: sim.mobileNumber,
    };
  }

  /**
   * Handle reply to previously sent message
   * @param {string} chatId - Telegram chat ID
   * @param {string} text - Reply text
   */
  async handleReply(chatId, text) {
    // Find the SIM linked to this chat
    const sim = await Sim.findOne({
      telegramChatId: String(chatId),
      isActive: true,
    });

    if (!sim) {
      logger.warn(`[Telegram] No SIM found for chat ${chatId}`);
      return { success: false, message: 'No SIM linked to this chat' };
    }

    // Find the latest pending message for this SIM
    const latestMessage = await TelegramMessage.findOne({
      simId: sim._id,
      status: { $in: ['sent', 'delivered'] },
      isActive: null,
    }).sort({ sentAt: -1 });

    if (!latestMessage) {
      logger.info(`[Telegram] No pending message found for SIM ${sim.mobileNumber}`);
      return { success: false, message: 'No pending message found' };
    }

    // Calculate time since message was sent
    const timeSinceSent = Date.now() - new Date(latestMessage.sentAt).getTime();
    const oneHour = 60 * 60 * 1000;
    const isWithinOneHour = timeSinceSent <= oneHour;

    logger.info(`[Telegram] Found pending message for SIM ${sim.mobileNumber}`, {
      messageId: latestMessage._id,
      timeSinceSent: Math.round(timeSinceSent / 1000 / 60) + ' minutes',
      isWithinOneHour,
      updateSimStatus: latestMessage.updateSimStatus,
    });

    // Update message record
    latestMessage.status = 'replied';
    latestMessage.repliedAt = new Date();
    latestMessage.replyMessage = text;
    latestMessage.isActive = isWithinOneHour;

    await latestMessage.save();

    // Update SIM's Telegram last active timestamp
    sim.telegramLastActive = new Date();

    // Update SIM status only if updateSimStatus flag is enabled
    if (latestMessage.updateSimStatus && isWithinOneHour && sim.status !== 'active') {
      const previousStatus = sim.status;
      sim.status = 'active';
      sim.lastActiveDate = new Date();

      await sim.save();

      // Create audit log for SIM activation
      await auditLogService.logAction({
        action: 'TELEGRAM_SIM_ACTIVE',
        module: 'TELEGRAM',
        description: `SIM ${sim.mobileNumber} marked ACTIVE via Telegram reply (within 1 hour)`,
        companyId: sim.companyId,
        entityId: sim._id,
        entityType: 'SIM',
        metadata: {
          simMobileNumber: sim.mobileNumber,
          chatId: String(chatId),
          replyMessage: text.substring(0, 200),
          previousStatus,
          messageId: latestMessage._id,
          responseTime: Math.round(timeSinceSent / 1000 / 60) + ' minutes',
        },
      });

      logger.info(`[Telegram] SIM ${sim.mobileNumber} marked ACTIVE (updateSimStatus enabled)`);
    } else {
      await sim.save();
    }

    if (isWithinOneHour) {
      // Send confirmation to user
      await this.sendTelegramMessage(chatId,
        `✅ <b>Thank you for your response!</b>\n\n` +
        `Your reply for SIM <b>${sim.mobileNumber}</b> has been recorded.`
      );

      logger.info(`[Telegram] Reply received for SIM ${sim.mobileNumber}`, {
        simId: sim._id,
        responseTime: Math.round(timeSinceSent / 1000 / 60) + ' minutes',
      });
    } else {
      // Reply too late
      await this.sendTelegramMessage(chatId,
        `⚠️ <b>Response Too Late</b>\n\n` +
        `Your reply was received more than 1 hour after the check message.\n` +
        `Your reply for SIM <b>${sim.mobileNumber}</b> has been recorded.\n\n` +
        `Please contact your administrator if you need assistance.`
      );

      logger.info(`[Telegram] Reply too late for SIM ${sim.mobileNumber}`, {
        timeSinceSent: Math.round(timeSinceSent / 1000 / 60) + ' minutes',
      });
    }

    return {
      success: true,
      message: 'Reply processed',
      isActive: isWithinOneHour,
      simId: sim._id,
    };
  }

  /**
   * Handle callback query (button clicks)
   * @param {Object} callbackQuery - Telegram callback query
   */
  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    logger.info(`[Telegram] Callback from chat ${chatId}:`, { data });

    // Handle button callbacks if needed
    // For now, just acknowledge
    return { success: true, message: 'Callback acknowledged' };
  }

  /**
   * Process messages that have not received reply within 1 hour
   * Called by cron job
   * Updates message status and SIM status if updateSimStatus flag is enabled
   */
  async processInactiveMessages() {
    logger.info('[Telegram Cron] Processing inactive messages...');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find messages that are sent/delivered but not replied within 1 hour
    const messagesToUpdate = await TelegramMessage.find({
      status: { $in: ['sent', 'delivered'] },
      isActive: null,
      sentAt: { $lte: oneHourAgo },
    });

    let updatedCount = 0;
    let simUpdatedCount = 0;

    for (const message of messagesToUpdate) {
      // Update message status
      message.status = 'inactive';
      message.isActive = false;
      await message.save();
      updatedCount++;

      logger.info(`[Telegram Cron] Message ${message._id} marked inactive (no reply within 1 hour)`);

      // Update SIM status only if updateSimStatus flag is enabled
      if (message.simId && message.updateSimStatus) {
        try {
          const sim = await Sim.findById(message.simId);
          if (sim && sim.status === 'active') {
            sim.status = 'inactive';
            await sim.save();
            simUpdatedCount++;

            // Create audit log for SIM inactivation
            await auditLogService.logAction({
              action: 'TELEGRAM_SIM_INACTIVE',
              module: 'TELEGRAM',
              description: `SIM ${sim.mobileNumber} marked INACTIVE (no reply within 1 hour)`,
              companyId: sim.companyId,
              entityId: sim._id,
              entityType: 'SIM',
              metadata: {
                simMobileNumber: sim.mobileNumber,
                messageId: message._id,
                messageSentAt: message.sentAt,
                chatId: message.chatId,
              },
            });

            logger.info(`[Telegram Cron] SIM ${sim.mobileNumber} marked INACTIVE (updateSimStatus enabled)`);
          }
        } catch (error) {
          logger.error(`[Telegram Cron] Error updating SIM ${message.simId}`, {
            error: error.message,
          });
        }
      }
    }

    logger.info(`[Telegram Cron] Processed ${updatedCount} messages, updated ${simUpdatedCount} SIMs`);

    return {
      processed: updatedCount,
      simsUpdated: simUpdatedCount,
    };
  }

    return {
      processed: updatedCount,
    };
  }

  /**
   * Get messages for a company
   */
  async getMessages(query, user) {
    const { page = 1, limit = 20, status, simId, chatId, batchId, startDate, endDate } = query;
    const filter = { companyId: user.companyId };

    if (status) filter.status = status;
    if (simId) filter.simId = simId;
    if (chatId) filter.chatId = chatId;
    if (batchId) filter.batchId = batchId;

    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) filter.sentAt.$gte = new Date(startDate);
      if (endDate) filter.sentAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const data = await TelegramMessage.find(filter)
      .populate('simId', 'mobileNumber operator status')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ sentAt: -1 });

    const total = await TelegramMessage.countDocuments(filter);

    return {
      data,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    };
  }

  /**
   * Get message stats for a company
   */
  async getStats(user, startDate, endDate) {
    return await TelegramMessage.getStatsByCompany(user.companyId, startDate, endDate);
  }

  /**
   * Get SIMs eligible for Telegram messaging
   * Returns SIMs with telegramChatId linked
   */
  async getEligibleSIMs(user) {
    const filter = {
      companyId: user.companyId,
      isActive: true,
      telegramChatId: { $ne: null },
    };

    const sims = await Sim.find(filter)
      .select('mobileNumber operator status telegramChatId telegramEnabled telegramLastActive assignedTo')
      .populate('assignedTo', 'name email')
      .sort({ mobileNumber: 1 });

    return sims;
  }

  /**
   * Generate deep link for SIM
   * @param {string} simId - SIM ID
   * @returns {string} - Deep link URL
   */
  generateDeepLink(simId) {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SimTrackBot';
    return `https://t.me/${botUsername}?start=SIM_${simId}`;
  }

  /**
   * Set webhook URL for the bot
   * @param {string} webhookUrl - Webhook URL
   */
  async setWebhook(webhookUrl) {
    if (!this.isConfigured) {
      throw new AppError('Telegram bot token not configured', 400);
    }

    try {
      const response = await axios.post(`${TELEGRAM_API_BASE}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      });

      logger.info('[Telegram] Webhook set successfully', {
        url: webhookUrl,
        result: response.data,
      });

      return response.data;
    } catch (error) {
      logger.error('[Telegram] Failed to set webhook', {
        error: error.response?.data || error.message,
      });
      throw new AppError('Failed to set Telegram webhook', 500);
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo() {
    if (!this.isConfigured) {
      throw new AppError('Telegram bot token not configured', 400);
    }

    try {
      const response = await axios.get(`${TELEGRAM_API_BASE}/getWebhookInfo`);
      return response.data.result;
    } catch (error) {
      logger.error('[Telegram] Failed to get webhook info', {
        error: error.response?.data || error.message,
      });
      throw new AppError('Failed to get webhook info', 500);
    }
  }
}

module.exports = new TelegramService();