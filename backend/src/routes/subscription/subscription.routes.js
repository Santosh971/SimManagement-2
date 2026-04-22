const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const subscriptionController = require('../../controllers/subscription/subscription.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

// Validation rules
const createPlanValidation = [
  body('name').trim().notEmpty().withMessage('Plan name is required').isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('price.monthly').isFloat({ min: 0 }).withMessage('Monthly price is required'),
  body('price.yearly').isFloat({ min: 0 }).withMessage('Yearly price is required'),
  body('trialDays').optional().isInt({ min: 0 }),
  body('limits.maxSims').optional().isInt(),
  body('limits.maxUsers').optional().isInt(),
  body('limits.maxRecharges').optional().isInt(),
];

const updatePlanValidation = [
  param('id').isMongoId().withMessage('Invalid plan ID'),
  body('name').optional().trim().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('price.monthly').optional().isFloat({ min: 0 }),
  body('price.yearly').optional().isFloat({ min: 0 }),
];

// Public routes - get plans (for landing page)
router.get('/compare', subscriptionController.compare);

// Protected routes
router.use(authenticate);

// All authenticated users can view plans
router.get('/', subscriptionController.getAll);
router.get('/:id', subscriptionController.getById);
router.get('/stats', authorize('super_admin'), subscriptionController.getStats);

// Super admin only routes
router.post('/', authorize('super_admin'), createPlanValidation, validate, subscriptionController.create);
router.put('/:id', authorize('super_admin'), updatePlanValidation, validate, subscriptionController.update);
router.delete('/:id', authorize('super_admin'), subscriptionController.delete);
router.patch('/:id/toggle', authorize('super_admin'), subscriptionController.toggleStatus);
router.post('/initialize', authorize('super_admin'), subscriptionController.initialize);

module.exports = router;