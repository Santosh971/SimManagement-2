const Razorpay = require('razorpay');
const Payment = require('../../models/payment/payment.model');
const Company = require('../../models/company/company.model');
const Subscription = require('../../models/subscription/subscription.model');
const { AppError, NotFoundError, ConflictError } = require('../../utils/errors');
const config = require('../../config');

// Initialize Razorpay
let razorpay = null;

const getRazorpayInstance = () => {
  if (!razorpay && config.razorpay?.keyId && config.razorpay?.keySecret) {
    razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpay;
};

class PaymentService {
  /**
   * Create a Razorpay order for subscription purchase
   */
  async createOrder(companyId, userId, planId, billingCycle = 'monthly') {
    // Get Razorpay instance
    const rzp = getRazorpayInstance();
    if (!rzp) {
      throw new AppError('Payment gateway not configured', 500);
    }

    // Get plan details
    const plan = await Subscription.findById(planId);
    if (!plan) {
      throw new NotFoundError('Subscription plan');
    }

    // Get company details
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    // Calculate amount based on billing cycle
    const amount = billingCycle === 'yearly'
      ? plan.price.yearly * 100 // Convert to paise
      : plan.price.monthly * 100;

    const planDuration = billingCycle === 'yearly' ? 365 : 30;

    // Create Razorpay order
    const order = await rzp.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${companyId}_${Date.now()}`,
      notes: {
        companyId: companyId.toString(),
        userId: userId.toString(),
        subscriptionId: planId.toString(),
        planName: plan.name,
        billingCycle,
      },
    });

    // Create payment record
    const payment = new Payment({
      companyId,
      userId,
      subscriptionId: planId,
      planName: plan.name,
      planDuration,
      amount: amount / 100, // Store in rupees
      currency: 'INR',
      billingCycle,
      razorpayOrderId: order.id,
      status: 'created',
    });

    await payment.save();

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.razorpay?.keyId,
      companyName: company.name,
      planName: plan.name,
      planDuration,
      paymentId: payment._id,
    };
  }

  /**
   * Verify Razorpay payment and update subscription
   */
  async verifyPayment(paymentData) {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = paymentData;

    // Get Razorpay instance
    const rzp = getRazorpayInstance();
    if (!rzp) {
      throw new AppError('Payment gateway not configured', 500);
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: orderId })
      .populate('companyId subscriptionId');

    if (!payment) {
      throw new NotFoundError('Payment record');
    }

    if (payment.status === 'completed') {
      throw new ConflictError('Payment already processed');
    }

    // Verify signature
    const crypto = require('crypto');
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      await payment.markFailed('Invalid payment signature');
      throw new AppError('Invalid payment signature', 400);
    }

    // Fetch payment details from Razorpay
    let paymentDetails;
    try {
      paymentDetails = await rzp.payments.fetch(paymentId);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      // Continue with basic payment data
    }

    // Update payment record
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.status = 'completed';
    payment.paidAt = new Date();

    if (paymentDetails) {
      payment.paymentMethod = paymentDetails.method;
      payment.bank = paymentDetails.bank;
      payment.wallet = paymentDetails.wallet;
      payment.vpa = paymentDetails.vpa;
      payment.cardId = paymentDetails.card_id;
      payment.cardLast4 = paymentDetails.card_last4;
      payment.cardNetwork = paymentDetails.card_network;
    }

    await payment.save();

    // Update company subscription
    const company = payment.companyId;
    const plan = payment.subscriptionId;

    company.subscriptionId = plan._id;
    company.subscriptionStartDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + payment.planDuration);
    company.subscriptionEndDate = endDate;
    company.isActive = true;

    await company.save();

    // Generate invoice number
    await payment.save(); // Trigger invoice number generation

    return {
      success: true,
      payment: {
        id: payment._id,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        planName: payment.planName,
        billingCycle: payment.billingCycle,
        planDuration: payment.planDuration,
      },
      company: {
        id: company._id,
        name: company.name,
        subscriptionEnds: company.subscriptionEndDate,
      },
    };
  }

  /**
   * Get payment history for a company
   */
  async getPaymentHistory(companyId, options = {}) {
    return Payment.findByCompany(companyId, options);
  }

  /**
   * Get a single payment by ID
   */
  async getPaymentById(paymentId, companyId) {
    const payment = await Payment.findOne({ _id: paymentId, companyId })
      .populate('subscriptionId', 'name description price')
      .populate('userId', 'name email');

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    return payment;
  }

  /**
   * Get revenue statistics (Super Admin only)
   */
  async getRevenueStats() {
    const totalRevenue = await Payment.getTotalRevenue();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Payment.getMonthlyRevenue(currentYear, currentMonth);

    // Get last 6 months revenue
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const result = await Payment.getMonthlyRevenue(year, month);
      monthlyTrend.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year,
        revenue: result.total,
        count: result.count,
      });
    }

    return {
      totalRevenue: totalRevenue.total,
      totalPayments: totalRevenue.count,
      currentMonthRevenue: monthlyRevenue.total,
      currentMonthPayments: monthlyRevenue.count,
      monthlyTrend,
    };
  }

  /**
   * Handle webhook events from Razorpay
   */
  async handleWebhook(webhookBody, signature) {
    const crypto = require('crypto');

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(JSON.stringify(webhookBody))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const event = webhookBody.event;
    const payload = webhookBody.payload.payment?.entity;

    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;

      case 'order.paid':
        // Order paid event - payment captured
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return { received: true };
  }

  async handlePaymentCaptured(paymentData) {
    // Find payment by order ID
    const payment = await Payment.findOne({
      razorpayOrderId: paymentData.order_id,
    });

    if (payment && payment.status !== 'completed') {
      // Update payment status
      payment.razorpayPaymentId = paymentData.id;
      payment.paymentMethod = paymentData.method;
      payment.bank = paymentData.bank;
      payment.wallet = paymentData.wallet;
      payment.vpa = paymentData.vpa;
      payment.status = 'completed';
      payment.paidAt = new Date();
      await payment.save();

      // Update company subscription
      const company = await Company.findById(payment.companyId);
      if (company) {
        const plan = await Subscription.findById(payment.subscriptionId);
        company.subscriptionId = plan._id;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + payment.planDuration);
        company.subscriptionEndDate = endDate;
        company.isActive = true;
        await company.save();
      }
    }
  }

  async handlePaymentFailed(paymentData) {
    const payment = await Payment.findOne({
      razorpayOrderId: paymentData.order_id,
    });

    if (payment) {
      await payment.markFailed(paymentData.error_description || 'Payment failed');
    }
  }
}

module.exports = new PaymentService();