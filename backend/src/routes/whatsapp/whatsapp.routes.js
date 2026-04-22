const express = require('express');
const router = express.Router();
const whatsAppController = require('../../controllers/whatsapp/whatsapp.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  sendBulkValidation,
  queryValidation,
  statsValidation,
} = require('./whatsapp.validation');

// =============================================
// PUBLIC ROUTES (No Authentication Required)
// =============================================

/**
 * Twilio Webhook Endpoint
 * POST /api/whatsapp/webhook
 * This endpoint receives incoming WhatsApp messages from Twilio
 */
router.post('/webhook', whatsAppController.handleWebhook);

// =============================================
// PROTECTED ROUTES (Authentication Required)
// =============================================
router.use(authenticate);

/**
 * Get eligible recipients (SIMs and Users)
 * GET /api/whatsapp/recipients
 */
router.get('/recipients', whatsAppController.getRecipients);

/**
 * Get WhatsApp messages for company
 * GET /api/whatsapp/messages
 */
router.get('/messages', queryValidation, validate, whatsAppController.getMessages);

/**
 * Get message statistics
 * GET /api/whatsapp/stats
 */
router.get('/stats', statsValidation, validate, whatsAppController.getStats);

/**
 * Send bulk WhatsApp messages
 * POST /api/whatsapp/send-bulk
 * Requires admin role
 */
router.post(
  '/send-bulk',
  authorize('super_admin', 'admin'),
  sendBulkValidation,
  validate,
  whatsAppController.sendBulk
);

/**
 * Manually process inactive messages (Admin only)
 * POST /api/whatsapp/process-inactive
 */
router.post(
  '/process-inactive',
  authorize('super_admin', 'admin'),
  whatsAppController.processInactive
);

module.exports = router;