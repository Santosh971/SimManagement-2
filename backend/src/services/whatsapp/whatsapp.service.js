const mongoose = require('mongoose');
let twilio = null;

// Try to load Twilio, but don't crash if it's not available
try {
  twilio = require('twilio');
} catch (error) {
  console.warn('[WhatsApp] Twilio package not installed. WhatsApp features will be simulated.');
}

const WhatsAppMessage = require('../../models/whatsapp/whatsapp.model');
const Sim = require('../../models/sim/sim.model');
const User = require('../../models/auth/user.model');
const { AppError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const crypto = require('crypto');

class WhatsAppService {
  constructor() {
    // Twilio credentials from environment
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    // Initialize Twilio client if credentials are available
    if (this.accountSid && this.authToken && twilio) {
      try {
        this.client = twilio(this.accountSid, this.authToken);
        logger.info('[WhatsApp] Twilio client initialized successfully');
      } catch (error) {
        logger.error('[WhatsApp] Failed to initialize Twilio client', { error: error.message });
        this.client = null;
      }
    } else {
      logger.warn('[WhatsApp] Twilio credentials not configured. Messages will be logged only.');
      this.client = null;
    }
  }

  /**
   * Send WhatsApp message to a single number
   * @param {string} to - Phone number (with country code)
   * @param {string} message - Message content
   * @returns {Object} - Result with success status and twilio SID
   */
  async sendWhatsAppMessage(to, message) {
    // Format phone number for WhatsApp
    let formattedNumber = to;
    if (!to.startsWith('whatsapp:')) {
      formattedNumber = `whatsapp:${to.startsWith('+') ? to : '+' + to}`;
    }

    // If Twilio is not configured, simulate success (for development)
    if (!this.client) {
      logger.info(`[WhatsApp SIMULATION] Would send to ${formattedNumber}: ${message}`);
      return {
        success: true,
        sid: `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        simulated: true,
      };
    }

    try {
      const result = await this.client.messages.create({
        from: this.phoneNumber,
        to: formattedNumber,
        body: message,
      });

      logger.info(`[WhatsApp] Message sent to ${formattedNumber}`, {
        sid: result.sid,
        status: result.status,
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status,
      };
    } catch (error) {
      logger.error(`[WhatsApp] Failed to send message to ${formattedNumber}`, {
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  /**
   * Send bulk WhatsApp messages
   * @param {Object} data - { simIds, userIds, message }
   * @param {Object} user - Current authenticated user
   * @returns {Object} - Results with sent/failed counts
   */
  async sendBulkMessages(data, user) {
    const { simIds = [], userIds = [], message } = data;
    const companyId = user.companyId;
    const results = {
      sent: 0,
      failed: 0,
      total: 0,
      messages: [],
      errors: [],
    };

    // Generate batch ID for this bulk send
    const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Collect all phone numbers with their references
    const recipients = [];

    // Fetch SIMs and extract phone numbers
    if (simIds.length > 0) {
      const sims = await Sim.find({
        _id: { $in: simIds },
        companyId,
        isActive: true,
      }).populate('assignedTo', 'name email');

      sims.forEach((sim) => {
        recipients.push({
          phoneNumber: sim.mobileNumber,
          simId: sim._id,
          userId: sim.assignedTo?._id || null,
          name: sim.assignedTo?.name || 'Unassigned',
        });
      });
    }

    // Fetch Users and extract phone numbers
    if (userIds.length > 0) {
      const users = await User.find({
        _id: { $in: userIds },
        companyId,
        isActive: true,
      });

      users.forEach((u) => {
        // Use phone field for users
        if (u.phone) {
          recipients.push({
            phoneNumber: u.phone,
            simId: null,
            userId: u._id,
            name: u.name,
          });
        }
      });
    }

    // Remove duplicates based on phone number
    const uniqueRecipients = [];
    const seenNumbers = new Set();

    recipients.forEach((recipient) => {
      const normalizedNumber = recipient.phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!seenNumbers.has(normalizedNumber)) {
        seenNumbers.add(normalizedNumber);
        uniqueRecipients.push({
          ...recipient,
          phoneNumber: normalizedNumber,
        });
      }
    });

    results.total = uniqueRecipients.length;

    if (uniqueRecipients.length === 0) {
      throw new AppError('No valid recipients found', 400);
    }

    // Send messages
    for (const recipient of uniqueRecipients) {
      try {
        // Send via Twilio
        const sendResult = await this.sendWhatsAppMessage(recipient.phoneNumber, message);

        // Save message record
        const messageRecord = new WhatsAppMessage({
          companyId,
          simId: recipient.simId,
          userId: recipient.userId,
          phoneNumber: recipient.phoneNumber,
          message,
          status: sendResult.success ? 'sent' : 'failed',
          twilioMessageSid: sendResult.sid || null,
          sentAt: new Date(),
          batchId,
          createdBy: user._id,
          errorMessage: sendResult.error || null,
        });

        await messageRecord.save();

        results.messages.push({
          phoneNumber: recipient.phoneNumber,
          name: recipient.name,
          status: sendResult.success ? 'sent' : 'failed',
          messageId: messageRecord._id,
        });

        if (sendResult.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            phoneNumber: recipient.phoneNumber,
            error: sendResult.error,
          });
        }
      } catch (error) {
        logger.error(`[WhatsApp] Error processing recipient ${recipient.phoneNumber}`, {
          error: error.message,
        });
        results.failed++;
        results.errors.push({
          phoneNumber: recipient.phoneNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Handle incoming webhook from Twilio
   * @param {Object} webhookData - Data from Twilio webhook
   * @returns {Object} - Processing result
   */
  async handleWebhook(webhookData) {
    const { From, Body, MessageSid } = webhookData;

    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = From.replace('whatsapp:', '').replace('+', '');

    logger.info(`[WhatsApp Webhook] Received reply from ${phoneNumber}`, {
      messageSid: MessageSid,
      body: Body,
    });

    // Find the latest message from this phone number (any company)
    const latestMessage = await WhatsAppMessage.findOne({
      phoneNumber: { $regex: phoneNumber.replace('+', ''), $options: 'i' },
      status: { $in: ['sent', 'delivered'] },
      isActive: null,
    }).sort({ sentAt: -1 });

    if (!latestMessage) {
      logger.warn(`[WhatsApp Webhook] No pending message found for ${phoneNumber}`);
      return {
        success: false,
        message: 'No pending message found for this phone number',
      };
    }

    // Calculate time since message was sent
    const timeSinceSent = Date.now() - new Date(latestMessage.sentAt).getTime();
    const oneHour = 60 * 60 * 1000;
    const isWithinOneHour = timeSinceSent <= oneHour;

    // Update message record
    latestMessage.status = 'replied';
    latestMessage.repliedAt = new Date();
    latestMessage.replyMessage = Body;
    latestMessage.isActive = isWithinOneHour;

    await latestMessage.save();

    // If replied within 1 hour, update SIM status to active
    if (isWithinOneHour && latestMessage.simId) {
      try {
        const sim = await Sim.findById(latestMessage.simId);
        if (sim && sim.status !== 'active') {
          sim.status = 'active';
          sim.lastActiveDate = new Date();
          await sim.save();

          logger.info(`[WhatsApp Webhook] Updated SIM ${sim.mobileNumber} to active`, {
            simId: sim._id,
          });
        }
      } catch (error) {
        logger.error('[WhatsApp Webhook] Error updating SIM status', {
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: 'Reply processed successfully',
      isActive: isWithinOneHour,
      messageId: latestMessage._id,
    };
  }

  /**
   * Process messages that have not received reply within 1 hour
   * Called by cron job
   */
  async processInactiveMessages() {
    logger.info('[WhatsApp Cron] Processing inactive messages...');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find messages that are sent/delivered but not replied within 1 hour
    const messagesToUpdate = await WhatsAppMessage.find({
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

      // Update SIM status to inactive if exists
      if (message.simId) {
        try {
          const sim = await Sim.findById(message.simId);
          if (sim && sim.status === 'active') {
            sim.status = 'inactive';
            await sim.save();
            simUpdatedCount++;
          }
        } catch (error) {
          logger.error(`[WhatsApp Cron] Error updating SIM ${message.simId}`, {
            error: error.message,
          });
        }
      }
    }

    logger.info(`[WhatsApp Cron] Processed ${updatedCount} messages, updated ${simUpdatedCount} SIMs`);

    return {
      processed: updatedCount,
      simsUpdated: simUpdatedCount,
    };
  }

  /**
   * Get messages for a company
   */
  async getMessages(query, user) {
    const { page = 1, limit = 20, status, phoneNumber, batchId, startDate, endDate } = query;
    const filter = { companyId: user.companyId };

    if (status) filter.status = status;
    if (phoneNumber) filter.phoneNumber = { $regex: phoneNumber, $options: 'i' };
    if (batchId) filter.batchId = batchId;

    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) filter.sentAt.$gte = new Date(startDate);
      if (endDate) filter.sentAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const data = await WhatsAppMessage.find(filter)
      .populate('simId', 'mobileNumber operator status')
      .populate('userId', 'name email')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ sentAt: -1 });

    const total = await WhatsAppMessage.countDocuments(filter);

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
    return await WhatsAppMessage.getStatsByCompany(user.companyId, startDate, endDate);
  }

  /**
   * Validate Twilio webhook signature
   * @param {string} url - Webhook URL
   * @param {Object} params - Request parameters
   * @param {string} signature - X-Twilio-Signature header
   * @returns {boolean} - Whether signature is valid
   */
  validateWebhookSignature(url, params, signature) {
    if (!this.authToken) {
      logger.warn('[WhatsApp] Cannot validate webhook - no auth token');
      return true; // Allow in development
    }

    // Create the signature string
    const signatureString = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha1', this.authToken)
      .update(signatureString)
      .digest('Base64');

    return signature === expectedSignature;
  }
}

module.exports = new WhatsAppService();