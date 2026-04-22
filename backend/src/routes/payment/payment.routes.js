const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const paymentController = require('../../controllers/payment/payment.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

// Validation rules
const createOrderValidation = [
  body('subscriptionId').isMongoId().withMessage('Valid subscription ID is required'),
  body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Billing cycle must be monthly or yearly'),
];

const verifyPaymentValidation = [
  body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Signature is required'),
];

// All routes require authentication
router.use(authenticate);

// Create order (admin/super_admin)
router.post(
  '/create-order',
  createOrderValidation,
  validate,
  paymentController.createOrder
);

// Verify payment
router.post(
  '/verify',
  verifyPaymentValidation,
  validate,
  paymentController.verifyPayment
);

// Get payment history
router.get('/history', paymentController.getHistory);

// Get single payment
router.get('/:id', paymentController.getPayment);

// Revenue stats (Super Admin only)
router.get(
  '/stats/revenue',
  authorize('super_admin'),
  paymentController.getStats
);

// Webhook endpoint (no auth required - called by Razorpay)
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;