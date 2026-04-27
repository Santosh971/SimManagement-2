const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../../models/payment/payment.model');
const Company = require('../../models/company/company.model');
const User = require('../../models/auth/user.model');
const Subscription = require('../../models/subscription/subscription.model');
const { AppError, NotFoundError, ConflictError } = require('../../utils/errors');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const emailService = require('../../utils/emailService');

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
    console.log('createOrder called with:', { companyId, userId, planId, billingCycle });

    // Get Razorpay instance
    const rzp = getRazorpayInstance();
    if (!rzp) {
      console.error('Razorpay instance is null. Config:', {
        hasKeyId: !!config.razorpay?.keyId,
        hasKeySecret: !!config.razorpay?.keySecret,
      });
      throw new AppError('Payment gateway not configured. Please contact support.', 500);
    }

    // Get plan details
    const plan = await Subscription.findById(planId);
    if (!plan) {
      console.error('Plan not found:', planId);
      throw new NotFoundError('Subscription plan');
    }
    console.log('Plan found:', plan.name, 'Price:', plan.price);

    // Get company details
    const company = await Company.findById(companyId);
    if (!company) {
      console.error('Company not found:', companyId);
      throw new NotFoundError('Company');
    }
    console.log('Company found:', company.name);

    // Calculate amount based on billing cycle
    const amount = billingCycle === 'yearly'
      ? plan.price.yearly * 100 // Convert to paise
      : plan.price.monthly * 100;

    const planDuration = billingCycle === 'yearly' ? 365 : 30;
    console.log('Creating order for amount:', amount, 'paise (', amount / 100, 'rupees)');

    // Create Razorpay order
    let order;
    try {
      // Receipt must be max 40 chars - use short format
      const shortCompanyId = companyId.toString().slice(-8);
      const timestamp = Date.now().toString().slice(-10);
      const receipt = `r_${shortCompanyId}_${timestamp}`; // ~25 chars

      const orderData = {
        amount,
        currency: 'INR',
        receipt,
        notes: {
          companyId: companyId.toString(),
          userId: userId.toString(),
          subscriptionId: planId.toString(),
          planName: plan.name,
          billingCycle,
        },
      };
      console.log('Calling Razorpay orders.create with:', orderData);

      order = await rzp.orders.create(orderData);
      console.log('Razorpay order created:', order);
    } catch (razorpayError) {
      console.error('Razorpay order creation failed:', JSON.stringify(razorpayError, null, 2));
      const errorMessage = razorpayError?.error?.description
        || razorpayError?.message
        || 'Failed to create payment order. Please try again.';
      throw new AppError(errorMessage, 500);
    }

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
    console.log('Payment record created:', payment._id);

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
      .populate('companyId subscriptionId userId');

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
    const user = payment.userId;

    company.subscriptionId = plan._id;
    company.subscriptionStartDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + payment.planDuration);
    company.subscriptionEndDate = endDate;
    company.billingCycle = payment.billingCycle; // Store billing cycle
    company.isActive = true;

    await company.save();

    // Send notification to superadmins (non-blocking)
    if (user) {
      this.notifySuperadminsRenewal(company, user, payment, plan).catch(err => {
        console.error('Failed to send superadmin renewal notification:', err.message);
      });
    }

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
   * Get all payment history (Super Admin only)
   */
  async getAllPaymentHistory(options = {}) {
    const { companyId, status, planId, startDate, endDate, page = 1, limit = 20 } = options;

    // Build filter
    const filter = {};
    if (companyId) {
      filter.companyId = companyId;
    }
    if (status) {
      filter.status = status;
    }
    if (planId) {
      filter.subscriptionId = planId;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Payment.countDocuments(filter);

    // Get payments with pagination
    const payments = await Payment.find(filter)
      .populate('companyId', 'name email phone')
      .populate('userId', 'name email')
      .populate('subscriptionId', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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

  /**
   * Create order for new registration (no auth required)
   */
  async createOrderForRegistration(planId, billingCycle, userData) {
    const rzp = getRazorpayInstance();
    if (!rzp) {
      throw new AppError('Payment gateway not configured', 500);
    }

    // Get plan details
    const plan = await Subscription.findById(planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundError('Subscription plan');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('This email is already registered. Please login instead.');
    }

    // Check if company name already exists
    const existingCompany = await Company.findOne({
      name: { $regex: new RegExp(`^${userData.companyName}$`, 'i') }
    });
    if (existingCompany) {
      throw new ConflictError('A company with this name already exists.');
    }

    // Calculate amount
    const amount = billingCycle === 'yearly'
      ? plan.price.yearly * 100
      : plan.price.monthly * 100;

    const planDuration = billingCycle === 'yearly' ? 365 : 30;

    // Create Razorpay order
    const order = await rzp.orders.create({
      amount,
      currency: 'INR',
      receipt: `reg_${Date.now()}`,
      notes: {
        type: 'registration',
        email: userData.email,
        name: userData.name,
        companyName: userData.companyName,
        phone: userData.phone || '',
        subscriptionId: planId.toString(),
        planName: plan.name,
        billingCycle,
      },
    });

    // Create pending payment record (no company yet)
    const payment = new Payment({
      companyId: null, // Will be updated after registration
      userId: null,    // Will be updated after registration
      subscriptionId: planId,
      planName: plan.name,
      planDuration,
      amount: amount / 100,
      currency: 'INR',
      billingCycle,
      razorpayOrderId: order.id,
      status: 'created',
      notes: JSON.stringify({
        type: 'registration',
        userData: {
          email: userData.email,
          name: userData.name,
          companyName: userData.companyName,
          phone: userData.phone,
          password: userData.password, // Will be used to create user
        },
      }),
    });

    await payment.save();

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.razorpay?.keyId,
      planName: plan.name,
      planDuration,
      paymentId: payment._id,
    };
  }

  /**
   * Verify payment and complete registration
   */
  async verifyPaymentAndRegister(paymentData) {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = paymentData;

    const rzp = getRazorpayInstance();
    if (!rzp) {
      throw new AppError('Payment gateway not configured', 500);
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      throw new NotFoundError('Payment record');
    }

    if (payment.status === 'completed') {
      throw new ConflictError('Payment already processed');
    }

    // Verify signature
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      await payment.markFailed('Invalid payment signature');
      throw new AppError('Invalid payment signature', 400);
    }

    // Parse stored user data
    let notesData;
    try {
      notesData = JSON.parse(payment.notes);
    } catch (e) {
      throw new AppError('Invalid payment data', 500);
    }

    const { userData } = notesData;
    const plan = await Subscription.findById(payment.subscriptionId);

    // Calculate subscription dates
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + payment.planDuration);

    // Create company
    const company = new Company({
      name: userData.companyName,
      email: userData.email.toLowerCase(),
      phone: userData.phone || null,
      subscriptionId: plan._id,
      subscriptionStartDate,
      subscriptionEndDate,
      billingCycle: payment.billingCycle, // Store billing cycle
      isActive: true,
    });

    try {
      await company.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        throw new ConflictError('Company already exists');
      }
      throw saveError;
    }

    // Create admin user
    const user = new User({
      email: userData.email.toLowerCase(),
      password: userData.password,
      name: userData.name,
      phone: userData.phone,
      role: 'admin',
      companyId: company._id,
      emailVerified: true,
      isActive: true,
    });

    try {
      await user.save();
    } catch (saveError) {
      // Rollback company
      await Company.findByIdAndDelete(company._id);
      if (saveError.code === 11000) {
        throw new ConflictError('Email already registered');
      }
      throw saveError;
    }

    // Update company with creator
    company.createdBy = user._id;
    await company.save();

    // Update payment record
    payment.companyId = company._id;
    payment.userId = user._id;
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.status = 'completed';
    payment.paidAt = new Date();
    payment.notes = 'Registration completed'; // Clear sensitive data
    await payment.save();

    // Generate tokens for auto-login
    const accessToken = jwt.sign(
      { id: user._id, role: user.role, companyId: user.companyId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Send notification to superadmins (non-blocking)
    this.notifySuperadmins(company, user, payment, plan).catch(err => {
      console.error('Failed to send superadmin notification:', err.message);
    });

    // Return user without sensitive data
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;
    delete userObj.__v;

    return {
      success: true,
      user: userObj,
      accessToken,
      refreshToken,
      company: {
        id: company._id,
        name: company.name,
        subscriptionEnds: company.subscriptionEndDate,
      },
      payment: {
        id: payment._id,
        amount: payment.amount,
        planName: payment.planName,
        billingCycle: payment.billingCycle,
      },
    };
  }

  /**
   * Send notification to all superadmins about new registration
   */
  async notifySuperadmins(company, user, payment, plan) {
    try {
      // Get all active superadmins
      const superadmins = await User.find({
        role: 'super_admin',
        isActive: true,
      }).select('name email');

      if (!superadmins || superadmins.length === 0) {
        console.log('No active superadmins found to notify');
        return;
      }

      // Send email to each superadmin
      const emailPromises = superadmins.map(superadmin =>
        emailService.sendNewRegistrationEmail(superadmin, {
          company: {
            name: company.name,
            email: company.email,
            phone: company.phone,
            subscriptionEnds: company.subscriptionEndDate,
          },
          user: {
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
          payment: {
            amount: payment.amount,
            billingCycle: payment.billingCycle,
            razorpayPaymentId: payment.razorpayPaymentId,
            id: payment._id,
          },
          plan: {
            name: plan.name,
          },
        })
      );

      await Promise.allSettled(emailPromises);
      console.log(`Registration notification sent to ${superadmins.length} superadmin(s)`);
    } catch (error) {
      console.error('Error sending superadmin notifications:', error.message);
    }
  }

  /**
   * Send notification to all superadmins about subscription renewal
   */
  async notifySuperadminsRenewal(company, user, payment, plan) {
    try {
      // Get all active superadmins
      const superadmins = await User.find({
        role: 'super_admin',
        isActive: true,
      }).select('name email');

      if (!superadmins || superadmins.length === 0) {
        console.log('No active superadmins found to notify about renewal');
        return;
      }

      // Send email to each superadmin
      const emailPromises = superadmins.map(superadmin =>
        emailService.sendRenewalNotificationEmail(superadmin, {
          company: {
            name: company.name,
            email: company.email,
            phone: company.phone,
            subscriptionEnds: company.subscriptionEndDate,
          },
          user: {
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
          payment: {
            amount: payment.amount,
            billingCycle: payment.billingCycle,
            razorpayPaymentId: payment.razorpayPaymentId,
            id: payment._id,
          },
          plan: {
            name: plan.name,
          },
        })
      );

      await Promise.allSettled(emailPromises);
      console.log(`Renewal notification sent to ${superadmins.length} superadmin(s)`);
    } catch (error) {
      console.error('Error sending superadmin renewal notifications:', error.message);
    }
  }
}

module.exports = new PaymentService();