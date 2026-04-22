const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const statusController = require('../../controllers/status/status.controller');
const { authenticate } = require('../../middleware/auth');
const { checkSubscriptionLimit } = require('../../middleware/subscription');
const { validate } = require('../../middleware/validate');

// Validation rules
const updateWhatsAppValidation = [
  param('simId').isMongoId().withMessage('Invalid SIM ID'),
  body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
];

const updateTelegramValidation = [
  param('simId').isMongoId().withMessage('Invalid SIM ID'),
  body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
];

const bulkUpdateValidation = [
  body('simIds').isArray({ min: 1 }).withMessage('SIM IDs array is required'),
  body('simIds.*').isMongoId().withMessage('Invalid SIM ID'),
  body('platform').isIn(['whatsapp', 'telegram']).withMessage('Invalid platform'),
  body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
];

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/overview', statusController.getOverview);
router.get('/:simId', statusController.getStatus);
router.get('/:simId/history', statusController.getHistory);
router.put('/:simId/whatsapp', checkSubscriptionLimit('whatsappStatus'), updateWhatsAppValidation, validate, statusController.updateWhatsApp);
router.put('/:simId/telegram', checkSubscriptionLimit('whatsappStatus'), updateTelegramValidation, validate, statusController.updateTelegram);
router.post('/bulk', bulkUpdateValidation, validate, statusController.bulkUpdate);

module.exports = router;