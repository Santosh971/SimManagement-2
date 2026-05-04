/**
 * Call Automation Routes
 *
 * API routes for call automation configuration management.
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const callAutomationController = require('../../controllers/callAutomation/callAutomation.controller');
const { authenticate, authorize, checkCompanyAccess } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

// =============================================
// VALIDATION RULES
// =============================================

const saveConfigValidation = [
  body('callerSimIds')
    .isArray({ min: 1 })
    .withMessage('At least one caller SIM is required'),
  body('targetSimIds')
    .isArray({ min: 1 })
    .withMessage('At least one target SIM is required'),
  body('callDuration')
    .isInt({ min: 10, max: 60 })
    .withMessage('Call duration must be between 10 and 60 seconds'),
  body('frequency')
    .optional()
    .isIn(['hourly', 'daily', 'weekly'])
    .withMessage('Frequency must be hourly, daily, or weekly'),
  body('scheduledTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Scheduled time must be in HH:MM format'),
  body('scheduledDay')
    .optional()
    .isIn(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
    .withMessage('Scheduled day must be a valid day of week'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

const toggleValidation = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

const deviceConfigValidation = [
  query('simNumber')
    .optional()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid SIM number format'),
];

// =============================================
// ADMIN ROUTES (require authentication)
// =============================================

// All routes below require authentication
router.use(authenticate);

// Save/update configuration (admin only)
router.post(
  '/config',
  authorize('super_admin', 'admin'),
  checkCompanyAccess,
  saveConfigValidation,
  validate,
  callAutomationController.saveConfig
);

// Get configuration (admin only)
router.get(
  '/config',
  authorize('super_admin', 'admin'),
  callAutomationController.getConfig
);

// Toggle active status (admin only)
router.put(
  '/toggle',
  authorize('super_admin', 'admin'),
  toggleValidation,
  validate,
  callAutomationController.toggleActive
);

// Get eligible SIMs for selection (admin only)
router.get(
  '/eligible-sims',
  authorize('super_admin', 'admin'),
  callAutomationController.getEligibleSims
);

// =============================================
// DEVICE ROUTES (public, uses SIM auth)
// =============================================

// Note: Device routes are registered separately in server.js under /api/device
// This file only handles /api/call-automation routes

module.exports = router;