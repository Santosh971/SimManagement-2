const paymentService = require('../../services/payment/payment.service');
const { successResponse } = require('../../utils/response');

class PaymentController {
  /**
   * Create a Razorpay order
   * POST /api/payments/create-order
   */
  async createOrder(req, res, next) {
    try {
      const { subscriptionId, billingCycle } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user._id;

      const result = await paymentService.createOrder(
        companyId,
        userId,
        subscriptionId,
        billingCycle
      );

      return successResponse(res, result, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify payment and activate subscription
   * POST /api/payments/verify
   */
  async verifyPayment(req, res, next) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      const result = await paymentService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      return successResponse(res, result, 'Payment verified successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment history for company
   * GET /api/payments/history
   */
  async getHistory(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const { status, limit } = req.query;

      const payments = await paymentService.getPaymentHistory(companyId, {
        status,
        limit: limit ? parseInt(limit) : 50,
      });

      return successResponse(res, payments);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single payment details
   * GET /api/payments/:id
   */
  async getPayment(req, res, next) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const payment = await paymentService.getPaymentById(id, companyId);

      return successResponse(res, payment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get revenue statistics (Super Admin)
   * GET /api/payments/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await paymentService.getRevenueStats();
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Razorpay webhook
   * POST /api/payments/webhook
   */
  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const result = await paymentService.handleWebhook(req.body, signature);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();